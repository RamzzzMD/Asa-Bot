import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['clsesi', 'clearsesion', 'clearsesi'],
    category: 'owner',
    description: 'Membersihkan temporary file dan session cache lama',
    owner: true,
    execute: async (context: PluginContext): Promise<void> => {
        let deletedFiles = 0;
        const tempDirs = ['data/trash', 'tmp', 'temp-convert'];

        for (const dir of tempDirs) {
            const resolved = path.resolve(dir);
            if (fs.existsSync(resolved)) {
                try {
                    const files = fs.readdirSync(resolved);
                    for (const file of files) {
                        try {
                            const fp = path.join(resolved, file);
                            if (fs.statSync(fp).isFile()) {
                                fs.unlinkSync(fp);
                                deletedFiles++;
                            }
                        } catch {}
                    }
                } catch {}
            }
        }

        await context.reply(
            `🧹 *Pembersihan Selesai!*\n` +
            `• Berhasil menghapus *${deletedFiles}* file sampah temporary.`
        );
    }
};

export default handler;
