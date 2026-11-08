// @ts-nocheck
/**
 * Scraper: Pinterest Complete (Search, Downloader for Image/GIF/Video/Carousel, and Visual Lens Search)
 * Bot: Enami Asa Ai
 * Owner: Ranzz Suaminya Asa
 */
import { existsSync, readFileSync } from 'node:fs';

const BASE_URL = 'https://www.pinterest.com';
const RESOURCE_BASE = 'https://www.pinterest.com/resource';
const DEFAULT_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export interface PinterestItem {
    id: string;
    title: string;
    description: string;
    image: string;
    url: string;
    type?: string;
    isVideo?: boolean;
    isGif?: boolean;
    thumbnail?: string | null;
    dominantColor?: string | null;
    pinner?: {
        username: string;
        fullName: string;
        avatar: string | null;
    } | null;
}

export interface PinterestSearchResult {
    status: boolean;
    query: string;
    total: number;
    results: PinterestItem[];
    error?: string;
}

let sessionCookies = '';
let csrfToken = '';

async function ensureSession() {
    if (sessionCookies && csrfToken) {
        return { cookies: sessionCookies, csrf: csrfToken };
    }
    const res = await fetch(BASE_URL, {
        headers: {
            'User-Agent': DEFAULT_UA
        }
    });
    const rawCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    const map: Record<string, string> = {};
    for (const c of rawCookies) {
        const parts = c.split(';')[0].split('=');
        if (parts.length === 2) {
            map[parts[0].trim()] = parts[1].trim();
        }
    }
    sessionCookies = Object.entries(map)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
    csrfToken = map['csrftoken'] || '';
    return { cookies: sessionCookies, csrf: csrfToken };
}

function getHeaders(
    customCookies: string | null = null,
    handler = 'www/[username]/[slug].js',
    referer = BASE_URL
): Record<string, string> {
    const cookieStr = customCookies || sessionCookies;
    const csrf = cookieStr.match(/csrftoken=([^;]+)/)?.[1] || csrfToken;
    return {
        'User-Agent': DEFAULT_UA,
        Accept: 'application/json, text/javascript, */*, q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRFToken': csrf,
        'X-Pinterest-AppState': 'active',
        'X-Pinterest-PWS-Handler': handler,
        Referer: referer,
        Cookie: cookieStr
    };
}

export async function extractPinId(input: string): Promise<string> {
    if (!input || typeof input !== 'string') {
        throw new Error('Input URL or ID is required');
    }
    const clean = input.trim();
    if (/^\d+$/.test(clean)) return clean;
    if (clean.includes('pin.it/')) {
        const res = await fetch(clean, {
            method: 'GET',
            redirect: 'follow',
            headers: {
                'User-Agent': DEFAULT_UA
            }
        });
        const m = res.url.match(/\/pin\/(\d+)/);
        if (m) return m[1];
    }
    const match = clean.match(/\/pin\/(\d+)/);
    if (match) return match[1];
    throw new Error('Unable to extract Pin ID from input');
}

async function resolveVideoDirectUrl(m3u8Url: string): Promise<string> {
    if (!m3u8Url || !m3u8Url.endsWith('.m3u8')) return m3u8Url;
    try {
        const res = await fetch(m3u8Url, {
            headers: {
                'User-Agent': DEFAULT_UA,
                Referer: BASE_URL
            }
        });
        if (!res.ok) return m3u8Url;
        const text = await res.text();
        const subPlaylists = text.match(/[A-Za-z0-9_-]+\.m3u8/g) || [];
        if (subPlaylists.length === 0) return m3u8Url;
        const bestSub = subPlaylists[subPlaylists.length - 1];
        const baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf('/') + 1);
        const subRes = await fetch(baseUrl + bestSub, {
            headers: {
                'User-Agent': DEFAULT_UA,
                Referer: BASE_URL
            }
        });
        if (!subRes.ok) return m3u8Url;
        const subText = await subRes.text();
        const cmfvMatch = subText.match(/URI="([^"]+\.cmfv)"/);
        if (cmfvMatch) {
            return baseUrl + cmfvMatch[1];
        }
    } catch {}
    return m3u8Url;
}

