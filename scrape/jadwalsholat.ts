/**
 * JADWAL SHOLAT SCRAPER
 * [•] WEB         :: jadwalsholat.org
 * [•] DESCRIPTION :: Scrape jadwal sholat seluruh Indonesia dari jadwalsholat.org
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
    'Referer': 'https://www.jadwalsholat.org/',
    'Connection': 'keep-alive'
};

export interface CityItem {
    id: number;
    name: string;
}

export interface TodaySholat {
    tanggal: number;
    hijriyah: string;
    imsyak: string;
    subuh: string;
    terbit: string;
    dhuha: string;
    dzuhur: string;
    ashar: string;
    maghrib: string;
    isya: string;
}

export interface JadwalSholatResult {
    cityName: string;
    month: number;
    year: number;
    today: TodaySholat | null;
}

let cachedCities: CityItem[] | null = null;
let lastFetchTime = 0;

export async function getCityList(): Promise<CityItem[]> {
    if (cachedCities && Date.now() - lastFetchTime < 1000 * 60 * 60 * 24) {
        return cachedCities;
    }

    const { data } = await axios.get('https://www.jadwalsholat.org/adzan/monthly.php', {
        headers,
        timeout: 15000
    });
    const $ = cheerio.load(data);
    const cities: CityItem[] = [];

    $('select option').each((_, el) => {
        const id = $(el).val();
        const name = $(el).text().trim();
        if (id && name) {
            cities.push({
                id: parseInt(String(id), 10),
                name
            });
        }
    });

    if (cities.length > 0) {
        cachedCities = cities;
        lastFetchTime = Date.now();
    }
    return cities;
}

export async function scrapeJadwal(
    cityId: number,
    month?: number,
    year?: number,
    date?: number
): Promise<JadwalSholatResult> {
    const now = new Date();
    const m = month ?? (now.getMonth() + 1);
    const y = year ?? now.getFullYear();
    const targetDate = date ?? now.getDate();

    const url = `https://www.jadwalsholat.org/adzan/monthly.php?id=${cityId}&month=${m}&year=${y}`;
    const { data } = await axios.get(url, { headers, timeout: 15000 });
    const $ = cheerio.load(data);

    const cityName = $('h1').first().text().trim().replace(/^Jadwal Sholat\s+/i, '');
    let today: TodaySholat | null = null;

    $('table tr').each((_, row) => {
        const cols = $(row).find('td');
        if (cols.length >= 9) {
            const tanggalRaw = $(cols[0]).text().trim();
            const tgl = parseInt(tanggalRaw.replace(/\D/g, '').substring(0, 2), 10);
            if (!tgl) return;

            const entry: TodaySholat = {
                tanggal: tgl,
                hijriyah: $(cols[1]).text().trim(),
                imsyak: $(cols[2]).text().trim(),
                subuh: $(cols[3]).text().trim(),
                terbit: $(cols[4]).text().trim(),
                dhuha: $(cols[5]).text().trim(),
                dzuhur: $(cols[6]).text().trim(),
                ashar: $(cols[7]).text().trim(),
                maghrib: $(cols[8]).text().trim(),
                isya: $(cols[9]).text().trim()
            };

            if (tgl === targetDate) {
                today = entry;
            }
        }
    });

    return {
        cityName,
        month: m,
        year: y,
        today
    };
}
