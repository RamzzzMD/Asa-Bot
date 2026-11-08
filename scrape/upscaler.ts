import axios from 'axios';
import FormData from 'form-data';

export interface UpscaleResult {
    readonly buffer: Buffer;
    readonly downloadUrl: string;
    readonly source: 'imageupscaler' | 'imgupscaler';
    readonly scale: number;
}

export interface UpscaleOptions {
    readonly scale?: 2 | 4;
    readonly upscaleType?: 'face-upscaler' | 'standard' | 'anime-cartoon';
    readonly timeoutMs?: number;
}

const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function upscaleImageUpscaler(
    inputBuffer: Buffer,
    ext = 'png',
    options: UpscaleOptions = {}
): Promise<string> {
    const page = await axios.get('https://imageupscaler.com/upscale-image-4x/', {
        headers: {
            'User-Agent': USER_AGENT,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 15000
    });

    const nonce = page.data.match(/id="process_nonce"[^>]*value="([^"]+)"/)?.[1] || '';
    const fileId = `f_${Math.random().toString(36).slice(2)}`;
    const fileName = `image_${Date.now()}.${ext}`;
    const rid = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const scale = String(options.scale || 4);
    const upscaleType = options.upscaleType || 'face-upscaler';

    const fd = new FormData();
    fd.append('action', 'processing_images_adv');
    fd.append('nonce', nonce);
    fd.append('pid', '537361920108024');
    fd.append('function', 'upscale-image-4x');
    fd.append('batch_number', '1');
    fd.append('total_batches', '1');
    fd.append('mediaMeta', JSON.stringify([{ fileName, fileId }]));
    fd.append('mediaFiles[]', inputBuffer, { filename: fileName, contentType: `image/${ext}` });
    fd.append(
        'parameters',
        JSON.stringify({
            'upscale-type': upscaleType,
            increase: scale,
            'save-format': 'auto'
        })
    );
    fd.append('rid', rid);

    const res = await axios.post('https://imageupscaler.com/wp-admin/admin-ajax.php', fd, {
        headers: {
            ...fd.getHeaders(),
            'User-Agent': USER_AGENT,
            Origin: 'https://imageupscaler.com',
            Referer: 'https://imageupscaler.com/upscale-image-4x/'
        },
        timeout: options.timeoutMs || 60000
    });

    if (res.data?.success && res.data?.data?.items?.[0]?.url) {
        return res.data.data.items[0].url;
    }

    throw new Error(res.data?.data?.code || res.data?.data?.message || 'Primary upscale failed');
}

async function upscaleImgUpscaler(
    inputBuffer: Buffer,
    ext = 'png',
    options: UpscaleOptions = {}
): Promise<string> {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).slice(2);
    const fileName = `image_${Date.now()}.${ext}`;
    const scale = String(options.scale || 4);

    let body = '';
    body += '--' + boundary + '\r\n';
    body += 'Content-Disposition: form-data; name="tool"\r\n\r\n';
    body += 'upscale\r\n';
    body += '--' + boundary + '\r\n';
    body += 'Content-Disposition: form-data; name="mode"\r\n\r\n';
    body += 'batch\r\n';
    body += '--' + boundary + '\r\n';
    body += 'Content-Disposition: form-data; name="scaleRadio"\r\n\r\n';
    body += `${scale}\r\n`;
    body += '--' + boundary + '\r\n';
    body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
    body += `Content-Type: image/${ext}\r\n\r\n`;

    const payload = Buffer.concat([
        Buffer.from(body, 'utf-8'),
        inputBuffer,
        Buffer.from('\r\n--' + boundary + '--\r\n', 'utf-8')
    ]);

    const uploadRes = await axios.post('https://imgupscaler.com/api/legacy/upload', payload, {
        headers: {
            'User-Agent': USER_AGENT,
            Origin: 'https://imgupscaler.com',
            Referer: 'https://imgupscaler.com/',
            'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        timeout: 30000
    });

    const taskId = uploadRes.data?.taskId;
    if (!taskId) {
        throw new Error('Gagal mendapatkan taskId dari imgupscaler');
    }

    const maxAttempts = 20;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        const statusRes = await axios.post(
            'https://imgupscaler.com/api/legacy/status',
            { tool: 'upscale', taskId, scaleRadio: scale },
            {
                headers: {
                    'User-Agent': USER_AGENT,
                    Origin: 'https://imgupscaler.com',
                    Referer: 'https://imgupscaler.com/',
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            }
        );

        if (statusRes.data?.status === 'success' || statusRes.data?.status === 'completed') {
            const url = statusRes.data?.downloadUrls?.[0];
            if (url) {
                return url;
            }
        }
    }

    throw new Error('Timeout saat menunggu hasil dari imgupscaler');
}

export async function upscaleImage(
    imageBuffer: Buffer,
    ext = 'png',
    options: UpscaleOptions = {}
): Promise<UpscaleResult> {
    if (!imageBuffer || !Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
        throw new Error('Buffer gambar tidak valid.');
    }

    let downloadUrl = '';
    let source: 'imageupscaler' | 'imgupscaler' = 'imageupscaler';

    // 1. Coba primary: imageupscaler.com
    try {
        downloadUrl = await upscaleImageUpscaler(imageBuffer, ext, options);
        source = 'imageupscaler';
    } catch {
        // 2. Fallback: imgupscaler.com (bypass limit)
        try {
            downloadUrl = await upscaleImgUpscaler(imageBuffer, ext, options);
            source = 'imgupscaler';
        } catch (fallbackError: any) {
            throw new Error(`Gagal memproses HD gambar: ${fallbackError.message || 'Semua provider gagal'}`);
        }
    }

    // Unduh buffer hasil upscaling
    const imgRes = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: { 'User-Agent': USER_AGENT }
    });

    return {
        buffer: Buffer.from(imgRes.data),
        downloadUrl,
        source,
        scale: options.scale || 4
    };
}

export default {
    upscale: upscaleImage
};
