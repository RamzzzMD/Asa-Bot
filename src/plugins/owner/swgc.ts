import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['swgc'],
    category: 'owner',
    description: 'Mengirim status/story WhatsApp ke grup',
    owner: true,
    execute: async (context: PluginContext): Promise<void> => {
        const text = context.text.trim();
        const quoted = context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!text && !quoted) {
            await context.reply(
                `*Contoh Penggunaan:*\n` +
                `› *${context.usedPrefix}${context.command} Pesan Story*\n` +
                `› Atau reply gambar/video dengan *${context.usedPrefix}${context.command}*' (opsional caption)`
            );
            return;
        }

        const targetJid = context.chatJid;

        try {
            if (quoted?.imageMessage || quoted?.videoMessage) {
                const buffer = await context.client.downloadMedia(quoted);
                if (quoted.imageMessage) {
                    await context.client.sendMessage(targetJid, {
                        image: buffer,
                        text: text || quoted.imageMessage.caption || ''
                    });
                } else if (quoted.videoMessage) {
                    await context.client.sendMessage(targetJid, {
                        video: buffer,
                        text: text || quoted.videoMessage.caption || ''
                    });
                }
                await context.reply('✅ Berhasil mengirim media status ke grup!');
                return;
            }

            await context.client.sendMessage(targetJid, {
                text: text || 'Group Status'
            });

            await context.reply('✅ Berhasil mengirim status teks ke grup!');
        } catch (err: any) {
            console.error(err);
            await context.reply(`❌ Gagal mengirim story grup: ${err.message}`);
        }
    }
};

export default handler;
