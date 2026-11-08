import type { Plugin, PluginContext } from '../../../types/plugin.js';

interface ResolvedUser {
    jid: string;
    number: string;
}

function unwrapViewOnce(msg: any): any {
    let current = msg;
    if (!current || typeof current !== 'object') return null;
    if (current.viewOnceMessage) current = current.viewOnceMessage.message || current.viewOnceMessage;
    if (current.viewOnceMessageV2) current = current.viewOnceMessageV2.message || current.viewOnceMessageV2;
    if (current.viewOnceMessageV2Extension) current = current.viewOnceMessageV2Extension.message || current.viewOnceMessageV2Extension;
    return current;
}

async function buildLidResolver(context: PluginContext) {
    const lidToPnMap = new Map<string, string>();
    const lidJidToPnJidMap = new Map<string, string>();

    // 1. Scan group metadata jika di dalam grup
    if (context.chatJid.endsWith('@g.us')) {
        try {
            const meta: any = await context.client.groupMetadata(context.chatJid);
            const participants: any[] = meta?.participants || [];
            for (const p of participants) {
                const lidRaw = p.lidJid || p.lid || (p.jid && p.jid.includes('@lid') ? p.jid : '') || (p.id && p.id.includes('@lid') ? p.id : '');
                const pnRaw = p.phoneNumber || p.phoneJid || (p.jid && !p.jid.includes('@lid') ? p.jid : '') || (p.id && !p.id.includes('@lid') ? p.id : '');

                const cleanLid = lidRaw ? lidRaw.replace(/:\d+@.*$/, '').replace(/@.*$/, '').trim() : '';
                const cleanPn = pnRaw ? pnRaw.replace(/:\d+@.*$/, '').replace(/@.*$/, '').replace(/\D/g, '').trim() : '';

                if (cleanLid && cleanPn && cleanLid !== cleanPn) {
                    lidToPnMap.set(cleanLid, cleanPn);
                    lidJidToPnJidMap.set(`${cleanLid}@lid`, `${cleanPn}@s.whatsapp.net`);
                }
            }
        } catch {
            // ignore error
        }
    }

    return async (target: string): Promise<ResolvedUser> => {
        if (!target) return { jid: '', number: '' };

        const clean = target.replace(/:\d+@/, '@').trim();
        const rawDigits = clean.replace(/@.*$/, '').replace(/:\d+$/, '').trim();

        // Cek map group metadata
        if (lidToPnMap.has(rawDigits)) {
            const pn = lidToPnMap.get(rawDigits)!;
            return { jid: `${pn}@s.whatsapp.net`, number: pn };
        }
        if (lidJidToPnJidMap.has(clean)) {
            const pnJid = lidJidToPnJidMap.get(clean)!;
            return { jid: pnJid, number: pnJid.replace(/@.*$/, '') };
        }

        // Jika sudah nomor telepon biasa
        if (!clean.includes('@lid') && !clean.includes('lid') && /^\d{5,16}$/.test(rawDigits)) {
            return { jid: `${rawDigits}@s.whatsapp.net`, number: rawDigits };
        }

        // Coba resolve via signalDeviceSync
        try {
            const sync = (context.client as any).signalDeviceSync;
            if (sync && typeof sync.resolveUserJidPair === 'function') {
                const queryJid = clean.includes('@') ? clean : `${clean}@lid`;
                const pair = await sync.resolveUserJidPair(queryJid);
                if (pair?.pnJid) {
                    const pn = pair.pnJid.replace(/@.*$/, '').replace(/:\d+$/, '').replace(/\D/g, '');
                    if (pn) {
                        lidToPnMap.set(rawDigits, pn);
                        lidJidToPnJidMap.set(clean, `${pn}@s.whatsapp.net`);
                        return { jid: `${pn}@s.whatsapp.net`, number: pn };
                    }
                }
            }
        } catch {
            // ignore
        }

        return {
            jid: clean.includes('@') ? clean : `${clean}@s.whatsapp.net`,
            number: rawDigits
        };
    };
}

