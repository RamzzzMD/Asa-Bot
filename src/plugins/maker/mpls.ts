import axios from 'axios';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import type { Plugin, PluginContext } from '../../../types/plugin.js';

const FRAME_URL = 'https://files.clugx.my.id/ehmVW.png';
let cachedFrameBuffer: Buffer | null = null;

const handler: Plugin = {
    command: ['mpls'],
    category: 'maker',
    description: 'Menambahkan twibbon / frame MPLS pada foto',
    owner: false,
    premium: false,
    group: false,
    private: false,
    admin: false,
    botadmin: false,
    execute: async (context: PluginContext): Promise<void> => {
        const quotedMsg = context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const targetMessage = quotedMsg || context.event.message;
        const isImage = Boolean(targetMessage?.imageMessage);

        if (!isImage) {
            await context.reply(`Reply atau kirim foto dengan caption *${context.usedPrefix || '.'}${context.command}*`);
            return;
        }

        await context.reply(global.mess.wait);

        try {
            const userBuf = await context.client.downloadMedia(targetMessage);
            if (!userBuf || userBuf.length === 0) {
                throw new Error('Gagal mengunduh gambar.');
            }

            if (!cachedFrameBuffer) {
                const frameRes = await axios.get(FRAME_URL, { responseType: 'arraybuffer', timeout: 30000 });
                cachedFrameBuffer = Buffer.from(frameRes.data);
            }

            const [userImg, frameImg] = await Promise.all([
                loadImage(userBuf),
                loadImage(cachedFrameBuffer)
            ]);

            const canvas = createCanvas(1080, 1080);
            const ctx = canvas.getContext('2d');

            ctx.drawImage(userImg, 0, 0, 1080, 1080);
            ctx.drawImage(frameImg, 0, 0, 1080, 1080);

            const resultBuffer = canvas.toBuffer('image/png');

            await context.client.sendMessage(
                context.chatJid,
                {
                    image: resultBuffer,
                    text: '🎒 *MPLS TWIBBON*'
                },
                { quoted: context.raw }
            );
        } catch (err: any) {
            await context.reply(`❌ Gagal membuat MPLS: ${err.message || err}`);
        }
    }
};

export default handler;
