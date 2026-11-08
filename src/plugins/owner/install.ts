import { exec } from 'node:child_process';
import util from 'node:util';
import type { Plugin, PluginContext } from '../../../types/plugin.js';

const execPromise = util.promisify(exec);

const handler: Plugin = {
    command: ['install', 'npmi'],
    category: 'owner',
    description: 'Menginstall package npm ke dalam bot',
    owner: true,
    execute: async (context: PluginContext): Promise<void> => {
        const pkg = context.text.trim();
        if (!pkg) {
            await context.reply(`Contoh: *${context.usedPrefix}${context.command} axios*`);
            return;
        }

        await context.reply(`⏳ *Sedang menginstall package:* \`${pkg}\`...`);

        try {
            const { stdout, stderr } = await execPromise(`npm install ${pkg}`);
            const result = stdout || stderr || 'Berhasil.';
            await context.reply(`✅ *Install Sukses!*\n\`\`\`\n${result.slice(-500)}\n\`\`\``);
        } catch (err: any) {
            await context.reply(`❌ *Gagal Install:*\n${err.message}`);
        }
    }
};

export default handler;
