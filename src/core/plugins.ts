import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import chokidar, { type FSWatcher } from 'chokidar';
import type { Plugin, PluginPermissions, PluginContext } from '../../types/plugin.js';
import { logger } from '../lib/logger.js';
import { isIgnoredFile } from '../lib/utils.js';

function extractCommands(plugin: Plugin): readonly string[] {
    if (plugin.commands && plugin.commands.length > 0) {
        return plugin.commands;
    }
    if (Array.isArray(plugin.command)) {
        return plugin.command;
    }
    if (typeof plugin.command === 'string' && plugin.command.trim() !== '') {
        return [plugin.command];
    }
    return [];
}

export class PluginRegistry {
    private pluginsByPath = new Map<string, Plugin>();
    private commandMap = new Map<string, Plugin>();

    public register(filePath: string, plugin: Plugin): void {
        this.unregister(filePath);

        const commands = extractCommands(plugin);
        const name = plugin.name ?? commands[0] ?? 'unnamed';
        const category = plugin.category ?? 'general';

        for (const cmd of commands) {
            const normalized = cmd.toLowerCase().trim();
            if (this.commandMap.has(normalized)) {
                logger.warn(`Command '${normalized}' already registered, overriding with '${name}'`);
            }
            this.commandMap.set(normalized, plugin);
        }

        this.pluginsByPath.set(filePath, plugin);
        logger.info(`Registered plugin '${name}' [${category}] (${commands.length} commands)`);
    }

    public unregister(filePath: string): boolean {
        const existing = this.pluginsByPath.get(filePath);
        if (!existing) {
            return false;
        }

        const commands = extractCommands(existing);
        const name = existing.name ?? commands[0] ?? 'unnamed';

        for (const cmd of commands) {
            const normalized = cmd.toLowerCase().trim();
            if (this.commandMap.get(normalized) === existing) {
                this.commandMap.delete(normalized);
            }
        }

        this.pluginsByPath.delete(filePath);
        logger.info(`Unregistered plugin '${name}' from ${filePath}`);
        return true;
    }

    public getCommand(name: string): Plugin | undefined {
        return this.commandMap.get(name.toLowerCase().trim());
    }

    public hasCommand(name: string): boolean {
        return this.commandMap.has(name.toLowerCase().trim());
    }

    public getAllPlugins(): Plugin[] {
        return Array.from(this.pluginsByPath.values());
    }

    public getPluginsByCategory(): Map<string, Plugin[]> {
        const categories = new Map<string, Plugin[]>();
        for (const plugin of this.pluginsByPath.values()) {
            const category = plugin.category ?? 'general';
            const list = categories.get(category) ?? [];
            list.push(plugin);
            categories.set(category, list);
        }
        return categories;
    }

    public getPluginCount(): number {
        return this.pluginsByPath.size;
    }

    public getCommandCount(): number {
        return this.commandMap.size;
    }
}

