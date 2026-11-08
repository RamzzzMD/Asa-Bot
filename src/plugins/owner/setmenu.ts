import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, PluginContext } from '../../../types/plugin.js';

export interface MenuStyleInfo {
    readonly id: string;
    readonly index: number;
    readonly name: string;
    readonly description: string;
}

export const MENU_STYLES: readonly MenuStyleInfo[] = [
    {
        id: 'list',
        index: 1,
        name: 'Interactive List Menu',
        description: 'Menu interaktif dengan tombol daftar pilihan kategori + gambar header (Default)'
    },
    {
        id: 'button',
        index: 2,
        name: 'Button V2 Quick Reply',
        description: 'Menu interaktif dengan tombol cepat (All Menu, Owner, Runtime) + dropdown kategori'
    },
    {
        id: 'carousel',
        index: 3,
        name: 'Carousel Slide Cards',
        description: 'Menu kartu geser (slide) interaktif untuk setiap kategori fitur'
    },
    {
        id: 'thumb',
        index: 4,
        name: 'Thumbnail Link Preview',
        description: 'Menu teks lengkap dengan pratinjau tautan (AdReply Thumbnail) di bagian atas'
    },
    {
        id: 'image',
        index: 5,
        name: 'Simple Image & Caption',
        description: 'Menu gambar penuh dengan teks caption lengkap tanpa tombol interaktif'
    },
    {
        id: 'document',
        index: 6,
        name: 'Document Interactive Menu',
        description: 'Menu dengan header dokumen estetik + tombol interaktif'
    },
    {
        id: 'gif',
        index: 7,
        name: 'GIF / Video Playback Menu',
        description: 'Menu dengan animasi GIF/Video auto-play + daftar fitur lengkap'
    }
];

export function resolveMenuStyle(input: string): MenuStyleInfo | null {
    const clean = input.toLowerCase().trim();
    const byNum = parseInt(clean, 10);
    if (!Number.isNaN(byNum)) {
        const foundNum = MENU_STYLES.find((s) => s.index === byNum);
        if (foundNum) return foundNum;
    }

    const aliases: Record<string, string> = {
        list: 'list',
        buttonlist: 'list',
        button: 'button',
        buttons: 'button',
        buttonv2: 'button',
        btn: 'button',
        carousel: 'carousel',
        coroseul: 'carousel',
        slide: 'carousel',
        card: 'carousel',
        thumb: 'thumb',
        thumbnail: 'thumb',
        adreply: 'thumb',
        link: 'thumb',
        image: 'image',
        img: 'image',
        simple: 'image',
        foto: 'image',
        document: 'document',
        doc: 'document',
        pdf: 'document',
        gif: 'gif',
        video: 'gif',
        mp4: 'gif'
    };

    const mapped = aliases[clean];
    if (!mapped) return null;
    return MENU_STYLES.find((s) => s.id === mapped) || null;
}

