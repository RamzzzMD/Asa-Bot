import axios, { type AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'node:crypto';

export interface SflBypassResult {
    readonly success: boolean;
    readonly originalUrl: string;
    readonly destinationUrl: string;
    readonly readyGoUrl?: string;
    readonly error?: string;
}

export async function bypassSfl(targetUrl: string, maxSteps = 25): Promise<SflBypassResult> {
    if (!targetUrl || typeof targetUrl !== 'string') {
        throw new Error('URL target sfl.gl harus berupa string.');
    }

    let url = targetUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
    }

    const jar: Record<string, string> = {};
    const updateCookies = (res: AxiosResponse): void => {
        const raw = res.headers['set-cookie'] || [];
        for (const cookie of raw) {
            const [pair] = cookie.split(';');
            const [k, v] = pair.split('=');
            if (k && v) {
                jar[k.trim()] = v.trim();
            }
        }
    };

    const getCookieHeader = (): string =>
        Object.entries(jar)
            .map(([k, v]) => `${k}=${v}`)
            .join('; ');

    const defaultHeaders = {
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Upgrade-Insecure-Requests': '1'
    };

    const res1 = await axios.get(url, {
        headers: defaultHeaders,
        timeout: 15000,
        validateStatus: () => true
    });
    updateCookies(res1);

    const $1 = cheerio.load(String(res1.data || ''));
    const form = $1('form#form, form[action*="redirect.php"]');
    const action = form.attr('action');
    const rayId = form.find('input[name="ray_id"]').val() as string | undefined;
    const alias = form.find('input[name="alias"]').val() as string | undefined;

    if (!action || !rayId || !alias) {
        throw new Error('Gagal mengekstrak form redirect sfl.gl. Pastikan link masih aktif.');
    }

    const redirectUrl = `${action}?ray_id=${encodeURIComponent(rayId)}&alias=${encodeURIComponent(alias)}`;
    const res2 = await axios.get(redirectUrl, {
        headers: {
            ...defaultHeaders,
            Referer: url,
            Cookie: getCookieHeader()
        },
        maxRedirects: 0,
        timeout: 15000,
        validateStatus: () => true
    });
    updateCookies(res2);

    const firstPagePath = res2.headers.location;
    if (!firstPagePath) {
        throw new Error('Gagal mendapatkan header location redirect ke halaman awal artikel.');
    }

    const buildToken = (): string => {
        const hash = crypto.createHash('sha256').update(`fp_${Date.now()}_${Math.random()}`).digest('hex');
        const u = `#${Buffer.from(hash).toString('base64')}`;
        const tokenCookie = jar['XSRF-TOKEN'] || '';
        return (tokenCookie ? tokenCookie.slice(0, 128 - u.length) : '') + u;
    };

    let currentUrl = new URL(firstPagePath, redirectUrl).href;
    let prevUrl = redirectUrl;
    let readyGoUrl = '';

    for (let step = 1; step <= maxSteps; step++) {
        const pageRes = await axios.get(currentUrl, {
            headers: {
                ...defaultHeaders,
                Referer: prevUrl,
                Cookie: getCookieHeader()
            },
            timeout: 15000,
            validateStatus: () => true
        });
        updateCookies(pageRes);

        const sessionRes = await axios.post(
            'https://app.khaddavi.net/api/session',
            { _token: buildToken() },
            {
                headers: {
                    'User-Agent': defaultHeaders['User-Agent'],
                    Referer: currentUrl,
                    'Content-Type': 'application/json',
                    Cookie: getCookieHeader()
                },
                timeout: 15000,
                validateStatus: () => true
            }
        );
        updateCookies(sessionRes);

        const key = Math.floor(Math.random() * 1000);
        const size = `${(1280 + key) * 2}.${(720 + key) * 2}`;
        const goRes = await axios.post(
            'https://app.khaddavi.net/api/go',
            { key, size, ado: null },
            {
                headers: {
                    'User-Agent': defaultHeaders['User-Agent'],
                    Referer: currentUrl,
                    'Content-Type': 'application/json',
                    Cookie: getCookieHeader()
                },
                timeout: 15000,
                validateStatus: () => true
            }
        );
        updateCookies(goRes);

        if (goRes.status === 200 && goRes.data?.url) {
            readyGoUrl = String(goRes.data.url);
            break;
        }

        const verifyRes = await axios.post(
            'https://app.khaddavi.net/api/verify',
            { _a: 0 },
            {
                headers: {
                    'User-Agent': defaultHeaders['User-Agent'],
                    Referer: currentUrl,
                    'Content-Type': 'application/json',
                    Cookie: getCookieHeader()
                },
                timeout: 15000,
                validateStatus: () => true
            }
        );
        updateCookies(verifyRes);

        const nextTarget = verifyRes.data?.target as string | undefined;
        if (!nextTarget) {
            throw new Error(`Gagal melanjutkan pada step ${step}: ${verifyRes.data?.message || 'Target tidak ditemukan'}`);
        }

        const redirectRes = await axios.get(nextTarget, {
            headers: {
                ...defaultHeaders,
                Referer: currentUrl,
                Cookie: getCookieHeader()
            },
            maxRedirects: 0,
            timeout: 15000,
            validateStatus: () => true
        });
        updateCookies(redirectRes);

        const nextLocation = redirectRes.headers.location;
        if (!nextLocation) {
            throw new Error(`Gagal mendapatkan redirect location pada step ${step}`);
        }

        prevUrl = nextTarget;
        currentUrl = new URL(nextLocation, nextTarget).href;
    }

    if (!readyGoUrl) {
        throw new Error('Mencapai batas maksimum step tanpa menemukan tautan akhir.');
    }

    const resReady = await axios.get(readyGoUrl, {
        headers: {
            ...defaultHeaders,
            Referer: currentUrl,
            Cookie: getCookieHeader()
        },
        timeout: 15000,
        validateStatus: () => true
    });

    const body = String(resReady.data || '');
    let destinationUrl = '';
    const matchHref = body.match(/window\.location\.href\s*=\s*["']([^"']+)["']/);
    if (matchHref?.[1]) {
        destinationUrl = matchHref[1].replace(/\\\//g, '/');
    } else {
        const $ready = cheerio.load(body);
        const anchor = $ready('a[href^="http"]').first().attr('href');
        if (anchor) {
            destinationUrl = anchor;
        }
    }

    if (!destinationUrl) {
        destinationUrl = readyGoUrl;
    }

    return {
        success: true,
        originalUrl: url,
        destinationUrl,
        readyGoUrl
    };
}

export default bypassSfl;
