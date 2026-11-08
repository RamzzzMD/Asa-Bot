import type { WaClient, WaIncomingMessageEvent, WaSendMessageContent } from 'zapo-js';
import type { BotConfig } from '../src/lib/config.js';
import type { ButtonHelper, ButtonV2Helper, CoroseulFunction, LocationFunction, ThumbHelper, ZapoWithHelpers } from '../src/lib/helper-zapo.js';

export * from '../src/lib/helper-zapo.js';

export interface GlobalMessages {
    wait: string;
    loading: string;
    error: string;
    owner: string;
    admin: string;
    botAdmin: string;
    group: string;
    premium: string;
    private: string;
}

declare global {
    var mess: GlobalMessages;
}

export interface PluginPermissions {
    readonly owner?: boolean;
    readonly premium?: boolean;
    readonly group?: boolean;
    readonly private?: boolean;
    readonly admin?: boolean;
    readonly botadmin?: boolean;
}

import type { AppDatabase } from '../src/lib/database.js';

export interface PluginRegistryLike {
    register(filePath: string, plugin: Plugin): void;
    unregister(filePath: string): boolean;
    getAllPlugins(): Plugin[];
    getPluginsByCategory(): Map<string, Plugin[]>;
    getPluginCount(): number;
    getCommandCount(): number;
}

export interface PluginContext {
    readonly client: ZapoWithHelpers;
    readonly sock: ZapoWithHelpers;
    readonly conn: ZapoWithHelpers;
    readonly m: any;
    readonly event: WaIncomingMessageEvent;
    readonly chatJid: string;
    readonly from: string;
    readonly raw: unknown;
    readonly senderJid: string;
    readonly senderNumber: string;
    readonly pushName: string;
    readonly isOwner: boolean;
    readonly isPremium: boolean;
    readonly isGroup: boolean;
    readonly isAdmin: boolean;
    readonly isBotAdmin: boolean;
    readonly command: string;
    readonly args: string[];
    readonly text: string;
    readonly prefix: string;
    readonly usedPrefix: string;
    readonly config: BotConfig;
    readonly registry: PluginRegistryLike;
    readonly db: AppDatabase;
    readonly reply: (content: string | WaSendMessageContent) => Promise<unknown>;
}

export interface BaileysHandlerExtra {
    sock: ZapoWithHelpers;
    conn: ZapoWithHelpers;
    text: string;
    reply: (content: string | WaSendMessageContent) => Promise<unknown>;
    usedPrefix: string;
    command: string;
    args: string[];
    db: AppDatabase;
    config: BotConfig;
    registry: PluginRegistryLike;
    chatJid: string;
    from: string;
    senderJid: string;
    senderNumber: string;
    pushName: string;
    isOwner: boolean;
    isPremium: boolean;
    isGroup: boolean;
    isAdmin: boolean;
    isBotAdmin: boolean;
    event: WaIncomingMessageEvent;
    raw: unknown;
    client: ZapoWithHelpers;
    m: any;
}

export type BaileysHandlerFunction = (
    m: any,
    extra: BaileysHandlerExtra
) => Promise<void> | void;

export interface Plugin {
    readonly name?: string;
    readonly category?: string;
    readonly description?: string;
    readonly command?: string | readonly string[];
    readonly commands?: readonly string[];
    readonly help?: readonly string[] | string;
    readonly tags?: readonly string[] | string;
    readonly limit?: boolean | number;
    readonly register?: boolean;
    readonly owner?: boolean;
    readonly premium?: boolean;
    readonly group?: boolean;
    readonly private?: boolean;
    readonly admin?: boolean;
    readonly botadmin?: boolean;
    readonly permissions?: PluginPermissions;
    readonly execute: (
        context: PluginContext,
        extra?: { readonly client: ZapoWithHelpers; readonly config: BotConfig }
    ) => Promise<void> | void;
}
