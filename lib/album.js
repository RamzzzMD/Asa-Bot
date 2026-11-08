import crypto from 'node:crypto';
/**
 * Helper untuk mengambil Buffer, mendeteksi mime type dan ekstensi file
 */
export async function getFile(PATH, saveToFile = false) {
    let res;
    let filename;
    let data;
    if (Buffer.isBuffer(PATH)) {
        data = PATH;
    }
    else if (PATH instanceof Uint8Array) {
        data = Buffer.from(PATH);
    }
    else if (typeof PATH === 'object' && PATH?.url) {
        const response = await fetch(PATH.url);
        data = Buffer.from(await response.arrayBuffer());
    }
    else if (typeof PATH === 'string') {
        const trimmed = PATH.trim();
        if (/^data:.*?\/.*?;base64,/i.test(trimmed)) {
            data = Buffer.from(trimmed.split(',')[1], 'base64');
        }
        else if (/^https?:\/\//.test(trimmed)) {
            const response = await fetch(trimmed);
            data = Buffer.from(await response.arrayBuffer());
        }
        else {
            const fs = await import('node:fs/promises');
            const { existsSync } = await import('node:fs');
            if (existsSync(trimmed)) {
                filename = trimmed;
                data = await fs.readFile(trimmed);
            }
            else {
                data = Buffer.from(trimmed);
            }
        }
    }
    else {
        data = Buffer.alloc(0);
    }
    let mime = 'application/octet-stream';
    let ext = '.bin';
    if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
        mime = 'image/jpeg';
        ext = '.jpg';
    }
    else if (data.length >= 8 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
        mime = 'image/png';
        ext = '.png';
    }
    else if (data.length >= 12 && data.toString('utf8', 8, 12) === 'WEBP') {
        mime = 'image/webp';
        ext = '.webp';
    }
    else if (data.length >= 8 && data.toString('utf8', 4, 8) === 'ftyp') {
        mime = 'video/mp4';
        ext = '.mp4';
    }
    return { res, filename, mime, ext, data };
}
/**
 * Mengirim kumpulan media (gambar/video) dalam bentuk 1 album WhatsApp native
 * @param conn Instance socket bot (Baileys / zapo-js)
 * @param jid Target chat JID (nomor / grup)
 * @param medias Array media [{ image: { url } }, { video: { url } }] atau array URL string
 * @param options Opsi pengiriman seperti quoted, delay, dll.
 */
