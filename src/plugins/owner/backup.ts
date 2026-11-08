import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import util from 'node:util';
import type { Plugin, PluginContext } from '../../../types/plugin.js';

const execPromise = util.promisify(exec);

const handler: Plugin = {
    command: ['backup', 'bckp'],
    category: 'owner',
    description: 'Membuat arsip backup zip kode bot dan mengirimkannya ke owner',
    owner: true,
    execute: async (context: PluginContext): Promise<void> => {
        await context.reply(global.mess.wait);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const zipName = `enami-asa-backup-${timestamp}.zip`;
        const zipPath = path.resolve(`data/${zipName}`);

        try {
            await execPromise(
                `zip -r "${zipPath}" . -x "node_modules/*" ".git/*" "data/*.sqlite*" "dist/*" "*.log" "data/trash/*" "temp-convert/*"`
            );

            if (!fs.existsSync(zipPath)) {
                await context.reply('❌ Gagal membuat file zip backup.');
                return;
            }

            const buffer = fs.readFileSync(zipPath);
            const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);

            await context.client.sendMessage(context.chatJid, {
                document: buffer,
                filename: zipName,
                mimetype: 'application/zip'
            }, { quoted: context.raw });

            fs.unlinkSync(zipPath);
        } catch (err: any) {
            console.error(err);
            await context.reply(`❌ Gagal memproses backup: ${err.message}`);
        }
    }
};

export default handler;
