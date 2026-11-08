import type { WaClient, WaIncomingMessageEvent, WaSendMessageContent } from 'zapo-js';
import type { Plugin, PluginContext, ZapoWithHelpers } from '../../types/plugin.js';
import type { BotConfig } from '../lib/config.js';
import { appDb, type AppDatabase } from '../lib/database.js';
import { extractInteraction } from '../lib/helper-zapo.js';
import { logger } from '../lib/logger.js';
import {
    decodeLid,
    extractMessageText,
    parseCommand,
    resolveSenderInfo
} from '../lib/utils.js';
import { isLikelyRawScrapeCode } from '../lib/scrape-engine.js';
import type { PluginRegistry } from './plugins.js';

interface GroupMetadataSnapshot {
    subject?: string;
    participants?: Array<{
        jid?: string;
        phoneNumber?: string;
        lid?: string;
        type?: string;
        isAdmin?: boolean;
        isSuperAdmin?: boolean;
    }>;
}

function extractMessageTimestamp(event: WaIncomingMessageEvent): number | undefined {
    if (typeof event.timestampSeconds === 'number' && event.timestampSeconds > 0) {
        return event.timestampSeconds;
    }
    const rawT = (event as any).rawNode?.attrs?.t;
    if (rawT) {
        const parsed = parseInt(String(rawT), 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
            return parsed;
        }
    }
    const msgTs = (event as any).messageTimestamp;
    if (msgTs) {
        if (typeof msgTs === 'number' && msgTs > 0) {
            return msgTs;
        }
        if (typeof msgTs === 'object' && typeof msgTs.low === 'number' && msgTs.low > 0) {
            return msgTs.low;
        }
        const parsed = parseInt(String(msgTs), 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
            return parsed;
        }
    }
    return undefined;
}

export class CommandDispatcher {
    private readonly client: ZapoWithHelpers;
    private readonly registry: PluginRegistry;
    private readonly config: BotConfig;
    private readonly db: AppDatabase;
    private readonly sentMessageIds = new Set<string>();
    private readonly groupMetadataCache = new Map<string, { data: GroupMetadataSnapshot; expiry: number }>();
    private botStartTime: number = Math.floor(Date.now() / 1000) - 2;
    private isOfflineResuming = false;

    public constructor(client: ZapoWithHelpers, registry: PluginRegistry, config: BotConfig, db: AppDatabase = appDb) {
        this.client = client;
        this.registry = registry;
        this.config = config;
        this.db = db;
    }

    public markReady(): void {
        this.botStartTime = Math.floor(Date.now() / 1000);
    }

    public setOfflineResuming(resuming: boolean): void {
        this.isOfflineResuming = resuming;
        if (!resuming) {
            this.botStartTime = Math.floor(Date.now() / 1000);
        }
    }

