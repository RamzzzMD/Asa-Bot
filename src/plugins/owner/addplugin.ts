import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { PluginLoader } from '../../core/plugins.js';
import { transpileToJs } from '../../lib/scrape-engine.js';

const handler: Plugin = {
    command: ['addplugin', 'addp', 'ap'],
    category: 'owner',
    description: 'Menambah atau memperbarui file plugin baru',
    owner: true,
    execute: async (context: PluginContext): Promise<void> => {
        let fileName = '';
        let fileContent = '';

        const quotedMsg =
            context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            (context.event as any)?.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            null;

        const quotedText =
            quotedMsg?.conversation ||
            quotedMsg?.extendedTextMessage?.text;

        const isDirectDoc = Boolean(context.event.message?.documentMessage);
        const isQuotedDoc = Boolean(quotedMsg?.documentMessage);

        if (isDirectDoc || isQuotedDoc) {
            try {
                const buf = isDirectDoc
                    ? await context.client.downloadMedia(context.event)
                    : await context.client.downloadMedia({ message: quotedMsg });
                fileContent = buf.toString('utf-8');
                fileName = context.text.trim() ||
                    context.event.message?.documentMessage?.fileName ||
                    quotedMsg?.documentMessage?.fileName ||
                    '';
            } catch {}
        } else if (quotedText) {
            fileName = context.text.trim();
            fileContent = quotedText;
        } else {
            const firstSpace = context.text.indexOf(' ');
            if (firstSpace === -1) {
                await context.reply(
                    `*Cara Penggunaan:*\n` +
                    `1. Reply pesan atau dokumen yang berisi kode plugin dengan caption:\n` +
                    `   *${context.usedPrefix}${context.command} group/namafile.ts*\n` +
                    `2. Atau tulis langsung: *${context.usedPrefix}${context.command} group/namafile.ts <kode_disini>*`
                );
                return;
            }
            fileName = context.text.substring(0, firstSpace).trim();
            fileContent = context.text.substring(firstSpace + 1).trim();
        }

        if (!fileName || (!fileName.endsWith('.ts') && !fileName.endsWith('.js'))) {
            await context.reply('❌ Nama file harus berakhiran *.ts* atau *.js* (contoh: *group/kick.ts*)');
            return;
        }

        const baseDir = path.resolve('src/plugins');
        const targetPath = path.resolve(baseDir, fileName);

        if (!targetPath.startsWith(baseDir)) {
            await context.reply('❌ Path tidak valid.');
            return;
        }

        try {
            const dir = path.dirname(targetPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            const isUpdate = fs.existsSync(targetPath);
            fs.writeFileSync(targetPath, fileContent, 'utf-8');

            // Sinkronisasi ke dist/src/plugins jika dist/ tersedia
            let runtimePath = targetPath;
            const distBaseDir = path.resolve('dist/src/plugins');
            if (fs.existsSync(path.resolve('dist'))) {
                try {
                    const jsRelName = fileName.replace(/\.ts$/i, '.js');
                    const distTargetPath = path.resolve(distBaseDir, jsRelName);
                    fs.mkdirSync(path.dirname(distTargetPath), { recursive: true });
                    fs.writeFileSync(distTargetPath, transpileToJs(fileContent), 'utf-8');
                    if (import.meta.url.includes('/dist/') || import.meta.url.includes('\\dist\\')) {
                        runtimePath = distTargetPath;
                    }
                } catch {}
            }

            try {
                const loader = new PluginLoader();
                const loaded = await loader.loadPlugin(runtimePath);
                if (loaded) {
                    context.registry.register(runtimePath, loaded);
                }
            } catch {}

            await context.reply(
                `✅ *Plugin Berhasil ${isUpdate ? 'Diperbarui' : 'Ditambahkan'}!*\n` +
                `• File: \`src/plugins/${fileName}\`\n` +
                `_Hot-reload otomatis mendeteksi perubahan ini._`
            );
        } catch (err: any) {
            console.error(err);
            await context.reply(`❌ Gagal menyimpan plugin: ${err.message}`);
        }
    }
};

export default handler;
