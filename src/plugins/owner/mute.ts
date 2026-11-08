import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['mute', 'unmute'],
    category: 'owner',
    description: 'Membisukan atau mengaktifkan respon bot di grup',
    owner: true,
    group: true,
    execute: async (context: PluginContext): Promise<void> => {
        if (context.command === 'mute') {
            context.db.setSetting('group:' + context.chatJid, 'mute', '1');
            await context.reply('🔇 Bot *dibisukan* di grup ini.');
            return;
        }

        if (context.command === 'unmute') {
            context.db.setSetting('group:' + context.chatJid, 'mute', '0');
            await context.reply('🔊 Bot *diaktifkan kembali* di grup ini.');
            return;
        }
    }
};

export default handler;