export class PluginLoader {
    public normalizePlugin(candidate: unknown, filePath: string): Plugin | null {
        if (!candidate || (typeof candidate !== 'object' && typeof candidate !== 'function')) {
            return null;
        }

        const p = candidate as Record<string, unknown>;

        let rawCommands: unknown = p.command ?? p.commands ?? p.help;
        if (typeof rawCommands === 'string' && rawCommands.trim() !== '') {
            rawCommands = [rawCommands];
        }

        if (Array.isArray(rawCommands)) {
            rawCommands = rawCommands.map((c) => {
                if (typeof c === 'string') {
                    return c.trim().split(/\s+/)[0];
                }
                return c;
            });
        }

        if (
            !Array.isArray(rawCommands) ||
            rawCommands.length === 0 ||
            !rawCommands.every((c) => typeof c === 'string' && c.trim() !== '')
        ) {
            return null;
        }

        const commands = rawCommands.map((c) => String(c).trim().toLowerCase());

        let executeFn: Plugin['execute'];
        if (typeof candidate === 'function') {
            executeFn = (context: PluginContext) => {
                const m = context.m || context.event;
                return (candidate as any)(m, {
                    sock: context.client,
                    conn: context.client,
                    text: context.text,
                    reply: context.reply,
                    usedPrefix: context.usedPrefix,
                    command: context.command,
                    args: context.args,
                    db: context.db,
                    config: context.config,
                    registry: context.registry,
                    chatJid: context.chatJid,
                    from: context.from,
                    senderJid: context.senderJid,
                    senderNumber: context.senderNumber,
                    pushName: context.pushName,
                    isOwner: context.isOwner,
                    isPremium: context.isPremium,
                    isGroup: context.isGroup,
                    isAdmin: context.isAdmin,
                    isBotAdmin: context.isBotAdmin,
                    event: context.event,
                    raw: context.raw,
                    client: context.client,
                    m
                });
            };
        } else if (typeof p.execute === 'function') {
            executeFn = p.execute as Plugin['execute'];
        } else {
            return null;
        }

        let limitVal: boolean | number | undefined = undefined;
        if ('limit' in p && p.limit !== undefined && p.limit !== false) {
            if (p.limit === true) {
                limitVal = true;
            } else if (typeof p.limit === 'number') {
                if (!Number.isInteger(p.limit) || p.limit <= 0 || Number.isNaN(p.limit)) {
                    logger.error(`Invalid limit metadata in '${filePath}': ${p.limit}`);
                    return null;
                }
                limitVal = p.limit;
            } else {
                logger.error(`Invalid limit metadata type in '${filePath}': ${typeof p.limit}`);
                return null;
            }
        }

        const registerVal = typeof p.register === 'boolean' ? p.register : undefined;

        const rawPerms = (p.permissions && typeof p.permissions === 'object' ? p.permissions : {}) as Record<string, unknown>;

        const isOwner = Boolean(p.owner ?? rawPerms.owner);
        const isPremium = Boolean(p.premium ?? rawPerms.premium);
        const isGroup = Boolean(p.group ?? rawPerms.group);
        const isPrivate = Boolean(p.private ?? rawPerms.private);
        const isAdmin = Boolean(p.admin ?? rawPerms.admin);
        const isBotAdmin = Boolean(p.botadmin ?? rawPerms.botadmin);

        if (isGroup && isPrivate) {
            logger.error(`Conflicting permissions in '${filePath}': both 'group' and 'private' are set to true.`);
            return null;
        }

        if (isPrivate && (isAdmin || isBotAdmin)) {
            logger.error(`Conflicting permissions in '${filePath}': 'admin' or 'botadmin' cannot be active in private chat.`);
            return null;
        }

        const rawCategory = (Array.isArray(p.tags) ? p.tags[0] : p.tags) ?? p.category;
        const dirCategory = path.basename(path.dirname(path.resolve(filePath)));
        const fallbackCategory = dirCategory && dirCategory !== 'plugins' ? dirCategory : 'general';
        const category = typeof rawCategory === 'string' && rawCategory.trim() !== '' ? rawCategory.trim() : fallbackCategory;

        const defaultName = path.basename(filePath, path.extname(filePath));
        const name = typeof p.name === 'string' && p.name.trim() !== '' ? p.name.trim() : (commands[0] ?? defaultName);
        const rawDesc = (Array.isArray(p.help) ? p.help.join(', ') : p.help) ?? p.description;
        const description = typeof rawDesc === 'string' ? rawDesc : '';

        const permissions: PluginPermissions = {
            owner: isOwner,
            premium: isPremium,
            group: isGroup,
            private: isPrivate,
            admin: isAdmin,
            botadmin: isBotAdmin
        };

        const helpVal = Array.isArray(p.help) ? p.help : (typeof p.help === 'string' ? [p.help] : undefined);
        const tagsVal = Array.isArray(p.tags) ? p.tags : (typeof p.tags === 'string' ? [p.tags] : undefined);

        return {
            name,
            category,
            description,
            commands,
            command: commands,
            help: helpVal,
            tags: tagsVal,
            limit: limitVal,
            register: registerVal,
            owner: isOwner,
            premium: isPremium,
            group: isGroup,
            private: isPrivate,
            admin: isAdmin,
            botadmin: isBotAdmin,
            permissions,
            execute: executeFn
        };
    }

