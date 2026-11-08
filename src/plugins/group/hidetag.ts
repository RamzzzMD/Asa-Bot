import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['hidetag', 'ht', 'h'],
    category: 'group',
    description: 'Mengirim pesan dengan mention tersembunyi ke seluruh anggota grup',
    group: true,
    admin: true,
    execute: async (context: PluginContext): Promise<void> => {
        const text = context.text || 'Perhatian seluruh anggota grup!';

        try {
            const metadata: any = await context.client.groupMetadata(context.chatJid);
            const participants = metadata?.participants || [];
            const members: string[] = participants.map((p: any) => p.jid || p.id).filter(Boolean);

            await context.client.sendMessage(context.chatJid, {
                text,
                mentions: members
            }, { quoted: context.raw });
        } catch (err) {
            console.error(err);
            await context.reply('❌ Gagal mengirim pesan hidetag.');
        }
    }
};

export default handler;
