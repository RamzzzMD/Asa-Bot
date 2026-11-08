// @ts-nocheck
/**
 * Scraper: FDown Facebook Video Downloader (Node.js ESM - Zero Dependency)
 * Bot: Enami Asa Ai
 * Owner: Ranzz Suaminya Asa
 */
import { randomUUID } from 'node:crypto';

const BASE_URL = 'https://app-api.fdown.vn';
const FDOWN_APP_TOKEN = 'v1NLTJmqbLth2VrQ3TD9ajg0Bsu3Cn2r';
const USER_AGENT = 'FDown/1.0.0 (Linux; Android 13; SM-G988N)';

function getHeaders(clientToken = FDOWN_APP_TOKEN): Record<string, string> {
    const hdrName = ['X', 'Api', 'Key'].join('-');
    return {
        'Content-Type': 'application/json',
        [hdrName]: clientToken,
        'X-Locale': 'en',
        'X-Device-Id': randomUUID(),
        'User-Agent': USER_AGENT
    };
}

function parseStreamPayload(payloadStr: string): { videoUrl: string | null; audioUrl: string | null } {
    try {
        const parsed = JSON.parse(payloadStr);
        return {
            videoUrl: parsed.videoUrl || null,
            audioUrl: parsed.audioUrl || null
        };
    } catch {
        return { videoUrl: null, audioUrl: null };
    }
}

export async function renderMedia(
    mediaItem: any,
    { maxWaitMs = 120000, pollIntervalMs = 2000, clientToken = FDOWN_APP_TOKEN } = {}
) {
    const downloadUrl = mediaItem?._downloadPayload || mediaItem?.download_url || mediaItem;
    const provider = mediaItem?._provider || mediaItem?.provider || 'FBDownTo';

    if (!downloadUrl || typeof downloadUrl !== 'string') {
        throw new Error('Invalid render media payload');
    }

    const renderRes = await fetch(`${BASE_URL}/api/v2/app/render`, {
        method: 'POST',
        headers: getHeaders(clientToken),
        body: JSON.stringify({
            download_url: downloadUrl,
            provider
        })
    });

    if (!renderRes.ok) {
        throw new Error(`HTTP ${renderRes.status}`);
    }

    const renderJson = (await renderRes.json()) as any;
    if (!renderJson.success || !renderJson.data?.process_id) {
        throw new Error(renderJson.message || 'Failed to initiate render job');
    }

    const { process_id } = renderJson.data;
    const payloadUrl = renderJson.data.download_url || downloadUrl;
    const activeProvider = renderJson.data.provider || provider;

    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

        const progRes = await fetch(`${BASE_URL}/api/v2/app/progress`, {
            method: 'POST',
            headers: getHeaders(clientToken),
            body: JSON.stringify({
                process_id,
                download_url: payloadUrl,
                provider: activeProvider
            })
        });

        if (!progRes.ok) continue;

        const progJson = (await progRes.json()) as any;
        if (!progJson.success || !progJson.data) continue;

        const { status, download_url: finalUrl, file_size } = progJson.data;

        if (status === 'completed' && finalUrl) {
            return {
                status: 'completed',
                url: finalUrl,
                fileSize: file_size || null
            };
        }

        if (status === 'failed') {
            throw new Error(progJson.message || 'Render job failed on server');
        }
    }

    throw new Error('Render timeout exceeded');
}

export async function resolveAll(medias: any[], { maxWaitMs = 60000, clientToken = FDOWN_APP_TOKEN } = {}) {
    const results = [];
    for (const item of medias) {
        if (!item.needsRender) {
            results.push({ ...item });
            continue;
        }

        try {
            const rendered = await renderMedia(item, { maxWaitMs, clientToken });
            results.push({
                ...item,
                url: rendered.url,
                fileSize: rendered.fileSize,
                needsRender: false
            });
        } catch {
            results.push({
                ...item,
                url: item.videoUrl || item.audioUrl || null
            });
        }
    }
    return results;
}

export async function fetchVideo(url: string, options: Record<string, any> = {}) {
    if (!url || typeof url !== 'string') {
        throw new Error('Valid Facebook video URL is required');
    }

    const clientToken = options.clientToken || FDOWN_APP_TOKEN;

    const res = await fetch(`${BASE_URL}/api/v2/app/download`, {
        method: 'POST',
        headers: getHeaders(clientToken),
        body: JSON.stringify({ url: url.trim() })
    });

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }

    const json = (await res.json()) as any;
    if (!json.success || !json.data) {
        throw new Error(json.message || json.code || 'Failed to fetch video details');
    }

    const { data } = json;
    const provider = data.source_provider || 'FBDownTo';

    let medias = (data.media_items || []).map((item: any) => {
        const needsRender = Boolean(item.needs_render);
        const { videoUrl, audioUrl } = needsRender
            ? parseStreamPayload(item.download_url)
            : { videoUrl: null, audioUrl: null };

        return {
            id: item.media_id,
            type: item.type,
            resolution: item.resolution,
            quality: item.quality_label,
            extension: item.extension,
            duration: item.duration,
            needsRender,
            url: needsRender ? null : item.download_url,
            videoUrl,
            audioUrl,
            _provider: provider,
            _downloadPayload: item.download_url
        };
    });

    if (options.resolveAll) {
        medias = await resolveAll(medias, { maxWaitMs: options.maxWaitMs || 60000, clientToken });
    }

    return {
        title: data.title || 'Facebook Video',
        description: data.description || null,
        thumbnail: data.thumbnail || null,
        duration: data.duration || null,
        provider,
        medias
    };
}

export default {
    fetchVideo,
    renderMedia,
    resolveAll
};

