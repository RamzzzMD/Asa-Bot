import crypto from 'node:crypto';
import type { Plugin, PluginContext } from '../../../types/plugin.js';

export const relayStore: Record<string, string> = {};

const handler: Plugin = {
    command: ['crm', 'relay', 'evalrelay'],
    category: 'owner',
    description: 'Inspect dan generate kode relayMessage dari pesan yang di-reply',
    owner: true,
    execute: async (context: PluginContext): Promise<void> => {
        if (context.command === 'evalrelay') {
            const id = context.args[0];
            const code = relayStore[id];
            if (!code) {
                await context.reply('❌ Kode relay tidak ditemukan atau sudah kadaluarsa.');
                return;
            }
            try {
                const quotedMsg =
                    context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
                    (context.raw as any)?.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
                    null;
                const m = Object.assign({}, context.raw, {
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
                // eslint-disable-next-line @typescript-eslint/no-implied-eval
                const fn = new Function('sock', 'm', 'context', `return (async () => { ${code} })()`);
                await fn(context.client, m, context);
                await context.reply('✅ Kode relay berhasil dieksekusi!');
            } catch (err: any) {
                await context.reply(`❌ Error eksekusi relay: ${err.message}`);
            }
            return;
        }

        const quoted = context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted) {
            await context.reply('Reply pesan yang ingin di-inspect / di-generate kode relay-nya!');
            return;
        }

        const msgType = Object.keys(quoted)[0] || 'unknown';
        const relayId = crypto.randomBytes(4).toString('hex');
        const quotedStr = JSON.stringify(quoted, null, 2);

        const relayCode = `await sock.relayMessage(
  m.chat,
  ${quotedStr},
  {}
)`.trim();

        relayStore[relayId] = relayCode;

        await context.client.sendMessage(context.chatJid, {
            text:
                `🔍 *Inspect Pesan Relay*\n` +
                `• Tipe Pesan: *${msgType}*\n` +
                `• ID Relay: \`${relayId}\`\n\n` +
                `\`\`\`json\n${quotedStr.slice(0, 800)}\n\`\`\``,
            buttons: [
                {
                    type: 'copy',
                    text: 'Copy Relay Code',
                    copyCode: relayCode
                },
                {
                    type: 'reply',
                    id: `${context.usedPrefix}evalrelay ${relayId}`,
                    text: 'Eksekusi Relay'
                }
            ]
        }, { quoted: context.raw });
    }
};

export default handler;