    public async dispatch(event: WaIncomingMessageEvent): Promise<void> {
        if (!event.key.remoteJid) {
            return;
        }

        if (event.key.id && this.sentMessageIds.has(event.key.id)) {
            return;
        }

        // Abaikan jika sedang memproses pemulihan antrean offline catchup
        if (this.isOfflineResuming) {
            return;
        }

        // Abaikan jika pesan berstatus offline dari node WhatsApp
        if (event.offline || (event as any).rawNode?.attrs?.offline !== undefined) {
            return;
        }

        // Cek timestamp pesan: abaikan pesan yang dikirim sebelum bot aktif atau terlalu basi (> 60 detik)
        const msgTimestamp = extractMessageTimestamp(event);
        if (msgTimestamp !== undefined) {
            if (msgTimestamp < this.botStartTime) {
                return;
            }
            if (Date.now() / 1000 - msgTimestamp > 60) {
                return;
            }
        }

        const storedPrefix = this.db.getSetting('bot', 'prefix');
        const activePrefix = storedPrefix || this.config.prefixes[0] || '.';
        const isPrefixOff = this.db.getSetting('bot', 'noprefix') === '1';

        const interaction = extractInteraction(event);
        let rawText = '';

        if (interaction && interaction.id) {
            rawText = interaction.id;
            if (!isPrefixOff) {
                if (!rawText.startsWith(activePrefix)) {
                    rawText = `${activePrefix}${rawText.replace(/^[.#!\/]/, '')}`;
                }
            }
        } else {
            rawText = extractMessageText(event);
        }

        const docFileName = event.message?.documentMessage?.fileName || '';
        const isCodeDocument = /\.(ts|js|mjs|cjs)$/i.test(docFileName);

        if (!rawText && !isCodeDocument) {
            return;
        }

        const startTime = Date.now();
        const chatJid = event.key.remoteJid;
        const isGroup = Boolean(event.key.isGroup);

        let groupParticipants: Array<{ jid?: string; lid?: string; phoneNumber?: string }> | undefined;
        let groupName = '';
        if (isGroup) {
            const cachedMeta = await this.getGroupMetadata(chatJid);
            if (cachedMeta) {
                if (cachedMeta.subject) groupName = cachedMeta.subject;
                if (Array.isArray(cachedMeta.participants)) {
                    groupParticipants = cachedMeta.participants;
                }
            }
        }

        const senderInfo = resolveSenderInfo(event, groupParticipants);
        const senderJid = senderInfo.senderJid;
        const senderNumber = senderInfo.senderNumber;
        const extraOwners = this.db.getSetting('bot', 'extra_owners');
        const isOwner =
            event.key.fromMe ||
            this.config.ownerNumbers.includes(senderNumber) ||
            (extraOwners ? extraOwners.includes(senderNumber) : false);
        const isPremium = isOwner || this.db.isPremium(senderNumber);
        const pushName = event.pushName ?? '';

        const currentMode = this.db.getSetting('bot', 'mode') || this.config.mode || 'public';
        if (currentMode === 'self' && !isOwner) {
            return;
        }

        if (!isOwner) {
            const isGcOnly = this.db.getSetting('bot', 'gconly') === '1';
            if (isGcOnly && !isGroup) {
                return;
            }
            const isPcOnly = this.db.getSetting('bot', 'pconly') === '1';
            if (isPcOnly && isGroup) {
                return;
            }
            if (isGroup && this.db.getSetting('group:' + chatJid, 'mute') === '1') {
                return;
            }
        }

        if (isGroup && !isOwner) {
            const isAntilinkOn = this.db.getSetting('group:' + chatJid, 'antilink') === '1';
            if (isAntilinkOn && /chat\.whatsapp\.com\/[A-Za-z0-9]{20,24}/i.test(rawText)) {
                try {
                    await this.client.sendMessage(chatJid, {
                        text: `@${senderNumber} dilarang mengirim link grup WhatsApp!`,
                        mentions: [senderJid]
                    });
                    if (event.key.id) {
                        await this.client.message.send(chatJid, {
                            delete: {
                                remoteJid: chatJid,
                                id: event.key.id,
                                participant: senderJid,
                                fromMe: false
                            }
                        } as any);
                    }
                } catch (e) {
                    logger.warn('Antilink action error', e);
                }
                return;
            }
        }

        (this.config as any).prefixes = isPrefixOff ? [''] : [activePrefix];

        let parsed: { prefix: string; command: string; args: string[]; fullText: string } | null = null;

        if (isPrefixOff) {
            if (rawText.startsWith(activePrefix)) {
                parsed = parseCommand(rawText, [activePrefix]);
            } else {
                const trimmed = rawText.trim();
                const parts = trimmed.split(/\s+/);
                const firstWord = parts[0]?.toLowerCase() || '';
                if (this.registry.hasCommand(firstWord)) {
                    parsed = {
                        prefix: '',
                        command: firstWord,
                        args: parts.slice(1),
                        fullText: trimmed.slice(parts[0].length).trim()
                    };
                }
            }
        } else {
            parsed = parseCommand(rawText, [activePrefix]);
        }

        if (!parsed && isOwner) {
            if (rawText.startsWith('=>')) {
                const fullText = rawText.slice(2).trim();
                parsed = { prefix: '', command: '=>', args: fullText ? fullText.split(/\s+/) : [], fullText };
            } else if (rawText.startsWith('>')) {
                const fullText = rawText.slice(1).trim();
                parsed = { prefix: '', command: '>', args: fullText ? fullText.split(/\s+/) : [], fullText };
            } else if (rawText.startsWith('$')) {
                const fullText = rawText.slice(1).trim();
                parsed = { prefix: '', command: '$', args: fullText ? fullText.split(/\s+/) : [], fullText };
            } else if (
                this.db.getSetting('bot', 'autoscrape') !== '0' &&
                (isCodeDocument || isLikelyRawScrapeCode(rawText))
            ) {
                parsed = {
                    prefix: activePrefix,
                    command: 'autoscrape',
                    args: [],
                    fullText: rawText
                };
            }
        }

        if (!parsed) {
            logger.chat({
                isGroup,
                groupName,
                sender: pushName || (isOwner ? 'Owner' : 'User'),
                number: senderNumber,
                message: rawText,
                command: '-',
                responseTime: Date.now() - startTime,
                status: 'message'
            });
            return;
        }

        const plugin = this.registry.getCommand(parsed.command);
        if (!plugin) {
            logger.chat({
                isGroup,
                groupName,
                sender: pushName || (isOwner ? 'Owner' : 'User'),
                number: senderNumber,
                message: rawText,
                command: `${parsed.prefix}${parsed.command}`,
                responseTime: Date.now() - startTime,
                status: 'unhandled'
            });
            return;
        }

        let isUserAdmin = isOwner;
        let isBotAdmin = false;

        if (isGroup) {
            const meta = await this.getGroupMetadata(chatJid);
            if (meta && Array.isArray(meta.participants)) {
                const clean = (val?: string) => (val ? val.replace(/@.*$/, '').replace(/:\d+$/, '').trim() : '');
                const userCandidates = [
                    clean(event.key.participant),
                    clean(event.key.participantAlt),
                    clean(senderJid),
                    senderNumber
                ].filter(Boolean);

                const creds = this.client.getCredentials();
                const botCandidates = [
                    clean(creds?.meJid),
                    clean(creds?.meLid),
                    clean(this.client.user?.id),
                    clean(this.config.pairingPhoneNumber)
                ].filter(Boolean);

                for (const p of meta.participants) {
                    const pIds = [
                        clean(p.jid),
                        clean(p.lid),
                        clean(p.phoneNumber),
                        clean((p as any).id)
                    ].filter(Boolean);

                    const hasAdminRole = Boolean(
                        p.isAdmin ||
                        p.isSuperAdmin ||
                        p.type === 'admin' ||
                        p.type === 'superadmin' ||
                        (p as any).admin === 'admin' ||
                        (p as any).admin === 'superadmin' ||
                        (p as any).role === 'admin' ||
                        (p as any).role === 'superadmin'
                    );

                    if (!isUserAdmin && userCandidates.some((c) => pIds.includes(c))) {
                        if (hasAdminRole) {
                            isUserAdmin = true;
                        }
                    }

                    if (!isBotAdmin && botCandidates.some((b) => pIds.includes(b))) {
                        if (hasAdminRole) {
                            isBotAdmin = true;
                        }
                    }
                }
            }
        }

        const permissionResult = this.verifyPermissions(plugin, {
            isOwner,
            isPremium,
            isGroup,
            isAdmin: isUserAdmin,
            isBotAdmin
        });

        if (!permissionResult.allowed) {
            await this.client.message.send(chatJid, permissionResult.reason ?? 'Akses ditolak.', { quote: event });
            return;
        }

        const quotedMsg =
            event.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            (event as any)?.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            null;

        const replyFn = async (content: string | WaSendMessageContent) => {
            const res = await this.client.message.send(chatJid, content, { quote: event });
            if (res?.id) {
                this.sentMessageIds.add(res.id);
                if (this.sentMessageIds.size > 1000) {
                    const first = this.sentMessageIds.values().next().value;
                    if (first) {
                        this.sentMessageIds.delete(first);
                    }
                }
            }
            return res;
        };

        const m = Object.assign({}, event, {
            chat: chatJid,
            from: chatJid,
            sender: senderJid,
            isGroup,
            fromMe: event.key?.fromMe ?? false,
            id: event.key?.id ?? '',
            key: event.key,
            message: event.message,
            quoted: quotedMsg,
            reply: replyFn,
            text: parsed.fullText
        });

        const context: PluginContext = {
            client: this.client,
            sock: this.client,
            conn: this.client,
            m,
            event,
            chatJid,
            from: chatJid,
            raw: event,
            senderJid,
            senderNumber,
            pushName,
            isOwner,
            isPremium,
            isGroup,
            isAdmin: isUserAdmin,
            isBotAdmin,
            command: parsed.command,
            args: parsed.args,
            text: parsed.fullText,
            prefix: isPrefixOff ? '' : activePrefix,
            usedPrefix: parsed.prefix,
            config: this.config,
            registry: this.registry,
            db: this.db,
            reply: replyFn
        };

        try {
            await plugin.execute(context, { client: this.client, config: this.config });
            const responseTime = Date.now() - startTime;
            logger.chat({
                isGroup,
                groupName,
                sender: pushName || (isOwner ? 'Owner' : 'User'),
                number: senderNumber,
                message: rawText,
                command: `${parsed.prefix}${parsed.command}`,
                responseTime,
                status: 'success ✓'
            });
        } catch (error) {
            const responseTime = Date.now() - startTime;
            logger.chat({
                isGroup,
                groupName,
                sender: pushName || (isOwner ? 'Owner' : 'User'),
                number: senderNumber,
                message: rawText,
                command: `${parsed.prefix}${parsed.command}`,
                responseTime,
                status: 'error ✗'
            });
            logger.error(`Error executing command '${parsed.command}' from ${senderNumber}`, error);
            try {
                await this.client.message.send(
                    chatJid,
                    global.mess?.error ?? '❌ ᴛᴇʀᴊᴀᴅɪ ᴋᴇsᴀʟᴀʜᴀɴ, sɪʟᴀᴋᴀɴ ᴄᴏʙᴀ ʟᴀɢɪ ɴᴀɴᴛɪ 🎀✨',
                    { quote: event }
                );
            } catch (replyError) {
                logger.error('Failed to send error notification message', replyError);
            }
        }
    }

