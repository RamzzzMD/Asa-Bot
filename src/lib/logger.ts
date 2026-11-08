import { ConsoleLogger, type LogLevel, type Logger as WaLogger } from 'zapo-js';
import os from 'node:os';

export const colors = {
    reset: '\x1b[0m',
    dim: '\x1b[2m',
    bold: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    pink: '\x1b[38;5;213m',
    softPink: '\x1b[38;5;218m',
    lavender: '\x1b[38;5;183m'
};

function getTimestamp(): string {
    return new Date().toTimeString().split(' ')[0];
}

function formatTag(tag: string, color = colors.cyan): string {
    return `${colors.dim}[${getTimestamp()}]${colors.reset} ${color}[${tag}]${colors.reset}`;
}

const formatBytes = (n: number): string => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    while (n >= 1024 && i < units.length - 1) {
        n /= 1024;
        i++;
    }
    return `${n.toFixed(2)} ${units[i]}`;
};

export interface ChatLogOptions {
    isGroup?: boolean;
    groupName?: string;
    sender?: string;
    number?: string;
    message?: string;
    command?: string;
    responseTime?: number | string;
    status?: string;
}

export interface StartupLogOptions {
    name?: string;
    dev?: string;
    pluginsCount?: number;
    commandsCount?: number;
}

export interface ConnectedLogOptions {
    name?: string;
    botJid?: string;
    library?: string;
}

export class Logger {
    public system(msg: string): void {
        console.log(`${formatTag('SYSTEM', colors.blue)} ${msg}`);
    }

    public plugin(msg: string): void {
        console.log(`${formatTag('PLUGIN', colors.green)} ${msg}`);
    }

    public whatsapp(msg: string): void {
        console.log(`${formatTag('WHATSAPP', colors.magenta)} ${msg}`);
    }

    public message(msg: string): void {
        console.log(`${formatTag('MESSAGE', colors.cyan)} ${msg}`);
    }

    public hotreload(msg: string): void {
        console.log(`${formatTag('HOTRELOAD', colors.yellow)} ${msg}`);
    }

    public info(message: string, meta?: unknown): void {
        if (meta !== undefined) {
            console.log(`${formatTag('INFO', colors.cyan)} ${message}`, meta);
        } else {
            console.log(`${formatTag('INFO', colors.cyan)} ${message}`);
        }
    }

    public warn(message: string, meta?: unknown): void {
        if (meta !== undefined) {
            console.warn(`${formatTag('WARN', colors.yellow)} ${colors.yellow}${message}${colors.reset}`, meta);
        } else {
            console.warn(`${formatTag('WARN', colors.yellow)} ${colors.yellow}${message}${colors.reset}`);
        }
    }

    public error(message: string, error?: unknown): void {
        console.error(`${formatTag('ERROR', colors.red)} ${colors.red}${message}${colors.reset}`);
        if (error && typeof error === 'object' && 'stack' in error && (error as any).stack) {
            console.error(`${colors.dim}${(error as any).stack}${colors.reset}`);
        } else if (error !== undefined) {
            console.error(error);
        }
    }

    public debug(message: string, meta?: unknown): void {
        if (meta !== undefined) {
            console.debug(`${formatTag('DEBUG', colors.dim)} ${message}`, meta);
        } else {
            console.debug(`${formatTag('DEBUG', colors.dim)} ${message}`);
        }
    }

    public startup({
        name = 'Enami Asa Ai',
        dev = 'Ranzz Suaminya Asa',
        pluginsCount = 0,
        commandsCount = 0
    }: StartupLogOptions = {}): void {
        const total = os.totalmem();
        const free = os.freemem();

        console.log(`
${colors.pink}╭─── ୨୧ ENAMI ASA AI ୨୧ ───╮${colors.reset}
${colors.pink}│${colors.reset} ૮₍˶ᵔ ᵕ ᵔ˶₎ა ${colors.softPink}system initialization!${colors.reset}
${colors.pink}╰──────────────────────────╯${colors.reset}

${colors.lavender}୨ৎ  SYSTEM INFORMATION${colors.reset}
${colors.pink}│${colors.reset}
${colors.pink}├─${colors.reset} ♡ Bot Name  : ${colors.cyan}${name}${colors.reset}
${colors.pink}├─${colors.reset} ♡ Owner     : ${colors.softPink}${dev}${colors.reset}
${colors.pink}├─${colors.reset} ♡ Core      : ${colors.pink}${name} by ${dev}${colors.reset}
${colors.pink}├─${colors.reset} ♡ Node.js   : ${colors.yellow}${process.version}${colors.reset}
${colors.pink}├─${colors.reset} ♡ Platform  : ${colors.yellow}${process.platform} (${process.arch})${colors.reset}
${colors.pink}├─${colors.reset} ♡ RAM       : ${colors.cyan}${formatBytes(total - free)} / ${formatBytes(total)}${colors.reset}
${colors.pink}├─${colors.reset} ♡ Plugins   : ${colors.green}${pluginsCount} plugins${colors.reset}
${colors.pink}├─${colors.reset} ♡ Commands  : ${colors.green}${commandsCount} commands${colors.reset}
└─ ♡ Status    : ${colors.green}starting up...${colors.reset}

${colors.softPink}꒰ა ♡ ໒꒱ loading modules & session...${colors.reset}
`);
    }