export async function search(query: string, options: Record<string, any> = {}) {
    if (!query || typeof query !== 'string') {
        throw new Error('Search query is required');
    }
    await ensureSession();
    const q = query.trim();
    const pageSize = options.pageSize || 25;
    const scope = options.scope || 'pins';
    const sourceUrl = `/search/${scope}/?q=${encodeURIComponent(q)}`;

    const data = {
        options: {
            query: q,
            scope,
            page_size: pageSize,
            bookmarks: options.bookmarks || []
        },
        context: {}
    };

    const params = new URLSearchParams({
        source_url: sourceUrl,
        data: JSON.stringify(data)
    });

    const url = `${RESOURCE_BASE}/BaseSearchResource/get/?${params.toString()}`;
    const headers = getHeaders(options.cookies, `www/search/${scope}.js`, `${BASE_URL}${sourceUrl}`);

    const res = await fetch(url, { headers });
    if (!res.ok) {
        throw new Error(`Pinterest search failed: HTTP ${res.status}`);
    }

    const json = (await res.json()) as any;
    const results = json.resource_response?.data?.results || [];

    return {
        query: q,
        scope,
        count: results.length,
        bookmarks: json.resource?.options?.bookmarks || [],
        results: results.map((p: any) => {
            const orig = p.images?.orig?.url || p.images?.['736x']?.url || null;
            const isGif = Boolean(orig && orig.endsWith('.gif'));
            const isVideo = Boolean(p.is_video || p.videos);
            return {
                id: p.id,
                title: p.title || p.grid_title || '',
                description: p.description || '',
                url: p.id ? `${BASE_URL}/pin/${p.id}/` : null,
                type: isVideo ? 'video' : isGif ? 'gif' : 'image',
                isVideo,
                isGif,
                image: orig,
                thumbnail: p.images?.['236x']?.url || orig,
                dominantColor: p.dominant_color || null,
                pinner: p.pinner
                    ? {
                          username: p.pinner.username,
                          fullName: p.pinner.full_name || '',
                          avatar: p.pinner.image_medium_url || null
                      }
                    : null
            };
        })
    };
}

export async function scrapePinterest(query: string, limit = 6): Promise<PinterestSearchResult> {
    try {
        const res = await search(query, { pageSize: Math.max(limit * 2, 15) });
        const validItems = (res.results || [])
            .filter((item: any) => item && item.image)
            .slice(0, limit)
            .map((item: any) => ({
                ...item,
                title: item.title || query,
                url: item.url || `${BASE_URL}/search/pins/?q=${encodeURIComponent(query)}`
            }));

        if (validItems.length === 0) {
            return {
                status: false,
                query,
                total: 0,
                results: [],
                error: `Tidak ada hasil Pinterest ditemukan untuk "${query}".`
            };
        }

        return {
            status: true,
            query,
            total: validItems.length,
            results: validItems
        };
    } catch (err: any) {
        return {
            status: false,
            query,
            total: 0,
            results: [],
            error: err.message || 'Terjadi kesalahan saat mencari di Pinterest.'
        };
    }
}

export async function getPin(urlOrId: string, options: Record<string, any> = {}) {
    await ensureSession();
    const pinId = await extractPinId(urlOrId);

    const data = {
        options: {
            id: pinId,
            field_set_key: 'detailed'
        },
        context: {}
    };

    const sourceUrl = `/pin/${pinId}/`;
    const params = new URLSearchParams({
        source_url: sourceUrl,
        data: JSON.stringify(data)
    });

    const url = `${RESOURCE_BASE}/PinResource/get/?${params.toString()}`;
    const headers = getHeaders(options.cookies, 'www/pin/[id].js', `${BASE_URL}${sourceUrl}`);

    const res = await fetch(url, { headers });
    if (!res.ok) {
        throw new Error(`Failed to fetch Pin ${pinId}: HTTP ${res.status}`);
    }

    const json = (await res.json()) as any;
    const p = json.resource_response?.data;
    if (!p) {
        throw new Error(`Pin ${pinId} not found`);
    }

    const origImage = p.images?.orig?.url || p.images?.['736x']?.url || null;
    const isGif = Boolean(origImage && origImage.endsWith('.gif'));
    const isVideo = Boolean(p.is_video || p.videos);

    let isCarousel = false;
    let carouselItems: any[] = [];

    if (p.carousel_data && Array.isArray(p.carousel_data.carousel_slots)) {
        isCarousel = true;
        carouselItems = p.carousel_data.carousel_slots
            .map((s: any, idx: number) => ({
                index: idx,
                title: s.title || '',
                details: s.details || '',
                url: s.images?.['736x']?.url || s.images?.['564x']?.url || s.images?.orig?.url || null
            }))
            .filter((it: any) => it.url !== null);
    } else if (p.story_pin_data && Array.isArray(p.story_pin_data.pages)) {
        isCarousel = true;
        p.story_pin_data.pages.forEach((page: any, idx: number) => {
            (page.blocks || []).forEach((b: any) => {
                const u = b.image?.images?.originals?.url || b.image?.images?.['736x']?.url;
                if (u) {
                    carouselItems.push({
                        index: idx,
                        title: page.title || '',
                        url: u
                    });
                }
            });
        });
    }

    let videoData = null;
    if (isVideo) {
        const vlist = p.videos?.video_list || {};
        const bestFormatKey = Object.keys(vlist).find((k) => k === 'V_720P') || Object.keys(vlist)[0];
        const bestVariant = bestFormatKey ? vlist[bestFormatKey] : null;
        if (bestVariant && bestVariant.url) {
            const directUrl = await resolveVideoDirectUrl(bestVariant.url);
            videoData = {
                hlsUrl: bestVariant.url,
                downloadUrl: directUrl,
                width: bestVariant.width || null,
                height: bestVariant.height || null,
                duration: bestVariant.duration || p.videos?.duration || null
            };
        }
    }

    let mediaType = 'image';
    if (isCarousel) mediaType = 'carousel';
    else if (isVideo) mediaType = 'video';
    else if (isGif) mediaType = 'gif';

    return {
        id: p.id,
        url: `${BASE_URL}/pin/${p.id}/`,
        title: p.title || p.grid_title || '',
        description: p.description || '',
        type: mediaType,
        isCarousel,
        isVideo,
        isGif,
        image: origImage,
        video: videoData,
        carousel: isCarousel ? carouselItems : null,
        pinner: p.pinner
            ? {
                  username: p.pinner.username,
                  fullName: p.pinner.full_name || '',
                  avatar: p.pinner.image_medium_url || null
              }
            : null,
        board: p.board
            ? {
                  id: p.board.id,
                  name: p.board.name,
                  url: p.board.url ? `${BASE_URL}${p.board.url}` : null
              }
            : null,
        dominantColor: p.dominant_color || null,
        createdAt: p.created_at || null
    };
}

