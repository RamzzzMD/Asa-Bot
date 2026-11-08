import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['public'],
    category: 'owner',
    description: 'Mengubah mode bot menjadi public (semua pengguna)',
    owner: true,
    execute: async (context: PluginContext): Promise<void> => {
        context.config.mode = 'public';
        context.db.setSetting('bot', 'mode', 'public');
        await context.reply('🌐 *Mode Bot Diubah!*\nStatus: *PUBLIC*\n_Sekarang seluruh pengguna dapat menggunakan bot._');
    }
};

export default handler;
