import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['revoke'],
    category: 'group',
    description: 'Mereset dan mengganti tautan undangan grup dengan yang baru',
    group: true,
    admin: true,
    botadmin: true,
    owner: false,
    limit: false,
    execute: async (context: PluginContext): Promise<void> => {
        try {
            const res = await context.client.groupRevokeInvite(context.chatJid);
            const newCode = (res as any)?.code || (await context.client.groupInviteCode(context.chatJid));
            await context.reply(
                `╭ ┈──ׅ─┈─ׅ─┈─ׅ─┈─ׅ─\n` +
                `│   ---- *⫹ REVOKE GROUP LINK ⫺* ----\n` +
                `│╭ ┈──ׅ───ׅ──ׅ─┈─ׅ─\n` +
                `││ *𖢷 ׁ 𖹭₊ Status :* Tautan lama dinonaktifkan\n` +
                `││ *𖢷 ׁ 𖹭₊ Link Baru :* https://chat.whatsapp.com/${newCode}\n` +
                `│╰┈─ׅ──ֺ─ֺ──ׅ──ׅ─ֺ─ֺ\n` +
                `╰┈─ׅ──ֺ─ֺ───ׅ─  ׅ ⏝ׅ︶ ׅ 𝅄\n\n` +
                `_Tautan undangan grup berhasil diperbarui!_`
            );
        } catch (err: any) {
            await context.reply(`❌ Gagal mereset tautan grup: ${err?.message || err}`);
        }
    }
};

export default handler;
