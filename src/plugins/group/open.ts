import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['open', 'buka', 'close', 'tutup'],
    category: 'group',
    description: 'Membuka atau menutup izin kirim pesan di grup',
    group: true,
    admin: true,
    botadmin: true,
    execute: async (context: PluginContext): Promise<void> => {
        const cmd = context.command.toLowerCase();

        if (cmd === 'open' || cmd === 'buka') {
            await context.client.groupSettingUpdate(context.chatJid, 'not_announcement');
            await context.reply('🔓 *Grup Dibuka!* Semua member sekarang dapat mengirim pesan.');
            return;
        }

        if (cmd === 'close' || cmd === 'tutup') {
            await context.client.groupSettingUpdate(context.chatJid, 'announcement');
            await context.reply('🔒 *Grup Ditutup!* Hanya admin yang dapat mengirim pesan.');
            return;
        }
    }
};

export default handler;
