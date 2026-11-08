import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { DeepSeekThinking } from '../../../scrape/deepseek.js';

const handler: Plugin = {
    command: ['deepseek'],
    category: 'ai',
    description: 'Chat dengan DeepSeek AI',
    execute: async (context: PluginContext): Promise<void> => {
        const prompt = context.text.trim();
        if (!prompt) {
            await context.reply(`Contoh: *${context.usedPrefix}${context.command} Berikan analogi sederhana teori relativitas Einstein*`);
            return;
        }

        await context.reply(global.mess?.wait || '⏳ Sedang memproses penalaran DeepSeek AI...');

        try {
            const res = await DeepSeekThinking(prompt);
            if (!res.success || !res.answer) {
                await context.reply(res.error || '❌ Gagal mendapatkan respon dari DeepSeek.');
                return;
            }

            let responseText = res.answer.trim();
            if (res.reasoning && res.reasoning.trim()) {
                responseText = `🧠 *Reasoning:*\n_${res.reasoning.trim()}_\n\n────────────────────\n\n${responseText}`;
            }

            await context.reply(responseText);
        } catch (err: any) {
            await context.reply(`❌ Terjadi kesalahan: ${err.message || 'Gagal terhubung ke DeepSeek.'}`);
        }
    }
};

export default handler;
