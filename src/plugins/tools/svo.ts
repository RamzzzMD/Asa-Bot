import type { Plugin, PluginContext } from '../../../types/plugin.js';

function unwrapViewOnce(msg: any): any {
    let current = msg;
    if (!current || typeof current !== 'object') return null;
    if (current.viewOnceMessage) current = current.viewOnceMessage.message || current.viewOnceMessage;
    if (current.viewOnceMessageV2) current = current.viewOnceMessageV2.message || current.viewOnceMessageV2;
    if (current.viewOnceMessageV2Extension) current = current.viewOnceMessageV2Extension.message || current.viewOnceMessageV2Extension;
    return current;
}

const handler: Plugin = {
    command: ['svo'],
    category: 'tools',
    description: 'Mengirim media (gambar/video/audio) sebagai pesan sekali lihat (View Once)',
    execute: async (context: PluginContext): Promise<void> => {
        const rawQuoted =
            context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            (context.event as any)?.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            null;

        const hasDirectMedia = Boolean(
            context.event.message?.imageMessage ||
            context.event.message?.videoMessage ||
            context.event.message?.audioMessage
        );
        const hasQuotedMedia = Boolean(
            rawQuoted?.imageMessage ||
            rawQuoted?.videoMessage ||
            rawQuoted?.audioMessage ||
            rawQuoted?.viewOnceMessage ||
            rawQuoted?.viewOnceMessageV2 ||
            rawQuoted?.viewOnceMessageV2Extension
        );

        if (!hasDirectMedia && !hasQuotedMedia) {
            await context.reply(
                `👁️ *SEND VIEW ONCE (SVO)*\n\n` +
                `Mengubah gambar, video, atau audio menjadi pesan sekali lihat (View Once).\n\n` +
                `⚙️ *Cara Penggunaan:*\n` +
                `› Balas (quote) gambar/video/audio dengan: *${context.usedPrefix || '.'}${context.command} [caption]*\n` +
                `› Atau kirim media langsung dengan caption: *${context.usedPrefix || '.'}${context.command} [caption]*`
            );
            return;
        }

        await context.reply(global.mess?.wait || '⏳ Sedang memproses pesan sekali lihat...');

        try {
            let targetMediaSource: any = null;
            let mediaType: 'image' | 'video' | 'audio' = 'image';
            let defaultCaption = context.text.trim();

            if (hasDirectMedia) {
                targetMediaSource = context.event;
                if (context.event.message?.videoMessage) mediaType = 'video';
                else if (context.event.message?.audioMessage) mediaType = 'audio';
                else mediaType = 'image';
            } else {
                const innerMsg = unwrapViewOnce(rawQuoted);
                targetMediaSource = { message: innerMsg };
                if (innerMsg.videoMessage) {
                    mediaType = 'video';
                    if (!defaultCaption) defaultCaption = innerMsg.videoMessage.caption || '';
                } else if (innerMsg.audioMessage) {
                    mediaType = 'audio';
                } else if (innerMsg.imageMessage) {
                    mediaType = 'image';
                    if (!defaultCaption) defaultCaption = innerMsg.imageMessage.caption || '';
                }
            }

            const buffer = await context.client.downloadMedia(targetMediaSource);

            if (!buffer || buffer.length === 0) {
                await context.reply('❌ Gagal mengunduh media untuk dijadikan View Once.');
                return;
            }

            if (mediaType === 'image') {
                await context.client.sendMessage(
                    context.chatJid,
                    {
                        image: buffer,
                        caption: defaultCaption,
                        viewOnce: true
                    },
                    { quoted: context.raw as any }
                );
            } else if (mediaType === 'video') {
                await context.client.sendMessage(
                    context.chatJid,
                    {
                        video: buffer,
                        caption: defaultCaption,
                        viewOnce: true
                    },
                    { quoted: context.raw as any }
                );
            } else if (mediaType === 'audio') {
                await context.client.sendMessage(
                    context.chatJid,
                    {
                        audio: buffer,
                        ptt: true,
                        viewOnce: true
                    },
                    { quoted: context.raw as any }
                );
            }
        } catch (err: any) {
            console.error('[svo]', err);
            await context.reply(`❌ Gagal mengirim pesan sekali lihat: ${err.message || err}`);
        }
    }
};

export default handler;
