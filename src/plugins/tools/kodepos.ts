import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { scrapeKodepos } from '../../../scrape/kodepos.js';

const handler: Plugin = {
    command: ['kodepos'],
    category: 'tools',
    description: 'Cari kode pos seluruh Indonesia dari Pos Indonesia',
    execute: async (context: PluginContext): Promise<void> => {
        const query = context.text.trim();
        if (!query) {
            await context.reply(`Contoh: *${context.usedPrefix}${context.command} Gambir* atau *${context.usedPrefix}${context.command} 10110*`);
            return;
        }

        await context.reply(global.mess?.wait || '⏳ Sedang mencari kode pos...');

        try {
            const results = await scrapeKodepos(query);
            if (!results || results.length === 0) {
                await context.reply(`❌ Data kode pos untuk *"${query}"* tidak ditemukan.`);
                return;
            }

            const total = results.length;
            const displayResults = results.slice(0, 15);

            let message = `📮 *PENCARIAN KODE POS INDONESIA*\n`;
            message += `🔍 *Keyword:* ${query}\n`;
            message += `📊 *Ditemukan:* ${total} data${total > 15 ? ' (menampilkan 15 teratas)' : ''}\n\n`;

            displayResults.forEach((item, index) => {
                message += `*${index + 1}. ${item.desa.toUpperCase()}* (${item.kodepos})\n`;
                message += `   • *Kecamatan:* ${item.kecamatan}\n`;
                message += `   • *Kota/Kab:* ${item.kota}\n`;
                message += `   • *Provinsi:* ${item.provinsi}\n\n`;
            });

            message += `_Enami Asa Ai - Pos Indonesia Scraper_`;

            await context.reply(message.trim());
        } catch (err: any) {
            await context.reply(`❌ Terjadi kesalahan: ${err.message || 'Gagal mencari kode pos.'}`);
        }
    }
};

export default handler;
