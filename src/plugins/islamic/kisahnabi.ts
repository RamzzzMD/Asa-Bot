import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { fetchKisahNabi, LIST_25_NABI } from '../../../scrape/kisahnabi.js';

const handler: Plugin = {
    command: ['kisahnabi', 'nabi'],
    category: 'islamic',
    description: 'Kisah 25 Nabi dan Rasul lengkap dengan sejarah dan riwayatnya',
    execute: async (context: PluginContext): Promise<void> => {
        let text = context.text.trim();

        if (!text) {
            const quotedText =
                context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
                context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text;

            if (quotedText) {
                text = quotedText.trim();
            }
        }

        if (!text || text.toLowerCase() === 'list') {
            const listFormatted = LIST_25_NABI.map((n, i) => `*${i + 1}.* ${n.charAt(0).toUpperCase() + n.slice(1)}`).join('\n');
            await context.reply(
                `> 💡 *Masukkan nama nabi*\n` +
                `> Contoh: \`${context.usedPrefix || '.'}${context.command} adam\`\n\n` +
                `📜 *Daftar 25 Nabi & Rasul:*\n${listFormatted}`
            );
            return;
        }

        await context.reply(global.mess?.wait || '⏳ Sedang mencari kisah nabi...');

        try {
            const kisah = await fetchKisahNabi(text);

            const hasil =
                `> 👳 *Nabi*: ${kisah.name}\n` +
                `> 📅 *Lahir*: ${kisah.thn_kelahiran || '-'}\n` +
                `> 📍 *Tempat*: ${kisah.tmp || '-'}\n` +
                `> 📊 *Usia*: ${kisah.usia || '-'}\n\n` +
                `*— — — — — [ K I S A H ] — — — — —*\n\n` +
                `${kisah.description}`;

            await context.client.sendMessage(
                context.chatJid,
                {
                    text: hasil
                },
                {
                    quoted: context.raw as any
                }
            );
        } catch {
            await context.reply(
                `> ❌ *Not Found*\n` +
                `> _Tips: Gunakan nama salah satu dari 25 nabi (contoh: adam, muhammad, isa, musa)_`
            );
        }
    }
};

export default handler;
