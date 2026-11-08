/**
 * =============================================================
 *  NAME       : LOKLOK SCRAPER
 *  AUTHOR     : Ranzz Suaminya Asa
 * =============================================================
 */

import crypto from 'node:crypto';

const CREATOR = 'Ranzz Suaminya Asa';
const BASE_URL = 'https://api.loklok.fun';
const WEB_URL = 'https://www.loklok.fun';

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCR0hi0Ah2EkHEL0bMsyQUPn8A1
0ZW42z9LtfSiUSMaf3lw/sfqRcMTmh4m8+sBnK2a5PWKLTG2CW/HWYydN5n1BU63
c9yYMAoUD+52usxxsMaELLOb+xEv6LRW5oquDck7ZWj0xkSfHc4UXUa1l1FwVXQS
+qFIRDJGXgPCUEGVmwIDAQAB
-----END PUBLIC KEY-----`;

function getPublicKeyRaw(pem: string): string {
    return pem.replace(/-----BEGIN PUBLIC KEY-----/g, '').replace(/-----END PUBLIC KEY-----/g, '').replace(/\s/g, '');
}

function aesEncrypt(text: string, key: string): string {
    const cipher = crypto.createCipheriv('aes-128-ecb', Buffer.from(key, 'utf8'), null);
    cipher.setAutoPadding(true);
    return Buffer.concat([cipher.update(Buffer.from(text, 'utf8')), cipher.final()]).toString('base64');
}

function aesDecrypt(base64Text: string, key: string): string {
    const decipher = crypto.createDecipheriv('aes-128-ecb', Buffer.from(key, 'utf8'), null);
    decipher.setAutoPadding(true);
    return Buffer.concat([decipher.update(Buffer.from(base64Text, 'base64')), decipher.final()]).toString('utf8');
}

function rsaEncrypt(text: string, publicKey: string): string {
    return crypto.publicEncrypt({
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_PADDING
    }, Buffer.from(text, 'utf8')).toString('base64');
}

function hmacSha256(text: string, key: string): string {
    return crypto.createHmac('sha256', Buffer.from(key, 'utf8')).update(Buffer.from(text, 'utf8')).digest('hex').toLowerCase();
}

function md5(text: string): string {
    return crypto.createHash('md5').update(Buffer.from(text, 'utf8')).digest('hex').toLowerCase();
}

function generateDeviceId(): string {
    return crypto.randomBytes(16).toString('hex').toUpperCase();
}

function generateAesKey(): string {
    return crypto.randomBytes(8).toString('hex').slice(0, 16);
}

function getTimezone(): string {
    const offset = -new Date().getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const abs = Math.abs(offset);
    const h = String(Math.floor(abs / 60)).padStart(2, '0');
    const m = String(abs % 60).padStart(2, '0');
    return `GMT${sign}${h}:${m}`;
}

function encodeURIParam(val: string): string {
    return encodeURIComponent(val).replace(/[!'()]/g, t => '%' + t.charCodeAt(0).toString(16).toUpperCase());
}

function serializeBody(obj: any): string {
    if (obj === null || obj === undefined) return '';
    if (typeof obj === 'string') return obj;
    if (typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) {
        return obj.filter(item => item && typeof item === 'object' && !Array.isArray(item)).map(serializeBody).join('');
    }
    return Object.keys(obj).sort().map(k => {
        const v = obj[k];
        if (typeof v === 'string') return v ? encodeURIParam(v) : '';
        if (Array.isArray(v)) {
            return v.map(item => typeof item === 'string' ? item : item && typeof item === 'object' ? serializeBody(item) : JSON.stringify(item)).join('');
        }
        return JSON.stringify(v);
    }).join('');
}

interface RequestOptions {
    method?: 'GET' | 'POST';
    query?: Record<string, string> | null;
    body?: any;
}

async function request(endpoint: string, { method = 'GET', query = null, body = null }: RequestOptions = {}): Promise<any> {
    const aesKey = generateAesKey();
    const deviceId = generateDeviceId();
    const currentTime = String(Date.now());
    const pubRaw = getPublicKeyRaw(PUBLIC_KEY).slice(0, 16);

    let paramStr = '';
    if (query && Object.keys(query).length > 0) {
        paramStr = Object.keys(query).sort().map(k => query[k]).filter(Boolean).join('');
    } else if (body) {
        paramStr = serializeBody(body);
    }

    const signEnc = aesEncrypt(paramStr + currentTime, aesKey);
    const sign = md5(signEnc);
    const userTypeEnc = aesEncrypt(deviceId, pubRaw);
    const usertype = hmacSha256(userTypeEnc, aesKey);
    const encryptedAesKey = rsaEncrypt(aesKey, PUBLIC_KEY);

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'clientType': 'web-loklok',
        'currentTime': currentTime,
        'deviceId': deviceId,
        'keke': 'false',
        'lang': 'en',
        'sign': sign,
        'timezone': getTimezone(),
        'usertype': usertype,
        'versionCode': '32',
        'aesKey': encryptedAesKey
    };

    let url = BASE_URL + endpoint;
    if (query) {
        const qs = new URLSearchParams(query).toString();
        if (qs) url += '?' + qs;
    }

    const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    const isEncrypted = res.headers.get('ecy') === '1';
    const json: any = await res.json();

    if (isEncrypted && typeof json.data === 'string') {
        const decrypted = aesDecrypt(json.data, aesKey);
        return { ...json, data: JSON.parse(decrypted) };
    }
    return json;
}

function extractIdFromJump(jumpAddress: string, fallbackId: any): string {
    if (!jumpAddress) return String(fallbackId || '');
    const match = jumpAddress.match(/[?&]id=([^&]+)/);
    return match ? match[1] : String(fallbackId || '');
}

export interface LoklokNavItem {
    id: string;
    name: string;
    chineseName: string;
    type: string;
    sequence: number;
}

export interface LoklokContentItem {
    id: string;
    title: string;
    coverImage: string;
    horizontalCoverImage: string;
    contentType: string;
    category: number;
    score: number;
    releaseYear: string;
    tags: string[];
    introduction: string;
    rankDesc: string;
    episodesCount: number;
    watchUrl: string;
}

export interface LoklokHomeSection {
    sectionId: string;
    sectionName: string;
    sectionType: string;
    items: LoklokContentItem[];
}

export interface LoklokSearchItem {
    id: string;
    title: string;
    category: number;
    type: string;
    score: number;
    releaseYear: string;
    areas: string[];
    tags: string[];
    coverVertical: string;
    coverHorizontal: string;
    introduction: string;
    episodesCount: number;
    watchUrl: string;
    episodes: Array<{ seriesNo: number; isVip: boolean }>;
}

export interface LoklokEpisodeItem {
    vid: string;
    episodeId: string;
    name: string;
    seriesNo: number;
    isVip: boolean;
    watchUrl: string;
}

export interface LoklokStreamResult {
    creator: string;
    status: boolean;
    contentId: string;
    vid: string;
    category: number;
    definition: string;
    watchUrl: string;
    mediaUrl: string | null;
    subtitles: any[];
    qualities: any[];
    message: string;
    raw?: any;
}

export async function nav() {
    try {
        const res = await request('/home/pc/navigationBar');
        const items: LoklokNavItem[] = (res.data?.navigationBarItemList || []).map((item: any) => ({
            id: item.id,
            name: item.name || '',
            chineseName: item.cnName || '',
            type: item.redirectContentType || 'HOME',
            sequence: item.sequence || 0
        }));

        return {
            creator: CREATOR,
            status: true,
            total: items.length,
            data: items
        };
    } catch (error: any) {
        return { creator: CREATOR, status: false, message: error.message, data: [] };
    }
}

export async function home(navigationId: string = '1000004', page: number = 0) {
    try {
        const res = await request('/home/pc/getHome', {
            query: { navigationId: String(navigationId), page: String(page) }
        });

        const sections: LoklokHomeSection[] = (res.data?.recommendItems || [])
            .map((section: any) => {
                const items: LoklokContentItem[] = (section.recommendContentVOList || []).map((content: any) => {
                    const contentId = extractIdFromJump(content.jumpAddress, content.id);
                    const cover = content.imageUrl || content.coverHorizontalUrl || '';
                    const horizontalCover = content.coverHorizontalUrl || content.imageUrl || '';
                    const scoreVal = content.score != null ? content.score : 0;
                    const yearVal = content.releaseTime || content.year || '';
                    const epCount = content.resourceNum || (content.contentType === 'MOVIE' ? 1 : 0);
                    const categoryVal = content.contentType === 'MOVIE' ? 0 : 1;

                    return {
                        id: contentId,
                        title: content.title || 'Untitled',
                        coverImage: cover,
                        horizontalCoverImage: horizontalCover,
                        contentType: content.contentType || (content.jumpType || 'DRAMA'),
                        category: categoryVal,
                        score: scoreVal,
                        releaseYear: yearVal ? String(yearVal) : 'N/A',
                        tags: Array.isArray(content.tagList) ? content.tagList : [],
                        introduction: content.introduction || 'No description available.',
                        rankDesc: content.rankInfo?.rankDesc || 'Regular',
                        episodesCount: epCount,
                        watchUrl: `${WEB_URL}/play/${categoryVal}/${contentId}`
                    };
                });

                return {
                    sectionId: section.homeSectionId,
                    sectionName: section.homeSectionName || section.cnName || (section.homeSectionType === 'BANNER' ? 'Featured Banner' : 'Trending'),
                    sectionType: section.homeSectionType || 'LIST',
                    items
                };
            })
            .filter((section: LoklokHomeSection) => section.items.length > 0);

        return {
            creator: CREATOR,
            status: true,
            navigationId: String(navigationId),
            page: Number(page),
            total_sections: sections.length,
            data: sections
        };
    } catch (error: any) {
        return { creator: CREATOR, status: false, message: error.message, data: [] };
    }
}

export async function search(keyword: string, size: number = 20) {
    try {
        if (!keyword) {
            return { creator: CREATOR, status: false, message: 'Keyword is required', data: [] };
        }
        const res = await request('/cms/pc/search/searchWithKeyWord', {
            method: 'POST',
            body: { searchKeyWord: keyword, size, sort: '', searchType: '' }
        });

        const items: LoklokSearchItem[] = (res.data || []).map((item: any) => {
            const coverH = item.coverHorizontalUrl || item.coverVerticalUrl || '';
            const coverV = item.coverVerticalUrl || item.coverHorizontalUrl || '';
            const areasList = Array.isArray(item.areas) ? item.areas.map((a: any) => a.name).filter(Boolean) : [];
            const tagsList = Array.isArray(item.categoryTag) ? item.categoryTag.map((t: any) => t.name).filter(Boolean) : [];
            const epCount = item.resourceNum || (Array.isArray(item.episodeVo) ? item.episodeVo.length : (item.domainType === 0 ? 1 : 0));
            const categoryVal = item.domainType != null ? item.domainType : 1;
            const epList = (item.episodeVo || []).map((ep: any) => ({
                seriesNo: ep.seriesNo,
                isVip: ep.paidMode === 1
            }));

            return {
                id: String(item.id),
                title: item.name || 'Untitled',
                category: categoryVal,
                type: item.subType || (item.domainType === 0 ? 'MOVIE' : 'TV'),
                score: item.score != null ? item.score : 0,
                releaseYear: item.releaseTime ? String(item.releaseTime) : 'N/A',
                areas: areasList,
                tags: tagsList,
                coverVertical: coverV,
                coverHorizontal: coverH,
                introduction: item.introduction || 'No description available.',
                episodesCount: epCount,
                watchUrl: `${WEB_URL}/play/${categoryVal}/${item.id}`,
                episodes: epList
            };
        });

        return {
            creator: CREATOR,
            status: true,
            keyword,
            total: items.length,
            data: items
        };
    } catch (error: any) {
        return { creator: CREATOR, status: false, message: error.message, data: [] };
    }
}

export async function episodes(id: string | number, category: number = 1) {
    try {
        if (!id) {
            return { creator: CREATOR, status: false, message: 'Content ID is required', data: [] };
        }
        const res = await request('/cms/pc/movieDrama/queryEpisodeList', {
            query: { id: String(id), category: String(category) }
        });

        const items: LoklokEpisodeItem[] = (res.data || []).map((item: any, idx: number) => {
            const epNumber = item.seriesNo || idx + 1;
            const vid = String(item.id || item.vid || '');
            return {
                vid,
                episodeId: vid,
                name: item.name && item.name.trim() ? item.name.trim() : `Episode ${epNumber}`,
                seriesNo: epNumber,
                isVip: item.paidMode === 1,
                watchUrl: `${WEB_URL}/play/${category}/${id}?episodeId=${vid}`
            };
        });

        return {
            creator: CREATOR,
            status: true,
            contentId: String(id),
            category: Number(category),
            total: items.length,
            data: items
        };
    } catch (error: any) {
        return { creator: CREATOR, status: false, message: error.message, data: [] };
    }
}

export async function stream(contentId: string | number, vid: string | number, category: number = 1, definition: string = 'GROOT_HD'): Promise<LoklokStreamResult> {
    try {
        if (!contentId || !vid) {
            return { creator: CREATOR, status: false, contentId: String(contentId), vid: String(vid), category: Number(category), definition: String(definition), watchUrl: '', mediaUrl: null, subtitles: [], qualities: [], message: 'contentId and vid are required' };
        }
        const res = await request('/media/pc/getPlayInfo', {
            query: {
                contentId: String(contentId),
                category: String(category),
                episodeId: String(vid),
                definition: String(definition)
            }
        });

        const rawData = res.data || res;
        const mediaUrl = rawData?.mediaUrl || null;
        const isTranscoding = rawData?.code === 'FDLSxl1000129';
        const webWatchUrl = `${WEB_URL}/play/${category}/${contentId}?episodeId=${vid}`;

        return {
            creator: CREATOR,
            status: true,
            contentId: String(contentId),
            vid: String(vid),
            category: Number(category),
            definition: String(definition),
            watchUrl: webWatchUrl,
            mediaUrl: mediaUrl,
            subtitles: rawData?.subtitlingList || [],
            qualities: rawData?.definitionList || [],
            message: isTranscoding ? 'Direct HLS stream is restricted/transcoding on Loklok web server. Use watchUrl to play directly.' : 'Success',
            raw: rawData
        };
    } catch (error: any) {
        return { creator: CREATOR, status: false, contentId: String(contentId), vid: String(vid), category: Number(category), definition: String(definition), watchUrl: '', mediaUrl: null, subtitles: [], qualities: [], message: error.message };
    }
}

export default {
    nav,
    home,
    search,
    episodes,
    stream
};
