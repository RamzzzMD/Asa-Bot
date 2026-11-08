import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['ping', 'p'],
    category: 'main',
    description: 'Mengecek kecepatan respon dan status aktif bot',
    owner: false,
    premium: false,
    group: false,
    private: false,
    admin: false,
    botadmin: false,
    execute: async (m: PluginContext): Promise<void> => {
        const start = Date.now();
        await m.reply(`Pong! 🏓 Latensi: ${Date.now() - start}ms`);
    }
};

export default handler;