const handler: Plugin = {
    command: ['setmenu', 'menustyle', 'setmenutype', 'setthumbmenu', 'setaudiomenu'],
    category: 'owner',
    description: 'Mengatur tampilan menu (7 tipe menu), mengganti thumbnail, audio VN, teks sambutan, dan footer menu',
    owner: true,
    execute: async (context: PluginContext): Promise<void> => {
        const cmd = context.command.toLowerCase();
        const rawText = context.text.trim();
        const args = context.args;
        const sub = (args[0] || '').toLowerCase().trim();

        const quotedMsg =
            context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            (context.event as any)?.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            null;

        const isDirectImage = Boolean(context.event.message?.imageMessage);
        const isQuotedImage = Boolean(quotedMsg?.imageMessage);
        const isDirectVideo = Boolean(context.event.message?.videoMessage);
        const isQuotedVideo = Boolean(quotedMsg?.videoMessage);
        const isDirectAudio = Boolean(context.event.message?.audioMessage);
        const isQuotedAudio = Boolean(quotedMsg?.audioMessage);

        // 1. Ganti Thumbnail Gambar Menu (.setthumbmenu atau .setmenu thumb/image)
        if (
            cmd === 'setthumbmenu' ||
            sub === 'thumb' ||
            sub === 'thumbnail' ||
            sub === 'pp' ||
            sub === 'foto' ||
            (isDirectImage && !sub)
        ) {
            if (isDirectImage || isQuotedImage) {
                try {
                    const imgBuf = isDirectImage
                        ? await context.client.downloadMedia(context.event)
                        : await context.client.downloadMedia({ message: quotedMsg });

                    const assetsDir = path.resolve('assets');
                    if (!fs.existsSync(assetsDir)) {
                        fs.mkdirSync(assetsDir, { recursive: true });
                    }

                    const targetPath = path.resolve('assets/menu.jpg');
                    fs.writeFileSync(targetPath, imgBuf);
                    context.db.deleteSetting('menu', 'thumb_url');

                    await context.reply(
                        `✅ *Thumbnail Menu Berhasil Diperbarui!*\n\n` +
                        `• *Lokasi:* \`assets/menu.jpg\`\n` +
                        `• *Ukuran:* ${(imgBuf.length / 1024).toFixed(1)} KB\n\n` +
                        `_Ketik *${context.usedPrefix}menu* untuk melihat tampilan baru._`
                    );
                } catch (err: any) {
                    await context.reply(`❌ Gagal menyimpan gambar menu: ${err.message || err}`);
                }
                return;
            }

            const urlCandidate = args[1]?.trim() || (sub.startsWith('http') ? sub : '');
            if (urlCandidate && /^https?:\/\//i.test(urlCandidate)) {
                context.db.setSetting('menu', 'thumb_url', urlCandidate);
                await context.reply(
                    `✅ *URL Thumbnail Menu Berhasil Diperbarui!*\n\n` +
                    `• *URL:* ${urlCandidate}\n\n` +
                    `_Ketik *${context.usedPrefix}menu* untuk melihat tampilan baru._`
                );
                return;
            }

            await context.reply(
                `🖼️ *SET THUMBNAIL MENU*\n\n` +
                `⚙️ *Cara Penggunaan:*\n` +
                `1. Kirim/Reply gambar dengan perintah *${context.usedPrefix}setmenu thumb*\n` +
                `2. Atau gunakan URL gambar:\n` +
                `   *${context.usedPrefix}setmenu thumb https://example.com/foto.jpg*`
            );
            return;
        }

        // 2. Ganti Video/GIF Menu (.setmenu video/gif)
        if ((sub === 'video' || sub === 'mp4') && (isDirectVideo || isQuotedVideo)) {
            try {
                const vidBuf = isDirectVideo
                    ? await context.client.downloadMedia(context.event)
                    : await context.client.downloadMedia({ message: quotedMsg });

                const assetsDir = path.resolve('assets');
                if (!fs.existsSync(assetsDir)) {
                    fs.mkdirSync(assetsDir, { recursive: true });
                }

                const targetPath = path.resolve('assets/menu.mp4');
                fs.writeFileSync(targetPath, vidBuf);
                context.db.setSetting('menu', 'type', 'gif');

                await context.reply(
                    `✅ *Video/GIF Menu Berhasil Disimpan!*\n\n` +
                    `• *Lokasi:* \`assets/menu.mp4\`\n` +
                    `• *Tipe Menu:* Otomatis diubah ke *GIF / Video Playback*\n\n` +
                    `_Ketik *${context.usedPrefix}menu* untuk melihat hasilnya._`
                );
            } catch (err: any) {
                await context.reply(`❌ Gagal menyimpan video menu: ${err.message || err}`);
            }
            return;
        }

        // 3. Pengaturan Audio / VN Menu (.setaudiomenu atau .setmenu audio [on/off])
        if (cmd === 'setaudiomenu' || sub === 'audio' || sub === 'vn' || sub === 'sound') {
            const toggleArg = (cmd === 'setaudiomenu' ? sub : args[1] || '').toLowerCase().trim();

            if (toggleArg === 'on' || toggleArg === 'enable' || toggleArg === 'aktif') {
                context.db.setSetting('menu', 'audio', '1');
                await context.reply('🔊 *Audio VN Menu Diaktifkan!* Bot akan mengirimkan musik/VN saat `.menu` dipanggil.');
                return;
            }

            if (toggleArg === 'off' || toggleArg === 'disable' || toggleArg === 'nonaktif') {
                context.db.setSetting('menu', 'audio', '0');
                await context.reply('🔇 *Audio VN Menu Dinonaktifkan!* Bot tidak akan mengirim VN saat `.menu` dipanggil.');
                return;
            }

            if (isDirectAudio || isQuotedAudio) {
                try {
                    const audioBuf = isDirectAudio
                        ? await context.client.downloadMedia(context.event)
                        : await context.client.downloadMedia({ message: quotedMsg });

                    const assetsDir = path.resolve('assets');
                    if (!fs.existsSync(assetsDir)) {
                        fs.mkdirSync(assetsDir, { recursive: true });
                    }

                    const targetPath = path.resolve('assets/menu.opus');
                    fs.writeFileSync(targetPath, audioBuf);
                    context.db.setSetting('menu', 'audio', '1');

                    await context.reply(
                        `✅ *Audio VN Menu Berhasil Diperbarui!*\n\n` +
                        `• *Lokasi:* \`assets/menu.opus\`\n` +
                        `• *Ukuran:* ${(audioBuf.length / 1024).toFixed(1)} KB\n` +
                        `• *Status Audio:* 🟢 ON`
                    );
                } catch (err: any) {
                    await context.reply(`❌ Gagal menyimpan audio menu: ${err.message || err}`);
                }
                return;
            }

            await context.reply(
                `🎵 *PENGATURAN AUDIO MENU*\n\n` +
                `⚙️ *Cara Penggunaan:*\n` +
                `› Reply pesan suara/audio dengan *${context.usedPrefix}setmenu audio* untuk mengganti VN menu\n` +
                `› *${context.usedPrefix}setmenu audio on* — Aktifkan VN menu\n` +
                `› *${context.usedPrefix}setmenu audio off* — Matikan VN menu`
            );
            return;
        }

        // 4. Ubah Teks Sambutan (Greeting) Menu (.setmenu text <teks>)
        if (sub === 'text' || sub === 'teks' || sub === 'greeting' || sub === 'ucapan') {
            const customGreeting = rawText.slice(args[0].length).trim();
            if (!customGreeting) {
                await context.reply(
                    `📝 *SET TEKS SAMBUTAN MENU*\n\n` +
                    `📌 *Contoh:*\n` +
                    `› *${context.usedPrefix}setmenu text Halo {name}, selamat datang di {bot} milik {owner}!*\n\n` +
                    `💡 *Variabel yang didukung:*\n` +
                    `• \`{name}\` — Nama pengguna\n` +
                    `• \`{bot}\` — Nama bot (${context.config.botName})\n` +
                    `• \`{owner}\` — Nama owner (${context.config.ownerName})\n` +
                    `• \`{prefix}\` — Prefix aktif`
                );
                return;
            }

            context.db.setSetting('menu', 'greeting', customGreeting);
            await context.reply(
                `✅ *Teks Sambutan Menu Berhasil Diperbarui!*\n\n` +
                `📌 *Preview:*\n${customGreeting}`
            );
            return;
        }

        // 5. Ubah Footer Menu (.setmenu footer <teks>)
        if (sub === 'footer') {
            const customFooter = rawText.slice(args[0].length).trim();
            if (!customFooter) {
                await context.reply(`Contoh: *${context.usedPrefix}setmenu footer © ${context.config.botName} by ${context.config.ownerName}*`);
                return;
            }
            context.db.setSetting('menu', 'footer', customFooter);
            await context.reply(`✅ *Footer Menu Berhasil Diubah:*\n_${customFooter}_`);
            return;
        }

        // 6. Reset Pengaturan Menu (.setmenu reset)
        if (sub === 'reset' || sub === 'default') {
            context.db.deleteSetting('menu', 'type');
            context.db.deleteSetting('menu', 'thumb_url');
            context.db.deleteSetting('menu', 'greeting');
            context.db.deleteSetting('menu', 'footer');
            context.db.setSetting('menu', 'audio', '1');

            await context.reply(
                `🔄 *Pengaturan Menu Berhasil Direset ke Default!*\n\n` +
                `• *Tipe Menu:* 1. Interactive List Menu\n` +
                `• *Audio VN:* 🟢 ON\n` +
                `• *Thumbnail:* \`assets/menu.jpg\``
            );
            return;
        }

        // 7. Pilih Tipe Tampilan Menu (.setmenu 1..7 atau .setmenu list/button/carousel/thumb/image/doc/gif)
        const targetStyleInput = sub === 'type' || sub === 'style' ? (args[1] || '') : sub;
        if (targetStyleInput) {
            const matchedStyle = resolveMenuStyle(targetStyleInput);
            if (matchedStyle) {
                context.db.setSetting('menu', 'type', matchedStyle.id);
                await context.reply(
                    `✅ *Tampilan Menu Berhasil Diubah!*\n\n` +
                    `• *Tipe Aktif:* *[${matchedStyle.index}] ${matchedStyle.name}* (\`${matchedStyle.id}\`)\n` +
                    `• *Keterangan:* ${matchedStyle.description}\n\n` +
                    `_Ketik *${context.usedPrefix}menu* untuk mencoba tampilan baru!_`
                );
                return;
            }
        }

        // 8. Tampilkan Panel Interaktif Pengaturan Menu (.setmenu tanpa argumen)
        const currentTypeId = context.db.getSetting('menu', 'type') || 'list';
        const currentStyle = MENU_STYLES.find((s) => s.id === currentTypeId) || MENU_STYLES[0];
        const isAudioOn = context.db.getSetting('menu', 'audio') !== '0';
        const customThumb = context.db.getSetting('menu', 'thumb_url') || 'assets/menu.jpg (Lokal)';
        const customGreeting = context.db.getSetting('menu', 'greeting') || 'Default';
        const usedPrefix = context.usedPrefix || '.';

        const styleListText = MENU_STYLES.map(
            (s) => `${s.id === currentStyle.id ? '🟢' : '⚪'} *${s.index}. ${s.name}* (\`${usedPrefix}setmenu ${s.id}\`)\n   _${s.description}_`
        ).join('\n\n');

        const infoText =
            `⚙️ *PENGATURAN TAMPILAN MENU (${context.config.botName})*\n\n` +
            `╭──「 📊 *STATUS SAAT INI* 」\n` +
            `│ • *Gaya Menu:* [${currentStyle.index}] ${currentStyle.name}\n` +
            `│ • *Audio VN:* ${isAudioOn ? '🟢 ON' : '🔴 OFF'}\n` +
            `│ • *Thumbnail:* ${customThumb}\n` +
            `│ • *Greeting:* ${customGreeting === 'Default' ? 'Default' : 'Custom'}\n` +
            `╰───────────────\n\n` +
            `🎨 *7 PILIHAN GAYA MENU:*\n${styleListText}\n\n` +
            `🛠️ *KUSTOMISASI LAINNYA:*\n` +
            `› *${usedPrefix}setmenu thumb* (reply foto untuk ganti gambar menu)\n` +
            `› *${usedPrefix}setmenu audio* (reply audio/VN atau \`on\`/\`off\`)\n` +
            `› *${usedPrefix}setmenu video* (reply video untuk menu GIF)\n` +
            `› *${usedPrefix}setmenu text <ucapan>* (ubah sambutan menu)\n` +
            `› *${usedPrefix}setmenu footer <teks>* (ubah footer menu)\n` +
            `› *${usedPrefix}setmenu reset* (kembalikan ke awal)`;

        const sections = [
            {
                title: '🎨 Pilih Gaya Tampilan Menu',
                rows: MENU_STYLES.map((s) => ({
                    id: `${usedPrefix}setmenu ${s.id}`,
                    title: `${s.id === currentStyle.id ? '✅ ' : ''}${s.index}. ${s.name}`,
                    description: s.description
                }))
            },
            {
                title: '🔊 Pengaturan Audio & Reset',
                rows: [
                    {
                        id: `${usedPrefix}setmenu audio ${isAudioOn ? 'off' : 'on'}`,
                        title: isAudioOn ? '🔇 Matikan Audio VN Menu' : '🔊 Aktifkan Audio VN Menu',
                        description: `Status saat ini: ${isAudioOn ? 'ON' : 'OFF'}`
                    },
                    {
                        id: `${usedPrefix}setmenu reset`,
                        title: '🔄 Reset Pengaturan Menu',
                        description: 'Kembalikan seluruh pengaturan menu ke default'
                    },
                    {
                        id: `${usedPrefix}menu`,
                        title: '🚀 Lihat Tampilan Menu Sekarang',
                        description: 'Buka menu untuk melihat hasil perubahan'
                    }
                ]
            }
        ];

        await global.button.list(context, {
            text: infoText,
            buttonText: 'Pilih Gaya Menu',
            header: '🌸 SETMENU CONFIGURATION',
            footer: `${context.config.botName} • ${context.config.ownerName}`,
            sections
        });
    }
};

export default handler;
