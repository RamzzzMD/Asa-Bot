import axios from 'axios';
import * as cheerio from 'cheerio';
import path from 'node:path';

export interface MediafireResult {
    readonly title: string;
    readonly filename: string;
    readonly size: string;
    readonly downloadUrl: string;
    readonly mimetype: string;
}

const DEFAULT_HEADERS = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
};

export function getMimeType(filename: string, fallback = 'application/octet-stream'): string {
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
        '.gif': 'image/gif'
    };
    return mimeMap[ext] || fallback;
}

export async function scrapeMediafire(targetUrl: string): Promise<MediafireResult> {
    if (!targetUrl || typeof targetUrl !== 'string') {
        throw new Error('URL MediaFire harus disertakan.');
    }

    let url = targetUrl.trim();
    if (!url.startsWith('http')) {
        url = `https://${url}`;
    }

    const res = await axios.get(url, {
        headers: DEFAULT_HEADERS,
        timeout: 20000,
        validateStatus: () => true
    });

    const html = String(res.data || '');
    const $ = cheerio.load(html);

    let downloadUrl =
        $('#downloadButton').attr('href') ||
        $('a[aria-label="Download file"]').attr('href') ||
        $('a#download_link').attr('href');

    if (!downloadUrl) {
        const matchHref = html.match(/href="((?:https?:)?\/\/[^"]*mediafire\.com\/[^"]*download[^"]*)"/i);
        if (matchHref) {
            downloadUrl = matchHref[1];
        }
    }

    if (!downloadUrl) {
        const matchGeneral = html.match(/https?:\/\/download\d+\.mediafire\.com\/[^\s"']+/i);
        if (matchGeneral) {
            downloadUrl = matchGeneral[0];
        }
    }

    if (!downloadUrl) {
        throw new Error('Gagal mengekstrak tautan unduhan MediaFire. Pastikan file masih aktif.');
    }

    let filename =
        $('.dl-btn-label').attr('title') ||
        $('div.filename').text().trim() ||
        $('div.intro .filename').text().trim() ||
        $('meta[property="og:title"]').attr('content') ||
        '';

    if (!filename || filename.toLowerCase() === 'mediafire') {
        const urlSegments = url.split('/');
        const candidate = urlSegments[urlSegments.length - 2] || urlSegments[urlSegments.length - 1];
        if (candidate && candidate !== 'file') {
            filename = decodeURIComponent(candidate);
        } else {
            filename = 'downloaded_file';
        }
    }

    filename = filename.replace(/\s+/g, ' ').trim();

    let size = '';
    const btnText = $('#downloadButton').text();
    const sizeMatch = btnText.match(/\(([\d.]+\s*(?:KB|MB|GB|B))\)/i);
    if (sizeMatch) {
        size = sizeMatch[1].toUpperCase();
    } else {
        const detailSize = $('ul.details li:contains("File size:") span').text().trim();
        if (detailSize) {
            size = detailSize;
        }
    }

    const mimetype = getMimeType(filename);

    return {
        title: filename,
        filename,
        size: size || 'Unknown',
        downloadUrl,
        mimetype
    };
}

export default {
    scrape: scrapeMediafire,
    getMimeType
};
