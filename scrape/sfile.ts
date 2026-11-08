import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'node:crypto';
import path from 'node:path';

export interface SfileSearchResult {
    readonly title: string;
    readonly size: string;
    readonly url: string;
    readonly uploadDate?: string;
}

export interface SfileDownloadResult {
    readonly title: string;
    readonly size: string;
    readonly filename: string;
    readonly mimetype: string;
    readonly downloadUrl: string;
    readonly originalUrl: string;
}

export interface SfileUploadResult {
    readonly shareUrl: string;
    readonly downloadUrl: string;
    readonly fileName: string;
    readonly sizeLabel: string;
}

const DEFAULT_HEADERS = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
};

export function getMimeTypeFromFilename(filename: string, fallback = 'application/octet-stream'): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeMap: Record<string, string> = {
        '.apk': 'application/vnd.android.package-archive',
        '.xapk': 'application/vnd.android.package-archive',
        '.apks': 'application/vnd.android.package-archive',
        '.zip': 'application/zip',
        '.rar': 'application/x-rar-compressed',
        '.7z': 'application/x-7z-compressed',
        '.tar': 'application/x-tar',
        '.gz': 'application/gzip',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.txt': 'text/plain',
        '.csv': 'text/csv',
        '.json': 'application/json',
        '.html': 'text/html',
        '.mp3': 'audio/mpeg',
        '.m4a': 'audio/mp4',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.opus': 'audio/ogg; codecs=opus',
        '.mp4': 'video/mp4',
        '.mkv': 'video/x-matroska',
        '.avi': 'video/x-msvideo',
        '.webm': 'video/webm',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.hc': 'application/octet-stream',
        '.ehi': 'application/octet-stream',
        '.dark': 'application/octet-stream'
    };
    return mimeMap[ext] || fallback;
}

export async function sfileSearch(query: string, page = 1): Promise<SfileSearchResult[]> {
    if (!query || typeof query !== 'string') {
        throw new Error('Query pencarian harus disertakan.');
    }

    const searchUrl = `https://sfile.co/search?q=${encodeURIComponent(query.trim())}&page=${page}`;
    const res = await axios.get(searchUrl, {
        headers: DEFAULT_HEADERS,
        timeout: 15000,
        validateStatus: () => true
    });

    const $ = cheerio.load(String(res.data || ''));
    const results: SfileSearchResult[] = [];
    const seenUrls = new Set<string>();

    $('a.search-result-link').each((_, el) => {
        const link = $(el);
        const url = link.attr('href') || link.attr('data-file-url');
        if (!url) return;

        const fullUrl = url.startsWith('http') ? url : `https://sfile.co${url}`;
        if (seenUrls.has(fullUrl)) return;
        seenUrls.add(fullUrl);

        const title = link.text().trim();
        const pElem = link.next('p');
        const pText = pElem.text().trim();

        const sizeMatch = pText.match(/([\d.]+\s*(?:KB|MB|GB|B))/i);
        const size = sizeMatch ? sizeMatch[1].toUpperCase() : 'Unknown';

        const dateMatch = pText.match(/(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})/);
        const uploadDate = dateMatch ? dateMatch[1] : undefined;

        results.push({
            title,
            size,
            url: fullUrl,
            uploadDate
        });
    });

    if (results.length === 0) {
        $('main a[href*="sfile.co/"]').each((_, a) => {
            const h = $(a).attr('href') || '';
            const t = $(a).text().trim();
            if (
                h &&
                !h.includes('/search') &&
                !h.includes('/latest') &&
                !h.includes('/trends') &&
                !h.includes('/user/') &&
                t &&
                t.toLowerCase() !== 'download' &&
                !seenUrls.has(h)
            ) {
                seenUrls.add(h);
                results.push({
                    title: t,
                    size: 'Unknown',
                    url: h.startsWith('http') ? h : `https://sfile.co${h}`
                });
            }
        });
    }

    return results;
}

