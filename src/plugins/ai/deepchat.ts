import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { chat } from '../../../scrape/deepchat.js';

interface ProviderPreset {
    readonly providerId: string;
    readonly modelId: string;
    readonly label: string;
}

const PRESETS: Record<string, ProviderPreset> = {
    deepchat: { providerId: 'chatgpt', modelId: 'gpt-4o-mini', label: 'DeepChat GPT-4o Mini' },
    gpt4: { providerId: 'chatgpt', modelId: 'gpt-4.1', label: 'ChatGPT 4.1 PRO' },
    claude: { providerId: 'claude', modelId: 'claude-opus-4-7', label: 'Claude Opus 4.7 PRO' },
    gemini: { providerId: 'gemini', modelId: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    kimi: { providerId: 'kimi', modelId: 'kimi-k3', label: 'Kimi K3 AI' },
    grok: { providerId: 'grok', modelId: 'grok-3', label: 'Grok AI' },
    perplexity: { providerId: 'perplexity', modelId: 'sonar-pro', label: 'Perplexity Sonar Pro' }
};

const handler: Plugin = {
    command: ['deepchat', 'gpt4', 'claude', 'gemini', 'kimi', 'grok', 'perplexity'],
    category: 'ai',
    description: 'Multi-Provider AI Chat & Vision (GPT-4.1, Claude Opus 4.7, Gemini 2.5 Pro, Kimi, Grok, Perplexity)',
    execute: async (context: PluginContext): Promise<void> => {
        const preset = PRESETS[context.command] || PRESETS.deepchat;

        const quotedMsg =
            context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            (context.event as any)?.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            null;

        const quotedText =
            quotedMsg?.conversation ||
            quotedMsg?.extendedTextMessage?.text ||
            quotedMsg?.imageMessage?.caption ||
            '';

        let rawPrompt = context.text.trim();
        if (!rawPrompt && quotedText) {
            rawPrompt = quotedText.trim();
        }

        // Check for optional flags: --think, --research, --code
        let deepThink = false;
        let deepResearch = false;
        let writeCode = false;

        if (/\B--think\b/i.test(rawPrompt)) {
            deepThink = true;
            rawPrompt = rawPrompt.replace(/\B--think\b/gi, '').trim();
        }
        if (/\B--research\b/i.test(rawPrompt)) {
            deepResearch = true;
            rawPrompt = rawPrompt.replace(/\B--research\b/gi, '').trim();
        }
        if (/\B--code\b/i.test(rawPrompt)) {
            writeCode = true;
            rawPrompt = rawPrompt.replace(/\B--code\b/gi, '').trim();
        }

        // Check for direct or quoted image (Vision support)
        const isDirectImage = Boolean(context.event.message?.imageMessage);
        const isQuotedImage = Boolean(quotedMsg?.imageMessage);
        let imageBuffer: Buffer | null = null;

        if (isDirectImage) {
            try {
                imageBuffer = await context.client.downloadMedia(context.event);
            } catch {
                imageBuffer = null;
            }
        } else if (isQuotedImage) {
            try {
                imageBuffer = await context.client.downloadMedia({ message: quotedMsg });
            } catch {
                imageBuffer = null;
            }
        }

        if (!rawPrompt && imageBuffer) {
            rawPrompt = 'Deskripsikan dan analisis isi gambar ini secara detail dalam Bahasa Indonesia.';
        }

        if (!rawPrompt) {
            await context.reply(
                `🤖 *${preset.label.toUpperCase()}*\n\n` +
                `⚙️ *Cara Penggunaan:*\n` +
                `› *${context.usedPrefix}${context.command} <pertanyaan>*\n` +
                `› Kirim/Reply gambar dengan *${context.usedPrefix}${context.command} <pertanyaan>* untuk fitur Vision\n\n` +
                `💡 *Opsi Mode Tambahan:*\n` +
                `› Tambahkan \`--think\` untuk mode Reasoning\n` +
                `› Tambahkan \`--research\` untuk mode Deep Research\n` +
                `› Tambahkan \`--code\` untuk mode Coding\n\n` +
                `🌐 *Model Tersedia:*\n` +
                `› *${context.usedPrefix}gpt4* • *${context.usedPrefix}claude* • *${context.usedPrefix}gemini*\n` +
                `› *${context.usedPrefix}kimi* • *${context.usedPrefix}grok* • *${context.usedPrefix}perplexity*`
            );
            return;
        }

        await context.reply(global.mess?.wait || `⏳ Sedang menghubungi *${preset.label}*...`);

        try {
            const res = await chat(rawPrompt, {
                providerId: preset.providerId,
                modelId: preset.modelId,
                deepThink,
                deepResearch,
                writeCode,
                ...(imageBuffer ? { image: imageBuffer } : {})
            });

            if (!res.reply) {
                await context.reply(`❌ Tidak ada respon dari *${preset.label}*.`);
                return;
            }

            const output =
                `🤖 *${preset.label}*\n` +
                `────────────────────\n` +
                `${res.reply.trim()}\n` +
                `────────────────────\n` +
                `_${context.config.botName} • Model: ${res.model || preset.modelId}_`;

            await context.reply(output);
        } catch (err: any) {
            await context.reply(`❌ Gagal memproses permintaan *${preset.label}*: ${err.message || err}`);
        }
    }
};

export default handler;