    public connected({
        name = 'Enami Asa Ai',
        botJid = 'Unknown',
        library = 'zapo-js'
    }: ConnectedLogOptions = {}): void {
        console.log(`
${colors.pink}╭─── ୨୧ ENAMI ASA AI ୨୧ ───╮${colors.reset}
${colors.pink}│${colors.reset} ૮₍˶ᵔ ᵕ ᵔ˶₎ა ${colors.softPink}whatsapp connected!${colors.reset}
${colors.pink}╰──────────────────────────╯${colors.reset}

${colors.lavender}୨ৎ  CONNECTION STATUS${colors.reset}
${colors.pink}│${colors.reset}
${colors.pink}├─${colors.reset} ♡ Bot Name : ${colors.softPink}${name}${colors.reset}
${colors.pink}├─${colors.reset} ♡ Bot JID  : ${colors.yellow}${botJid}${colors.reset}
${colors.pink}├─${colors.reset} ♡ Library  : ${colors.cyan}${library}${colors.reset}
${colors.pink}├─${colors.reset} ♡ Status   : ${colors.green}online & ready${colors.reset}
└─ ♡ Auth     : ${colors.green}authenticated ✓${colors.reset}

${colors.softPink}꒰ა ♡ ໒꒱ enami asa ai is ready to serve!${colors.reset}
`);
    }

    public chat({
        isGroup = false,
        groupName = '',
        sender = '',
        number = '',
        message = '',
        command = '',
        responseTime = 0,
        status = 'success ✓'
    }: ChatLogOptions = {}): void {
        const timeStr = typeof responseTime === 'number' ? `${responseTime} ms` : String(responseTime);
        const cmdStr = command ? command : '-';
        const msgStr = message ? (message.length > 60 ? message.slice(0, 57) + '...' : message) : '-';
        const senderStr = sender || 'Unknown';
        const numberStr = number || '-';

        if (isGroup) {
            const gName = groupName || 'Group Chat';
            console.log(
`${colors.pink}╭─── ୨୧ ENAMI ASA AI ୨୧ ───╮${colors.reset}
${colors.pink}│${colors.reset} ૮₍˶ᵔ ᵕ ᵔ˶₎ა ${colors.softPink}group message!${colors.reset}
${colors.pink}╰──────────────────────────╯${colors.reset}

${colors.lavender}୨ৎ  GROUP CHAT${colors.reset}
${colors.pink}│${colors.reset}
${colors.pink}├─${colors.reset} ♡ Group   : ${colors.cyan}${gName} ♡${colors.reset}
${colors.pink}├─${colors.reset} ♡ Sender  : ${colors.softPink}${senderStr}${colors.reset}
${colors.pink}├─${colors.reset} ♡ Number  : ${colors.yellow}${numberStr}${colors.reset}
${colors.pink}├─${colors.reset} ♡ Message : ${colors.reset}${msgStr}
${colors.pink}├─${colors.reset} ♡ Command : ${colors.green}${cmdStr}${colors.reset}
${colors.pink}├─${colors.reset} ♡ Response: ${colors.magenta}${timeStr}${colors.reset}
└─ ♡ Status  : ${status.includes('error') ? colors.red : colors.green}${status}${colors.reset}

${colors.softPink}꒰ა ♡ ໒꒱ enami asa ai is ready for more chats!${colors.reset}
`
            );
        } else {
            console.log(
`${colors.pink}╭─── ୨୧ ENAMI ASA AI ୨୧ ───╮${colors.reset}
${colors.pink}│${colors.reset} ૮₍˶ᵔ ᵕ ᵔ˶₎ა ${colors.softPink}private message!${colors.reset}
${colors.pink}╰──────────────────────────╯${colors.reset}

${colors.lavender}୨ৎ  PRIVATE CHAT${colors.reset}
${colors.pink}│${colors.reset}
${colors.pink}├─${colors.reset} ♡ Sender  : ${colors.softPink}${senderStr}${colors.reset}
${colors.pink}├─${colors.reset} ♡ Number  : ${colors.yellow}${numberStr}${colors.reset}
${colors.pink}├─${colors.reset} ♡ Message : ${colors.reset}${msgStr}
${colors.pink}├─${colors.reset} ♡ Command : ${colors.green}${cmdStr}${colors.reset}
${colors.pink}├─${colors.reset} ♡ Response: ${colors.magenta}${timeStr}${colors.reset}
└─ ♡ Status  : ${status.includes('error') ? colors.red : colors.green}${status}${colors.reset}

${colors.softPink}꒰ა ♡ ໒꒱ enami asa ai is ready for more chats!${colors.reset}
`
            );
        }
    }
}