async function uploadBufferOrFileToUguu(input: string | Buffer): Promise<string> {
    const fileBytes = Buffer.isBuffer(input) ? input : readFileSync(input);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).slice(2);
    const body = Buffer.concat([
        Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="files[]"; filename="image.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
        ),
        fileBytes,
        Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const res = await fetch('https://uguu.se/upload', {
        method: 'POST',
        headers: {
            'User-Agent': DEFAULT_UA,
            'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body
    });

    if (!res.ok) {
        throw new Error(`Image upload failed: HTTP ${res.status}`);
    }

    const json = (await res.json()) as any;
    const url = json.files?.[0]?.url;
    if (!url) {
        throw new Error('Image host returned empty URL');
    }
    return url;
}

async function analyzeVisualQuery(imageInput: string | Buffer): Promise<string | null> {
    let targetUrl: string | null = null;

    if (Buffer.isBuffer(imageInput)) {
        targetUrl = await uploadBufferOrFileToUguu(imageInput);
    } else if (typeof imageInput === 'string') {
        if (existsSync(imageInput)) {
            targetUrl = await uploadBufferOrFileToUguu(imageInput);
        } else if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
            targetUrl = imageInput;
        }
    }

    if (!targetUrl) {
        return null;
    }

    const bingUrl = `https://www.bing.com/images/search?view=detailv2&iss=SBI&form=L2MS03&sbisrc=UrlPaste&q=imgurl:${encodeURIComponent(targetUrl)}`;
    const res = await fetch(bingUrl, {
        headers: {
            'User-Agent': DEFAULT_UA
        }
    });

    if (!res.ok) {
        return null;
    }

    const html = await res.text();
    const match = html.match(/format=rss(?:&amp;|&)q=([^&"]+)/);
    if (match) {
        return decodeURIComponent(match[1].replace(/\+/g, ' '));
    }

    const queryMatch = html.match(/data-query="([^"]+)"/);
    if (queryMatch) {
        return queryMatch[1];
    }

    return null;
}

export async function lens(input: string | Buffer, options: Record<string, any> = {}) {
    if (!input) {
        throw new Error('Input is required (Pin URL, Pin ID, Image URL, Buffer, or local image path)');
    }

    if (typeof input === 'string' && (input.includes('pinterest.com/pin/') || input.includes('pin.it/'))) {
        const pin = await getPin(input, options);
        const query = pin.title || pin.description || 'aesthetic';
        const related = await search(query, { pageSize: options.pageSize || 20 });
        return {
            type: 'pin',
            sourcePin: pin,
            searchQuery: query,
            results: related.results
        };
    }

    const query = await analyzeVisualQuery(input);
    if (!query) {
        throw new Error('Could not extract visual query from image');
    }

    const searchResults = await search(query, { pageSize: options.pageSize || 20 });
    return {
        type: 'visual_search',
        recognizedQuery: query,
        results: searchResults.results
    };
}

export async function downloadMedia(url: string): Promise<Buffer> {
    if (!url || typeof url !== 'string') {
        throw new Error('URL is required');
    }
    const res = await fetch(url, {
        headers: {
            'User-Agent': DEFAULT_UA,
            Referer: BASE_URL
        }
    });
    if (!res.ok) {
        throw new Error(`Download failed: HTTP ${res.status}`);
    }
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
}

export default {
    search,
    scrapePinterest,
    getPin,
    lens,
    extractPinId,
    downloadMedia
};
