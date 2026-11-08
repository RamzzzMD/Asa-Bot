import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { bypassSubUnlock } from '../../../scrape/subunlock.js';

const handler: Plugin = {
    command: ['sub2unlock'],
    category: 'bypass',
    description: 'Bypass link locker Sub2Unlock langsung ke destination URL',
    execute: async (context: PluginContext): Promise<void> => {
        let inputUrl = context.text.trim();

        if (!inputUrl) {
            const quotedText =
                context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
                context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text;

            if (quotedText) {
                const match = quotedText.match(/https?:\/\/[^\s]+/i);
                if (match) {
                    inputUrl = match[0];
                }
            }
        }

        if (!inputUrl) {
            await context.reply(
                `🔓 *SUB2UNLOCK BYPASSER*\n\n` +
                `Bypass link locker Sub2Unlock tanpa harus subscribe/like.\n\n` +
                `⚙️ *Format Penggunaan:*\n` +
                `› *${context.usedPrefix || '.'}${context.command} <url>*\n\n` +
                `📌 *Contoh:*\n` +
                `› *${context.usedPrefix || '.'}${context.command} https://sub2unlock.net/...*`
            );
            return;
        }

        const urlMatch = inputUrl.match(/https?:\/\/[^\s]+/i);
        const targetUrl = urlMatch ? urlMatch[0] : inputUrl;

        await context.reply(global.mess?.wait || '⏳ Sedang mem-bypass link sub2unlock...');

        try {
            const result = await bypassSubUnlock(targetUrl);

            const caption =
                `🔓 *SUB2UNLOCK BYPASSER SUKSES*\n\n` +
                `🌐 *Platform:* ${result.service}\n` +
                `🔗 *Origin URL:*\n${result.originalUrl}\n\n` +
                `🎯 *Destination URL:*\n${result.destinationUrl}\n\n` +
                `_Tautan tujuan berhasil dibuka langsung tanpa harus subscribe._`;

            await context.reply(caption);
        } catch (err: any) {
            console.error('[sub2unlock]', err);
            await context.reply(`❌ *Gagal Bypass:*\n${err.message || err}`);
        }
    }
};

export default handler;
