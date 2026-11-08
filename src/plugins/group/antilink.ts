import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['antilink', 'antilinkgc'],
    category: 'group',
    description: 'Mengaktifkan atau mematikan fitur antilink grup',
    group: true,
    admin: true,
    botadmin: true,
    execute: async (context: PluginContext): Promise<void> => {
        const arg = (context.args[0] || '').toLowerCase().trim();

        if (arg === 'on' || arg === '1') {
            context.db.setSetting('group:' + context.chatJid, 'antilink', '1');
            await context.reply('🛡️ Fitur *Antilink* berhasil *diaktifkan* untuk grup ini!');
            return;
        }

        if (arg === 'off' || arg === '0') {
            context.db.setSetting('group:' + context.chatJid, 'antilink', '0');
            await context.reply('⚪ Fitur *Antilink* berhasil *dinonaktifkan* untuk grup ini.');
            return;
        }

        const current = context.db.getSetting('group:' + context.chatJid, 'antilink') === '1' ? 'ON' : 'OFF';

        await context.reply(
            `*Pengaturan Antilink Grup*\n` +
            `• Status saat ini: *${current}*\n\n` +
            `Cara pakai:\n` +
            `› *${context.usedPrefix}${context.command} on*\n` +
            `› *${context.usedPrefix}${context.command} off*`
        );
    }
};

export default handler;
