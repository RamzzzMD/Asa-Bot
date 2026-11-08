import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['demote', 'dm'],
    category: 'group',
    description: 'Menurunkan jabatan admin menjadi anggota biasa',
    group: true,
    admin: true,
    botadmin: true,
    execute: async (context: PluginContext): Promise<void> => {
        let target: string | undefined;

        const contextInfo = context.event.message?.extendedTextMessage?.contextInfo;
        if (contextInfo?.mentionedJid?.[0]) {
            target = contextInfo.mentionedJid[0];
        } else if (contextInfo?.participant) {
            target = contextInfo.participant;
        } else if (context.text) {
            const clean = context.text.replace(/[^0-9]/g, '');
            if (clean.length >= 5) {
                target = clean + '@s.whatsapp.net';
            }
        }

        if (!target) {
            await context.reply(`Contoh: *${context.usedPrefix}${context.command} tag/reply/nomor*`);
            return;
        }

        try {
            await context.client.groupParticipantsUpdate(context.chatJid, [target], 'demote');
            await context.reply(`✅ @${target.split('@')[0]} sudah diturunkan dari admin.`);
        } catch (err) {
            console.error(err);
            await context.reply('❌ Gagal menurunkan jabatan admin!');
        }
    }
};

export default handler;
