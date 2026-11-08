import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['linkgc'],
    category: 'group',
    description: 'Mendapatkan tautan undangan grup WhatsApp',
    group: true,
    admin: false,
    botadmin: true,
    owner: false,
    limit: false,
    execute: async (context: PluginContext): Promise<void> => {
        try {
            const code = await context.client.groupInviteCode(context.chatJid);
            if (!code) {
                await context.reply('❌ Gagal mendapatkan tautan undangan grup.');
                return;
            }
            await context.reply(
                `╭ ┈──ׅ─┈─ׅ─┈─ׅ─┈─ׅ─\n` +
                `│   ---- *⫹ LINK GROUP ⫺* ----\n` +
                `│╭ ┈──ׅ───ׅ──ׅ─┈─ׅ─\n` +
                `││ *𖢷 ׁ 𖹭₊ URL :* https://chat.whatsapp.com/${code}\n` +
                `│╰┈─ׅ──ֺ─ֺ──ׅ──ׅ─ֺ─ֺ\n` +
                `╰┈─ׅ──ֺ─ֺ───ׅ─  ׅ ⏝ׅ︶ ׅ 𝅄\n\n` +
                `_Gunakan tautan di atas untuk mengundang anggota baru._`
            );
        } catch (err: any) {
            await context.reply(`❌ Gagal mengambil tautan grup: ${err?.message || err}`);
        }
    }
};

export default handler;
