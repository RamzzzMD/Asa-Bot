import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['gconly', 'pconly'],
    category: 'owner',
    description: 'Mengatur bot hanya aktif di grup atau hanya di obrolan pribadi',
    owner: true,
    execute: async (context: PluginContext): Promise<void> => {
        const status = (context.args[0] || '').toLowerCase().trim();
        if (!['on', 'off'].includes(status)) {
            await context.reply(`Contoh: *${context.usedPrefix}${context.command} on/off*`);
            return;
        }

        const isEnable = status === 'on';

        if (context.command === 'gconly') {
            context.db.setSetting('bot', 'gconly', isEnable ? '1' : '0');
            if (isEnable) context.db.setSetting('bot', 'pconly', '0');
            await context.reply(`✅ *Mode Group-Only:* *${isEnable ? 'AKTIF' : 'NONAKTIF'}*`);
            return;
        }

        if (context.command === 'pconly') {
            context.db.setSetting('bot', 'pconly', isEnable ? '1' : '0');
            if (isEnable) context.db.setSetting('bot', 'gconly', '0');
            await context.reply(`✅ *Mode Private-Chat-Only:* *${isEnable ? 'AKTIF' : 'NONAKTIF'}*`);
            return;
        }
    }
};

export default handler;
