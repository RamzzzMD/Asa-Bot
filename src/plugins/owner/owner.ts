import type { Plugin, PluginContext } from '../../../types/plugin.js';

const handler: Plugin = {
    command: ['addown', 'addowner', 'delown', 'delowner', 'listown', 'listowner'],
    category: 'owner',
    description: 'Manajemen daftar nomor owner bot',
    owner: true,
    execute: async (context: PluginContext): Promise<void> => {
        const cmd = context.command.toLowerCase();
        const storedStr = context.db.getSetting('bot', 'extra_owners') || '[]';
        let extraOwners: string[] = [];
        try {
            extraOwners = JSON.parse(storedStr);
        } catch {
            extraOwners = [];
        }

        if (cmd === 'listown' || cmd === 'listowner') {
            const allOwners = Array.from(new Set([...context.config.ownerNumbers, ...extraOwners]));
            const lines = allOwners.map((num, i) => `• ${i + 1}. +${num} (@${num})`);
            await context.client.sendMessage(context.chatJid, {
                text: `👑 *Daftar Owner Bot ${context.config.botName}:*\n• *Owner Utama:* ${context.config.ownerName}\n\n${lines.join('\n')}`,
                mentions: allOwners.map((n) => `${n}@s.whatsapp.net`)
            }, { quoted: context.raw });
            return;
        }

        let targetNumber = context.text.replace(/[^0-9]/g, '');
        const quotedMsg = context.event.message?.extendedTextMessage?.contextInfo;
        if (!targetNumber && quotedMsg?.participant) {
            targetNumber = quotedMsg.participant.replace(/@.*$/, '').replace(/:\d+$/, '');
        }

        if (!targetNumber || targetNumber.length < 8) {
            await context.reply(`Contoh: *${context.usedPrefix}${context.command} 628xxxx / reply user*`);
            return;
        }

        if (cmd === 'addown' || cmd === 'addowner') {
            if (context.config.ownerNumbers.includes(targetNumber) || extraOwners.includes(targetNumber)) {
                await context.reply('Nomor sudah ada di daftar owner.');
                return;
            }
            extraOwners.push(targetNumber);
            context.db.setSetting('bot', 'extra_owners', JSON.stringify(extraOwners));
            await context.reply(`✅ Berhasil menambahkan +${targetNumber} ke daftar owner.`);
            return;
        }

        if (cmd === 'delown' || cmd === 'delowner') {
            if (!extraOwners.includes(targetNumber)) {
                await context.reply('Nomor tidak ditemukan di daftar owner tambahan.');
                return;
            }
            extraOwners = extraOwners.filter((n) => n !== targetNumber);
            context.db.setSetting('bot', 'extra_owners', JSON.stringify(extraOwners));
            await context.reply(`✅ Berhasil menghapus +${targetNumber} dari daftar owner tambahan.`);
            return;
        }
    }
};

export default handler;
