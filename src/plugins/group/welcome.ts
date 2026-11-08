import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['welcome'],
    category: 'group',
    description: 'Mengaktifkan atau mematikan pesan sambutan anggota baru',
    group: true,
    admin: true,
    execute: async (context: PluginContext): Promise<void> => {
        const arg = (context.args[0] || '').toLowerCase().trim();

        if (arg === 'on' || arg === '1') {
            context.db.setSetting('group:' + context.chatJid, 'welcome', '1');
            await context.reply('🎉 Fitur *Welcome* berhasil *diaktifkan* untuk grup ini!');
            return;
        }

        if (arg === 'off' || arg === '0') {
            context.db.setSetting('group:' + context.chatJid, 'welcome', '0');
            await context.reply('⚪ Fitur *Welcome* berhasil *dinonaktifkan* untuk grup ini.');
            return;
        }

        const current = context.db.getSetting('group:' + context.chatJid, 'welcome') === '1' ? 'ON' : 'OFF';

        await context.reply(
            `*Pengaturan Welcome Grup*\n` +
            `• Status saat ini: *${current}*\n\n` +
            `Cara pakai:\n` +
            `› *${context.usedPrefix}${context.command} on*\n` +
            `› *${context.usedPrefix}${context.command} off*`
        );
    }
};

export default handler;
