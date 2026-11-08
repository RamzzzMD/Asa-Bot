import { exec } from 'node:child_process';
import util from 'node:util';
import type { Plugin, PluginContext } from '../../../types/plugin.js';

const execPromise = util.promisify(exec);

const handler: Plugin = {
    command: ['uninstall', 'npmun'],
    category: 'owner',
    description: 'Menghapus package npm dari bot',
    owner: true,
    execute: async (context: PluginContext): Promise<void> => {
        const pkg = context.text.trim();
        if (!pkg) {
            await context.reply(`Contoh: *${context.usedPrefix}${context.command} axios*`);
            return;
        }

        await context.reply(`⏳ *Sedang menghapus package:* \`${pkg}\`...`);

        try {
            const { stdout, stderr } = await execPromise(`npm uninstall ${pkg}`);
            const result = stdout || stderr || 'Berhasil.';
            await context.reply(`✅ *Uninstall Sukses!*\n\`\`\`\n${result.slice(-500)}\n\`\`\``);
        } catch (err: any) {
            await context.reply(`❌ *Gagal Uninstall:*\n${err.message}`);
        }
    }
};

export default handler;
