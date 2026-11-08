import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { searchPrompt } from '../../../scrape/prompthero.js';

const handler: Plugin = {
    command: ['prompthero'],
    category: 'ai',
    description: 'Cari inspirasi prompt AI art dari PromptHero',
    execute: async (context: PluginContext): Promise<void> => {
        const query = context.text.trim();
        if (!query) {
            await context.reply(`Contoh: *${context.usedPrefix}${context.command} anime girl cyberpunk*`);
            return;
        }

        await context.reply(global.mess?.wait || '⏳ Sedang mencari inspirasi prompt...');

        try {
            const data = await searchPrompt(query);
            if (!data.hasil || data.hasil.length === 0) {
                await context.reply(`❌ Prompt untuk *"${query}"* tidak ditemukan.`);
                return;
            }

            const total = data.hasil.length;
            const display = data.hasil.slice(0, 5);

            let message = `🎨 *PROMPTHERO SEARCH*\n`;
            message += `🔍 *Keyword:* ${query}\n`;
            message += `📊 *Total:* ${total} prompt ditemukan\n\n`;

            display.forEach((item, index) => {
                message += `*#${index + 1}. ${item.judul}*\n`;
                message += `• *Model:* ${item.model} ${item.versi || ''}\n`;
                message += `• *Kategori:* ${item.kategori}\n`;
                message += `• *Prompt:*\n\`\`\`${item.prompt}\`\`\`\n`;
                if (item.url) message += `🔗 ${item.url}\n`;
                message += `\n`;
            });

            message += `_Enami Asa Ai - PromptHero_`;

            const firstImage = display.find(d => d.gambar)?.gambar;
            if (firstImage) {
                await context.client.sendMessage(
                    context.chatJid,
                    {
                        image: { url: firstImage },
                        caption: message.trim()
                    },
                    { quoted: context.raw }
                );
            } else {
                await context.reply(message.trim());
            }
        } catch (err: any) {
            await context.reply(`❌ Terjadi kesalahan: ${err.message || 'Gagal mencari prompt.'}`);
        }
    }
};

export default handler;
