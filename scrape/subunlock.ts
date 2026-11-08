import axios from 'axios';
import * as cheerio from 'cheerio';

export interface SubUnlockBypassResult {
    success: boolean;
    originalUrl: string;
    destinationUrl: string;
    service: string;
    error?: string;
}

const BROWSER_HEADERS = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Upgrade-Insecure-Requests': '1'
};

function isTargetUrl(u: string): boolean {
    if (!u || !u.startsWith('http')) return false;
    const lower = u.toLowerCase();
    const blacklist = [
        'sub2unlock',
        'sub4unlock',
        'sub3unlock',
        'rekonise',
        'boost.ink',
        'youtube.com',
        'youtu.be',
        'instagram.com',
        'tiktok.com',
        'facebook.com',
        'discord.com',
        'discord.gg',
        'twitter.com',
        'x.com',
        't.me',
        'telegram.org',
        'google.com',
        'googleapis.com',
        'googletagmanager.com',
        'cloudflare.com',
        'schema.org',
        'w3.org',
        'fontawesome',
        'jquery',
        'bootstrap',
        '.png',
        '.jpg',
        '.jpeg',
        '.svg',
        '.css',
        '.js'
    ];
    return !blacklist.some((b) => lower.includes(b));
}

function cleanExtractedUrl(raw: string): string {
    let clean = raw.trim().replace(/^["']|["']$/g, '').replace(/&amp;/g, '&');
    // Cek apakah string berupa base64 encoded URL
    if (!clean.startsWith('http') && /^[A-Za-z0-9+/=]{16,}$/.test(clean)) {
        try {
            const decoded = Buffer.from(clean, 'base64').toString('utf-8');
            if (decoded.startsWith('http')) {
                clean = decoded.trim();
            }
        } catch {}
    }
    return clean;
}

export async function bypassSubUnlock(rawUrl: string): Promise<SubUnlockBypassResult> {
    if (!rawUrl || typeof rawUrl !== 'string') {
        throw new Error('URL target sub unlock harus diisi.');
    }

    let url = rawUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
    }

    const parsedUrl = new URL(url);
    const host = parsedUrl.hostname.toLowerCase();

    // 1. REKONISE.COM
    if (host.includes('rekonise.com')) {
        const slug = parsedUrl.pathname.replace(/^\/+/, '').split('/')[0];
        if (slug) {
            try {
                const res = await axios.get(`https://api.rekonise.com/social-unlocks/${slug}`, {
                    headers: BROWSER_HEADERS,
                    timeout: 15000
                });
                if (res.data?.url) {
                    return {
                        success: true,
                        originalUrl: url,
                        destinationUrl: res.data.url,
                        service: 'Rekonise'
                    };
                }
            } catch (err: any) {
                // Lanjut ke fallback scraping
            }
        }
    }

    // 2. FETCH WEB PAGE (Sub2Unlock, Sub4Unlock, Sub3Unlock, dll)
    const response = await axios.get(url, {
        headers: {
            ...BROWSER_HEADERS,
            Referer: `${parsedUrl.origin}/`
        },
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: () => true
    });

    const html = String(response.data || '');
    const $ = cheerio.load(html);

    // Deteksi service name
    let serviceName = 'SubUnlock';
    if (host.includes('sub2unlock')) serviceName = 'Sub2Unlock';
    else if (host.includes('sub4unlock')) serviceName = 'Sub4Unlock';
    else if (host.includes('sub3unlock')) serviceName = 'Sub3Unlock';
    else if (host.includes('boost.ink')) serviceName = 'Boost.ink';
    else if (host.includes('rekonise')) serviceName = 'Rekonise';

    // A. Cek Next.js __NEXT_DATA__ (sub2unlock.com dan Next.js lockers)
    const nextDataRaw = $('#__NEXT_DATA__').html();
    if (nextDataRaw) {
        try {
            const nextData = JSON.parse(nextDataRaw);
            const pageProps = nextData?.props?.pageProps;

            if (pageProps) {
                // Cek kemungkinan properti langsung
                const directCandidates = [
                    pageProps.destination,
                    pageProps.destination_url,
                    pageProps.target,
                    pageProps.target_url,
                    pageProps.flink,
                    pageProps.url,
                    pageProps.link?.destination,
                    pageProps.link?.target_url,
                    pageProps.link?.url
                ];

                for (const cand of directCandidates) {
                    if (typeof cand === 'string' && cand.startsWith('http')) {
                        return {
                            success: true,
                            originalUrl: url,
                            destinationUrl: cleanExtractedUrl(cand),
                            service: serviceName
                        };
                    }
                }

                // Recursively cari URL di JSON
                const jsonStr = JSON.stringify(pageProps);
                const allUrls = jsonStr.match(/https?:\/\/[^\s"'\\]+/g) || [];
                for (const u of allUrls) {
                    if (isTargetUrl(u)) {
                        return {
                            success: true,
                            originalUrl: url,
                            destinationUrl: cleanExtractedUrl(u),
                            service: serviceName
                        };
                    }
                }
            }
        } catch {}
    }

    // B. Cek DOM Element umum (#theLinkID, #destination-link, dll)
    const domSelectors = [
        '#theLinkID',
        '#thelinkid',
        '#destination-link',
        '#destination',
        '#final-link',
        '#target-link',
        '#unlock-link',
        'a#link',
        'a.getlink',
        'a#btn-download',
        'a#download-btn',
        'input[name="destination"]',
        'input[name="flink"]',
        'input[name="target"]'
    ];

    for (const sel of domSelectors) {
        const el = $(sel);
        if (el.length > 0) {
            const candidate =
                el.attr('href') ||
                el.attr('value') ||
                el.attr('data-url') ||
                el.attr('data-href') ||
                el.text().trim();

            if (candidate) {
                const cleaned = cleanExtractedUrl(candidate);
                if (cleaned.startsWith('http') && isTargetUrl(cleaned)) {
                    return {
                        success: true,
                        originalUrl: url,
                        destinationUrl: cleaned,
                        service: serviceName
                    };
                }
            }
        }
    }

    // C. Cek Pola Script / JS Variables di dalam HTML
    const scriptPatterns = [
        /(?:theLinkID|destination|target_url|targetUrl|final_link|finalLink|flink|unlockLink|targetLink)\s*[:=]\s*["'](https?:\/\/[^"'\s]+)["']/i,
        /(?:window\.open|location\.href)\s*=\s*["'](https?:\/\/[^"'\s]+)["']/i,
        /atob\(["']([A-Za-z0-9+/=]{16,})["']\)/i,
        /var\s+link\s*=\s*["'](https?:\/\/[^"'\s]+)["']/i
    ];

    for (const pattern of scriptPatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
            const candidate = cleanExtractedUrl(match[1]);
            if (candidate.startsWith('http') && isTargetUrl(candidate)) {
                return {
                    success: true,
                    originalUrl: url,
                    destinationUrl: candidate,
                    service: serviceName
                };
            }
        }
    }

    // D. Scan Semua Script tags untuk URL target potensial
    let foundTarget: string | null = null;
    $('script').each((_, el) => {
        if (foundTarget) return;
        const scriptText = $(el).html() || '';
        const urlsInScript = scriptText.match(/https?:\/\/[^"'\s<>{}|\^`\\]+/g) || [];
        for (const u of urlsInScript) {
            if (isTargetUrl(u)) {
                foundTarget = cleanExtractedUrl(u);
                break;
            }
        }
    });

    if (foundTarget) {
        return {
            success: true,
            originalUrl: url,
            destinationUrl: foundTarget,
            service: serviceName
        };
    }

    throw new Error(`Tidak dapat menemukan destination link pada halaman ${serviceName} (${url}). Link mungkin telah kedaluwarsa atau dilindungi captcha.`);
}
