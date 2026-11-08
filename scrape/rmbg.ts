// @ts-nocheck
/**
 * Scraper: Slazzer AI Background Removal (Zero-Dependency Node.js ESM)
 * Bot: Enami Asa Ai
 * Owner: Ranzz Suaminya Asa
 */
import { existsSync, readFileSync } from 'node:fs';

const BASE_URL = 'https://www.slazzer.com';
const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function parseCookies(headers: any): Record<string, string> {
    const raw = headers.getSetCookie ? headers.getSetCookie() : [];
    const map: Record<string, string> = {};
    for (const c of raw) {
        const parts = c.split(';')[0].split('=');
        if (parts.length === 2) {
            map[parts[0].trim()] = parts[1].trim();
        }
    }
    return map;
}

function buildCookieString(cookieMap: Record<string, string>): string {
    return Object.entries(cookieMap)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
}

export async function removeBg(imageInput: any, _options: Record<string, any> = {}) {
    if (!imageInput) {
        throw new Error('imageInput is required (file path, URL, or Buffer)');
    }

    let imageBytes: Buffer;
    let filename = 'image.jpg';

    if (typeof imageInput === 'string') {
        if (existsSync(imageInput)) {
            imageBytes = readFileSync(imageInput);
            const rawName = imageInput.split(/[/\\]/).pop() || 'image.jpg';
            filename = /\.(jpe?g|png|webp)$/i.test(rawName) ? rawName : `${rawName}.jpg`;
        } else if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
            const resp = await fetch(imageInput, { headers: { 'User-Agent': USER_AGENT } });
            if (!resp.ok) {
                throw new Error(`Failed to fetch image from URL: HTTP ${resp.status}`);
            }
            const ab = await resp.arrayBuffer();
            imageBytes = Buffer.from(ab);
            const rawName = imageInput.split(/[?#]/)[0].split('/').pop() || 'image.jpg';
            filename = /\.(jpe?g|png|webp)$/i.test(rawName) ? rawName : `${rawName}.jpg`;
        } else {
            throw new Error('Invalid imageInput string (not an existing file path or URL)');
        }
    } else if (Buffer.isBuffer(imageInput) || imageInput instanceof Uint8Array) {
        imageBytes = Buffer.from(imageInput);
    } else {
        throw new Error('imageInput must be a file path, URL, or Buffer');
    }

    const pageRes = await fetch(`${BASE_URL}/upload`, {
        headers: { 'User-Agent': USER_AGENT }
    });
    if (!pageRes.ok) {
        throw new Error(`Failed to initialize session: HTTP ${pageRes.status}`);
    }

    const html = await pageRes.text();
    const csrfMatch = html.match(/name=["']csrf-token["']\s+content=["']([^"']+)["']/);
    const csrfToken = csrfMatch ? csrfMatch[1] : '';

    const cookieMap = parseCookies(pageRes.headers);
    let cookieHeader = buildCookieString(cookieMap);

    const trustRes = await fetch(`${BASE_URL}/generate_trust_token`, {
        method: 'POST',
        headers: {
            'User-Agent': USER_AGENT,
            'X-CSRFToken': csrfToken,
            Referer: `${BASE_URL}/upload`,
            'X-Requested-With': 'XMLHttpRequest',
            Cookie: cookieHeader
        }
    });

    if (!trustRes.ok) {
        throw new Error(`Failed to obtain trust token: HTTP ${trustRes.status}`);
    }

    const trustData = (await trustRes.json()) as any;
    const trustToken = trustData.trust_token;
    if (!trustToken) {
        throw new Error('Trust token missing from server response');
    }

    const trustCookies = parseCookies(trustRes.headers);
    Object.assign(cookieMap, trustCookies);
    cookieHeader = buildCookieString(cookieMap);

    const boundary =
        '----WebKitFormBoundary' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const autogenId = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

    const parts = [
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="autogenerate_id"\r\n\r\n${autogenId}\r\n`),
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file_name"\r\n\r\nsource_${filename}\r\n`),
        Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="source_image_file"; filename="source_${filename}"\r\nContent-Type: image/jpeg\r\n\r\n`
        ),
        imageBytes,
        Buffer.from(`\r\n--${boundary}--\r\n`)
    ];

    const bodyBuffer = Buffer.concat(parts);

    const uploadRes = await fetch(`${BASE_URL}/upload_image`, {
        method: 'POST',
        headers: {
            'User-Agent': USER_AGENT,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'X-CSRFToken': csrfToken,
            'X-Trust-Token': trustToken,
            Referer: `${BASE_URL}/upload`,
            'X-Requested-With': 'XMLHttpRequest',
            Cookie: cookieHeader
        },
        body: bodyBuffer
    });

    if (!uploadRes.ok) {
        throw new Error(`Upload processing failed: HTTP ${uploadRes.status}`);
    }

    const data = (await uploadRes.json()) as any;
    if (!data.status) {
        throw new Error(data.message || 'Background removal failed');
    }

    const outputRelative = data.preview_size_output_image;
    const originalRelative = data.original_image;
    const outputUrl = outputRelative ? `${BASE_URL}${outputRelative}` : null;

    let buffer: Buffer | null = null;
    if (outputUrl) {
        try {
            buffer = await downloadMedia(outputUrl);
        } catch {
            buffer = null;
        }
    }

    return {
        status: data.status,
        message: data.message,
        autogenId,
        width: data.preview_size_image_width,
        height: data.preview_size_image_height,
        outputUrl,
        originalUrl: originalRelative ? `${BASE_URL}${originalRelative}` : null,
        isCarImage: Boolean(data.is_car_image),
        buffer
    };
}

export async function downloadMedia(url: string): Promise<Buffer> {
    if (!url || typeof url !== 'string') {
        throw new Error('URL is required');
    }
    const res = await fetch(url, {
        headers: {
            'User-Agent': USER_AGENT,
            Referer: BASE_URL
        }
    });
    if (!res.ok) {
        throw new Error(`Download failed: HTTP ${res.status}`);
    }
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
}

export default removeBg;