export async function sendAlbumMessage(conn, jid, medias = [], options = {}) {
    if (!Array.isArray(medias) || medias.length === 0) {
        throw new Error('Album minimal berisi 1 media item.');
    }
    const sendOpts = options.quoted ? { quote: options.quoted, ...options } : { ...options };
    // Normalisasi semua item ke format { image/video: Buffer, caption, mimetype }
    const normalizedMedias = [];
    for (const item of medias) {
        if (!item)
            continue;
        let rawMedia;
        let caption = '';
        let forceType = null;
        if (typeof item === 'string') {
            rawMedia = item;
        }
        else if (typeof item === 'object') {
            caption = item.caption || item.text || '';
            if (item.image) {
                rawMedia = item.image;
                forceType = 'image';
            }
            else if (item.video) {
                rawMedia = item.video;
                forceType = 'video';
            }
            else if (item.url) {
                rawMedia = item.url;
            }
            else if (item.data) {
                rawMedia = item.data;
            }
        }
        if (!rawMedia)
            continue;
        const file = await getFile(rawMedia);
        const isVideo = forceType === 'video' || file.mime.startsWith('video/');
        const mime = (typeof item === 'object' ? item.mimetype : null) || file.mime || (isVideo ? 'video/mp4' : 'image/jpeg');
        if (isVideo) {
            normalizedMedias.push({
                video: file.data,
                caption,
                mimetype: mime
            });
        }
        else {
            normalizedMedias.push({
                image: file.data,
                caption,
                mimetype: mime
            });
        }
    }
    if (normalizedMedias.length === 0) {
        throw new Error('Gagal memuat media untuk album.');
    }
    // Jika hanya 1 media, kirim sebagai pesan media tunggal
    if (normalizedMedias.length === 1) {
        const m = normalizedMedias[0];
        const isVid = Boolean(m.video);
        const content = isVid
            ? { type: 'video', media: m.video, mimetype: m.mimetype, caption: m.caption || '' }
            : { type: 'image', media: m.image, mimetype: m.mimetype, caption: m.caption || '' };
        return conn.sendMessage(jid, content, sendOpts);
    }
    // 1. Buat ID container album utama (Format Baileys: 3EB0...)
    const albumKeyId = options.id || ('3EB0' + crypto.randomBytes(14).toString('hex').toUpperCase());
    const expectedImageCount = normalizedMedias.filter((m) => m.image).length;
    const expectedVideoCount = normalizedMedias.filter((m) => m.video).length;
    try {
        // 2. Kirim Header Anchor albumMessage
        await conn.sendMessage(jid, {
            albumMessage: {
                expectedImageCount,
                expectedVideoCount
            },
            messageContextInfo: {
                messageSecret: crypto.randomBytes(32)
            }
        }, {
            ...sendOpts,
            id: albumKeyId
        });
        const results = [];
        const delayMs = options.delay ?? 500;
        // 3. Upload & kirim setiap item media yang ditautkan ke ID container
        for (const media of normalizedMedias) {
            const isVid = Boolean(media.video);
            const buf = (media.video || media.image);
            const mime = media.mimetype;
            const childId = '3EB0' + crypto.randomBytes(14).toString('hex').toUpperCase();
            try {
                // Upload media ke server CDN WhatsApp
                const uploaded = await (conn.message?.upload ? conn.message.upload(buf, {
                    type: isVid ? 'video' : 'image',
                    mimetype: mime
                }) : conn.waUploadToServer ? conn.waUploadToServer(buf, {
                    type: isVid ? 'video' : 'image',
                    mimetype: mime
                }) : null);
                if (!uploaded)
                    throw new Error('CDN upload method not found');
                // Tautkan media ke album induk via messageAssociation
                const childMsg = isVid
                    ? {
                        videoMessage: {
                            url: uploaded.url,
                            directPath: uploaded.directPath,
                            mediaKey: uploaded.mediaKey,
                            fileSha256: uploaded.fileSha256,
                            fileEncSha256: uploaded.fileEncSha256,
                            fileLength: uploaded.fileLength,
                            mediaKeyTimestamp: Math.floor(Date.now() / 1000),
                            mimetype: mime,
                            caption: media.caption || ''
                        },
                        messageContextInfo: {
                            messageSecret: crypto.randomBytes(32),
                            messageAssociation: {
                                associationType: 1, // MEDIA_ALBUM
                                parentMessageKey: {
                                    remoteJid: jid,
                                    fromMe: true,
                                    id: albumKeyId
                                }
                            }
                        }
                    }
                    : {
                        imageMessage: {
                            url: uploaded.url,
                            directPath: uploaded.directPath,
                            mediaKey: uploaded.mediaKey,
                            fileSha256: uploaded.fileSha256,
                            fileEncSha256: uploaded.fileEncSha256,
                            fileLength: uploaded.fileLength,
                            mediaKeyTimestamp: Math.floor(Date.now() / 1000),
                            mimetype: mime,
                            caption: media.caption || ''
                        },
                        messageContextInfo: {
                            messageSecret: crypto.randomBytes(32),
                            messageAssociation: {
                                associationType: 1, // MEDIA_ALBUM
                                parentMessageKey: {
                                    remoteJid: jid,
                                    fromMe: true,
                                    id: albumKeyId
                                }
                            }
                        }
                    };
                const res = await conn.sendMessage(jid, childMsg, { id: childId });
                results.push(res);
            }
            catch (uploadErr) {
                // Fallback jika upload asosiasi gagal
                const fallbackContent = isVid
                    ? { type: 'video', media: buf, mimetype: mime, caption: media.caption || '' }
                    : { type: 'image', media: buf, mimetype: mime, caption: media.caption || '' };
                const res = await conn.sendMessage(jid, fallbackContent, sendOpts);
                results.push(res);
            }
            if (delayMs > 0) {
                await new Promise((r) => setTimeout(r, delayMs));
            }
        }
        return { id: albumKeyId, results };
    }
    catch (albumErr) {
        // Fallback global jika albumMessage ditolak
        const results = [];
        for (const media of normalizedMedias) {
            const isVid = Boolean(media.video);
            const buf = (media.video || media.image);
            const content = isVid
                ? { type: 'video', media: buf, mimetype: media.mimetype, caption: media.caption || '' }
                : { type: 'image', media: buf, mimetype: media.mimetype, caption: media.caption || '' };
            const res = await conn.sendMessage(jid, content, sendOpts);
            results.push(res);
        }
        return results;
    }
}
export const sendAlbum = sendAlbumMessage;
export default {
    getFile,
    sendAlbumMessage,
    sendAlbum
};
