import type { WaIncomingMessageEvent } from 'zapo-js';

export function formatDuration(seconds: number): string {
    const totalSeconds = Math.max(0, Math.floor(seconds));
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
    parts.push(`${remainingSeconds}s`);
    return parts.join(' ');
}

export function extractMessageText(event: WaIncomingMessageEvent): string {
    if (!event.message) {
        return '';
    }
    const message = event.message;
    const rawText =
        message.conversation ??
        message.extendedTextMessage?.text ??
        message.imageMessage?.caption ??
        message.videoMessage?.caption ??
        message.documentMessage?.caption ??
        '';
    return rawText.trim();
}

export function isLid(jid: string): boolean {
    return jid.includes('@lid');
}

export function toPnJid(numberOrJid: string): string {
    const clean = numberOrJid.replace(/@.*$/, '').replace(/:\d+$/, '');
    return `${clean}@s.whatsapp.net`;
}

export function decodeLid(jidOrLid: string, groupParticipants?: Array<{ jid?: string; lid?: string; phoneNumber?: string }>): string {
    if (!jidOrLid) {
        return '';
    }
    if (!isLid(jidOrLid)) {
        return jidOrLid;
    }
    if (groupParticipants && groupParticipants.length > 0) {
        const cleanLid = jidOrLid.replace(/:\d+@lid$/, '@lid');
        const found = groupParticipants.find((p) => {
            const pLid = p.lid ? p.lid.replace(/:\d+@lid$/, '@lid') : '';
            return pLid === cleanLid || p.lid === jidOrLid;
        });
        if (found) {
            if (found.phoneNumber) {
                return found.phoneNumber.includes('@') ? found.phoneNumber : `${found.phoneNumber}@s.whatsapp.net`;
            }
            if (found.jid && !isLid(found.jid)) {
                return found.jid;
            }
        }
    }
    return jidOrLid;
}

export function resolveSenderInfo(
    event: WaIncomingMessageEvent,
    groupParticipants?: Array<{ jid?: string; lid?: string; phoneNumber?: string }>
): { senderJid: string; senderNumber: string; isLidSender: boolean } {
    let candidateJid = event.key.participantAlt || event.key.remoteJidAlt;
    if (!candidateJid || isLid(candidateJid)) {
        candidateJid = event.key.participant || event.key.remoteJid || '';
    }

    if (isLid(candidateJid)) {
        const decoded = decodeLid(candidateJid, groupParticipants);
        if (decoded && !isLid(decoded)) {
            candidateJid = decoded;
        }
    }

    const senderNumber = candidateJid.replace(/@.*$/, '').replace(/:\d+$/, '');
    const isLidSender = isLid(candidateJid);
    const normalizedJid = isLidSender ? candidateJid : `${senderNumber}@s.whatsapp.net`;

    return {
        senderJid: normalizedJid,
        senderNumber,
        isLidSender
    };
}

export function extractSenderJid(event: WaIncomingMessageEvent): string {
    return resolveSenderInfo(event).senderJid;
}

export function extractSenderNumber(senderJidOrEvent: string | WaIncomingMessageEvent): string {
    if (typeof senderJidOrEvent === 'object' && senderJidOrEvent !== null) {
        return resolveSenderInfo(senderJidOrEvent).senderNumber;
    }
    return senderJidOrEvent.replace(/@.*$/, '').replace(/:\d+$/, '');
}

export function parseCommand(
    text: string,
    prefixes: readonly string[]
): { prefix: string; command: string; args: string[]; fullText: string } | null {
    for (const prefix of prefixes) {
        if (text.startsWith(prefix)) {
            const body = text.slice(prefix.length).trim();
            if (!body) {
                return null;
            }
            if (body.startsWith('=>')) {
                const fullText = body.slice(2).trim();
                return { prefix, command: '=>', args: fullText ? fullText.split(/\s+/) : [], fullText };
            }
            if (body.startsWith('>')) {
                const fullText = body.slice(1).trim();
                return { prefix, command: '>', args: fullText ? fullText.split(/\s+/) : [], fullText };
            }
            if (body.startsWith('$')) {
                const fullText = body.slice(1).trim();
                return { prefix, command: '$', args: fullText ? fullText.split(/\s+/) : [], fullText };
            }
            const parts = body.split(/\s+/);
            const command = parts[0].toLowerCase();
            const args = parts.slice(1);
            const fullText = body.slice(parts[0].length).trim();
            return {
                prefix,
                command,
                args,
                fullText
            };
        }
    }
    return null;
}

