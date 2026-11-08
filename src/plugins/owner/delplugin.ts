import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['delplugin', 'delp', 'dp'],
    category: 'owner',
    description: 'Menghapus file plugin dari bot',
    owner: true,
    execute: async (context: PluginContext): Promise<void> => {
        const input = context.text.trim();
        if (!input) {
            await context.reply(`Contoh: *${context.usedPrefix}${context.command} group/kick.ts*`);
            return;
        }

        const relInput = input.endsWith('.ts') || input.endsWith('.js') ? input : `${input}.ts`;
        const baseDir = path.resolve('src/plugins');
        const targetPath = path.resolve(baseDir, relInput);

        if (!targetPath.startsWith(baseDir)) {
            await context.reply('❌ Path tidak valid.');
            return;
        }

        if (!fs.existsSync(targetPath)) {
            await context.reply(`❌ File plugin *${input}* tidak ditemukan.`);
            return;
        }

        try {
            fs.unlinkSync(targetPath);
            context.registry.unregister(targetPath);

            const distPath = path.resolve('dist/src/plugins', relInput.replace(/\.ts$/i, '.js'));
            if (fs.existsSync(distPath)) {
                try {
                    fs.unlinkSync(distPath);
                    context.registry.unregister(distPath);
                } catch {}
            }

            await context.reply(`🗑️ Plugin *${relInput}* berhasil dihapus.`);
        } catch (err: any) {
            console.error(err);
            await context.reply(`❌ Gagal menghapus plugin: ${err.message}`);
        }
    }
};

export default handler;
