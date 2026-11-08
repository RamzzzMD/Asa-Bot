import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { chatDeepAI } from '../../../scrape/deepai.js';

const handler: Plugin = {
    command: ['deepai'],
    category: 'ai',
    description: 'Chat dengan DeepAI',
    execute: async (context: PluginContext): Promise<void> => {
        const prompt = context.text.trim();
        if (!prompt) {
            await context.reply(`Contoh: *${context.usedPrefix}${context.command} Siapa presiden pertama Indonesia?*`);
            return;
        }

        await context.reply(global.mess?.wait || '⏳ Sedang memproses jawaban...');

        try {
            const answer = await chatDeepAI(prompt);
            await context.reply(answer);
        } catch (err: any) {
            await context.reply(`❌ Terjadi kesalahan: ${err.message || 'Gagal terhubung ke DeepAI.'}`);
        }
    }
};

export default handler;
