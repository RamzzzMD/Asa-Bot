import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

const execFileAsync = promisify(execFile);

export interface InstagramPostInfo {
    username?: string | null;
    caption?: string | null;
    source?: string | null;
    likes?: number | null;
    total_comments?: number | null;
    posted_at?: string | null;
}

export interface InstagramMedia {
    type: 'video' | 'image';
    quality?: string | null;
    extension?: string | null;
    download_url: string;
    thumbnail?: string | null;
}

export interface InstagramResult {
    post_info: InstagramPostInfo;
    medias: InstagramMedia[];
}

function getYtDlpPath(): string {
    if (process.env.YT_DLP_PATH && fs.existsSync(process.env.YT_DLP_PATH)) {
        return process.env.YT_DLP_PATH;
    }
    const localBin = path.resolve(process.cwd(), 'node_modules/youtube-dl-exec/bin/yt-dlp');
    if (fs.existsSync(localBin)) {
        return localBin;
    }
    if (fs.existsSync('/usr/local/bin/yt-dlp')) {
        return '/usr/local/bin/yt-dlp';
    }
    return 'yt-dlp';
}

export async function ytDlpInstagram(url: string): Promise<InstagramResult> {
    const { stdout } = await execFileAsync(
        getYtDlpPath(),
        ['--dump-json', '--yes-playlist', '--no-warnings', url],
        { timeout: 60000, maxBuffer: 20 * 1024 * 1024 }
    );

    const entries = stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line));

    if (!entries.length) throw new Error('Media tidak ditemukan');

    const first = entries[0];

    const postInfo: InstagramPostInfo = {
        username: first.uploader || first.uploader_id || null,
        caption: first.description || first.title || null,
        source: first.webpage_url || url,
        likes: first.like_count ?? null,
        total_comments: first.comment_count ?? null,
        posted_at: first.timestamp ? new Date(first.timestamp * 1000).toISOString() : null
    };

    const medias: InstagramMedia[] = entries
        .map((entry: any) => {
            const formats = entry.formats || [];
            const bestVideo = formats
                .filter((f: any) => f.vcodec !== 'none' && f.url)
                .sort((a: any, b: any) => (b.height || 0) - (a.height || 0))[0];

            if (bestVideo) {
                return {
                    type: 'video' as const,
                    quality: bestVideo.height ? `${bestVideo.height}p` : null,
                    extension: bestVideo.ext || 'mp4',
                    download_url: bestVideo.url,
                    thumbnail: entry.thumbnail || null
                };
            }

            return {
                type: 'image' as const,
                quality: null,
                extension: entry.ext || 'jpg',
                download_url: entry.url || entry.thumbnail || null,
                thumbnail: entry.thumbnail || null
            };
        })
        .filter((m: any) => Boolean(m.download_url));

    if (!medias.length) throw new Error('Media tidak ditemukan');

    return { post_info: postInfo, medias };
}

const BASE_URL = 'https://sssinstagram.com/pt';
const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36';

function cleanResponse(rawData: any[]): InstagramResult | null {
    if (!Array.isArray(rawData) || rawData.length === 0) return null;

    const firstMeta = rawData[0].meta || {};

    const postInfo: InstagramPostInfo = {
        username: firstMeta.username || null,
        caption: firstMeta.title || null,
        source: firstMeta.source || null,
        likes: firstMeta.like_count ?? null,
        total_comments: firstMeta.comment_count ?? null,
        posted_at: firstMeta.taken_at ? new Date(firstMeta.taken_at * 1000).toISOString() : null
    };

    const medias: InstagramMedia[] = rawData.map((item: any) => {
        const best = item.url?.[0] || {};
        return {
            type: (best.type === 'jpg' ? 'image' : 'video') as 'image' | 'video',
            quality: best.subname || null,
            extension: best.ext || null,
            download_url: best.url || null,
            thumbnail: item.thumb || null
        };
    }).filter((m: any) => Boolean(m.download_url));

    return { post_info: postInfo, medias };
}

export async function fallbackDownload(inputUrl: string): Promise<InstagramResult> {
    const jar = new CookieJar();
    const api = wrapper(
        axios.create({
            jar,
            withCredentials: true,
            timeout: 30000,
            validateStatus: () => true,
            headers: {
                'user-agent': UA,
                accept: '*/*',
                'accept-language': 'en-US,en;q=0.9'
            }
        })
    );

    await api.get(BASE_URL, {
        headers: { accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' }
    });

    const cookies = await jar.getCookies(BASE_URL);
    const xsrfCookie = cookies.find((c) => c.key === 'XSRF-TOKEN');
    const token = xsrfCookie ? decodeURIComponent(xsrfCookie.value) : '';

    if (!token) throw new Error('Gagal mendapatkan token sesi Instagram, coba lagi');

    const res = await api.post(
        `${BASE_URL}/r`,
        { link: inputUrl, token: '' },
        {
            headers: {
                'content-type': 'application/json',
                origin: 'https://sssinstagram.com',
                referer: `${BASE_URL}/`,
                'x-requested-with': 'XMLHttpRequest',
                'x-xsrf-token': token
            }
        }
    );

    if (res.status !== 200 || !res.data) {
        throw new Error('Gagal mengambil data Instagram, pastikan url valid & publik');
    }

    const cleaned = cleanResponse(res.data);

    if (!cleaned || cleaned.medias.length === 0) {
        throw new Error('Media tidak ditemukan, url mungkin invalid atau privat');
    }

    return cleaned;
}

export async function instagramDownload(inputUrl: string): Promise<InstagramResult> {
    try {
        return await ytDlpInstagram(inputUrl);
    } catch (err: any) {
        try {
            return await fallbackDownload(inputUrl);
        } catch {
            throw new Error(err.message || 'Gagal mengunduh media Instagram');
        }
    }
}

export default instagramDownload;
