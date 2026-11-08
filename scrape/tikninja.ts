import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'node:crypto';

export interface TikTokStalkVideo {
    readonly id: string;
    readonly title: string;
    readonly duration: number;
    readonly playUrl: string;
    readonly cover: string;
    readonly playCount: number;
    readonly diggCount: number;
    readonly commentCount: number;
    readonly shareCount: number;
    readonly createTime?: number;
}

export interface TikTokStalkUser {
    readonly id: string;
    readonly uniqueId: string;
    readonly nickname: string;
    readonly avatar: string;
    readonly signature: string;
    readonly bioLink?: string;
    readonly verified: boolean;
    readonly followerCount: number;
    readonly followingCount: number;
    readonly heartCount: number;
    readonly videoCount: number;
}

export interface TikTokStalkResult {
    readonly success: boolean;
    readonly user: TikTokStalkUser;
    readonly videos: TikTokStalkVideo[];
    readonly source: 'tik.ninja' | 'tiktok.com';
}

const DEFAULT_USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const MOBILE_USER_AGENT =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';

async function stalkViaTikNinja(rawUsername: string, videoCount = 5): Promise<TikTokStalkResult> {
    const cleanUsername = rawUsername.replace(/^@/, '').trim();

    // 1. Dapatkan halaman awal untuk TOKEN, JS_CHALLENGE_SEED & PHPSESSID
    const homeRes = await axios.get('https://tik.ninja/', {
        headers: {
            'User-Agent': DEFAULT_USER_AGENT,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 15000
    });

    const cookies = homeRes.headers['set-cookie']?.map((c) => c.split(';')[0]).join('; ') || '';
    const tokenMatch = homeRes.data.match(/const TOKEN\s*=\s*"([^"]+)";/);
    const seedMatch = homeRes.data.match(/const JS_CHALLENGE_SEED\s*=\s*"([^"]+)";/);

    if (!tokenMatch || !seedMatch) {
        throw new Error('Gagal mengekstrak token dari tik.ninja');
    }

    const token = tokenMatch[1];
    const seed = seedMatch[1];

    // Jeda 1.5 detik untuk melewati proteksi anti-bot tik.ninja
    await new Promise((resolve) => setTimeout(resolve, 1500));

    async function callApi(action: string, params: Record<string, any>): Promise<any> {
        const bucket = Math.floor(Date.now() / 30000);
        const raw = `${seed}:${token}:${bucket}:${action}:tik.ninja`;
        const jsToken = crypto.createHash('sha256').update(raw).digest('hex');

        const payload = {
            ...params,
            action,
            hp: '',
            js_token: jsToken,
            js_bucket: String(bucket),
            __client_build: 'js-token-body-v3'
        };

        const res = await axios.post('https://tik.ninja/api.php', payload, {
            validateStatus: () => true,
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Token': token,
                'X-JS-Token': jsToken,
                'X-JS-Bucket': String(bucket),
                'X-Client-Build': 'js-token-body-v3',
                'User-Agent': DEFAULT_USER_AGENT,
                Origin: 'https://tik.ninja',
                Referer: 'https://tik.ninja/',
                Cookie: cookies
            },
            timeout: 20000
        });

        let respData = res.data;
        if (respData && respData._d) {
            const rawKey = `${seed}:${token}:response:tik.ninja`;
            const keyHash = crypto.createHash('sha256').update(rawKey).digest();
            const iv = Buffer.from(respData._i, 'base64');
            const encrypted = Buffer.from(respData._d, 'base64');
            const decipher = crypto.createDecipheriv('aes-256-cbc', keyHash, iv);
            let dec = decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
            respData = JSON.parse(dec);
        }

        if (!respData || (respData.error && !respData.data)) {
            throw new Error(respData?.error || 'Permintaan ke API tik.ninja gagal');
        }

        return respData.data || respData;
    }

    const userData = await callApi('get_user', { unique_id: cleanUsername });
    const userObj = userData.user || {};
    const statsObj = userData.stats || {};

    const user: TikTokStalkUser = {
        id: String(userObj.id || ''),
        uniqueId: userObj.uniqueId || cleanUsername,
        nickname: userObj.nickname || cleanUsername,
        avatar: userObj.avatarLarger || userObj.avatarMedium || userObj.avatarThumb || '',
        signature: userObj.signature || '',
        bioLink: userObj.bioLink?.link || undefined,
        verified: Boolean(userObj.verified),
        followerCount: Number(statsObj.followerCount || 0),
        followingCount: Number(statsObj.followingCount || 0),
        heartCount: Number(statsObj.heartCount || statsObj.heart || 0),
        videoCount: Number(statsObj.videoCount || 0)
    };

    let videos: TikTokStalkVideo[] = [];
    if (user.id) {
        try {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const limit = Math.max(1, Math.min(5, videoCount));
            const postsData = await callApi('get_posts', {
                user_id: user.id,
                cursor: '0',
                count: limit
            });

            const rawVideos = Array.isArray(postsData.videos) ? postsData.videos : [];
            videos = rawVideos.slice(0, limit).map((v: any) => ({
                id: String(v.video_id || v.aweme_id || v.id || ''),
                title: v.title || v.desc || '',
                duration: Number(v.duration || 0),
                playUrl: v.play || v.play_url || v.video?.play_addr?.url_list?.[0] || '',
                cover: v.cover || v.origin_cover || v.ai_dynamic_cover || '',
                playCount: Number(v.play_count || 0),
                diggCount: Number(v.digg_count || 0),
                commentCount: Number(v.comment_count || 0),
                shareCount: Number(v.share_count || 0),
                createTime: v.create_time ? Number(v.create_time) : undefined
            }));
        } catch {
            // Jika pengambilan video gagal, tetap kembalikan info profil user
        }
    }

    return {
        success: true,
        user,
        videos,
        source: 'tik.ninja'
    };
}