export const logger = new Logger();

let consoleFilterInstalled = false;

export function setupConsoleFilter(): void {
    if (consoleFilterInstalled) return;
    consoleFilterInstalled = true;

    const origWarn = console.warn;
    const origError = console.error;

    const isSuppressed = (args: unknown[]): boolean => {
        for (const arg of args) {
            if (typeof arg === 'string') {
                const lower = arg.toLowerCase();
                if (
                    lower.includes('failed to decrypt incoming message') ||
                    lower.includes('sender key id mismatch') ||
                    lower.includes('invalid message mac') ||
                    lower.includes('decrypt_failed')
                ) {
                    return true;
                }
            } else if (arg && typeof arg === 'object') {
                try {
                    const str = JSON.stringify(arg).toLowerCase();
                    if (
                        str.includes('failed to decrypt incoming message') ||
                        str.includes('sender key id mismatch') ||
                        str.includes('invalid message mac') ||
                        str.includes('decrypt_failed')
                    ) {
                        return true;
                    }
                } catch {}
            }
        }
        return false;
    };

    console.warn = (...args: unknown[]) => {
        if (isSuppressed(args)) return;
        origWarn.apply(console, args);
    };

    console.error = (...args: unknown[]) => {
        if (isSuppressed(args)) return;
        origError.apply(console, args);
    };
}

setupConsoleFilter();

export class FilteredConsoleLogger extends ConsoleLogger {
    private shouldFilter(message: string, context?: Record<string, unknown>): boolean {
        if (message && typeof message === 'string') {
            const m = message.toLowerCase();
            if (m.includes('failed to decrypt incoming message') || m.includes('decrypt_failed')) {
                return true;
            }
        }
        if (context && typeof context === 'object') {
            try {
                const str = JSON.stringify(context).toLowerCase();
                if (
                    str.includes('failed to decrypt incoming message') ||
                    str.includes('sender key id mismatch') ||
                    str.includes('invalid message mac') ||
                    str.includes('decrypt_failed')
                ) {
                    return true;
                }
            } catch {}
        }
        return false;
    }

    public override trace(message: string, context?: Record<string, unknown>): void {
        if (this.shouldFilter(message, context)) return;
        super.trace(message, context);
    }

    public override debug(message: string, context?: Record<string, unknown>): void {
        if (this.shouldFilter(message, context)) return;
        super.debug(message, context);
    }

    public override info(message: string, context?: Record<string, unknown>): void {
        if (this.shouldFilter(message, context)) return;
        super.info(message, context);
    }

    public override warn(message: string, context?: Record<string, unknown>): void {
        if (this.shouldFilter(message, context)) return;
        super.warn(message, context);
    }

    public override error(message: string, context?: Record<string, unknown>): void {
        if (this.shouldFilter(message, context)) return;
        super.error(message, context);
    }

    public override child(
        bindings: Readonly<Record<string, unknown>>,
        options?: { readonly level?: LogLevel }
    ): WaLogger {
        const merged = (this as any).bindings ? { ...(this as any).bindings, ...bindings } : { ...bindings };
        return new FilteredConsoleLogger(options?.level ?? this.level, merged);
    }
}
