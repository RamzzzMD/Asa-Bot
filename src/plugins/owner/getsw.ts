import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['getsw', 'gsw'],
    category: 'owner',
    description: 'Mengambil dan meneruskan media status/story WhatsApp yang di-reply',
    owner: true,
    execute: async (context: PluginContext): Promise<void> => {
        const quotedMsg = context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMsg) {
            await context.reply('Reply story/status yang ingin diambil!');
            return;
        }

        try {
            let content: any = quotedMsg;
            if (quotedMsg.groupStatusMessageV2) {
                content = (quotedMsg as any).groupStatusMessageV2.message;
            }

            const type = Object.keys(content)[0];
            if (content?.[type]?.contextInfo) {
                delete content[type].contextInfo;
            }

            await context.client.relayMessage(context.chatJid, content, {});
            await context.reply('✅ Berhasil mengambil story!');
        } catch (err: any) {
            console.error(err);
            await context.reply(`❌ Gagal mengambil story: ${err.message}`);
        }
    }
};

export default handler;
