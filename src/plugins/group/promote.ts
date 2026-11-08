import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['promote'],
    category: 'group',
    description: 'Menaikkan jabatan anggota menjadi admin grup',
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
            await context.client.groupParticipantsUpdate(context.chatJid, [target], 'promote');
            await context.reply(`✅ @${target.split('@')[0]} sekarang sudah menjadi admin grup!`);
        } catch (err) {
            console.error(err);
            await context.reply('❌ Gagal mempromosikan anggota!');
        }
    }
};

export default handler;
