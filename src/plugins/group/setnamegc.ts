import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['setnamegc'],
    category: 'group',
    description: 'Mengubah nama atau subjek grup',
    group: true,
    admin: true,
    botadmin: true,
    owner: false,
    limit: false,
    execute: async (context: PluginContext): Promise<void> => {
        const newName = context.text.trim();
        if (!newName) {
            await context.reply(
                `📝 *UBAH NAMA GRUP*\n\n` +
                `⚙️ *Format Penggunaan:*\n` +
                `› *${context.usedPrefix || '.'}${context.command} <nama grup baru>*\n\n` +
                `📌 *Contoh:*\n` +
                `› *${context.usedPrefix || '.'}${context.command} Enami Asa Community*`
            );
            return;
        }

        if (newName.length > 100) {
            await context.reply('❌ Nama grup tidak boleh melebihi 100 karakter!');
            return;
        }

        try {
            await context.client.groupUpdateSubject(context.chatJid, newName);
            await context.reply(`✅ *Nama grup berhasil diubah menjadi:*\n*${newName}*`);
        } catch (err: any) {
            await context.reply(`❌ Gagal mengubah nama grup: ${err?.message || err}`);
        }
    }
};

export default handler;
