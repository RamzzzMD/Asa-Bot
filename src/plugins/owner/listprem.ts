import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['listprem', 'listpremium', 'premlist'],
    category: 'owner',
    description: 'Melihat seluruh daftar pengguna premium dari database',
    owner: true,
    execute: async (context: PluginContext): Promise<void> => {
        const list = context.db.listPremiums();

        if (list.length === 0) {
            await context.reply('📭 *Daftar Pengguna Premium*\nBelum ada pengguna premium yang terdaftar di database.');
            return;
        }

        const lines: string[] = [
            `👑 *DAFTAR PENGGUNA PREMIUM*`,
            `Total: *${list.length} Pengguna*\n`
        ];

        list.forEach((item, index) => {
            const expText = item.expiresAt
                ? new Date(item.expiresAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                  })
                : 'Permanen';
            lines.push(`${index + 1}. *+${item.number}*`);
            lines.push(`   └ Kadaluarsa: _${expText}_`);
        });

        await context.reply(lines.join('\n'));
    }
};

export default handler;
