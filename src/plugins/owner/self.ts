import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['self'],
    category: 'owner',
    description: 'Mengubah mode bot menjadi self (hanya owner)',
    owner: true,
    execute: async (context: PluginContext): Promise<void> => {
        context.config.mode = 'self';
        context.db.setSetting('bot', 'mode', 'self');
        await context.reply('🔒 *Mode Bot Diubah!*\nStatus: *SELF*\n_Sekarang hanya Owner yang dapat menggunakan bot._');
    }
};

export default handler;
