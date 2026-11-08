import { spawn } from 'node:child_process';
import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['restart', 'rst'],
    category: 'owner',
    description: 'Merestart proses bot',
    owner: true,
    execute: async (context: PluginContext): Promise<void> => {
        await context.reply(`🔄 \`\`\`Merestart bot ${context.config.botName}...\`\`\``);

        setTimeout(() => {
            const newProcess = spawn(process.argv[0], process.argv.slice(1), {
                detached: true,
                stdio: 'inherit'
            });
            newProcess.unref();
            process.exit(0);
        }, 1500);
    }
};

export default handler;
