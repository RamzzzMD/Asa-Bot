import type { BaileysHandlerExtra } from '../../../types/plugin.js';

const handler = async (m: any, { reply, config, senderNumber, pushName, isOwner, isPremium }: BaileysHandlerExtra): Promise<void> => {
    if (!senderNumber) {
        await reply('❌ Gagal mengidentifikasi identitas pengguna.');
        return;
    }

    const displayName = pushName || 'User';
    const roleText = isOwner ? 'Owner 👑' : isPremium ? 'Premium ⭐' : 'User';

    const message =
        `╭─「 PROFIL PENGGUNA 」\n` +
        `│\n` +
        `│ Nama: ${displayName}\n` +
        `│ Nomor: ${senderNumber}\n` +
        `│ Role: ${roleText}\n` +
        `│ Akses: Unlimited / Bebas\n` +
        `│\n` +
        `╰─ ${config.botName}`;

    await reply(message);
};

(handler as any).help = ['profile', 'profil', 'me'];
(handler as any).tags = ['main'];
(handler as any).command = ['profile', 'profil', 'me'];

export default handler;
