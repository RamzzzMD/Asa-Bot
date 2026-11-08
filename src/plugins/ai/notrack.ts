import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { notrackChat } from '../../../scrape/notrack.js';

const handler: Plugin = {
    command: ['notrack'],
    category: 'ai',
    description: 'Chat dengan NoTrack AI',
    execute: async (context: PluginContext): Promise<void> => {
        const prompt = context.text.trim();
        if (!prompt) {
            await context.reply(`Contoh: *${context.usedPrefix}${context.command} Halo siapa kamu?*`);
            return;
        }

        await context.reply(global.mess?.wait || '⏳ Sedang memproses jawaban NoTrack AI...');

        try {
            const res = await notrackChat({ prompt });
            await context.reply(res.result);
        } catch (err: any) {
            await context.reply(`❌ Terjadi kesalahan: ${err.message || 'Gagal terhubung ke NoTrack AI.'}`);
        }
    }
};

export default handler;
