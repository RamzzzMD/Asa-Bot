import type { Plugin, PluginContext } from '../../../types/plugin.js';
import {
    generateImage,
    imageToImage,
    editImage,
    faceSwap,
    humanize,
    optimizePrompt,
    downloadMedia
} from '../../../scrape/deepchat.js';

const handler: Plugin = {
    command: ['flux', 'txt2img', 'img2img', 'editimg', 'faceswap', 'humanize', 'optprompt'],
    category: 'ai',
    description: 'Flux Schnell Image Generator, Image-to-Image, Edit Image, Face Swap, AI Humanizer & Prompt Optimizer',
    execute: async (context: PluginContext): Promise<void> => {
        const cmd = context.command.toLowerCase();
        const text = context.text.trim();

        const quotedMsg =
            context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            (context.event as any)?.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            null;

        const quotedText =
            quotedMsg?.conversation ||
            quotedMsg?.extendedTextMessage?.text ||
            '';

        // 1. AI Humanizer
        if (cmd === 'humanize') {
            const targetText = text || quotedText.trim();
            if (!targetText) {
                await context.reply(
                    `✍️ *AI TEXT HUMANIZER*\n\n` +
                    `Mengubah teks buatan AI agar terdengar natural seperti tulisan manusia.\n\n` +
                    `📌 *Contoh:*\n` +
                    `› *${context.usedPrefix}humanize <teks>*\n` +
                    `› Atau reply teks dengan *${context.usedPrefix}humanize*`
                );
                return;
            }

            await context.reply(global.mess?.wait || '⏳ Sedang menghumanisasi teks...');
            try {
                const res = await humanize(targetText, { intensity: 'medium' });
                await context.reply(
                    `✍️ *HASIL AI HUMANIZER*\n` +
                    `• *Intensitas:* ${res.intensity}\n` +
                    `────────────────────\n\n` +
                    `${res.humanizedText}\n\n` +
                    `────────────────────\n` +
                    `_${context.config.botName} • AI Humanizer_`
                );
            } catch (err: any) {
                await context.reply(`❌ Gagal menghumanisasi teks: ${err.message || err}`);
            }
            return;
        }

        // 2. Prompt Optimizer
        if (cmd === 'optprompt') {
            const targetPrompt = text || quotedText.trim();
            if (!targetPrompt) {
                await context.reply(
                    `✨ *AI PROMPT OPTIMIZER*\n\n` +
                    `Memperluas dan mempertajam prompt sederhana menjadi prompt komprehensif.\n\n` +
                    `📌 *Contoh:*\n` +
                    `› *${context.usedPrefix}optprompt cyberpunk samurai in rain*`
                );
                return;
            }

            await context.reply(global.mess?.wait || '⏳ Sedang mengoptimalkan prompt...');
            try {
                const res = await optimizePrompt(targetPrompt, { context: 'image' });
                await context.client.sendMessage(
                    context.chatJid,
                    {
                        text:
                            `✨ *PROMPT OPTIMIZER*\n\n` +
                            `📌 *Prompt Awal:*\n${targetPrompt}\n\n` +
                            `🚀 *Prompt Optimal:*\n${res.optimizedPrompt}`,
                        footer: `${context.config.botName} • Prompt Optimizer`,
                        buttons: [
                            {
                                type: 'copy',
                                text: '📋 Salin Prompt',
                                copyCode: res.optimizedPrompt
                            }
                        ]
                    },
                    { quoted: context.raw }
                );
            } catch (err: any) {
                await context.reply(`❌ Gagal mengoptimalkan prompt: ${err.message || err}`);
            }
            return;
        }

        // Helper ambil gambar
        const isDirectImage = Boolean(context.event.message?.imageMessage);
        const isQuotedImage = Boolean(quotedMsg?.imageMessage);

        // 3. Face Swap
        if (cmd === 'faceswap') {
            let sourceInput: string | Buffer | null = null;
            let faceInput: string | Buffer | null = null;

            if (isDirectImage && isQuotedImage) {
                try {
                    sourceInput = await context.client.downloadMedia({ message: quotedMsg });
                    faceInput = await context.client.downloadMedia(context.event);
                } catch {}
            } else if (text.includes('|')) {
                const [u1, u2] = text.split('|').map((s) => s.trim());
                if (u1 && u2) {
                    sourceInput = u1;
                    faceInput = u2;
                }
            }

            if (!sourceInput || !faceInput) {
                await context.reply(
                    `🎭 *AI FACE SWAP*\n\n` +
                    `⚙️ *Cara Penggunaan:*\n` +
                    `1. Balas (reply) foto target dengan mengirim foto wajah sumber + caption *${context.usedPrefix}faceswap*\n` +
                    `2. Atau gunakan 2 URL gambar:\n` +
                    `   *${context.usedPrefix}faceswap <url_target>|<url_wajah>*`
                );
                return;
            }

            await context.reply(global.mess?.wait || '⏳ Sedang memproses Face Swap...');
            try {
                const res = await faceSwap(sourceInput, faceInput);
                const resultUrl = res.original || res.variant;
                if (!resultUrl) {
                    await context.reply('❌ Gagal mendapatkan gambar hasil Face Swap.');
                    return;
                }
                const imgBuf = resultUrl.startsWith('http')
                    ? await downloadMedia(resultUrl)
                    : Buffer.from(resultUrl.replace(/^data:image\/\w+;base64,/, ''), 'base64');

                await context.client.sendMessage(
                    context.chatJid,
                    {
                        image: imgBuf,
                        caption: `🎭 *AI FACE SWAP BERHASIL*\n\n_${context.config.botName} • Face Swap Engine_`
                    },
                    { quoted: context.raw }
                );
            } catch (err: any) {
                await context.reply(`❌ Gagal memproses Face Swap: ${err.message || err}`);
            }
            return;
        }

        // 4. Image-to-Image & Edit Image
        if (cmd === 'img2img' || cmd === 'editimg') {
            let imgBuffer: Buffer | null = null;
            if (isDirectImage) {
                try {
                    imgBuffer = await context.client.downloadMedia(context.event);
                } catch {}
            } else if (isQuotedImage) {
                try {
                    imgBuffer = await context.client.downloadMedia({ message: quotedMsg });
                } catch {}
            }

            const promptText = text || quotedText.trim();
            if (!imgBuffer || !promptText) {
                await context.reply(
                    `🎨 *${cmd === 'img2img' ? 'FLUX IMAGE-TO-IMAGE' : 'AI EDIT IMAGE'}*\n\n` +
                    `⚙️ *Cara Penggunaan:*\n` +
                    `› Kirim atau balas (reply) gambar dengan perintah:\n` +
                    `  *${context.usedPrefix}${cmd} <prompt perubahan>*\n\n` +
                    `📌 *Contoh:*\n` +
                    `› *${context.usedPrefix}${cmd} make it futuristic anime cyberpunk style*`
                );
                return;
            }

            await context.reply(global.mess?.wait || '⏳ Sedang memodifikasi gambar dengan AI...');
            try {
                const res =
                    cmd === 'img2img'
                        ? await imageToImage(promptText, imgBuffer)
                        : await editImage(promptText, imgBuffer);

                const firstImg = res.images?.[0];
                const imgUrl = typeof firstImg === 'string' ? firstImg : firstImg?.url || firstImg?.b64_json;
                if (!imgUrl) {
                    await context.reply('❌ Gagal menghasilkan gambar.');
                    return;
                }

                const outBuf = imgUrl.startsWith('http')
                    ? await downloadMedia(imgUrl)
                    : Buffer.from(imgUrl.replace(/^data:image\/\w+;base64,/, ''), 'base64');

                await context.client.sendMessage(
                    context.chatJid,
                    {
                        image: outBuf,
                        caption:
                            `🎨 *${cmd === 'img2img' ? 'FLUX IMAGE-TO-IMAGE' : 'AI IMAGE EDITOR'}*\n\n` +
                            `• *Prompt:* ${promptText}\n\n` +
                            `_${context.config.botName} • Flux Schnell_`
                    },
                    { quoted: context.raw }
                );
            } catch (err: any) {
                await context.reply(`❌ Gagal memproses gambar: ${err.message || err}`);
            }
            return;
        }

        // 5. Default: Text-to-Image (flux / txt2img)
        const prompt = text || quotedText.trim();
        if (!prompt) {
            await context.reply(
                `🎨 *FLUX SCHNELL IMAGE GENERATOR*\n\n` +
                `⚙️ *Cara Penggunaan:*\n` +
                `› *${context.usedPrefix}${cmd} <prompt gambar>*\n\n` +
                `📌 *Contoh:*\n` +
                `› *${context.usedPrefix}${cmd} cyberpunk samurai standing in the rain, neon lights, 4k*\n\n` +
                `💡 *Fitur Terkait:*\n` +
                `› *${context.usedPrefix}img2img* • *${context.usedPrefix}editimg* • *${context.usedPrefix}faceswap*\n` +
                `› *${context.usedPrefix}humanize* • *${context.usedPrefix}optprompt*`
            );
            return;
        }

        await context.reply(global.mess?.wait || '⏳ Sedang membuat gambar dengan Flux Schnell...');

        try {
            const res = await generateImage(prompt);
            const firstImg = res.images?.[0];
            const imgUrl = typeof firstImg === 'string' ? firstImg : firstImg?.url || firstImg?.b64_json;

            if (!imgUrl) {
                await context.reply('❌ Gagal membuat gambar dari prompt tersebut.');
                return;
            }

            const outBuf = imgUrl.startsWith('http')
                ? await downloadMedia(imgUrl)
                : Buffer.from(imgUrl.replace(/^data:image\/\w+;base64,/, ''), 'base64');

            await context.client.sendMessage(
                context.chatJid,
                {
                    image: outBuf,
                    caption:
                        `🎨 *FLUX SCHNELL GENERATOR*\n\n` +
                        `• *Prompt:* ${prompt}\n` +
                        `• *Model:* ${res.model || 'flux/schnell'}\n\n` +
                        `_${context.config.botName} • AI Image Generator_`
                },
                { quoted: context.raw }
            );
        } catch (err: any) {
            await context.reply(`❌ Gagal membuat gambar: ${err.message || err}`);
        }
    }
};

export default handler;

