import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['add'],
    category: 'group',
    description: 'Menambahkan anggota baru ke grup',
    group: true,
    admin: true,
    botadmin: true,
    execute: async (context: PluginContext): Promise<void> => {
        let nomor = context.text?.replace(/[^0-9]/g, '');

        const contextInfo = context.event.message?.extendedTextMessage?.contextInfo;
        if (contextInfo?.mentionedJid?.[0]) {
            nomor = contextInfo.mentionedJid[0].split('@')[0];
        } else if (contextInfo?.participant) {
            nomor = contextInfo.participant.split('@')[0];
        }

        if (!nomor || nomor.length < 8) {
            await context.reply(`Contoh: *${context.usedPrefix}${context.command} 628xxxx*`);
            return;
        }

        const target = nomor + '@s.whatsapp.net';

        try {
            await context.client.groupParticipantsUpdate(context.chatJid, [target], 'add');
            await context.reply(`✅ Berhasil menambahkan @${nomor}`);
        } catch (err) {
            console.error(err);
            await context.reply('❌ Gagal menambahkan. Nomor mungkin privat, tidak aktif, atau sudah di grup.');
        }
    }
};

export default handler;