const handler: Plugin = {
    command: ['rvo'],
    category: 'tools',
    description: 'Membuka dan mengambil media dari pesan sekali lihat (View Once)',
    execute: async (context: PluginContext): Promise<void> => {
        const quoteContextInfo =
            context.event.message?.extendedTextMessage?.contextInfo ||
            (context.event as any)?.message?.extendedTextMessage?.contextInfo ||
            null;

        const rawQuoted = quoteContextInfo?.quotedMessage || null;

        if (!rawQuoted) {
            await context.reply(
                `🔓 *REVEAL VIEW ONCE (RVO)*\n\n` +
                `Membuka dan mengambil media dari pesan sekali lihat (View Once).\n\n` +
                `⚙️ *Cara Penggunaan:*\n` +
                `› Balas (quote) pesan View Once (gambar/video/audio) dengan perintah: *${context.usedPrefix || '.'}${context.command}*`
            );
            return;
        }

        const innerMsg = unwrapViewOnce(rawQuoted);
        const hasMedia = Boolean(
            innerMsg?.imageMessage ||
            innerMsg?.videoMessage ||
            innerMsg?.audioMessage
        );

        if (!hasMedia) {
            await context.reply('⚠️ Pesan yang kamu balas bukan merupakan pesan sekali lihat (View Once) atau media tidak ditemukan.');
            return;
        }

        await context.reply(global.mess?.wait || '⏳ Sedang membuka pesan sekali lihat...');

        try {
            const buffer = await context.client.downloadMedia({ message: innerMsg });

            if (!buffer || buffer.length === 0) {
                await context.reply('❌ Gagal mengunduh media dari pesan sekali lihat.');
                return;
            }

            const mediaContextInfo =
                innerMsg?.imageMessage?.contextInfo ||
                innerMsg?.videoMessage?.contextInfo ||
                innerMsg?.audioMessage?.contextInfo ||
                {};

            const resolveLid = await buildLidResolver(context);
            const allMentions = new Set<string>();

            // 1. Resolve Pengirim pesan View Once
            const quotedParticipant = quoteContextInfo?.participant || (context.chatJid.endsWith('@g.us') ? '' : context.chatJid);
            let senderDisplay = '';
            if (quotedParticipant) {
                const senderResolved = await resolveLid(quotedParticipant);
                if (senderResolved.number) {
                    senderDisplay = `👤 *Pengirim:* @${senderResolved.number}\n`;
                    allMentions.add(senderResolved.jid);
                    if (quotedParticipant.includes('@lid')) {
                        allMentions.add(quotedParticipant);
                    }
                }
            }

            // 2. Resolve mentions di dalam caption
            let rawCaption = (innerMsg.imageMessage?.caption || innerMsg.videoMessage?.caption || '').trim();
            const rawMentions: string[] = mediaContextInfo?.mentionedJid || [];

            for (const m of rawMentions) {
                const res = await resolveLid(m);
                if (res.jid) allMentions.add(res.jid);
                if (m.includes('@lid')) allMentions.add(m);

                const mDigits = m.replace(/@.*$/, '').replace(/:\d+$/, '').trim();
                if (mDigits && res.number && mDigits !== res.number) {
                    const regex = new RegExp(`@${mDigits}\\b`, 'g');
                    rawCaption = rawCaption.replace(regex, `@${res.number}`);
                }
            }

            // Cek jika masih ada pola @(\d+) di caption yang berupa LID
            const tagMatches = rawCaption.match(/@(\d{5,25})/g) || [];
            for (const match of tagMatches) {
                const digits = match.replace('@', '');
                const res = await resolveLid(digits);
                if (res.jid) allMentions.add(res.jid);
                if (digits !== res.number) {
                    const regex = new RegExp(`@${digits}\\b`, 'g');
                    rawCaption = rawCaption.replace(regex, `@${res.number}`);
                }
            }

            const captionBlock = rawCaption ? `📝 *Caption Asli:*\n${rawCaption}\n\n` : '';
            const mentionList = Array.from(allMentions);

            if (innerMsg.imageMessage) {
                const captionText =
                    `🔓 *REVEAL VIEW ONCE (IMAGE)*\n\n` +
                    (senderDisplay ? `${senderDisplay}\n` : '') +
                    captionBlock +
                    `_Pesan sekali lihat berhasil dibuka._`;

                await context.client.sendMessage(
                    context.chatJid,
                    {
                        image: buffer,
                        caption: captionText,
                        mentions: mentionList
                    },
                    { quoted: context.raw as any }
                );
            } else if (innerMsg.videoMessage) {
                const captionText =
                    `🔓 *REVEAL VIEW ONCE (VIDEO)*\n\n` +
                    (senderDisplay ? `${senderDisplay}\n` : '') +
                    captionBlock +
                    `_Pesan sekali lihat berhasil dibuka._`;

                await context.client.sendMessage(
                    context.chatJid,
                    {
                        video: buffer,
                        caption: captionText,
                        mentions: mentionList
                    },
                    { quoted: context.raw as any }
                );
            } else if (innerMsg.audioMessage) {
                await context.client.sendMessage(
                    context.chatJid,
                    {
                        audio: buffer,
                        mimetype: innerMsg.audioMessage.mimetype || 'audio/ogg; codecs=opus',
                        ptt: Boolean(innerMsg.audioMessage.ptt)
                    },
                    { quoted: context.raw as any }
                );

                const infoText =
                    `🔓 *REVEAL VIEW ONCE (VOICE/AUDIO)*\n\n` +
                    (senderDisplay ? `${senderDisplay}\n` : '') +
                    `_Pesan suara sekali lihat berhasil dibuka di atas._`;

                await context.client.sendMessage(
                    context.chatJid,
                    {
                        text: infoText,
                        mentions: mentionList
                    },
                    { quoted: context.raw as any }
                );
            }
        } catch (err: any) {
            console.error('[rvo]', err);
            await context.reply(`❌ Gagal membuka pesan sekali lihat: ${err.message || err}`);
        }
    }
};

export default handler;
