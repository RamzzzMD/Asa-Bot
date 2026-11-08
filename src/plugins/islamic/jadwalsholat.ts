import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { getCityList, scrapeJadwal } from '../../../scrape/jadwalsholat.js';

const THUMB_URL = 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=700';

const handler: Plugin = {
    command: ['jadwalsholat', 'sholat', 'jadwal'],
    category: 'islamic',
    description: 'Jadwal sholat harian seluruh kota dan kabupaten di Indonesia',
    execute: async (context: PluginContext): Promise<void> => {
        let text = context.text.trim();

        if (!text) {
            const quotedText =
                context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
                context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text;

            if (quotedText) {
                text = quotedText.trim();
            }
        }

        if (!text) {
            await context.reply(
                `> ✉️ Masukkan nama kota/wilayah yang ingin dicari.\n\n` +
                `💡 Contoh:\n` +
                `> *${context.usedPrefix || '.'}${context.command} tangerang*\n` +
                `> *${context.usedPrefix || '.'}${context.command} jakarta*`
            );
            return;
        }

        await context.reply(global.mess?.wait || '⏳ Sedang mencari jadwal sholat...');

        try {
            const now = new Date();
            const month = now.getMonth() + 1;
            const year = now.getFullYear();

            const cities = await getCityList();
            const searchKeyword = text.toLowerCase().trim();
            const results = cities.filter((c) => c.name.toLowerCase().includes(searchKeyword));

            if (results.length === 0) {
                await context.reply(`> ❌ Wilayah *"${text}"* tidak ditemukan.`);
                return;
            }

            if (results.length > 1) {
                let txt = `> 🔍 *Ditemukan beberapa wilayah untuk "${text}":*\n\n`;
                results.slice(0, 15).forEach((c) => {
                    txt += `🔹 _${context.usedPrefix || '.'}${context.command} ${c.name}_\n`;
                });
                if (results.length > 15) {
                    txt += `\n_...dan ${results.length - 15} wilayah lainnya._\n`;
                }
                txt += `\n💡 _Silakan ketik ulang dengan nama wilayah yang lebih spesifik dari daftar di atas._`;
                await context.reply(txt);
                return;
            }

            const targetCity = results[0];
            const jadwal = await scrapeJadwal(targetCity.id, month, year, now.getDate());

            if (!jadwal.today) {
                await context.reply(`> ❌ Gagal mendapatkan data jadwal sholat untuk hari ini di wilayah *${jadwal.cityName}*.`);
                return;
            }

            const caption = [
                `> 🕌 *JADWAL SHOLAT HARI INI*`,
                ``,
                `> 🏢 *Wilayah:* ${jadwal.cityName}`,
                `> 📅 *Tanggal:* ${jadwal.today.tanggal} | ${jadwal.today.hijriyah}`,
                `> ⏳ *Bulan/Tahun:* ${jadwal.month} / ${jadwal.year}`,
                ``,
                `> ⏱️ *Imsyak:* ${jadwal.today.imsyak}`,
                `> ⏱️ *Subuh:* ${jadwal.today.subuh}`,
                `> ⏱️ *Terbit:* ${jadwal.today.terbit}`,
                `> ⏱️ *Dhuha:* ${jadwal.today.dhuha}`,
                `> ⏱️ *Dzuhur:* ${jadwal.today.dzuhur}`,
                `> ⏱️ *Ashar:* ${jadwal.today.ashar}`,
                `> ⏱️ *Maghrib:* ${jadwal.today.maghrib}`,
                `> ⏱️ *Isya:* ${jadwal.today.isya}`
            ].join('\n').trim();

            await context.client.sendMessage(
                context.chatJid,
                {
                    image: { url: THUMB_URL },
                    caption
                },
                { quoted: context.raw as any }
            );
        } catch (e: any) {
            console.error(`[${context.command}]`, e?.message || e);
            await context.reply(`> ❌ Gagal mengambil data jadwal sholat.`);
        }
    }
};

export default handler;
