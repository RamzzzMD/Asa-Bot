import axios from 'axios';
import * as cheerio from 'cheerio';

export const MOBILE_HEADERS: Record<string, string> = {
    'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1'
};

export const API_HEADERS: Record<string, string> = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Referer': 'https://www.tiktok.com/',
    'Accept': 'application/json, text/plain, */*'
};

export interface TikTokCommentUser {
    id?: string;
    username?: string;
    nickname?: string;
    avatar?: string | null;
}

export interface TikTokComment {
    id: string;
    text: string;
    likes: number;
    replyCount: number;
    createTime: string | null;
    user: TikTokCommentUser;
}

export interface TikTokAuthor {
    id?: string;
    username?: string;
    nickname?: string;
    avatar?: string | null;
    signature?: string;
    verified?: boolean;
    following?: number | null;
    followers?: number | null;
    totalLikes?: number | null;
}

export interface TikTokStats {
    likes: number;
    shares: number;
    comments: number;
    plays: number;
    favorites: number;
}

export interface TikTokMusic {
    id?: string;
    title?: string;
    author?: string;
    album?: string;
    duration?: number;
    playUrl?: string;
    cover?: string | null;
}

export interface TikTokBitrate {
    quality?: string;
    bitrate?: number;
    codec?: string;
    url?: string;
}

export interface TikTokVideoMedia {
    directStreamUrl?: string | null;
    downloadUrl?: string | null;
    noWatermark?: string | null;
    direct?: string | null;
    headers?: Record<string, string>;
    format?: string;
    duration?: number;
    quality?: string;
    dimensions?: {
        width?: number;
        height?: number;
        ratio?: string;
    };
    cover?: string;
    dynamicCover?: string;
    originCover?: string;
    bitrates?: TikTokBitrate[];
}

export interface TikTokMedia {
    video?: TikTokVideoMedia;
    photos?: string[];
}

export interface TikTokResult {
    status: boolean;
    source?: string;
    id?: string;
    description?: string;
    createTime?: string | null;
    author?: TikTokAuthor;
    stats?: TikTokStats;
    music?: TikTokMusic | null;
    type?: 'photo' | 'video';
    media?: TikTokMedia;
    topComments?: TikTokComment[];
    error?: string;
}

export interface TikTokScrapeOptions {
    includeComments?: boolean;
    commentCount?: number;
}

export async function extractTikTokId(url: string): Promise<string> {
    let targetUrl = url.trim();

    if (url.includes('vt.tiktok.com') || url.includes('vm.tiktok.com') || url.includes('/t/')) {
        const res = await axios.get(url, {
            headers: MOBILE_HEADERS,
            maxRedirects: 5,
            validateStatus: (status) => status >= 200 && status < 400
        });
        targetUrl = res.request?.res?.responseUrl || url;
    }

    const match = targetUrl.match(/\/(?:video|photo|v)\/(\d+)/i) || targetUrl.match(/(\d{15,22})/);
    if (match && match[1]) {
        return match[1];
    }

    throw new Error('Tidak dapat menemukan ID video/post dari URL TikTok yang diberikan.');
}

export async function fetchTopComments(videoId: string, count: number = 10): Promise<TikTokComment[]> {
    try {
        const url = `https://www.tiktok.com/api/comment/list/?aid=1988&app_language=en&app_name=tiktok_web&aweme_id=${videoId}&count=${count}&cursor=0`;
        const res = await axios.get(url, { headers: API_HEADERS, timeout: 7000 });

        if (res.data && Array.isArray(res.data.comments)) {
            return res.data.comments.map((c: any) => ({
                id: c.cid,
                text: c.text,
                likes: c.digg_count || 0,
                replyCount: c.reply_comment_total || 0,
                createTime: c.create_time ? new Date(c.create_time * 1000).toISOString() : null,
                user: {
                    id: c.user?.uid,
                    username: c.user?.unique_id,
                    nickname: c.user?.nickname,
                    avatar: c.user?.avatar_thumb?.url_list?.[0] || null
                }
            }));
        }
        return [];
    } catch {
        return [];
    }
}

export async function downloadMedia(mediaUrl: string, customHeaders: Record<string, string> = {}): Promise<Buffer> {
    const headers = {
        ...MOBILE_HEADERS,
        'Referer': 'https://m.tiktok.com/',
        ...customHeaders
    };

    const response = await axios.get(mediaUrl, {
        headers,
        responseType: 'arraybuffer',
        timeout: 30000
    });

    return Buffer.from(response.data);
}

