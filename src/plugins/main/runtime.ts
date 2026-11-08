import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { formatDuration } from '../../lib/utils.js';

export const runtimePlugin: Plugin = {
    name: 'runtime',
    category: 'main',
    description: 'Menampilkan durasi aktif sistem bot',
    commands: ['runtime', 'uptime'],
    execute: async (context: PluginContext): Promise<void> => {
        const uptime = process.uptime();
        const formatted = formatDuration(uptime);
        await context.reply(`⏱️ *Runtime ${context.config.botName}*\nBot telah aktif selama: *${formatted}*`);
    }
};

export default runtimePlugin;