export function isIgnoredFile(fileName: string): boolean {
    if (fileName.startsWith('.') || fileName.startsWith('#') || fileName.endsWith('~')) {
        return true;
    }
    if (fileName.endsWith('.tmp') || fileName.endsWith('.swp') || fileName.endsWith('.d.ts')) {
        return true;
    }
    if (!fileName.endsWith('.ts') && !fileName.endsWith('.js')) {
        return true;
    }
    return false;
}

export function addExif(webpBuffer: Buffer, packname: string = 'Enami Asa Ai', author: string = 'Ranzz Suaminya Asa'): Buffer {
    const json = {
        'sticker-pack-id': 'enami-asa-ai',
        'sticker-pack-name': packname,
        'sticker-pack-publisher': author,
        'emojis': ['🌸']
    };
    const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
    const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8');
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);

    if (webpBuffer.length < 12 || webpBuffer.subarray(0, 4).toString() !== 'RIFF' || webpBuffer.subarray(8, 12).toString() !== 'WEBP') {
        return webpBuffer;
    }

    const exifHeader = Buffer.from('Exif\x00\x00');
    const fullExif = Buffer.concat([exifHeader, exif]);
    const exifChunkHeader = Buffer.alloc(8);
    exifChunkHeader.write('EXIF', 0);
    exifChunkHeader.writeUInt32LE(fullExif.length, 4);

    const pad = (fullExif.length % 2 !== 0) ? Buffer.from([0x00]) : Buffer.alloc(0);
    const exifChunk = Buffer.concat([exifChunkHeader, fullExif, pad]);

    const newRiff = Buffer.concat([webpBuffer, exifChunk]);
    newRiff.writeUInt32LE(newRiff.length - 8, 4);
    return newRiff;
}

export async function imageToWebp(inputBuffer: Buffer): Promise<Buffer> {
    const { execSync } = await import('child_process');
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const tmpInput = path.join(os.tmpdir(), `img_${Date.now()}_${Math.random().toString(36).slice(2)}.tmp`);
    const tmpOutput = path.join(os.tmpdir(), `out_${Date.now()}_${Math.random().toString(36).slice(2)}.webp`);
    try {
        fs.writeFileSync(tmpInput, inputBuffer);
        execSync(`ffmpeg -y -i "${tmpInput}" -vcodec libwebp -filter:v "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" "${tmpOutput}"`, { stdio: 'ignore' });
        return fs.readFileSync(tmpOutput);
    } finally {
        try { fs.unlinkSync(tmpInput); } catch {}
        try { fs.unlinkSync(tmpOutput); } catch {}
    }
}

export async function videoToWebp(inputBuffer: Buffer): Promise<Buffer> {
    const { execSync } = await import('child_process');
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const tmpInput = path.join(os.tmpdir(), `vid_${Date.now()}_${Math.random().toString(36).slice(2)}.tmp`);
    const tmpOutput = path.join(os.tmpdir(), `out_${Date.now()}_${Math.random().toString(36).slice(2)}.webp`);
    try {
        fs.writeFileSync(tmpInput, inputBuffer);
        execSync(`ffmpeg -y -i "${tmpInput}" -vcodec libwebp -filter:v "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -loop 0 -preset default -an -vsync 0 -s 512:512 "${tmpOutput}"`, { stdio: 'ignore' });
        return fs.readFileSync(tmpOutput);
    } finally {
        try { fs.unlinkSync(tmpInput); } catch {}
        try { fs.unlinkSync(tmpOutput); } catch {}
    }
}