export async function sfileDownload(targetUrl: string): Promise<SfileDownloadResult> {
    if (!targetUrl || typeof targetUrl !== 'string') {
        throw new Error('URL file sfile harus disertakan.');
    }

    let url = targetUrl.trim();
    if (!url.startsWith('http')) {
        url = `https://${url}`;
    }
    url = url.replace('sfile.mobi', 'sfile.co');

    const res1 = await axios.get(url, {
        headers: DEFAULT_HEADERS,
        timeout: 15000,
        validateStatus: () => true
    });

    const cookies1 = (res1.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ');
    const $1 = cheerio.load(String(res1.data || ''));

    const rawTitle = $1('h1').text().trim() || $1('title').text().trim().replace(/^(?:Download\s+)/i, '');
    const filename = rawTitle || 'file';
    const sizeMatch = String(res1.data).match(/([\d.]+\s*(?:KB|MB|GB|B))/i);
    const size = sizeMatch ? sizeMatch[1].toUpperCase() : 'Unknown';

    const btn = $1('#download');
    const dwUrl = btn.attr('data-dw-url') || btn.attr('href');

    if (!dwUrl || dwUrl === '#') {
        throw new Error('Tautan download sfile tidak ditemukan atau file telah dihapus.');
    }

    const fullDwUrl = dwUrl.startsWith('http') ? dwUrl : new URL(dwUrl, url).href;

    const res2 = await axios.get(fullDwUrl, {
        headers: {
            ...DEFAULT_HEADERS,
            Referer: url,
            Cookie: cookies1
        },
        timeout: 15000,
        validateStatus: () => true
    });

    const body2 = String(res2.data || '');
    let directDownloadUrl = '';

    const directServerMatch = body2.match(/https:\\\/\\\/download\d+\.sfile\.co\\\/downloadfile\\\/[^\"]+/);
    if (directServerMatch) {
        directDownloadUrl = directServerMatch[0].replaceAll('\\/', '/');
    }

    if (!directDownloadUrl) {
        const directMatch = body2.match(/https:\\\/\\\/sfile\.co\\\/download\\\/[^\"]+/);
        if (directMatch) {
            directDownloadUrl = directMatch[0].replaceAll('\\/', '/');
        }
    }

    if (!directDownloadUrl) {
        const $2 = cheerio.load(body2);
        const attrDirect = $2('#download').attr('data-direct-download');
        if (attrDirect) {
            directDownloadUrl = attrDirect;
        }
    }

    if (!directDownloadUrl) {
        const $2 = cheerio.load(body2);
        const href = $2('#download').attr('href');
        if (href && href !== '#') {
            directDownloadUrl = href;
        }
    }

    if (!directDownloadUrl) {
        throw new Error('Gagal mengekstrak tautan unduhan langsung sfile.');
    }

    let finalFilename = rawTitle || 'file';
    const matchUrlFilename = directDownloadUrl.split('?')[0].split('/').pop();
    if (matchUrlFilename && path.extname(matchUrlFilename)) {
        if (!path.extname(finalFilename)) {
            finalFilename = `${finalFilename}${path.extname(matchUrlFilename)}`;
        }
    }

    const mimetype = getMimeTypeFromFilename(finalFilename);

    return {
        title: rawTitle,
        size,
        filename: finalFilename,
        mimetype,
        downloadUrl: directDownloadUrl,
        originalUrl: url
    };
}

export async function sfileUpload(
    buffer: Buffer,
    fileName: string,
    mimeType?: string
): Promise<SfileUploadResult> {
    if (!buffer || !Buffer.isBuffer(buffer)) {
        throw new Error('File buffer tidak valid.');
    }

    const cleanFileName = (fileName || `enami_asa_${Date.now()}`).trim();
    const md5Hash = crypto.createHash('md5').update(buffer).digest('hex');

    const homeRes = await axios.get('https://sfile.co', {
        headers: DEFAULT_HEADERS,
        timeout: 15000,
        validateStatus: () => true
    });
    const cookies = (homeRes.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ');

    const checkRes = await axios.post(
        'https://sfile.co/upload/resume_v1_guest.php',
        `intent=check-hash&file_hash=${md5Hash}&file_name=${encodeURIComponent(cleanFileName)}`,
        {
            headers: {
                ...DEFAULT_HEADERS,
                Referer: 'https://sfile.co/',
                Cookie: cookies,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: 15000,
            validateStatus: () => true
        }
    );

    if (checkRes.status === 409 && checkRes.data?.file_short) {
        const shareUrl = `https://sfile.co/${checkRes.data.file_short}`;
        return {
            shareUrl,
            downloadUrl: shareUrl,
            fileName: checkRes.data.file_name || cleanFileName,
            sizeLabel: `${(buffer.length / 1024).toFixed(1)} KB`
        };
    }

    const normalizedName = checkRes.data?.file_name || cleanFileName;

    const formData = new FormData();
    formData.append('flowChunkNumber', '1');
    formData.append('flowChunkSize', String(Math.max(1048576, buffer.length)));
    formData.append('flowCurrentChunkSize', String(buffer.length));
    formData.append('flowTotalSize', String(buffer.length));
    formData.append('flowIdentifier', `${buffer.length}-${cleanFileName.replace(/[^a-zA-Z0-9_-]/g, '')}`);
    formData.append('flowFilename', cleanFileName);
    formData.append('flowRelativePath', cleanFileName);
    formData.append('flowTotalChunks', '1');
    formData.append('des', '');
    formData.append('file_hash', md5Hash);
    formData.append('desired_name', normalizedName);

    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType || getMimeTypeFromFilename(cleanFileName) });
    formData.append('file', blob, cleanFileName);

    const uploadRes = await axios.post(
        'https://sfile.co/upload/resume_v1_guest.php',
        formData,
        {
            headers: {
                ...DEFAULT_HEADERS,
                Referer: 'https://sfile.co/',
                Cookie: cookies
            },
            timeout: 60000,
            validateStatus: () => true
        }
    );

    if (uploadRes.status === 200 && uploadRes.data?.status === 'success') {
        const data = uploadRes.data;
        const shareUrl = data.share_url || (data.file?.short ? `https://sfile.co/${data.file.short}` : '');
        return {
            shareUrl,
            downloadUrl: shareUrl,
            fileName: data.file?.name || normalizedName,
            sizeLabel: data.file?.size_label || `${(buffer.length / 1024).toFixed(1)} KB`
        };
    }

    throw new Error(uploadRes.data?.message || 'Gagal mengunggah file ke sfile.');
}

export default {
    search: sfileSearch,
    download: sfileDownload,
    upload: sfileUpload
};
