import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['addprem', 'addpremium'],
    category: 'owner',
    description: 'Menambahkan pengguna ke database premium',
    owner: true,
    execute: async (context: PluginContext): Promise<void> => {
        const usedPrefix = context.usedPrefix || context.prefix;
        const rawTarget = context.args[0] || '';
        const durationStr = context.args[1] || '';

        let targetNumber = rawTarget.replace(/[^0-9]/g, '');

        if (!targetNumber) {
            const quotedMsg = context.event.message?.extendedTextMessage?.contextInfo;
            if (quotedMsg?.participant) {
                targetNumber = quotedMsg.participant.replace(/@.*$/, '').replace(/:\d+$/, '');
            }
        }

        if (!targetNumber) {
            await context.reply(
                `⚠️ *Format Perintah Salah!*\n` +
                `Penggunaan: *${usedPrefix}${context.command} <nomor/reply> [jumlah_hari]*\n` +
                `Contoh: *${usedPrefix}${context.command} 628123456789 30*\n` +
                `Contoh permanen: *${usedPrefix}${context.command} 628123456789*`
            );
            return;
        }

        const days = parseInt(durationStr, 10);
        const durationDays = !isNaN(days) && days > 0 ? days : undefined;

        const record = context.db.addPremium(targetNumber, undefined, durationDays);

        const expText = record.expiresAt
            ? new Date(record.expiresAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
              })
            : 'Permanen';

        await context.reply(
            `✅ *Berhasil Menambahkan Premium!*\n` +
            `• *Nomor:* +${record.number}\n` +
            `• *Masa Aktif:* ${expText}\n` +
            `• *Database:* SQLite (data/enami-asa.sqlite)`
        );
    }
};

export default handler;