async function stalkViaTikTokWeb(rawUsername: string): Promise<TikTokStalkResult> {
    const cleanUsername = rawUsername.replace(/^@/, '').trim();
    const url = `https://www.tiktok.com/@${cleanUsername}`;

    const res = await axios.get(url, {
        headers: {
            'User-Agent': MOBILE_USER_AGENT,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 15000,
        validateStatus: () => true
    });

    const $ = cheerio.load(String(res.data || ''));
    const rawJson = $('script#__UNIVERSAL_DATA_FOR_REHYDRATION__').html();
    if (!rawJson) {
        throw new Error('Gagal mengekstrak data TikTok pengguna');
    }

    const universal = JSON.parse(rawJson);
    const scope = universal['__DEFAULT_SCOPE__'] || {};
    const userDetail = scope['webapp.user-detail'];

    if (!userDetail || !userDetail.userInfo || !userDetail.userInfo.user) {
        throw new Error('Profil pengguna TikTok tidak ditemukan atau privat');
    }

    const u = userDetail.userInfo.user;
    const s = userDetail.userInfo.stats || {};

    const user: TikTokStalkUser = {
        id: String(u.id || ''),
        uniqueId: u.uniqueId || cleanUsername,
        nickname: u.nickname || cleanUsername,
        avatar: u.avatarLarger || u.avatarMedium || u.avatarThumb || '',
        signature: u.signature || '',
        bioLink: u.bioLink?.link || undefined,
        verified: Boolean(u.verified),
        followerCount: Number(s.followerCount || 0),
        followingCount: Number(s.followingCount || 0),
        heartCount: Number(s.heartCount || s.heart || 0),
        videoCount: Number(s.videoCount || 0)
    };

    return {
        success: true,
        user,
        videos: [],
        source: 'tiktok.com'
    };
}

export async function stalkTikTok(
    username: string,
    videoCount = 5
): Promise<TikTokStalkResult> {
    if (!username || typeof username !== 'string') {
        throw new Error('Username TikTok harus disertakan.');
    }

    const cleanUsername = username.replace(/^https?:\/\/.*tiktok\.com\/@/i, '').replace(/^@/, '').split('?')[0].trim();

    // 1. Coba via https://tik.ninja/
    try {
        return await stalkViaTikNinja(cleanUsername, videoCount);
    } catch {
        // 2. Fallback via TikTok Web App Rehydration
        try {
            return await stalkViaTikTokWeb(cleanUsername);
        } catch (err: any) {
            throw new Error(`Gagal stalk profil TikTok: ${err.message || 'Pengguna tidak ditemukan'}`);
        }
    }
}

export default {
    stalk: stalkTikTok
};
