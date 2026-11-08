import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { chatgpt } from '../../../scrape/chatgpt.js';

const handler: Plugin = {
    command: ['chatgpt'],
    category: 'ai',
    description: 'Chat dengan ChatGPT',
    execute: async (context: PluginContext): Promise<void> => {
        const prompt = context.text.trim();
        if (!prompt) {
            await context.reply(`Contoh: *${context.usedPrefix}${context.command} Jelaskan apa itu kuantum komputasi*`);
            return;
        }

        await context.reply(global.mess?.wait || '⏳ Sedang memproses jawaban ChatGPT...');

        try {
            const res = await chatgpt(prompt);
            if (!res.ok || !res.answer) {
                await context.reply(`❌ Gagal mendapatkan jawaban dari ChatGPT (${res.stage || 'unknown error'}).`);
                return;
            }

            await context.reply(res.answer.trim());
        } catch (err: any) {
            await context.reply(`❌ Terjadi kesalahan: ${err.message || 'Gagal terhubung ke ChatGPT.'}`);
        }
    }
};

export default handler;