export async function scrapeTikTok(
    inputUrl: string,
    options: TikTokScrapeOptions = { includeComments: true, commentCount: 10 }
): Promise<TikTokResult> {
    try {
        const videoId = await extractTikTokId(inputUrl);
        const endpoint = `https://m.tiktok.com/v/${videoId}.html`;

        const [postResponse, topComments] = await Promise.all([
            axios.get(endpoint, { headers: MOBILE_HEADERS, timeout: 10000 }),
            options.includeComments ? fetchTopComments(videoId, options.commentCount || 10) : Promise.resolve([])
        ]);

        const rawCookies = postResponse.headers['set-cookie'];
        const cookies = Array.isArray(rawCookies)
            ? rawCookies.map(c => c.split(';')[0]).join('; ')
            : rawCookies ? String(rawCookies).split(';')[0] : '';

        const $ = cheerio.load(postResponse.data as string);
        const rawJson = $('script#__UNIVERSAL_DATA_FOR_REHYDRATION__').html();
        if (!rawJson) {
            throw new Error('Gagal mengekstrak script data rehydration dari tiktok.com');
        }

        const universalData = JSON.parse(rawJson);
        const scope = universalData['__DEFAULT_SCOPE__'] || {};
        const videoDetail = scope['webapp.reflow.video.detail'] || scope['webapp.video-detail'];

        if (!videoDetail || !videoDetail.itemInfo || !videoDetail.itemInfo.itemStruct) {
            if (videoDetail?.statusCode === 10204) {
                throw new Error('Video/post tidak ditemukan atau bersifat privat di TikTok');
            }
            throw new Error(`Data postingan tidak ditemukan (Status: ${videoDetail?.statusMessage || videoDetail?.statusMsg || 'Unknown'})`);
        }

        const item = videoDetail.itemInfo.itemStruct;

        const mediaHeaders: Record<string, string> = {
            'User-Agent': MOBILE_HEADERS['User-Agent'],
            'Referer': 'https://m.tiktok.com/',
            'Cookie': cookies
        };

        const result: TikTokResult = {
            status: true,
            source: 'tiktok.com (Axios + Cheerio Native)',
            id: item.id,
            description: item.desc || '',
            createTime: item.createTime ? new Date(Number(item.createTime) * 1000).toISOString() : null,
            author: {
                id: item.author?.id,
                username: item.author?.uniqueId,
                nickname: item.author?.nickname,
                avatar: item.author?.avatarLarger || item.author?.avatarMedium || item.author?.avatarThumb,
                signature: item.author?.signature || '',
                verified: item.author?.verified || false,
                following: item.authorStats?.followingCount ?? null,
                followers: item.authorStats?.followerCount ?? null,
                totalLikes: item.authorStats?.heartCount ?? null
            },
            stats: {
                likes: item.stats?.diggCount ?? 0,
                shares: item.stats?.shareCount ?? 0,
                comments: item.stats?.commentCount ?? 0,
                plays: item.stats?.playCount ?? 0,
                favorites: item.stats?.collectCount ?? 0
            },
            music: item.music ? {
                id: item.music.id,
                title: item.music.title,
                author: item.music.authorName,
                album: item.music.album,
                duration: item.music.duration,
                playUrl: item.music.playUrl,
                cover: item.music.coverLarge || item.music.coverMedium
            } : null,
            type: item.imagePost ? 'photo' : 'video',
            media: {},
            topComments: topComments
        };

        if (item.video) {
            const directUrl = item.video.playAddr || null;
            const dlUrl = item.video.downloadAddr || directUrl;
            result.media = result.media || {};
            result.media.video = {
                directStreamUrl: directUrl,
                downloadUrl: dlUrl,
                noWatermark: directUrl || dlUrl,
                direct: directUrl,
                headers: mediaHeaders,
                format: item.video.format,
                duration: item.video.duration,
                quality: item.video.videoQuality,
                dimensions: {
                    width: item.video.width,
                    height: item.video.height,
                    ratio: item.video.ratio
                },
                cover: item.video.cover,
                dynamicCover: item.video.dynamicCover,
                originCover: item.video.originCover,
                bitrates: (item.video.bitrateInfo || []).map((b: any) => ({
                    quality: b.GearName,
                    bitrate: b.Bitrate,
                    codec: b.CodecType,
                    url: b.PlayAddr?.UrlList?.[0]
                }))
            };
        }

        if (item.imagePost && Array.isArray(item.imagePost.images)) {
            result.media = result.media || {};
            result.media.photos = item.imagePost.images.map((img: any) => {
                return img.imageURL?.urlList?.[0] || null;
            }).filter(Boolean);
        }

        return result;
    } catch (error: any) {
        return {
            status: false,
            error: error.message || 'Terjadi kesalahan saat scraping tiktok.com'
        };
    }
}

export default scrapeTikTok;
