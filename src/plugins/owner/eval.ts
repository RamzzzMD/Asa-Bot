import { exec } from 'node:child_process';
import util from 'node:util';
import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { relayStore } from './crm.js';

function fixUnescapedNewlines(str: string): string {
    let out = '';
    let inSingle = false;
    let inDouble = false;
    for (let i = 0; i < str.length; i++) {
        const c = str[i];
        const prev = i > 0 ? str[i - 1] : '';
        if (c === '\'' && !inDouble && prev !== '\\') {
            inSingle = !inSingle;
            out += c;
        } else if (c === '"' && !inSingle && prev !== '\\') {
            inDouble = !inDouble;
            out += c;
        } else if ((c === '\n' || c === '\r') && (inSingle || inDouble)) {
            if (prev !== '\\') {
                out += '\\n';
            } else {
                out += c;
            }
        } else {
            out += c;
        }
    }
    return out;
}

async function sendFormattedOutput(
    context: PluginContext,
    output: unknown,
    lang = 'javascript',
    isError = false
): Promise<void> {
    let formatted: string;
    if (typeof output === 'string') {
        formatted = output;
    } else if (output === undefined) {
        formatted = 'undefined';
    } else {
        formatted = util.inspect(output, { depth: 3, maxArrayLength: 100, showHidden: false });
    }

    const lines = formatted.split(/\r?\n/);
    const lineCount = lines.length;

    // Jika panjang (> 1000 baris atau karakter > 50.000), kirim sebagai file.js
    if (lineCount > 1000 || formatted.length > 50000) {
        try {
            await (context.client as any).sendMessage(
                context.chatJid,
                {
                    document: Buffer.from(formatted, 'utf-8'),
                    filename: 'file.js',
                    mimetype: 'application/javascript',
                    caption: `📄 *Hasil ${isError ? 'Error' : 'Evaluasi'}* (${lineCount} baris, ${(Buffer.byteLength(formatted, 'utf-8') / 1024).toFixed(2)} KB)`
                },
                { quoted: context.raw }
            );
            return;
        } catch {
            // Fallback jika gagal kirim dokumen
        }
    }

    // Jika tidak sampai 1000 baris, kirim sebagai kode di chat dengan AI Rich + suggestions
    try {
        const client = context.client as any;
        if (typeof client.createAIRich === 'function') {
            const aiRich = client.createAIRich({
                title: isError ? 'Eval Error' : 'Eval Output',
                footer: `Enami Asa Ai • ${lineCount} baris`
            })
                .addCode(lang, formatted)
                .addSuggest([
                    'Lihat Menu',
                    'Ping Bot',
                    'Info Status'
                ]);

            await aiRich.send(context.chatJid, { quoted: context.raw });
            return;
        }
    } catch {
        // Fallback jika AI Rich gagal dikirim
    }

    const truncated = formatted.length > 20000 ? `${formatted.slice(0, 20000)}\n\n...(output terpotong)` : formatted;
    await context.reply(`\`\`\`${lang}\n${truncated}\n\`\`\``);
}

const handler: Plugin = {
    command: ['eval', '>', '=>', '$'],
    category: 'owner',
    description: 'Eksekusi JavaScript atau perintah shell',
    owner: true,
    execute: async (context: PluginContext): Promise<void> => {
        const text = context.text.trim();
        if (!text) {
            await context.reply('Masukkan kode JavaScript atau perintah shell yang ingin dijalankan.');
            return;
        }

        if (context.command === '$') {
            exec(text, { timeout: 60000, maxBuffer: 1024 * 1024 * 10 }, async (error, stdout, stderr) => {
                const output = (stdout || stderr || (error ? error.message : 'Perintah selesai tanpa output.')).trim();
                await sendFormattedOutput(context, output, 'bash', Boolean(error && !stdout));
            });
            return;
        }

        try {
            let result: unknown;
            const client = context.client;
            const conn = context.client;
            const sock = context.client;
            const event = context.event;
            const config = context.config;
            const db = context.db;
            const registry = context.registry;
            const reply = context.reply;
            const chatJid = context.chatJid;
            const from = context.from;
            const senderJid = context.senderJid;
            const raw = context.raw;
            const chat = context.chatJid;

            const quotedMsg =
                context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
                (context.raw as any)?.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
                null;

            // Enriched m object untuk support eksekusi hasil CRM dan kompatibilitas Baileys
            const m = Object.assign({}, context.event, {
                chat: context.chatJid,
                from: context.from,
                sender: context.senderJid,
                isGroup: context.isGroup,
                fromMe: context.event.key?.fromMe ?? false,
                id: context.event.key?.id ?? '',
                key: context.event.key,
                message: context.event.message,
                quoted: quotedMsg,
                reply: context.reply,
                text: context.text
            });

            const button = globalThis.button;
            const buttonv2 = globalThis.buttonv2;
            const coroseul = globalThis.coroseul;
            const location = globalThis.location;
            const thumb = globalThis.thumb;

            void client;
            void conn;
            void sock;
            void m;
            void event;
            void config;
            void db;
            void registry;
            void reply;
            void chatJid;
            void chat;
            void from;
            void senderJid;
            void raw;
            void relayStore;
            void button;
            void buttonv2;
            void coroseul;
            void location;
            void thumb;

            const sanitizedCode = fixUnescapedNewlines(text);
            const isAsync =
                context.command === '=>' ||
                sanitizedCode.includes('await ') ||
                sanitizedCode.trim().startsWith('return ');

            if (isAsync) {
                let code = sanitizedCode;
                if (!code.includes('return ')) {
                    if (code.trim().startsWith('await ')) {
                        code = `return ${code}`;
                    } else {
                        try {
                            new Function(`return (async () => { return (${code}) })()`);
                            code = `return (${code})`;
                        } catch {}
                    }
                }
                const asyncRunner = new Function(
                    'context',
                    'client',
                    'conn',
                    'sock',
                    'm',
                    'event',
                    'config',
                    'db',
                    'registry',
                    'reply',
                    'chatJid',
                    'chat',
                    'from',
                    'senderJid',
                    'raw',
                    'relayStore',
                    'button',
                    'buttonv2',
                    'coroseul',
                    'location',
                    'thumb',
                    'util',
                    `return (async () => { ${code} })()`
                );
                result = await asyncRunner(
                    context,
                    client,
                    conn,
                    sock,
                    m,
                    event,
                    config,
                    db,
                    registry,
                    reply,
                    chatJid,
                    chat,
                    from,
                    senderJid,
                    raw,
                    relayStore,
                    button,
                    buttonv2,
                    coroseul,
                    location,
                    thumb,
                    util
                );
            } else {
                result = eval(sanitizedCode);
                if (result instanceof Promise) {
                    result = await result;
                }
            }

            await sendFormattedOutput(context, result, 'javascript', false);
        } catch (error: any) {
            await sendFormattedOutput(context, error, 'javascript', true);
        }
    }
};

export default handler;