    public validatePlugin(candidate: unknown): candidate is Plugin {
        return this.normalizePlugin(candidate, 'unknown') !== null;
    }

    public async loadPlugin(filePath: string): Promise<Plugin | null> {
        try {
            const absolutePath = path.resolve(filePath);
            const fileUrl = `${pathToFileURL(absolutePath).href}?t=${Date.now()}`;
            const importedModule = await import(fileUrl);
            const pluginCandidate = importedModule.default ?? importedModule.plugin ?? importedModule.handler ?? importedModule;

            const normalized = this.normalizePlugin(pluginCandidate, filePath);
            if (!normalized) {
                logger.warn(`Invalid plugin structure or conflicting permissions in ${filePath}`);
                return null;
            }

            return normalized;
        } catch (error) {
            logger.error(`Failed to load plugin from ${filePath}`, error);
            return null;
        }
    }

    public async loadAll(pluginsDir: string, registry: PluginRegistry): Promise<void> {
        const absoluteDir = path.resolve(pluginsDir);
        if (!fs.existsSync(absoluteDir)) {
            logger.warn(`Plugins directory does not exist: ${absoluteDir}`);
            return;
        }

        const files = this.scanDirectory(absoluteDir);
        for (const file of files) {
            const plugin = await this.loadPlugin(file);
            if (plugin) {
                registry.register(file, plugin);
            }
        }
    }

    private scanDirectory(dir: string): string[] {
        const results: string[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                results.push(...this.scanDirectory(fullPath));
            } else if (entry.isFile() && !isIgnoredFile(entry.name)) {
                results.push(fullPath);
            }
        }

        return results;
    }
}

export class PluginWatcher {
    private watcher: FSWatcher | null = null;
    private readonly pluginsDir: string;
    private readonly loader: PluginLoader;
    private readonly registry: PluginRegistry;

    public constructor(pluginsDir: string, loader: PluginLoader, registry: PluginRegistry) {
        this.pluginsDir = path.resolve(pluginsDir);
        this.loader = loader;
        this.registry = registry;
    }

    public start(): void {
        if (this.watcher) {
            return;
        }

        this.watcher = chokidar.watch(this.pluginsDir, {
            ignoreInitial: true,
            awaitWriteFinish: {
                stabilityThreshold: 300,
                pollInterval: 100
            },
            ignored: (targetPath, stats) => {
                if (stats?.isFile()) {
                    return isIgnoredFile(path.basename(targetPath));
                }
                return false;
            }
        });

        this.watcher.on('add', async (filePath: string) => {
            if (isIgnoredFile(path.basename(filePath))) {
                return;
            }
            logger.info(`Detected new plugin file: ${path.basename(filePath)}`);
            const plugin = await this.loader.loadPlugin(filePath);
            if (plugin) {
                this.registry.register(filePath, plugin);
            }
        });

        this.watcher.on('change', async (filePath: string) => {
            if (isIgnoredFile(path.basename(filePath))) {
                return;
            }
            logger.info(`Detected change in plugin file: ${path.basename(filePath)}`);
            const plugin = await this.loader.loadPlugin(filePath);
            if (plugin) {
                this.registry.register(filePath, plugin);
            }
        });

        this.watcher.on('unlink', (filePath: string) => {
            if (isIgnoredFile(path.basename(filePath))) {
                return;
            }
            logger.info(`Detected deletion of plugin file: ${path.basename(filePath)}`);
            this.registry.unregister(filePath);
        });

        this.watcher.on('error', (error: unknown) => {
            logger.error('Plugin watcher encountered an error', error);
        });

        logger.info(`Plugin watcher active on: ${this.pluginsDir}`);
    }

    public async close(): Promise<void> {
        if (this.watcher) {
            await this.watcher.close();
            this.watcher = null;
            logger.info('Plugin watcher stopped');
        }
    }
}
