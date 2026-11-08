import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['setprefix', 'prefix'],
    category: 'owner',
    description: 'Mengatur dan mengubah prefix bot (on/off/custom prefix)',
    owner: true,
    execute: async (context: PluginContext): Promise<void> => {
        const arg1 = context.args[0]?.trim();
        const arg2 = context.args[1]?.trim();

        const storedPrefix = context.db.getSetting('bot', 'prefix');
        const currentPrefix = storedPrefix || context.config.prefixes[0] || '.';
        const isPrefixOff = context.db.getSetting('bot', 'noprefix') === '1';

        // Tampilkan status & panduan jika tidak ada argumen
        if (!arg1) {
            const usedPrefix = context.usedPrefix || (isPrefixOff ? '' : currentPrefix);
            await context.reply(
                `⚙️ *PENGATURAN PREFIX BOT*\n\n` +
                `• Status Mode: *[ ${isPrefixOff ? 'OFF (Tanpa Prefix)' : 'ON (Wajib Prefix)'} ]*\n` +
                `• Active Prefix: *[ ${currentPrefix} ]*\n\n` +
                `*Pilihan Perintah:*\n` +
                `› *${usedPrefix}setprefix on* (Wajib pakai prefix aktif: ${currentPrefix})\n` +
                `› *${usedPrefix}setprefix off* (Mode tanpa prefix: menu, ping, dll)\n` +
                `› *${usedPrefix}setprefix <simbol>* (Ubah prefix ke simbol baru & aktifkan mode ON)\n\n` +
                `*Contoh:*\n` +
                `• *${usedPrefix}setprefix .* (hanya merespon prefix titik)\n` +
                `• *${usedPrefix}setprefix #* (hanya merespon prefix pagar)\n` +
                `• *${usedPrefix}setprefix off* (respon langsung tanpa prefix)`
            );
            return;
        }

        const lowerArg = arg1.toLowerCase();

        // 1. Mode OFF (Tanpa Prefix)
        if (lowerArg === 'off' || lowerArg === 'disable' || lowerArg === 'none') {
            context.db.setSetting('bot', 'noprefix', '1');
            (context.config as any).prefixes = [''];

            await context.reply(
                `✅ *Mode Prefix Berhasil Dimatikan (OFF)*\n\n` +
                `• Status: *Tanpa Prefix (No-Prefix Mode)*\n` +
                `• Keterangan: Bot sekarang dapat merespon perintah langsung tanpa simbol prefix.\n\n` +
                `*Contoh Penggunaan:* Ketik *menu*, *ping*, *sfl*, dll langsung di chat.`
            );
            return;
        }

        // 2. Mode ON (Ikut Setprefix)
        if (lowerArg === 'on' || lowerArg === 'enable') {
            let activePrefixToUse = currentPrefix;
            if (arg2) {
                activePrefixToUse = arg2;
                context.db.setSetting('bot', 'prefix', activePrefixToUse);
            }

            context.db.setSetting('bot', 'noprefix', '0');
            // 100% mengikuti dari setprefix (hanya satu prefix yang aktif)
            (context.config as any).prefixes = [activePrefixToUse];

            await context.reply(
                `✅ *Mode Prefix Berhasil Diaktifkan (ON)*\n\n` +
                `• Status: *Wajib Prefix (100% Mengikuti Set)*\n` +
                `• Active Prefix: *[ ${activePrefixToUse} ]*\n\n` +
                `Bot sekarang 100% hanya merespon perintah yang diawali prefix *[ ${activePrefixToUse} ]*.\n` +
                `*Contoh:* Ketik *${activePrefixToUse}menu*`
            );
            return;
        }

        // 3. Set Prefix Baru (misal: .setprefix # atau .setprefix !)
        const newPrefix = arg1;
        context.db.setSetting('bot', 'prefix', newPrefix);
        context.db.setSetting('bot', 'noprefix', '0'); // Otomatis aktifkan mode prefix ON
        // 100% mengikuti dari setprefix
        (context.config as any).prefixes = [newPrefix];

        await context.reply(
            `✅ *Prefix Bot Berhasil Diubah*\n\n` +
            `• Prefix Baru: *[ ${newPrefix} ]*\n` +
            `• Status Mode: *ON (Wajib Prefix)*\n\n` +
            `Bot sekarang 100% hanya merespon perintah dengan prefix *[ ${newPrefix} ]*.\n` +
            `*Contoh:* Ketik *${newPrefix}menu*`
        );
    }
};

export default handler;
