import type { WaClient } from 'zapo-js';
import type { GlobalMessages } from '../../types/plugin.js';
import { setupGlobalHelpers } from './helper-zapo.js';

export interface BotConfig {
    readonly botName: string;
    readonly ownerName: string;
    readonly prefixes: readonly string[];
    readonly ownerNumbers: readonly string[];
    readonly premiumNumbers: readonly string[];
    readonly sessionPath: string;
    readonly sessionId: string;
    readonly authMode: 'pairing_code' | 'qr';
    readonly pairingPhoneNumber: string;
    readonly thumbnailUrl: string;
    mode: 'public' | 'self';
    readonly logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error';
    readonly register: {
        readonly enabled: boolean;
        readonly defaultLimit: number;
    };
}

export const mess: GlobalMessages = {
    wait: '⏳ ᴍᴏʜᴏɴ ᴛᴜɴɢɢᴜ, sᴇᴅᴀɴɢ ᴅɪᴘʀᴏsᴇs... 🎀✨',
    loading: '⏳ ᴍᴏʜᴏɴ ᴛᴜɴɢɢᴜ, sᴇᴅᴀɴɢ ᴅɪᴘʀᴏsᴇs... 🎀✨',
    error: '❌ ᴛᴇʀᴊᴀᴅɪ ᴋᴇsᴀʟᴀʜᴀɴ, sɪʟᴀᴋᴀɴ ᴄᴏʙᴀ ʟᴀɢɪ ɴᴀɴᴛɪ 🎀✨',
    owner: '🍓 ᴀᴋsᴇs ᴋʜᴜsᴜs: ʜᴀɴʏᴀ ᴏᴡɴᴇʀ ᴛᴇʀsᴀʏᴀɴɢ sᴀᴊᴀ ʏᴀᴀ 🎀✨',
    admin: '🍓 ᴀᴋsᴇs ᴋʜᴜsᴜs: ғɪᴛᴜʀ ɪɴɪ ʜᴀɴʏᴀ ᴜɴᴛᴜᴋ ᴀᴅᴍɪɴ ɢʀᴜᴘ ʏᴀᴀ 🎀✨',
    botAdmin: '🍓 ᴍᴏʜᴏɴ ᴍᴀᴀғ: ʙᴏᴛ ʜᴀʀᴜs ᴍᴇɴᴊᴀᴅɪ ᴀᴅᴍɪɴ ɢʀᴜᴘ ᴛᴇʀʟᴇʙɪʜ ᴅᴀʜᴜʟᴜ 🎀✨',
    group: '🍓 ᴍᴏʜᴏɴ ᴍᴀᴀғ: ғɪᴛᴜʀ ɪɴɪ ʜᴀɴʏᴀ ʙɪsᴀ ᴅɪɢᴜɴᴀᴋᴀɴ ᴅɪ ᴅᴀʟᴀᴍ ɢʀᴜᴘ ʏᴀᴀ 🎀✨',
    premium: '🍓 ᴀᴋsᴇs ᴋʜᴜsᴜs: ғɪᴛᴜʀ ɪɴɪ ᴋʜᴜsᴜs ᴜsᴇʀ ᴘʀᴇᴍɪᴜᴍ sᴀᴊᴀ ʏᴀᴀ 🎀✨',
    private: '🍓 ᴍᴏʜᴏɴ ᴍᴀᴀғ: ғɪᴛᴜʀ ɪɴɪ ʜᴀɴʏᴀ ʙɪsᴀ ᴅɪɢᴜɴᴀᴋᴀɴ ᴅɪ ᴘʀɪᴠᴀᴛᴇ ᴄʜᴀᴛ ʏᴀᴀ 🎀✨'
};

globalThis.mess = mess;

export const config: BotConfig = {
    botName: 'Enami Asa Ai',
    ownerName: 'Ranzz Suaminya Asa',
    prefixes: ['.', '#', '!'],
    ownerNumbers: process.env.OWNER_NUMBERS ? process.env.OWNER_NUMBERS.split(',') : ['6281214300828'],
    premiumNumbers: process.env.PREMIUM_NUMBERS ? process.env.PREMIUM_NUMBERS.split(',') : ['6281214300828'],
    sessionPath: 'data/session.sqlite',
    sessionId: 'enami-asa-session',
    authMode: 'pairing_code',
    pairingPhoneNumber: process.env.PAIRING_NUMBER || '966582220373',
    thumbnailUrl: 'assets/menu.jpg',
    mode: 'public',
    logLevel: 'info',
    register: {
        enabled: true,
        defaultLimit: 30
    }
};

export function registerSettings(client: WaClient): void {
    globalThis.mess = mess;
    setupGlobalHelpers(client, config);
}