    private verifyPermissions(
        plugin: Plugin,
        info: {
            isOwner: boolean;
            isPremium: boolean;
            isGroup: boolean;
            isAdmin: boolean;
            isBotAdmin: boolean;
        }
    ): { allowed: boolean; reason?: string } {
        const isOwnerRequired = Boolean(plugin.owner ?? plugin.permissions?.owner);
        const isPremiumRequired = Boolean(plugin.premium ?? plugin.permissions?.premium);
        const isGroupRequired = Boolean(plugin.group ?? plugin.permissions?.group);
        const isPrivateRequired = Boolean(plugin.private ?? plugin.permissions?.private);
        const isAdminRequired = Boolean(plugin.admin ?? plugin.permissions?.admin);
        const isBotAdminRequired = Boolean(plugin.botadmin ?? plugin.permissions?.botadmin);

        if (isOwnerRequired && !info.isOwner) {
            return { allowed: false, reason: global.mess?.owner ?? '🍓 ᴀᴋsᴇs ᴋʜᴜsᴜs: ʜᴀɴʏᴀ ᴏᴡɴᴇʀ ᴛᴇʀsᴀʏᴀɴɢ sᴀᴊᴀ ʏᴀᴀ 🎀✨' };
        }

        if (isPremiumRequired && !info.isPremium) {
            return { allowed: false, reason: global.mess?.premium ?? '🍓 ᴀᴋsᴇs ᴋʜᴜsᴜs: ғɪᴛᴜʀ ɪɴɪ ᴋʜᴜsᴜs ᴜsᴇʀ ᴘʀᴇᴍɪᴜᴍ sᴀᴊᴀ ʏᴀᴀ 🎀✨' };
        }

        if (isGroupRequired && !info.isGroup) {
            return { allowed: false, reason: global.mess?.group ?? '🍓 ᴍᴏʜᴏɴ ᴍᴀᴀғ: ғɪᴛᴜʀ ɪɴɪ ʜᴀɴʏᴀ ʙɪsᴀ ᴅɪɢᴜɴᴀᴋᴀɴ ᴅɪ ᴅᴀʟᴀᴍ ɢʀᴜᴘ ʏᴀᴀ 🎀✨' };
        }

        if (isPrivateRequired && info.isGroup) {
            return { allowed: false, reason: global.mess?.private ?? '🍓 ᴍᴏʜᴏɴ ᴍᴀᴀғ: ғɪᴛᴜʀ ɪɴɪ ʜᴀɴʏᴀ ʙɪsᴀ ᴅɪɢᴜɴᴀᴋᴀɴ ᴅɪ ᴘʀɪᴠᴀᴛᴇ ᴄʜᴀᴛ ʏᴀᴀ 🎀✨' };
        }

        if (info.isGroup) {
            if (isAdminRequired && !info.isAdmin) {
                return { allowed: false, reason: global.mess?.admin ?? '🍓 ᴀᴋsᴇs ᴋʜᴜsᴜs: ғɪᴛᴜʀ ɪɴɪ ʜᴀɴʏᴀ ᴜɴᴛᴜᴋ ᴀᴅᴍɪɴ ɢʀᴜᴘ ʏᴀᴀ 🎀✨' };
            }

            if (isBotAdminRequired && !info.isBotAdmin) {
                return { allowed: false, reason: global.mess?.botAdmin ?? '🍓 ᴍᴏʜᴏɴ ᴍᴀᴀғ: ʙᴏᴛ ʜᴀʀᴜs ᴍᴇɴᴊᴀᴅɪ ᴀᴅᴍɪɴ ɢʀᴜᴘ ᴛᴇʀʟᴇʙɪʜ ᴅᴀʜᴜʟᴜ 🎀✨' };
            }
        }

        return { allowed: true };
    }

    private async getGroupMetadata(groupJid: string): Promise<GroupMetadataSnapshot | null> {
        const cached = this.groupMetadataCache.get(groupJid);
        if (cached && Date.now() < cached.expiry) {
            return cached.data;
        }

        try {
            const raw = await this.client.group.queryGroupMetadata(groupJid);
            const snapshot = raw as unknown as GroupMetadataSnapshot;
            this.groupMetadataCache.set(groupJid, {
                data: snapshot,
                expiry: Date.now() + 60000
            });
            return snapshot;
        } catch (error) {
            logger.error(`Failed to query group metadata for ${groupJid}`, error);
            return null;
        }
    }
}
