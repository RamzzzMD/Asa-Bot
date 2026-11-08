import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['delprem', 'delpremium'],
    category: 'owner',
    description: 'Menghapus pengguna dari database premium',
    owner: true,
    execute: async (context: PluginContext): Promise<void> => {
        const usedPrefix = context.usedPrefix || context.prefix;
        const rawTarget = context.args[0] || '';

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
                `Penggunaan: *${usedPrefix}${context.command} <nomor/reply>*\n` +
                `Contoh: *${usedPrefix}${context.command} 628123456789*`
            );
            return;
        }

        const success = context.db.removePremium(targetNumber);

        if (success) {
            await context.reply(`🗑️ *Berhasil Menghapus Premium!*\nNomor +${targetNumber} telah dihapus dari database.`);
        } else {
            await context.reply(`ℹ️ Nomor +${targetNumber} tidak ditemukan di dalam database premium.`);
        }
    }
};

export default handler;
