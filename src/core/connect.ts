import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import qrcode from 'qrcode-terminal';
import { createStore, WaClient, type WaStore } from 'zapo-js';
import { createSqliteStore } from '@zapo-js/store-sqlite';
import { type BotConfig, registerSettings } from '../lib/config.js';
import { appDb } from '../lib/database.js';
import makeHelper, { type ZapoWithHelpers } from '../lib/helper-zapo.js';
import { FilteredConsoleLogger, logger } from '../lib/logger.js';
import { CommandDispatcher } from './commands.js';
import { PluginLoader, PluginRegistry, PluginWatcher } from './plugins.js';

export class EnamiAsaBot {
    private readonly config: BotConfig;
    private readonly pluginsDir: string;
    private store!: WaStore;
    private client!: ZapoWithHelpers;
    private registry!: PluginRegistry;
    private loader!: PluginLoader;
    private watcher!: PluginWatcher;
    private dispatcher!: CommandDispatcher;

    public constructor(config: BotConfig, pluginsDir: string) {
        this.config = config;
        this.pluginsDir = path.resolve(pluginsDir);
    }

    public async start(): Promise<void> {
        const sessionDirectory = path.dirname(path.resolve(this.config.sessionPath));
        if (!fs.existsSync(sessionDirectory)) {
            fs.mkdirSync(sessionDirectory, { recursive: true });
        }

        this.store = createStore({
            backends: {
                sqlite: createSqliteStore({ path: path.resolve(this.config.sessionPath) })
            },
            providers: {
                auth: 'sqlite',
                signal: 'sqlite',
                preKey: 'sqlite',
                session: 'sqlite',
                identity: 'sqlite',
                senderKey: 'sqlite',
                appState: 'sqlite',
                privacyToken: 'sqlite',
                messages: 'none',
                threads: 'none',
                contacts: 'none'
            }
        });

        const rawClient = new WaClient(
            {
                store: this.store,
                sessionId: this.config.sessionId
            },
            new FilteredConsoleLogger(this.config.logLevel)
        );

        this.client = makeHelper(rawClient);
        registerSettings(this.client);

        const savedPrefix = appDb.getSetting('bot', 'prefix');
        const isPrefixOff = appDb.getSetting('bot', 'noprefix') === '1';
        if (isPrefixOff) {
            (this.config as any).prefixes = [''];
        } else if (savedPrefix) {
            (this.config as any).prefixes = [savedPrefix];
        }

        const savedMode = appDb.getSetting('bot', 'mode') as 'public' | 'self' | null;
        if (savedMode === 'public' || savedMode === 'self') {
            this.config.mode = savedMode;
        }

        this.registry = new PluginRegistry();
        this.loader = new PluginLoader();
        this.watcher = new PluginWatcher(this.pluginsDir, this.loader, this.registry);
        this.dispatcher = new CommandDispatcher(this.client, this.registry, this.config);

        this.registerEvents();

        await this.loader.loadAll(this.pluginsDir, this.registry);
        this.watcher.start();

        logger.startup({
            name: this.config.botName,
            dev: this.config.ownerName,
            pluginsCount: this.registry.getPluginCount(),
            commandsCount: this.registry.getCommandCount()
        });

        const credentials = this.client.getCredentials();
        const isAlreadyPaired = Boolean(credentials?.meJid);

        if (!isAlreadyPaired && this.config.authMode === 'pairing_code') {
            let phoneNumber = this.config.pairingPhoneNumber.replace(/[^0-9]/g, '');

            if (!phoneNumber && process.stdin.isTTY) {
                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                const answer = await rl.question('Masukkan nomor WhatsApp Anda untuk pairing (contoh: 6281234567890): ');
                phoneNumber = answer.replace(/[^0-9]/g, '');
                rl.close();
            }

            if (!phoneNumber) {
                logger.error('Nomor telepon pairing tidak ditentukan. Silakan isi pairingPhoneNumber pada src/lib/config.ts');
                return;
            }

            const connectPromise = this.client.connect();

            await new Promise<void>((resolve) => {
                const onReady = (): void => {
                    this.client.off('auth_pairing_required', onReady);
                    this.client.off('auth_qr', onReady);
                    resolve();
                };
                this.client.once('auth_pairing_required', onReady);
                this.client.once('auth_qr', onReady);
            });

            try {
                const code = await this.client.auth.requestPairingCode(phoneNumber);
                const formatted = code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
                process.stdout.write(`\n========================================\n  KODE PAIRING (8 DIGIT): ${formatted}\n========================================\n\n`);
            } catch (error) {
                logger.error('Gagal meminta kode pairing dari server WhatsApp', error);
            }

            await connectPromise;
        } else {
            await this.client.connect();
        }
    }

    public async stop(): Promise<void> {
        logger.info(`Menghentikan ${this.config.botName}...`);
        await this.watcher.close();
        if (this.client) {
            await this.client.disconnect();
        }
        if (this.store) {
            await this.store.destroy();
        }
        logger.info(`${this.config.botName} berhasil dihentikan`);
    }

    public getRegistry(): PluginRegistry {
        return this.registry;
    }

    public getClient(): WaClient {
        return this.client;
    }

    private registerEvents(): void {
        this.client.on('connection', (event) => {
            if (event.status === 'open') {
                this.dispatcher.markReady();
                const creds = this.client.getCredentials();
                logger.connected({
                    name: this.config.botName,
                    botJid: creds?.meJid ?? (this.client as any).user?.id ?? 'Enami Asa Ai',
                    library: 'zapo-js'
                });
            } else {
                logger.whatsapp(`Status koneksi: ${event.status}`);
            }
        });

        this.client.on('offline_resume', (event: any) => {
            if (event?.status === 'resuming') {
                this.dispatcher.setOfflineResuming(true);
            } else if (event?.status === 'complete') {
                this.dispatcher.setOfflineResuming(false);
            }
        });

        this.client.on('auth_qr', ({ qr }) => {
            if (this.config.authMode === 'qr') {
                logger.info('Pindai kode QR berikut di WhatsApp > Perangkat Tertaut:');
                qrcode.generate(qr, { small: true });
            }
        });

        this.client.on('auth_paired', ({ credentials }) => {
            logger.info(`Berhasil tertaut sebagai ${credentials.meJid ?? 'unknown'}`);
        });

        this.client.on('message', async (event) => {
            await this.dispatcher.dispatch(event);
        });
    }
}
