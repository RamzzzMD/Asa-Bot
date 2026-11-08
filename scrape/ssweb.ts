import axios from 'axios';

export type ScreenshotDeviceConfig = 'desktop' | 'tablet' | 'mobile';

export interface ScreenshotOptions {
    readonly config?: ScreenshotDeviceConfig | string;
    readonly fullPage?: boolean;
}

export interface ScreenshotResult {
    readonly buffer: Buffer;
    readonly config: ScreenshotDeviceConfig;
    readonly width: number;
    readonly height: number;
    readonly url: string;
    readonly source: 'microlink' | 'fallback';
}

export const POPULAR_CONFIGS: Record<ScreenshotDeviceConfig, { width: number; height: number; label: string }> = {
    desktop: {
        width: 1920,
        height: 1080,
        label: 'Desktop (1920x1080)'
    },
    tablet: {
        width: 800,
        height: 1024,
        label: 'Tablet (800x1024)'
    },
    mobile: {
        width: 375,
        height: 812,
        label: 'Mobile (375x812)'
    }
};

export async function scrapeScreenshot(
    targetUrl: string,
    options: ScreenshotOptions = {}
): Promise<ScreenshotResult> {
    if (!targetUrl || typeof targetUrl !== 'string') {
        throw new Error('URL target harus disertakan.');
    }

    let url = targetUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
    }

    let selectedConfig: ScreenshotDeviceConfig = 'desktop';
    const rawConfig = (options.config || '').toLowerCase().trim();
    if (rawConfig === 'mobile' || rawConfig === 'hp' || rawConfig === 'phone') {
        selectedConfig = 'mobile';
    } else if (rawConfig === 'tablet' || rawConfig === 'tab' || rawConfig === 'ipad') {
        selectedConfig = 'tablet';
    } else {
        selectedConfig = 'desktop';
    }

    const { width, height } = POPULAR_CONFIGS[selectedConfig];

    // 1. Coba request ke Microlink
    try {
        let microlinkUrl = `https://api.microlink.io?url=${encodeURIComponent(url)}&screenshot=true&meta=false&viewport.width=${width}&viewport.height=${height}&device=${selectedConfig}&adblock=true`;
        if (options.fullPage) {
            microlinkUrl += '&screenshot.fullPage=true';
        }

        const res = await axios.get(microlinkUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                Origin: 'https://microlink.io',
                Referer: 'https://microlink.io/tools/website-screenshot'
            },
            timeout: 25000,
            validateStatus: (status) => status === 200
        });

        const screenshotUrl = res.data?.data?.screenshot?.url;
        if (screenshotUrl) {
            const imgRes = await axios.get(screenshotUrl, {
                responseType: 'arraybuffer',
                timeout: 20000
            });
            return {
                buffer: Buffer.from(imgRes.data),
                config: selectedConfig,
                width,
                height,
                url,
                source: 'microlink'
            };
        }
    } catch {
        // Fallback jika Microlink rate-limited (HTTP 429) atau error
    }

    // 2. Fallback Engine beresolusi tinggi dengan dimensi yang sama persis
    try {
        const fallbackUrl = `https://image.thum.io/get/width/${width}/crop/${height}/noanimate/${url}`;
        const fallbackRes = await axios.get(fallbackUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            },
            responseType: 'arraybuffer',
            timeout: 30000
        });

        if (fallbackRes.status === 200 && fallbackRes.data && fallbackRes.data.length > 1000) {
            return {
                buffer: Buffer.from(fallbackRes.data),
                config: selectedConfig,
                width,
                height,
                url,
                source: 'fallback'
            };
        }
    } catch (err: any) {
        throw new Error(err.message || 'Gagal mengambil screenshot website.');
    }

    throw new Error('Gagal mengambil screenshot dari semua penyedia.');
}

export default {
    scrape: scrapeScreenshot,
    POPULAR_CONFIGS
};
