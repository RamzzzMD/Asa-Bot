import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['listfile', 'lf'],
    category: 'owner',
    description: 'Melihat daftar file dan folder di direktori server',
    owner: true,
    execute: async (context: PluginContext): Promise<void> => {
        const targetDir = context.text.trim() || '.';
        const resolved = path.resolve(targetDir);

        if (!fs.existsSync(resolved)) {
            await context.reply(`❌ Folder tidak ditemukan: *${targetDir}*`);
            return;
        }

        if (!fs.statSync(resolved).isDirectory()) {
            await context.reply(`❌ Path *${targetDir}* bukan sebuah folder.`);
            return;
        }

        try {
            const items = fs.readdirSync(resolved);
            const dirs: string[] = [];
            const files: string[] = [];

            for (const item of items) {
                if (item === 'node_modules' || item === '.git') continue;
                const fullPath = path.join(resolved, item);
                try {
                    const stat = fs.statSync(fullPath);
                    if (stat.isDirectory()) {
                        dirs.push(`📁 ${item}/`);
                    } else {
                        const sizeKb = (stat.size / 1024).toFixed(1);
                        files.push(`📄 ${item} (${sizeKb} KB)`);
                    }
                } catch {}
            }

            const output =
                `📂 *Daftar Folder/File:* \`${targetDir}\`\n\n` +
                (dirs.length > 0 ? `*Direktori (${dirs.length}):*\n${dirs.join('\n')}\n\n` : '') +
                (files.length > 0 ? `*File (${files.length}):*\n${files.join('\n')}` : '');

            await context.reply(output);
        } catch (err: any) {
            console.error(err);
            await context.reply(`❌ Gagal membaca folder: ${err.message}`);
        }
    }
};

export default handler;
