import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { bypassSfl } from '../../../scrape/sfl.js';

const handler: Plugin = {
    command: ['sfl', 'bypasssfl', 'safelinku'],
    category: 'bypass',
    description: 'Bypass shortlink SafelinkU / sfl.gl untuk mendapatkan real destination URL',
    owner: false,
    premium: false,
    group: false,
    private: false,
    admin: false,
    botadmin: false,
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
                `*Format Penggunaan:*\n` +
                `› *${context.usedPrefix || ''}${context.command} https://sfl.gl/ajGN1tr*`
            );
            return;
        }

        const urlMatch = inputUrl.match(/https?:\/\/[^\s]+/i);
        const targetUrl = urlMatch ? urlMatch[0] : inputUrl;

        await context.reply(global.mess.wait);

        try {
            const result = await bypassSfl(targetUrl);
            const footerText =
                `*Origin URL:*\n${result.originalUrl}\n\n` +
                `*Destination:*\n${result.destinationUrl}`;

            // Kirim sebagai full footer (caption masuk ke footer tanpa button)
            if (global.button && typeof global.button.send === 'function') {
                try {
                    await global.button.send(context, {
                        text: '',
                        footer: footerText,
                        buttons: []
                    }, { quote: context.raw as any });
                    return;
                } catch {
                    // Fallback jika button helper gagal
                }
            }

            const client = context.client as any;
            if (typeof client.sendButtons === 'function') {
                try {
                    await client.sendButtons(
                        context.chatJid,
                        {
                            text: '',
                            footer: footerText,
                            buttons: []
                        },
                        { quoted: context.raw }
                    );
                    return;
                } catch {
                    // Fallback
                }
            }

            await context.reply(footerText);
        } catch (error: any) {
            await context.reply(`❌ *Gagal bypass:* ${error?.message || 'Link tidak valid atau expired'}`);
        }
    }
};

export default handler;
