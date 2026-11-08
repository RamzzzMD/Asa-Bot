import fs from 'node:fs';
import path from 'node:path';
import axios from 'axios';
import type { Plugin, PluginContext } from '../../../types/plugin.js';

interface DoaItem {
    title: string;
    arabic: string;
    latin: string;
    translation: string;
}

const THUMBNAIL_URL = 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=700';

async function loadDoaData(): Promise<DoaItem[]> {
    const jsonPath = path.resolve(process.cwd(), 'json/doaharian.json');

    if (fs.existsSync(jsonPath)) {
        try {
            const raw = fs.readFileSync(jsonPath, 'utf-8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
            if (parsed?.data && Array.isArray(parsed.data)) {
                return parsed.data;
            }
        } catch (err) {
            console.error('Gagal membaca file lokal doaharian.json:', err);
        }
    }

    // Fallback: fetch from online Islamic API
    try {
        const { data } = await axios.get('https://islamic-api-zhirrr.vercel.app/api/doaharian', { timeout: 15000 });
        const list = Array.isArray(data) ? data : data?.data;
        if (Array.isArray(list) && list.length > 0) {
            try {
                fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
                fs.writeFileSync(jsonPath, JSON.stringify(list, null, 2));
            } catch {}
            return list;
        }
    } catch (err: any) {
        console.error('Gagal fetch online doaharian:', err.message);
    }

    return [];
}

const handler: Plugin = {
    command: ['doaharian', 'doa'],
    category: 'islamic',
    description: 'Kumpulan doa harian lengkap dengan teks Arab, Latin, dan terjemahan',
    execute: async (context: PluginContext): Promise<void> => {
        let input = context.text.trim();

        if (!input) {
            const quotedText =
                context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
                context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text;

            if (quotedText) {
                input = quotedText.trim();
            }
        }

        try {
            const src = await loadDoaData();

            if (!src || src.length === 0) {
                await context.reply('❌ Gagal memuat data doa harian. Pastikan data atau koneksi tersedia.');
                return;
            }

            // Jika user mencari doa spesifik (berdasarkan nama atau nomor index)
            if (input && input.toLowerCase() !== 'all') {
                const num = parseInt(input, 10);
                let filtered: DoaItem[] = [];

                if (!isNaN(num) && num >= 1 && num <= src.length) {
                    filtered = [src[num - 1]];
                } else {
                    const q = input.toLowerCase();
                    filtered = src.filter(
                        (v) =>
                            v.title.toLowerCase().includes(q) ||
                            v.latin.toLowerCase().includes(q) ||
                            v.translation.toLowerCase().includes(q)
                    );
                }

                if (filtered.length === 0) {
                    await context.reply(
                        `❌ Doa dengan kata kunci *"${input}"* tidak ditemukan.\n\n` +
                        `💡 _Ketik *${context.usedPrefix || '.'}${context.command}* untuk melihat seluruh daftar doa harian._`
                    );
                    return;
                }

                const caption = filtered
                    .map((v, i) => {
                        const originalIndex = src.indexOf(v) + 1;
                        return (
                            `*${originalIndex}.* ${v.title}\n\n` +
                            `*❃ Arabic :*\n${v.arabic}\n\n` +
                            `*❃ Latin :*\n${v.latin}\n\n` +
                            `*❃ Terjemahan :*\n_${v.translation}_`
                        );
                    })
                    .join('\n\n' + '—'.repeat(15) + '\n\n');

                await context.client.sendMessage(
                    context.chatJid,
                    {
                        text: `*「 DOA HARIAN 」*\n\n` + caption,
                        contextInfo: {
                            externalAdReply: {
                                title: filtered.length === 1 ? filtered[0].title : 'Kumpulan Doa Harian',
                                body: 'Enami Asa Ai • Islamic Education',
                                thumbnailUrl: THUMBNAIL_URL,
                                sourceUrl: '',
                                mediaType: 1,
                                renderLargerThumbnail: true
                            }
                        } as any
                    },
                    { quoted: context.raw as any }
                );
                return;
            }

            // Jika tanpa parameter: tampilkan kumpulan doa harian
            const caption = src
                .map((v, i) => {
                    return `*${i + 1}.* ${v.title}\n\n*❃ Arabic :*\n${v.arabic}\n\n*❃ Latin :*\n${v.latin}\n\n*❃ Translate :*\n_${v.translation}_`;
                })
                .join('\n\n' + '—'.repeat(15) + '\n\n');

            await context.client.sendMessage(
                context.chatJid,
                {
                    text: `*「 DOA HARIAN 」*\n\n` + caption,
                    contextInfo: {
                        externalAdReply: {
                            title: 'Kumpulan Doa Harian',
                            body: 'Enami Asa Ai • Islamic Education',
                            thumbnailUrl: THUMBNAIL_URL,
                            sourceUrl: '',
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    } as any
                },
                { quoted: context.raw as any }
            );
        } catch (e: any) {
            console.error('Error in doaharian:', e);
            await context.reply('❌ Gagal memuat data doa harian. Pastikan file JSON tersedia.');
        }
    }
};

export default handler;
