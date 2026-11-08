import crypto from 'node:crypto';
import {
    downloadMediaMessage,
    type WaClient,
    type WaIncomingMessageEvent,
    type WaSendMessageOptions,
    type WaSendMessageContent
} from 'zapo-js';
import type { BotConfig } from './config.js';
import { logger } from './logger.js';

export interface ReplyButtonOption {
    readonly id: string;
    readonly text: string;
}

export interface UrlButtonOption {
    readonly text: string;
    readonly url: string;
    readonly merchantUrl?: string;
}

export interface CopyButtonOption {
    readonly text: string;
    readonly copyCode: string;
}

export interface CallButtonOption {
    readonly text: string;
    readonly phoneNumber: string;
}

export interface ListRowOption {
    readonly id: string;
    readonly title: string;
    readonly description?: string;
}

export interface ListSectionOption {
    readonly title: string;
    readonly rows: readonly ListRowOption[];
}

export type InteractiveButton =
    | ({ readonly type: 'reply' } & ReplyButtonOption)
    | ({ readonly type: 'url' } & UrlButtonOption)
    | ({ readonly type: 'copy' } & CopyButtonOption)
    | ({ readonly type: 'call' } & CallButtonOption)
    | {
          readonly type: 'select';
          readonly title: string;
          readonly sections: readonly ListSectionOption[];
      };

export type ButtonV2Item =
    | ({ readonly type: 'reply' } & ReplyButtonOption)
    | ({ readonly type: 'url' } & UrlButtonOption)
    | ({ readonly type: 'copy' } & CopyButtonOption)
    | ({ readonly type: 'call' } & CallButtonOption)
    | {
          readonly type: 'select';
          readonly title: string;
          readonly sections: readonly ListSectionOption[];
      };

export interface ReplyOptions {
    readonly text: string;
    readonly header?: string;
    readonly footer?: string;
    readonly image?: string | Buffer;
    readonly buttons: readonly ReplyButtonOption[];
}

export interface UrlOptions {
    readonly text: string;
    readonly header?: string;
    readonly footer?: string;
    readonly image?: string | Buffer;
    readonly buttons: readonly UrlButtonOption[];
}

export interface CopyOptions {
    readonly text: string;
    readonly header?: string;
    readonly footer?: string;
    readonly image?: string | Buffer;
    readonly buttons: readonly CopyButtonOption[];
}

export interface CallOptions {
    readonly text: string;
    readonly header?: string;
    readonly footer?: string;
    readonly image?: string | Buffer;
    readonly buttons: readonly CallButtonOption[];
}

export interface ListOptions {
    readonly text: string;
    readonly buttonText: string;
    readonly header?: string;
    readonly footer?: string;
    readonly image?: string | Buffer;
    readonly sections: readonly ListSectionOption[];
}

export interface SelectOptions {
    readonly text: string;
    readonly title: string;
    readonly header?: string;
    readonly footer?: string;
    readonly image?: string | Buffer;
    readonly sections: readonly ListSectionOption[];
}

export interface SendOptions {
    readonly text: string;
    readonly header?: string;
    readonly footer?: string;
    readonly image?: string | Buffer;
    readonly buttons: readonly InteractiveButton[];
}

export interface LocationOptions {
    readonly latitude: number;
    readonly longitude: number;
    readonly name?: string;
    readonly address?: string;
    readonly url?: string;
    readonly thumbnail?: string | Buffer;
    readonly accuracyInMeters?: number;
    readonly speedInMps?: number;
    readonly isLive?: boolean;
}

export interface ButtonV2HeaderMedia {
    readonly title?: string;
    readonly subtitle?: string;
    readonly image?: string | Buffer;
    readonly video?: string | Buffer;
    readonly document?: string | Buffer;
    readonly thumbnail?: string | Buffer;
    readonly location?: LocationOptions;
}

export type ButtonV2HeaderInput = string | ButtonV2HeaderMedia;

export interface ButtonV2SendOptions {
    readonly text: string;
    readonly header?: ButtonV2HeaderInput;
    readonly footer?: string;
    readonly image?: string | Buffer;
    readonly buttons: readonly ButtonV2Item[];
}

export interface ButtonV2WithLocationOptions {
    readonly location: LocationOptions;
    readonly buttons: ButtonV2SendOptions;
    readonly mode?: 'auto' | 'native' | 'fallback';
}

export interface CoroseulCardButton {
    readonly type?: 'reply' | 'url' | 'copy';
    readonly id?: string;
    readonly text: string;
    readonly url?: string;
    readonly copyCode?: string;
    readonly merchantUrl?: string;
}

export interface CoroseulCard {
    readonly title?: string;
    readonly subtitle?: string;
    readonly body: string;
    readonly footer?: string;
    readonly image?: string | Buffer;
    readonly buttons?: readonly CoroseulCardButton[];
}

export interface CoroseulOptions {
    readonly text: string;
    readonly footer?: string;
    readonly cards: readonly CoroseulCard[];
}

export interface ThumbImageOptions {
    readonly image: string | Buffer;
    readonly caption?: string;
    readonly thumbnail?: string | Buffer;
}

export interface ThumbVideoOptions {
    readonly video: string | Buffer;
    readonly caption?: string;
    readonly thumbnail?: string | Buffer;
}

export interface ThumbLinkOptions {
    readonly text: string;
    readonly url: string;
    readonly title?: string;
    readonly description?: string;
    readonly thumbnail?: string | Buffer;
}

export interface ThumbGeneralOptions {
    readonly image?: string | Buffer;
    readonly video?: string | Buffer;
    readonly url?: string;
    readonly text?: string;
    readonly caption?: string;
    readonly title?: string;
    readonly description?: string;
    readonly thumbnail?: string | Buffer;
}

export type PluginTarget =
    | string
    | WaIncomingMessageEvent
    | {
          readonly chatJid?: string;
          readonly event?: WaIncomingMessageEvent;
          readonly client?: WaClient;
          readonly key?: { readonly remoteJid?: string };
      };

export interface ButtonHelper {
    reply(target: PluginTarget, options: ReplyOptions, sendOptions?: WaSendMessageOptions): Promise<unknown>;
    url(target: PluginTarget, options: UrlOptions, sendOptions?: WaSendMessageOptions): Promise<unknown>;
    copy(target: PluginTarget, options: CopyOptions, sendOptions?: WaSendMessageOptions): Promise<unknown>;
    list(target: PluginTarget, options: ListOptions, sendOptions?: WaSendMessageOptions): Promise<unknown>;
    select(target: PluginTarget, options: SelectOptions, sendOptions?: WaSendMessageOptions): Promise<unknown>;
    send(target: PluginTarget, options: SendOptions, sendOptions?: WaSendMessageOptions): Promise<unknown>;
}

export interface ButtonV2Helper {
    reply(target: PluginTarget, options: ReplyOptions, sendOptions?: WaSendMessageOptions): Promise<unknown>;
    url(target: PluginTarget, options: UrlOptions, sendOptions?: WaSendMessageOptions): Promise<unknown>;
    copy(target: PluginTarget, options: CopyOptions, sendOptions?: WaSendMessageOptions): Promise<unknown>;
    call(target: PluginTarget, options: CallOptions, sendOptions?: WaSendMessageOptions): Promise<unknown>;
    list(target: PluginTarget, options: ListOptions, sendOptions?: WaSendMessageOptions): Promise<unknown>;
    select(target: PluginTarget, options: SelectOptions, sendOptions?: WaSendMessageOptions): Promise<unknown>;
    send(target: PluginTarget, options: ButtonV2SendOptions, sendOptions?: WaSendMessageOptions): Promise<unknown>;
    sendWithLocation(target: PluginTarget, options: ButtonV2WithLocationOptions, sendOptions?: WaSendMessageOptions): Promise<unknown>;
}

export type LocationFunction = (
    target: PluginTarget,
    options: LocationOptions,
    sendOptions?: WaSendMessageOptions
) => Promise<unknown>;

export interface ThumbHelper {
    (target: PluginTarget, options: ThumbGeneralOptions, sendOptions?: WaSendMessageOptions): Promise<unknown>;
    image(target: PluginTarget, options: ThumbImageOptions, sendOptions?: WaSendMessageOptions): Promise<unknown>;
    video(target: PluginTarget, options: ThumbVideoOptions, sendOptions?: WaSendMessageOptions): Promise<unknown>;
    link(target: PluginTarget, options: ThumbLinkOptions, sendOptions?: WaSendMessageOptions): Promise<unknown>;
    send(target: PluginTarget, options: ThumbGeneralOptions, sendOptions?: WaSendMessageOptions): Promise<unknown>;
}

export type CoroseulFunction = (
    target: PluginTarget,
    options: CoroseulOptions,
    sendOptions?: WaSendMessageOptions
) => Promise<unknown>;

declare global {
    var button: ButtonHelper;
    var buttonv2: ButtonV2Helper;
    var coroseul: CoroseulFunction;
    var location: LocationFunction;
    var thumb: ThumbHelper;
}

let activeClient: WaClient | null = null;
let activeConfig: BotConfig | null = null;

function resolveTargetInfo(target: PluginTarget): { chatJid: string; quote?: unknown; client: WaClient } {
    let client = activeClient;
    let chatJid = '';
    let quote: unknown;

    if (typeof target === 'string') {
        chatJid = target;
    } else if (target && typeof target === 'object') {
        const obj = target as Record<string, unknown>;
        if (obj.client && typeof (obj.client as WaClient).message?.send === 'function') {
            client = obj.client as WaClient;
        }

        if (typeof obj.chatJid === 'string' && obj.chatJid) {
            chatJid = obj.chatJid;
            quote = obj.event;
        } else if (obj.key && typeof obj.key === 'object') {
            const keyObj = obj.key as Record<string, unknown>;
            if (typeof keyObj.remoteJid === 'string') {
                chatJid = keyObj.remoteJid;
                quote = target;
            }
        }
    }

    if (!client) {
        throw new Error('WaClient is not initialized in helper-zapo. Call setupGlobalHelpers first.');
    }

    if (!chatJid) {
        throw new Error('Could not resolve chatJid from target in helper-zapo.');
    }

    return { chatJid, quote, client };
}

function validateUrl(url: string): void {
    const trimmed = url.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        throw new Error(`Invalid URL scheme: "${url}". Only HTTP and HTTPS are allowed.`);
    }
}

function validateCoordinates(latitude: number, longitude: number): void {
    if (typeof latitude !== 'number' || Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
        throw new Error(`Invalid latitude "${latitude}". Latitude must be a number between -90 and 90.`);
    }
    if (typeof longitude !== 'number' || Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
        throw new Error(`Invalid longitude "${longitude}". Longitude must be a number between -180 and 180.`);
    }
}

async function fetchMediaBuffer(source: any): Promise<Buffer> {
    if (!source) throw new Error('Invalid media source: empty or undefined');
    if (Buffer.isBuffer(source)) {
        return source;
    }
    if (source instanceof Uint8Array) {
        return Buffer.from(source);
    }
    if (typeof source === 'object' && source.url) {
        return fetchMediaBuffer(source.url);
    }
    if (typeof source === 'string') {
        const trimmed = source.trim();
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            const response = await fetch(trimmed);
            if (!response.ok) {
                throw new Error(`Failed to fetch media from URL: ${response.statusText}`);
            }
            return Buffer.from(await response.arrayBuffer());
        }
        const fs = await import('node:fs/promises');
        const path = await import('node:path');
        const { existsSync } = await import('node:fs');
        let resolved = trimmed;
        if (!existsSync(resolved)) {
            const cwdPath = path.resolve(process.cwd(), trimmed);
            if (existsSync(cwdPath)) {
                resolved = cwdPath;
            }
        }
        return await fs.readFile(resolved);
    }
    throw new Error('Invalid media source: must be string URL, local path, Buffer, or { url } object.');
}

async function uploadMedia(
    client: WaClient,
    source: string | Buffer,
    type: 'image' | 'video' | 'audio' | 'document' = 'image',
    mimetype = 'image/jpeg'
): Promise<Record<string, unknown>> {
    const buffer = await fetchMediaBuffer(source);
    const uploadResult = await client.message.upload(buffer, {
        type,
        mimetype
    });

    return {
        url: uploadResult.url,
        directPath: uploadResult.directPath,
        mediaKey: uploadResult.mediaKey,
        fileSha256: uploadResult.fileSha256,
        fileEncSha256: uploadResult.fileEncSha256,
        fileLength: uploadResult.fileLength,
        mediaKeyTimestamp: uploadResult.mediaKeyTimestamp,
        mimetype: uploadResult.mimetype ?? mimetype
    };
}

function buildNativeButtons(buttons: readonly (InteractiveButton | ButtonV2Item)[]): Array<{ name: string; buttonParamsJson: string }> {
    return buttons.map((btn) => {
        if (btn.type === 'reply') {
            return {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: btn.text,
                    id: btn.id
                })
            };
        }
        if (btn.type === 'url') {
            validateUrl(btn.url);
            return {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: btn.text,
                    url: btn.url,
                    merchant_url: btn.merchantUrl ?? btn.url
                })
            };
        }
        if (btn.type === 'copy') {
            return {
                name: 'cta_copy',
                buttonParamsJson: JSON.stringify({
                    display_text: btn.text,
                    copy_code: btn.copyCode
                })
            };
        }
        if (btn.type === 'call') {
            return {
                name: 'cta_call',
                buttonParamsJson: JSON.stringify({
                    display_text: btn.text,
                    phone_number: btn.phoneNumber
                })
            };
        }
        if (btn.type === 'select') {
            return {
                name: 'single_select',
                buttonParamsJson: JSON.stringify({
                    title: btn.title,
                    sections: btn.sections
                })
            };
        }
        throw new Error('Unsupported button type in buildNativeButtons');
    });
}

function buildInteractiveFallback(
    text: string,
    buttons: readonly (InteractiveButton | ButtonV2Item)[],
    header?: string,
    footer?: string
): string {
    const parts: string[] = [];
    if (header) {
        parts.push(`*${header}*\n`);
    }
    parts.push(text);
    if (footer) {
        parts.push(`\n_${footer}_`);
    }

    if (buttons.length > 0) {
        parts.push('\n\n*Pilihan:*');
        let replyIndex = 1;
        for (const btn of buttons) {
            if (btn.type === 'reply') {
                parts.push(`[${replyIndex++}] ${btn.text} (Ketik: ${btn.id})`);
            } else if (btn.type === 'url') {
                parts.push(`[🔗] ${btn.text}: ${btn.url}`);
            } else if (btn.type === 'copy') {
                parts.push(`[📋] ${btn.text}: \`${btn.copyCode}\``);
            } else if (btn.type === 'call') {
                parts.push(`[📞] ${btn.text}: ${btn.phoneNumber}`);
            } else if (btn.type === 'select') {
                parts.push(`\n*${btn.title}:*`);
                for (const section of btn.sections) {
                    parts.push(`— ${section.title} —`);
                    for (const row of section.rows) {
                        const desc = row.description ? ` (${row.description})` : '';
                        parts.push(`• ${row.title}${desc} (Ketik: ${row.id})`);
                    }
                }
            }
        }
    }

    return parts.join('\n');
}

function buildLocationFallback(options: LocationOptions): string {
    const lines: string[] = ['📍 *LOKASI*'];
    if (options.name) {
        lines.push(`📌 *Nama:* ${options.name}`);
    }
    if (options.address) {
        lines.push(`🏢 *Alamat:* ${options.address}`);
    }
    lines.push(`🌐 *Koordinat:* ${options.latitude}, ${options.longitude}`);
    lines.push(`🗺️ *Peta:* https://maps.google.com/?q=${options.latitude},${options.longitude}`);
    if (options.url) {
        lines.push(`🔗 *Link:* ${options.url}`);
    }
    return lines.join('\n');
}

async function sendInteractive(
    target: PluginTarget,
    options: SendOptions,
    sendOptions?: WaSendMessageOptions
): Promise<unknown> {
    const { chatJid, quote, client } = resolveTargetInfo(target);
    const mergedSendOptions: WaSendMessageOptions = quote ? { quote: quote as any, ...sendOptions } : { ...sendOptions };

    const nativeButtons = buildNativeButtons(options.buttons);
    let uploadedImage: Record<string, unknown> | undefined;

    if (options.image) {
        try {
            uploadedImage = await uploadMedia(client, options.image, 'image', 'image/jpeg');
        } catch (uploadError) {
            logger.warn('Failed to upload interactive image', uploadError);
        }
    }

    const payload = {
        interactiveMessage: {
            header: {
                title: options.header ?? '',
                hasMediaAttachment: Boolean(uploadedImage),
                ...(uploadedImage ? { imageMessage: uploadedImage } : {})
            },
            body: {
                text: options.text
            },
            footer: options.footer ? { text: options.footer } : undefined,
            nativeFlowMessage: {
                buttons: nativeButtons,
                messageParamsJson: ''
            }
        }
    };

    const fallbackText = buildInteractiveFallback(options.text, options.buttons, options.header, options.footer);

    try {
        return await client.message.send(chatJid, payload as any, mergedSendOptions);
    } catch (sendError) {
        logger.warn('Native interactive send failed, delivering fallback', sendError);
        return await client.message.send(chatJid, fallbackText, mergedSendOptions);
    }
}

async function sendInteractiveV2(
    target: PluginTarget,
    options: ButtonV2SendOptions,
    sendOptions?: WaSendMessageOptions
): Promise<unknown> {
    const { chatJid, quote, client } = resolveTargetInfo(target);
    const mergedSendOptions: WaSendMessageOptions = quote ? { quote: quote as any, ...sendOptions } : { ...sendOptions };

    if (!options.buttons || options.buttons.length === 0) {
        throw new Error('ButtonV2 requires at least one button.');
    }
    if (options.buttons.length > 10) {
        throw new Error('ButtonV2 allows at most 10 buttons.');
    }

    const nativeButtons = buildNativeButtons(options.buttons);
    const headerObj: Record<string, unknown> = {};

    let imageSource: string | Buffer | undefined = options.image;
    let videoSource: string | Buffer | undefined;
    let documentSource: string | Buffer | undefined;
    let thumbnailSource: string | Buffer | undefined;
    let locationSource: LocationOptions | undefined;

    if (typeof options.header === 'string') {
        headerObj.title = options.header;
    } else if (options.header && typeof options.header === 'object') {
        if (options.header.title) {
            headerObj.title = options.header.title;
        }
        if (options.header.subtitle) {
            headerObj.subtitle = options.header.subtitle;
        }
        if (options.header.image) {
            imageSource = options.header.image;
        }
        if (options.header.video) {
            videoSource = options.header.video;
        }
        if (options.header.document) {
            documentSource = options.header.document;
        }
        if (options.header.thumbnail) {
            thumbnailSource = options.header.thumbnail;
        }
        if (options.header.location) {
            locationSource = options.header.location;
        }
    }

    if (imageSource) {
        try {
            const uploadedImage = await uploadMedia(client, imageSource, 'image', 'image/jpeg');
            headerObj.imageMessage = uploadedImage;
            headerObj.hasMediaAttachment = true;
        } catch (uploadError) {
            logger.warn('Failed to upload ButtonV2 image', uploadError);
        }
    } else if (videoSource) {
        try {
            const uploadedVideo = await uploadMedia(client, videoSource, 'video', 'video/mp4');
            headerObj.videoMessage = uploadedVideo;
            headerObj.hasMediaAttachment = true;
        } catch (uploadError) {
            logger.warn('Failed to upload ButtonV2 video', uploadError);
        }
    } else if (documentSource) {
        try {
            const uploadedDoc = await uploadMedia(client, documentSource, 'document', 'application/pdf');
            headerObj.documentMessage = uploadedDoc;
            headerObj.hasMediaAttachment = true;
        } catch (uploadError) {
            logger.warn('Failed to upload ButtonV2 document', uploadError);
        }
    }

    if (thumbnailSource) {
        try {
            const thumbBuf = await fetchMediaBuffer(thumbnailSource);
            headerObj.jpegThumbnail = new Uint8Array(thumbBuf);
        } catch (thumbError) {
            logger.warn('Failed to load ButtonV2 thumbnail', thumbError);
        }
    }

    if (locationSource) {
        validateCoordinates(locationSource.latitude, locationSource.longitude);
        headerObj.locationMessage = {
            degreesLatitude: locationSource.latitude,
            degreesLongitude: locationSource.longitude,
            name: locationSource.name ?? '',
            address: locationSource.address ?? ''
        };
        headerObj.hasMediaAttachment = true;
    }

    const payload = {
        interactiveMessage: {
            header: Object.keys(headerObj).length > 0 ? headerObj : undefined,
            body: {
                text: options.text
            },
            footer: options.footer ? { text: options.footer } : undefined,
            nativeFlowMessage: {
                buttons: nativeButtons,
                messageParamsJson: ''
            }
        }
    };

    const headerTitle = typeof options.header === 'string' ? options.header : options.header?.title;
    const fallbackText = buildInteractiveFallback(options.text, options.buttons, headerTitle, options.footer);

    try {
        return await client.message.send(chatJid, payload as any, mergedSendOptions);
    } catch (sendError) {
        logger.warn('Native interactive ButtonV2 send failed, delivering fallback', sendError);
        return await client.message.send(chatJid, fallbackText, mergedSendOptions);
    }
}

export async function sendLocation(
    target: PluginTarget,
    options: LocationOptions,
    sendOptions?: WaSendMessageOptions
): Promise<unknown> {
    validateCoordinates(options.latitude, options.longitude);

    const { chatJid, quote, client } = resolveTargetInfo(target);
    const mergedSendOptions: WaSendMessageOptions = quote ? { quote: quote as any, ...sendOptions } : { ...sendOptions };

    let jpegThumbnail: Uint8Array | undefined;
    if (options.thumbnail) {
        try {
            const buf = await fetchMediaBuffer(options.thumbnail);
            jpegThumbnail = new Uint8Array(buf);
        } catch (thumbError) {
            logger.warn('Failed to load location thumbnail', thumbError);
        }
    }

    const payload = {
        locationMessage: {
            degreesLatitude: options.latitude,
            degreesLongitude: options.longitude,
            ...(options.name ? { name: options.name } : {}),
            ...(options.address ? { address: options.address } : {}),
            ...(options.url ? { url: options.url } : {}),
            ...(options.accuracyInMeters !== undefined ? { accuracyInMeters: options.accuracyInMeters } : {}),
            ...(options.speedInMps !== undefined ? { speedInMps: options.speedInMps } : {}),
            ...(options.isLive !== undefined ? { isLive: options.isLive } : {}),
            ...(jpegThumbnail ? { jpegThumbnail } : {})
        }
    };

    const fallbackText = buildLocationFallback(options);

    try {
        return await client.message.send(chatJid, payload as any, mergedSendOptions);
    } catch (sendError) {
        logger.warn('Native location send failed, delivering fallback text', sendError);
        return await client.message.send(chatJid, fallbackText, mergedSendOptions);
    }
}

export async function sendThumb(
    target: PluginTarget,
    options: ThumbGeneralOptions,
    sendOptions?: WaSendMessageOptions
): Promise<unknown> {
    const { chatJid, quote, client } = resolveTargetInfo(target);
    const mergedSendOptions: WaSendMessageOptions = quote ? { quote: quote as any, ...sendOptions } : { ...sendOptions };

    if (options.image) {
        const imageBuf = await fetchMediaBuffer(options.image);
        let jpegThumbnail: Uint8Array | undefined;
        if (options.thumbnail) {
            try {
                const thumbBuf = await fetchMediaBuffer(options.thumbnail);
                jpegThumbnail = new Uint8Array(thumbBuf);
            } catch (thumbError) {
                logger.warn('Failed to process image thumbnail', thumbError);
            }
        }
        return await client.message.send(
            chatJid,
            {
                type: 'image',
                media: imageBuf,
                caption: options.caption ?? options.text ?? '',
                ...(jpegThumbnail ? { jpegThumbnail } : {})
            } as any,
            mergedSendOptions
        );
    }

    if (options.video) {
        const videoBuf = await fetchMediaBuffer(options.video);
        let jpegThumbnail: Uint8Array | undefined;
        if (options.thumbnail) {
            try {
                const thumbBuf = await fetchMediaBuffer(options.thumbnail);
                jpegThumbnail = new Uint8Array(thumbBuf);
            } catch (thumbError) {
                logger.warn('Failed to process video thumbnail', thumbError);
            }
        }
        return await client.message.send(
            chatJid,
            {
                type: 'video',
                media: videoBuf,
                caption: options.caption ?? options.text ?? '',
                ...(jpegThumbnail ? { jpegThumbnail } : {})
            } as any,
            mergedSendOptions
        );
    }

    if (options.url) {
        validateUrl(options.url);
        let thumbBytes: Uint8Array | undefined;
        if (options.thumbnail) {
            try {
                const buf = await fetchMediaBuffer(options.thumbnail);
                thumbBytes = new Uint8Array(buf);
            } catch (err) {
                logger.warn('Failed to process link thumbnail', err);
            }
        }
        const textMessage = {
            type: 'text' as const,
            text: options.text || options.url,
            linkPreview: {
                matchedText: options.url,
                ...(options.title ? { title: options.title } : {}),
                ...(options.description ? { description: options.description } : {}),
                ...(thumbBytes ? { thumbnail: { bytes: thumbBytes } } : {})
            }
        };
        return await client.message.send(chatJid, textMessage as any, mergedSendOptions);
    }

    if (options.text) {
        return await client.message.send(chatJid, options.text, mergedSendOptions);
    }

    throw new Error('sendThumb requires image, video, url, or text.');
}

export async function sendWithLocation(
    target: PluginTarget,
    options: ButtonV2WithLocationOptions,
    sendOptions?: WaSendMessageOptions
): Promise<unknown> {
    validateCoordinates(options.location.latitude, options.location.longitude);
    const mode = options.mode ?? 'auto';

    if (mode === 'native') {
        const headerMedia: ButtonV2HeaderMedia = {
            ...(typeof options.buttons.header === 'object' ? options.buttons.header : {}),
            ...(typeof options.buttons.header === 'string' ? { title: options.buttons.header } : {}),
            location: options.location
        };

        try {
            return await sendInteractiveV2(
                target,
                {
                    ...options.buttons,
                    header: headerMedia
                },
                sendOptions
            );
        } catch (nativeError) {
            logger.warn('Native combined location and ButtonV2 rejected by WhatsApp, executing sequential delivery', nativeError);
        }
    }

    const locResult = await sendLocation(target, options.location, sendOptions);
    const btnResult = await sendInteractiveV2(target, options.buttons, sendOptions);
    return [locResult, btnResult];
}

function buildCardNativeButtons(buttons?: readonly CoroseulCardButton[]): Array<{ name: string; buttonParamsJson: string }> {
    if (!buttons || buttons.length === 0) {
        return [];
    }
    return buttons.map((btn) => {
        const type = btn.type ?? (btn.url ? 'url' : btn.copyCode ? 'copy' : 'reply');
        if (type === 'reply') {
            return {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: btn.text,
                    id: btn.id ?? btn.text
                })
            };
        }
        if (type === 'url') {
            const url = btn.url ?? '';
            validateUrl(url);
            return {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: btn.text,
                    url,
                    merchant_url: btn.merchantUrl ?? url
                })
            };
        }
        if (type === 'copy') {
            return {
                name: 'cta_copy',
                buttonParamsJson: JSON.stringify({
                    display_text: btn.text,
                    copy_code: btn.copyCode ?? ''
                })
            };
        }
        throw new Error('Unsupported coroseul card button type');
    });
}

function buildCoroseulFallback(options: CoroseulOptions): string {
    const parts: string[] = [];
    parts.push(`*${options.text}*`);
    if (options.footer) {
        parts.push(`_${options.footer}_\n`);
    } else {
        parts.push('\n');
    }

    const total = options.cards.length;
    for (let i = 0; i < total; i++) {
        const card = options.cards[i];
        parts.push(`╭───「 *SLIDE ${i + 1} / ${total}* 」`);
        if (card.title) {
            parts.push(`│ 📌 *${card.title}*`);
        }
        parts.push(`│ ${card.body}`);
        if (card.footer) {
            parts.push(`│ _${card.footer}_`);
        }
        if (card.buttons && card.buttons.length > 0) {
            parts.push(`│`);
            for (const btn of card.buttons) {
                const type = btn.type ?? (btn.url ? 'url' : btn.copyCode ? 'copy' : 'reply');
                if (type === 'reply') {
                    parts.push(`│ › [ ${btn.text} ] (Ketik: ${btn.id ?? btn.text})`);
                } else if (type === 'url') {
                    parts.push(`│ › 🔗 ${btn.text}: ${btn.url}`);
                } else if (type === 'copy') {
                    parts.push(`│ › 📋 ${btn.text}: \`${btn.copyCode}\``);
                }
            }
        }
        parts.push(`╰───────────────────\n`);
    }

    return parts.join('\n');
}

export interface AlbumItem {
    readonly image?: string | Buffer | Uint8Array;
    readonly video?: string | Buffer | Uint8Array;
    readonly caption?: string;
    readonly mimetype?: string;
}

export async function sendAlbumMessage(
    target: PluginTarget,
    medias: readonly AlbumItem[],
    options?: ZapoHelperOptions
): Promise<unknown> {
    const { chatJid, quote, client } = resolveTargetInfo(target);
    const helperClient = client as unknown as ZapoWithHelpers;
    if (typeof helperClient.sendAlbumMessage === 'function') {
        return helperClient.sendAlbumMessage(chatJid, medias, {
            quoted: quote as any,
            ...options
        });
    }
    throw new Error('sendAlbumMessage is not supported on this client');
}

export async function sendCoroseul(
    target: PluginTarget,
    options: CoroseulOptions,
    sendOptions?: WaSendMessageOptions
): Promise<unknown> {
    if (!options.cards || options.cards.length < 2) {
        throw new Error('Coroseul requires at least 2 cards.');
    }
    if (options.cards.length > 10) {
        throw new Error('Coroseul allows at most 10 cards.');
    }

    const { chatJid, quote, client } = resolveTargetInfo(target);
    const mergedSendOptions: WaSendMessageOptions = quote ? { quote: quote as any, ...sendOptions } : { ...sendOptions };
    const defaultThumbnail = activeConfig?.thumbnailUrl || 'https://n.uguu.se/HAEBPeSk.jpeg';

    const builtCards: unknown[] = [];
    for (const card of options.cards) {
        if (!card.body || card.body.trim() === '') {
            throw new Error('Every coroseul card must have a non-empty body.');
        }

        const cardButtons = buildCardNativeButtons(card.buttons);
        let uploadedImage: Record<string, unknown> | undefined;
        const imageSource = card.image ?? defaultThumbnail;

        if (imageSource) {
            try {
                uploadedImage = await uploadMedia(client, imageSource, 'image', 'image/jpeg');
            } catch (mediaError) {
                logger.warn('Failed to upload coroseul card media', mediaError);
            }
        }

        const headerObj: Record<string, unknown> = {
            title: card.title ?? '',
            hasMediaAttachment: Boolean(uploadedImage),
            ...(uploadedImage ? { imageMessage: uploadedImage } : {})
        };

        if (card.subtitle) {
            headerObj.subtitle = card.subtitle;
        }

        builtCards.push({
            header: headerObj,
            body: {
                text: card.body
            },
            footer: card.footer ? { text: card.footer } : undefined,
            nativeFlowMessage: {
                buttons: cardButtons,
                messageParamsJson: ''
            }
        });
    }

    const payload = {
        interactiveMessage: {
            header: {
                hasMediaAttachment: false
            },
            body: {
                text: options.text
            },
            footer: options.footer ? { text: options.footer } : undefined,
            nativeFlowMessage: {
                buttons: [],
                messageParamsJson: ''
            },
            carouselMessage: {
                cards: builtCards,
                messageVersion: 1,
                carouselCardType: 1
            }
        }
    };

    const fallbackText = buildCoroseulFallback(options);

    try {
        return await client.message.send(chatJid, payload as any, mergedSendOptions);
    } catch (sendError) {
        logger.warn('Native coroseul send failed, delivering fallback', sendError);
        return await client.message.send(chatJid, fallbackText, mergedSendOptions);
    }
}

export const button: ButtonHelper = {
    reply: (target, opts, sendOpts) => {
        const buttons: InteractiveButton[] = opts.buttons.map((b) => ({
            type: 'reply' as const,
            id: b.id,
            text: b.text
        }));
        return sendInteractive(target, { text: opts.text, header: opts.header, footer: opts.footer, image: opts.image, buttons }, sendOpts);
    },
    url: (target, opts, sendOpts) => {
        const buttons: InteractiveButton[] = opts.buttons.map((b) => ({
            type: 'url' as const,
            text: b.text,
            url: b.url,
            merchantUrl: b.merchantUrl
        }));
        return sendInteractive(target, { text: opts.text, header: opts.header, footer: opts.footer, image: opts.image, buttons }, sendOpts);
    },
    copy: (target, opts, sendOpts) => {
        const buttons: InteractiveButton[] = opts.buttons.map((b) => ({
            type: 'copy' as const,
            text: b.text,
            copyCode: b.copyCode
        }));
        return sendInteractive(target, { text: opts.text, header: opts.header, footer: opts.footer, image: opts.image, buttons }, sendOpts);
    },
    list: (target, opts, sendOpts) => {
        const buttons: InteractiveButton[] = [
            {
                type: 'select' as const,
                title: opts.buttonText,
                sections: opts.sections
            }
        ];
        return sendInteractive(target, { text: opts.text, header: opts.header, footer: opts.footer, image: opts.image, buttons }, sendOpts);
    },
    select: (target, opts, sendOpts) => {
        const buttons: InteractiveButton[] = [
            {
                type: 'select' as const,
                title: opts.title,
                sections: opts.sections
            }
        ];
        return sendInteractive(target, { text: opts.text, header: opts.header, footer: opts.footer, image: opts.image, buttons }, sendOpts);
    },
    send: (target, opts, sendOpts) => sendInteractive(target, opts, sendOpts)
};

export const buttonv2: ButtonV2Helper = {
    reply: (target, opts, sendOpts) => {
        const buttons: ButtonV2Item[] = opts.buttons.map((b) => ({
            type: 'reply' as const,
            id: b.id,
            text: b.text
        }));
        return sendInteractiveV2(target, { text: opts.text, header: opts.header, footer: opts.footer, image: opts.image, buttons }, sendOpts);
    },
    url: (target, opts, sendOpts) => {
        const buttons: ButtonV2Item[] = opts.buttons.map((b) => ({
            type: 'url' as const,
            text: b.text,
            url: b.url,
            merchantUrl: b.merchantUrl
        }));
        return sendInteractiveV2(target, { text: opts.text, header: opts.header, footer: opts.footer, image: opts.image, buttons }, sendOpts);
    },
    copy: (target, opts, sendOpts) => {
        const buttons: ButtonV2Item[] = opts.buttons.map((b) => ({
            type: 'copy' as const,
            text: b.text,
            copyCode: b.copyCode
        }));
        return sendInteractiveV2(target, { text: opts.text, header: opts.header, footer: opts.footer, image: opts.image, buttons }, sendOpts);
    },
    call: (target, opts, sendOpts) => {
        const buttons: ButtonV2Item[] = opts.buttons.map((b) => ({
            type: 'call' as const,
            text: b.text,
            phoneNumber: b.phoneNumber
        }));
        return sendInteractiveV2(target, { text: opts.text, header: opts.header, footer: opts.footer, image: opts.image, buttons }, sendOpts);
    },
    list: (target, opts, sendOpts) => {
        const buttons: ButtonV2Item[] = [
            {
                type: 'select' as const,
                title: opts.buttonText,
                sections: opts.sections
            }
        ];
        return sendInteractiveV2(target, { text: opts.text, header: opts.header, footer: opts.footer, image: opts.image, buttons }, sendOpts);
    },
    select: (target, opts, sendOpts) => {
        const buttons: ButtonV2Item[] = [
            {
                type: 'select' as const,
                title: opts.title,
                sections: opts.sections
            }
        ];
        return sendInteractiveV2(target, { text: opts.text, header: opts.header, footer: opts.footer, image: opts.image, buttons }, sendOpts);
    },
    send: (target, opts, sendOpts) => sendInteractiveV2(target, opts, sendOpts),
    sendWithLocation: (target, opts, sendOpts) => sendWithLocation(target, opts, sendOpts)
};

const thumbCallable = (target: PluginTarget, opts: ThumbGeneralOptions, sendOpts?: WaSendMessageOptions): Promise<unknown> => {
    return sendThumb(target, opts, sendOpts);
};

export const thumb: ThumbHelper = Object.assign(thumbCallable, {
    image: (target: PluginTarget, opts: ThumbImageOptions, sendOpts?: WaSendMessageOptions) =>
        sendThumb(target, { image: opts.image, caption: opts.caption, thumbnail: opts.thumbnail }, sendOpts),
    video: (target: PluginTarget, opts: ThumbVideoOptions, sendOpts?: WaSendMessageOptions) =>
        sendThumb(target, { video: opts.video, caption: opts.caption, thumbnail: opts.thumbnail }, sendOpts),
    link: (target: PluginTarget, opts: ThumbLinkOptions, sendOpts?: WaSendMessageOptions) =>
        sendThumb(target, { text: opts.text, url: opts.url, title: opts.title, description: opts.description, thumbnail: opts.thumbnail }, sendOpts),
    send: (target: PluginTarget, opts: ThumbGeneralOptions, sendOpts?: WaSendMessageOptions) =>
        sendThumb(target, opts, sendOpts)
});

export const coroseul: CoroseulFunction = sendCoroseul;
export const location: LocationFunction = sendLocation;

export function extractInteraction(event: WaIncomingMessageEvent): { id: string; type: string } | null {
    const msg = event.message as Record<string, unknown> | undefined;
    if (!msg) {
        return null;
    }

    const interactiveResponse = msg.interactiveResponseMessage as Record<string, unknown> | undefined;
    if (interactiveResponse) {
        const nativeFlowResponse = interactiveResponse.nativeFlowResponseMessage as Record<string, unknown> | undefined;
        if (nativeFlowResponse && typeof nativeFlowResponse.paramsJson === 'string') {
            try {
                const parsed = JSON.parse(nativeFlowResponse.paramsJson);
                const resolvedId = parsed.id ?? parsed.selected_row_id ?? parsed.selected_id;
                if (resolvedId) {
                    return { id: String(resolvedId), type: 'native_flow_reply' };
                }
            } catch {}
        }
    }

    const templateResponse = msg.templateButtonReplyMessage as Record<string, unknown> | undefined;
    if (templateResponse && typeof templateResponse.selectedId === 'string') {
        return { id: templateResponse.selectedId, type: 'template_reply' };
    }

    const buttonResponse = msg.buttonsResponseMessage as Record<string, unknown> | undefined;
    if (buttonResponse && typeof buttonResponse.selectedButtonId === 'string') {
        return { id: buttonResponse.selectedButtonId, type: 'buttons_reply' };
    }

    const listResponse = msg.listResponseMessage as Record<string, unknown> | undefined;
    if (listResponse) {
        const singleSelect = listResponse.singleSelectReply as Record<string, unknown> | undefined;
        if (singleSelect && typeof singleSelect.selectedRowId === 'string') {
            return { id: singleSelect.selectedRowId, type: 'list_reply' };
        }
    }

    return null;
}

export function setupGlobalHelpers(client: WaClient, config: BotConfig): ZapoWithHelpers {
    activeClient = client;
    activeConfig = config;
    const enhanced = makeHelper(client);
    globalThis.button = button;
    globalThis.buttonv2 = buttonv2;
    globalThis.coroseul = coroseul;
    globalThis.location = sendLocation;
    globalThis.thumb = thumb;
    logger.info('Global Zapo helpers (button, buttonv2, coroseul, location, thumb, makeHelper) successfully registered.');
    return enhanced;
}


/**
 * Buttons & AI Rich helper untuk WhatsApp Zapo (100% TypeScript + zapo-js)
 *
 * Creator: Ranzz Suaminya Asa
 * Bot: Enami Asa Ai
 **/

export interface InteractiveButtonInput {
    readonly name?: string;
    readonly displayText?: string;
    readonly text?: string;
    readonly id?: string;
    readonly buttonId?: string;
    readonly url?: string;
    readonly copy?: string;
    readonly copyCode?: string;
    readonly call?: string;
    readonly phone?: string;
    readonly type?: string;
    readonly reminder?: boolean;
    readonly transaction_id?: string;
    readonly review_and_pay?: Record<string, unknown>;
    readonly params?: Record<string, unknown>;
    readonly product_id?: string;
    readonly catalog_product_id?: string;
    readonly business_phone_number?: string;
    readonly thumbnail_product_retailer_id?: string;
    readonly retailerId?: string;
    readonly flow_id?: string;
    readonly galaxy_message?: boolean;
    readonly flow_message_version?: string;
    readonly flow_token?: unknown;
    readonly flow_cta?: string;
    readonly flow_action?: string;
    readonly flow_action_payload?: Record<string, unknown>;
    readonly flow_metadata?: Record<string, unknown>;
    readonly icon?: string;
    readonly booking_confirmation?: Record<string, unknown>;
    readonly sections?: Array<{
        title?: string;
        highlight_label?: string;
        rows?: Array<{
            header?: string;
            title?: string;
            text?: string;
            description?: string;
            desc?: string;
            id?: string;
            rowId?: string;
        }>;
    }>;
    readonly rows?: Array<{
        header?: string;
        title?: string;
        text?: string;
        description?: string;
        desc?: string;
        id?: string;
        rowId?: string;
    }>;
    readonly sectionTitle?: string;
    readonly title?: string;
    readonly buttonText?: string;
    readonly buttonParamsJson?: string;
}

export interface HeaderContentInput {
    readonly title?: string;
    readonly subtitle?: string;
    readonly image?: string | Buffer;
    readonly video?: string | Buffer;
    readonly document?: string | Buffer;
    readonly mimetype?: string;
    readonly filename?: string;
    readonly location?: {
        readonly lat?: number;
        readonly lng?: number;
        readonly name?: string;
        readonly address?: string;
        readonly jpegThumbnail?: Buffer | Uint8Array;
    };
    readonly catalog?: {
        readonly image?: string | Buffer;
        readonly productId?: string;
        readonly title?: string;
        readonly currency?: string;
        readonly price?: number;
        readonly retailerId?: string;
        readonly url?: string;
        readonly businessJid?: string;
    };
    readonly autoDownload?: boolean;
}

export interface SendButtonsContentInput extends HeaderContentInput {
    readonly type?: string;
    readonly text?: string;
    readonly footer?: string;
    readonly buttons?: readonly InteractiveButtonInput[];
    readonly messageParams?: Record<string, unknown>;
    readonly contextInfo?: Record<string, unknown>;
    readonly carousel?: readonly any[];
    readonly cards?: readonly any[];
    readonly thumbnail?: string | Buffer;
    readonly jpegThumbnail?: Buffer | Uint8Array;
    readonly lat?: number;
    readonly lng?: number;
    readonly paymentParams?: Record<string, any>;
    readonly buttonsMessage?: unknown;
    readonly templateMessage?: unknown;
    readonly listMessage?: unknown;
    readonly productMessage?: unknown;
    readonly carouselMessage?: unknown;
    readonly interactiveMessage?: unknown;
    readonly medias?: readonly any[];
    readonly album?: readonly any[];
    readonly options?: readonly any[];
    readonly values?: readonly any[];
    readonly selectableCount?: number;
    readonly name?: string;
    readonly pollVotes?: readonly any[];
    readonly pollType?: string;
    readonly messageSecret?: string;
    readonly orderId?: string;
    readonly itemCount?: number;
    readonly status?: number;
    readonly surface?: number;
    readonly sellerJid?: string;
    readonly token?: string;
    readonly total?: number;
    readonly currency?: string;
    readonly url?: string;
    readonly description?: string;
    readonly uploadHD?: boolean;
    readonly previewType?: number;
    readonly mediaType?: number;
    readonly thumbnailHeight?: number;
    readonly thumbnailWidth?: number;
    readonly inviteLinkGroupTypeV2?: string;
    readonly startTime?: number | string;
    readonly extraGuestsAllowed?: boolean;
    readonly isScheduleCall?: boolean;
    readonly hasReminder?: boolean;
    readonly reminderOffsetSec?: number;
    readonly start_datetime?: string;
    readonly end_datetime?: string;
    readonly booking_url?: string;
    readonly phone_number?: string;
    readonly booking_management_url?: string;
    readonly email?: string;
    readonly display_text?: string;
    readonly display_content?: Record<string, unknown>;
    readonly buttonText?: string;
    readonly sections?: any;
    readonly productId?: string;
    readonly price?: number;
    readonly retailerId?: string;
    readonly businessJid?: string;
    readonly message?: unknown;
    readonly rich?: Record<string, unknown>;
}

export interface ZapoHelperOptions extends WaSendMessageOptions {
    readonly quoted?: unknown;
    readonly forward?: boolean;
    readonly forwarded?: boolean;
    readonly forwardingScore?: number;
    readonly contextInfo?: Record<string, unknown>;
    readonly autoDownload?: boolean;
}

export interface EventBuilder {
    setTitle(title: string): EventBuilder;
    setStartTime(time: number | string): EventBuilder;
    setReminder(sec: number): EventBuilder;
    setFooter(footer: string): EventBuilder;
    setQuoted(q: unknown): EventBuilder;
    addButton(name: string, params?: Record<string, unknown>): EventBuilder;
    send(jid: string, opts?: ZapoHelperOptions): Promise<unknown>;
}

export interface AIRichBuilder {
    setTitle(title: string): AIRichBuilder;
    setFooter(footer: string): AIRichBuilder;
    setContextInfo(obj: Record<string, unknown>): AIRichBuilder;
    addPayload(obj: Record<string, unknown>): AIRichBuilder;
    setAutoDownload(enabled?: boolean): AIRichBuilder;
    addText(text: string, options?: { hyperlink?: boolean; citation?: boolean; latex?: boolean }): AIRichBuilder;
    addCode(language: string, code: string): AIRichBuilder;
    addTable(table: any): AIRichBuilder;
    addSource(sources: any[]): AIRichBuilder;
    addImage(imageUrl: string | string[], options?: { autoDownload?: boolean }): AIRichBuilder;
    addVideo(videoUrl: string | string[], options?: { autoDownload?: boolean }): AIRichBuilder;
    addReels(reelsItems: any[] | any): AIRichBuilder;
    addProduct(data: any): AIRichBuilder;
    addPost(data: any): AIRichBuilder;
    addTip(text: string): AIRichBuilder;
    addSuggest(suggestion: string | string[] | Array<{ text?: string; prompt?: string }>): AIRichBuilder;
    send(jid: string | Record<string, unknown>, opts?: ZapoHelperOptions): Promise<unknown>;
    sendAsButtons(jid: string | Record<string, unknown>, opts?: ZapoHelperOptions): Promise<unknown>;
}

export interface ZapoHelperMethods {
    readonly user?: { readonly id: string };
    autoDownload: boolean;
    setAutoDownload(enabled?: boolean): ZapoWithHelpers;
    downloadMedia(source: unknown, options?: unknown): Promise<Buffer>;
    getFile: (PATH: any, saveToFile?: boolean) => Promise<{ res?: Buffer; filename?: string; mime: string; ext: string; data: Buffer }>;
    waUploadToServer?: (source: Buffer | Uint8Array, opts?: any) => Promise<any>;
    sendMessage(jid: string, content?: any, options?: ZapoHelperOptions): Promise<unknown>;
    relayMessage(jid: string, message: any, options?: ZapoHelperOptions): Promise<unknown>;
    sendButtons(jid: string, content?: SendButtonsContentInput, options?: ZapoHelperOptions): Promise<unknown>;
    sendList(jid: string, content?: SendButtonsContentInput, options?: ZapoHelperOptions): Promise<unknown>;
    sendTemplate(jid: string, content?: SendButtonsContentInput, options?: ZapoHelperOptions): Promise<unknown>;
    sendLocationButtons(jid: string, content?: SendButtonsContentInput, options?: ZapoHelperOptions): Promise<unknown>;
    sendProduct(jid: string, content?: SendButtonsContentInput, options?: ZapoHelperOptions): Promise<unknown>;
    sendOrder(jid: string, content?: SendButtonsContentInput, options?: ZapoHelperOptions): Promise<unknown>;
    sendPoll(jid: string, content?: SendButtonsContentInput, options?: ZapoHelperOptions): Promise<unknown>;
    sendPollSnapshot(jid: string, content?: SendButtonsContentInput, options?: ZapoHelperOptions): Promise<unknown>;
    sendAlbum(jid: string, medias?: readonly any[], options?: ZapoHelperOptions): Promise<unknown>;
    sendAlbumMessage(jid: string, medias?: readonly any[], options?: ZapoHelperOptions): Promise<unknown>;
    sendLinkPreview(jid: string, content?: SendButtonsContentInput, options?: ZapoHelperOptions): Promise<unknown>;
    sendEvent(jid: string, content?: SendButtonsContentInput, options?: ZapoHelperOptions): Promise<unknown>;
    createEvent(options?: Record<string, unknown>): EventBuilder;
    sendBooking(jid: string, content?: SendButtonsContentInput, options?: ZapoHelperOptions): Promise<unknown>;
    sendRawMessage(jid: string, message: unknown, options?: ZapoHelperOptions): Promise<unknown>;
    sendAIRich(jid: string | Record<string, unknown>, builder?: any, options?: ZapoHelperOptions): Promise<unknown>;
    createAIRich(options?: Record<string, unknown>): AIRichBuilder;
    groupParticipantsUpdate(groupJid: string, participants: string[], action: 'add' | 'remove' | 'promote' | 'demote'): Promise<unknown>;
    groupSettingUpdate(groupJid: string, action: 'announcement' | 'not_announcement' | 'locked' | 'unlocked'): Promise<unknown>;
    groupMetadata(groupJid: string): Promise<any>;
    groupInviteCode(groupJid: string): Promise<string>;
    groupRevokeInvite(groupJid: string): Promise<unknown>;
    groupUpdateSubject(groupJid: string, subject: string): Promise<unknown>;
    groupUpdateDescription(groupJid: string, description: string): Promise<unknown>;
    groupGetInviteInfo(code: string): Promise<any>;
    updateProfilePicture(jid: string, image: Buffer | Uint8Array): Promise<unknown>;
    onWhatsApp(...jids: string[]): Promise<Array<{ jid: string; exists: boolean }>>;
}

export type ZapoWithHelpers = WaClient & ZapoHelperMethods;

export function makeHelper(sock: WaClient): ZapoWithHelpers {
    const extendedSock = sock as ZapoWithHelpers;

    async function fetchMediaBuffer(source: any): Promise<Buffer> {
        if (!source) throw new Error('Invalid media input source: empty or undefined');
        if (Buffer.isBuffer(source)) {
            return source;
        }
        if (source instanceof Uint8Array) {
            return Buffer.from(source);
        }
        if (typeof source === 'object' && source.url) {
            return fetchMediaBuffer(source.url);
        }
        if (typeof source === 'string') {
            const trimmed = source.trim();
            if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                const res = await fetch(trimmed, { signal: AbortSignal.timeout(15000) });
                if (!res.ok) {
                    throw new Error(`Failed to fetch media from URL: ${res.statusText}`);
                }
                return Buffer.from(await res.arrayBuffer());
            }
            const fs = await import('node:fs/promises');
            const path = await import('node:path');
            const { existsSync } = await import('node:fs');
            let resolved = trimmed;
            if (!existsSync(resolved)) {
                const cwdPath = path.resolve(process.cwd(), trimmed);
                if (existsSync(cwdPath)) {
                    resolved = cwdPath;
                }
            }
            return await fs.readFile(resolved);
        }
        throw new Error('Invalid media input source.');
    }

    async function uploadMedia(
        content: {
            image?: string | Buffer;
            video?: string | Buffer;
            document?: string | Buffer;
            mimetype?: string;
            filename?: string;
            jpegThumbnail?: Buffer | Uint8Array;
            autoDownload?: boolean;
        }
    ): Promise<{
        imageMessage?: Record<string, unknown>;
        videoMessage?: Record<string, unknown>;
        documentMessage?: Record<string, unknown>;
    }> {
        const isAuto = content.autoDownload !== false;

        if (content.image) {
            const buf = await fetchMediaBuffer(content.image);
            const up = await sock.message.upload(buf, {
                type: 'image',
                mimetype: content.mimetype || 'image/jpeg'
            });
            let jpegThumbnail: Uint8Array | undefined = content.jpegThumbnail ? new Uint8Array(content.jpegThumbnail) : undefined;
            if (!jpegThumbnail && isAuto) {
                jpegThumbnail = new Uint8Array(buf.length <= 65536 ? buf : buf.subarray(0, 65536));
            }
            return {
                imageMessage: {
                    url: up.url,
                    directPath: up.directPath,
                    mediaKey: up.mediaKey,
                    fileSha256: up.fileSha256,
                    fileEncSha256: up.fileEncSha256,
                    fileLength: up.fileLength,
                    mediaKeyTimestamp: up.mediaKeyTimestamp,
                    mimetype: up.mimetype || 'image/jpeg',
                    ...(jpegThumbnail ? { jpegThumbnail } : {})
                }
            };
        }

        if (content.video) {
            const buf = await fetchMediaBuffer(content.video);
            const up = await sock.message.upload(buf, {
                type: 'video',
                mimetype: content.mimetype || 'video/mp4'
            });
            let jpegThumbnail: Uint8Array | undefined = content.jpegThumbnail ? new Uint8Array(content.jpegThumbnail) : undefined;
            return {
                videoMessage: {
                    url: up.url,
                    directPath: up.directPath,
                    mediaKey: up.mediaKey,
                    fileSha256: up.fileSha256,
                    fileEncSha256: up.fileEncSha256,
                    fileLength: up.fileLength,
                    mediaKeyTimestamp: up.mediaKeyTimestamp,
                    mimetype: up.mimetype || 'video/mp4',
                    ...(jpegThumbnail ? { jpegThumbnail } : {})
                }
            };
        }

        if (content.document) {
            const buf = await fetchMediaBuffer(content.document);
            const up = await sock.message.upload(buf, {
                type: 'document',
                mimetype: content.mimetype || 'application/octet-stream'
            });
            let jpegThumbnail: Uint8Array | undefined = content.jpegThumbnail ? new Uint8Array(content.jpegThumbnail) : undefined;
            return {
                documentMessage: {
                    url: up.url,
                    directPath: up.directPath,
                    mediaKey: up.mediaKey,
                    fileSha256: up.fileSha256,
                    fileEncSha256: up.fileEncSha256,
                    fileLength: up.fileLength,
                    mediaKeyTimestamp: up.mediaKeyTimestamp,
                    mimetype: up.mimetype || 'application/octet-stream',
                    fileName: content.filename || 'file',
                    ...(jpegThumbnail ? { jpegThumbnail } : {})
                }
            };
        }

        return {};
    }

    async function buildHeader(content: HeaderContentInput = {}): Promise<{
        hasMediaAttachment: boolean;
        imageMessage?: Record<string, unknown>;
        videoMessage?: Record<string, unknown>;
        documentMessage?: Record<string, unknown>;
        locationMessage?: Record<string, unknown>;
        productMessage?: Record<string, unknown>;
    }> {
        if (content.image) {
            const m = await uploadMedia({ image: content.image, autoDownload: content.autoDownload });
            return { hasMediaAttachment: true, imageMessage: m.imageMessage };
        }
        if (content.video) {
            const m = await uploadMedia({ video: content.video, autoDownload: content.autoDownload });
            return { hasMediaAttachment: true, videoMessage: m.videoMessage };
        }
        if (content.document) {
            const m = await uploadMedia({
                document: content.document,
                mimetype: content.mimetype || 'application/octet-stream',
                filename: content.filename || 'file',
                autoDownload: content.autoDownload
            });
            return { hasMediaAttachment: true, documentMessage: m.documentMessage };
        }
        if (content.location) {
            return {
                hasMediaAttachment: true,
                locationMessage: {
                    degreesLatitude: content.location.lat || 0,
                    degreesLongitude: content.location.lng || 0,
                    name: content.location.name || '',
                    address: content.location.address || '',
                    jpegThumbnail: content.location.jpegThumbnail || Buffer.from([])
                }
            };
        }
        if (content.catalog) {
            const cat = content.catalog;
            let productImage: Record<string, unknown> | undefined;
            if (cat.image) {
                const m = await uploadMedia({ image: cat.image });
                productImage = m.imageMessage;
            }
            return {
                hasMediaAttachment: true,
                productMessage: {
                    product: {
                        productImage,
                        productId: cat.productId || '',
                        title: cat.title || '',
                        currencyCode: cat.currency || 'IDR',
                        priceAmount1000: (cat.price || 0) * 1000,
                        retailerId: cat.retailerId || '',
                        url: cat.url || '',
                        productImageCount: 1
                    },
                    businessOwnerJid: cat.businessJid || ''
                }
            };
        }
        return { hasMediaAttachment: false };
    }

    function convertButtons(buttons: readonly InteractiveButtonInput[] = []): Array<{ name: string; buttonParamsJson: string }> {
        return buttons.map((btn, i) => {
            if (btn.name && btn.buttonParamsJson) {
                return { name: btn.name, buttonParamsJson: btn.buttonParamsJson };
            }

            const text = btn.displayText || btn.text || '';

            if (btn.url) {
                return {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({ display_text: text, url: btn.url })
                };
            }
            if (btn.copy || btn.copyCode) {
                return {
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({ display_text: text, copy_code: btn.copy || btn.copyCode })
                };
            }
            if (btn.call || btn.phone) {
                return {
                    name: 'cta_call',
                    buttonParamsJson: JSON.stringify({ display_text: text, phone_number: btn.call || btn.phone })
                };
            }
            if (btn.type === 'reminder' || btn.reminder) {
                return {
                    name: 'cta_reminder',
                    buttonParamsJson: JSON.stringify({ display_text: text })
                };
            }
            if (btn.type === 'send_location' || btn.type === 'location') {
                return {
                    name: 'send_location',
                    buttonParamsJson: JSON.stringify({})
                };
            }
            if (btn.type === 'address') {
                return {
                    name: 'address_message',
                    buttonParamsJson: JSON.stringify({ display_text: text })
                };
            }
            if (btn.transaction_id || btn.type === 'payment_transaction') {
                return {
                    name: 'wa_payment_transaction_details',
                    buttonParamsJson: JSON.stringify({ transaction_id: btn.transaction_id || '' })
                };
            }
            if (btn.type === 'review_and_pay' || btn.review_and_pay) {
                return {
                    name: 'review_and_pay',
                    buttonParamsJson: JSON.stringify(btn.review_and_pay || btn.params || {})
                };
            }
            if (btn.product_id || btn.type === 'mpm') {
                return {
                    name: 'mpm',
                    buttonParamsJson: JSON.stringify({ product_id: btn.product_id || '' })
                };
            }
            if (btn.catalog_product_id || btn.type === 'catalog') {
                return {
                    name: 'automated_greeting_message_view_catalog',
                    buttonParamsJson: JSON.stringify({
                        business_phone_number: btn.business_phone_number || '',
                        catalog_product_id: btn.catalog_product_id || ''
                    })
                };
            }
            if (btn.type === 'catalog_message' || btn.thumbnail_product_retailer_id) {
                return {
                    name: 'catalog_message',
                    buttonParamsJson: JSON.stringify({
                        thumbnail_product_retailer_id: btn.thumbnail_product_retailer_id || btn.retailerId || ''
                    })
                };
            }
            if (btn.flow_id || btn.galaxy_message || btn.type === 'galaxy') {
                return {
                    name: 'galaxy_message',
                    buttonParamsJson: JSON.stringify({
                        flow_message_version: btn.flow_message_version || '3',
                        flow_token: btn.flow_token ? JSON.stringify(btn.flow_token) : '{}',
                        flow_id: btn.flow_id || '',
                        flow_cta: btn.flow_cta || 'Open',
                        flow_action: btn.flow_action || 'navigate',
                        flow_action_payload: btn.flow_action_payload || {},
                        flow_metadata: btn.flow_metadata || {},
                        icon: btn.icon || 'DEFAULT'
                    })
                };
            }
            if (btn.type === 'booking_confirmation' || btn.booking_confirmation) {
                const p = btn.booking_confirmation || btn.params || {};
                return { name: 'booking_confirmation', buttonParamsJson: JSON.stringify(p) };
            }
            if (btn.sections || btn.rows) {
                const sections = btn.sections
                    ? btn.sections.map((sec) => ({
                          title: sec.title || '',
                          highlight_label: sec.highlight_label || undefined,
                          rows: (sec.rows || []).map((row, ri) => ({
                              header: row.header || undefined,
                              title: row.title || row.text || '',
                              description: row.description || row.desc || '',
                              id: row.id || row.rowId || `row_${ri}`
                          }))
                      }))
                    : [
                          {
                              title: btn.sectionTitle || '',
                              rows: (btn.rows || []).map((row, ri) => ({
                                  header: row.header || undefined,
                                  title: row.title || row.text || '',
                                  description: row.description || row.desc || '',
                                  id: row.id || row.rowId || `row_${ri}`
                              }))
                          }
                      ];
                return {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: btn.title || btn.buttonText || 'Pilih',
                        sections,
                        icon: btn.icon || 'DEFAULT'
                    })
                };
            }

            return {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: text,
                    id: btn.id || `btn_${i}`
                })
            };
        });
    }

    function buildContextInfo(options: ZapoHelperOptions = {}, extra: Record<string, unknown> = {}): Record<string, unknown> {
        const ctx: Record<string, unknown> = { ...extra, ...(options.contextInfo || {}) };
        if (options.quoted) {
            const q = options.quoted as any;
            ctx.stanzaId = q?.key?.id || q?.id;
            ctx.participant = q?.key?.participant || q?.key?.remoteJid || q?.senderJid || q?.from;
            ctx.quotedMessage = q?.message || q?.content || (typeof q?.text === 'string' ? { conversation: q.text } : undefined);
        }
        if (options.forward || options.forwarded) {
            ctx.forwardingScore = options.forwardingScore || 1;
            ctx.isForwarded = true;
        }
        return ctx;
    }

    const originalMessageSend = sock.message.send.bind(sock.message);

    extendedSock.autoDownload = true;
    extendedSock.setAutoDownload = (enabled: boolean = true) => {
        extendedSock.autoDownload = enabled;
        return extendedSock;
    };

    extendedSock.downloadMedia = async (source: unknown, options: any = {}): Promise<Buffer> => {
        let target = source;
        if (target && typeof target === 'object') {
            if ('raw' in (target as any)) {
                target = (target as any).raw;
            } else if ('message' in (target as any) && !('imageMessage' in (target as any)) && !('videoMessage' in (target as any)) && !('documentMessage' in (target as any))) {
                target = (target as any).message;
            }
        }
        if (typeof (sock as any).message?.downloadBytes === 'function') {
            try {
                const bytes = await (sock as any).message.downloadBytes(target, options);
                return Buffer.from(bytes);
            } catch {
                // fallback to stream
            }
        }
        const stream = await downloadMediaMessage(target as any, options);
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
    };

    extendedSock.groupParticipantsUpdate = async (groupJid: string, participants: string[], action: 'add' | 'remove' | 'promote' | 'demote') => {
        const groupCoord = (sock as any).group;
        if (!groupCoord) throw new Error('Group coordinator is not available');
        const list = Array.isArray(participants) ? participants : [participants];
        if (action === 'add') return groupCoord.addParticipants(groupJid, list);
        if (action === 'remove') return groupCoord.removeParticipants(groupJid, list);
        if (action === 'promote') return groupCoord.promoteParticipants(groupJid, list);
        if (action === 'demote') return groupCoord.demoteParticipants(groupJid, list);
        throw new Error(`Unsupported action: ${action}`);
    };

    extendedSock.groupSettingUpdate = async (groupJid: string, action: 'announcement' | 'not_announcement' | 'locked' | 'unlocked') => {
        const groupCoord = (sock as any).group;
        if (!groupCoord) throw new Error('Group coordinator is not available');
        if (action === 'announcement') return groupCoord.setSetting(groupJid, 'announcement', true);
        if (action === 'not_announcement') return groupCoord.setSetting(groupJid, 'announcement', false);
        if (action === 'locked') return groupCoord.setSetting(groupJid, 'locked', true);
        if (action === 'unlocked') return groupCoord.setSetting(groupJid, 'locked', false);
        throw new Error(`Unsupported action: ${action}`);
    };

    extendedSock.groupMetadata = async (groupJid: string) => {
        const groupCoord = (sock as any).group;
        return groupCoord ? groupCoord.queryGroupMetadata(groupJid) : null;
    };

    extendedSock.groupInviteCode = async (groupJid: string) => {
        const groupCoord = (sock as any).group;
        return groupCoord ? groupCoord.queryInviteCode(groupJid) : '';
    };

    extendedSock.groupRevokeInvite = async (groupJid: string) => {
        const groupCoord = (sock as any).group;
        return groupCoord ? groupCoord.revokeInvite(groupJid) : null;
    };

    extendedSock.groupUpdateSubject = async (groupJid: string, subject: string) => {
        const groupCoord = (sock as any).group;
        return groupCoord ? groupCoord.setSubject(groupJid, subject) : null;
    };

    extendedSock.groupUpdateDescription = async (groupJid: string, description: string) => {
        const groupCoord = (sock as any).group;
        return groupCoord ? groupCoord.setDescription(groupJid, description) : null;
    };

    extendedSock.groupGetInviteInfo = async (code: string) => {
        const groupCoord = (sock as any).group;
        return groupCoord ? groupCoord.joinGroupViaInvite(code) : null;
    };

    extendedSock.updateProfilePicture = async (jid: string, image: Buffer | Uint8Array) => {
        const profileCoord = (sock as any).profile;
        if (!profileCoord) throw new Error('Profile coordinator is not available');
        return profileCoord.setProfilePicture(image, jid);
    };

    extendedSock.onWhatsApp = async (...jids: string[]) => {
        const flat = jids.flat();
        return flat.map((j) => ({ jid: j.includes('@') ? j : `${j}@s.whatsapp.net`, exists: true }));
    };

    extendedSock.sendMessage = async (jid: string, content: any = {}, options: ZapoHelperOptions = {}) => {
        const quoteTarget = options.quoted || (options as any).quote;
        const sendOpts: any = { ...options };
        if (quoteTarget) {
            sendOpts.quote = quoteTarget;
        }
        if (content.viewOnce || (options as any).viewOnce) {
            sendOpts.viewOnce = true;
        }
        if (content.mentions || (options as any).mentions) {
            sendOpts.mentions = content.mentions || (options as any).mentions;
        }
        if (content.contextInfo || (options as any).contextInfo) {
            sendOpts.contextInfo = { ...((options as any).contextInfo || {}), ...(content.contextInfo || {}) };
            if (!sendOpts.mentions && sendOpts.contextInfo?.mentionedJid) {
                sendOpts.mentions = sendOpts.contextInfo.mentionedJid;
            }
        }

        if (content.image) {
            const mediaSource = typeof content.image === 'object' && content.image !== null && 'url' in content.image ? content.image.url : content.image;
            return (sock as any).message.send(jid, {
                type: 'image',
                media: mediaSource,
                caption: content.caption || content.text || '',
                mimetype: content.mimetype || 'image/jpeg'
            }, sendOpts);
        }
        if (content.video) {
            const mediaSource = typeof content.video === 'object' && content.video !== null && 'url' in content.video ? content.video.url : content.video;
            return (sock as any).message.send(jid, {
                type: 'video',
                media: mediaSource,
                caption: content.caption || content.text || '',
                mimetype: content.mimetype || 'video/mp4',
                gifPlayback: Boolean(content.gifPlayback)
            }, sendOpts);
        }
        if (content.sticker) {
            const mediaSource = typeof content.sticker === 'object' && content.sticker !== null && 'url' in content.sticker ? content.sticker.url : content.sticker;
            return (sock as any).message.send(jid, {
                type: 'sticker',
                media: mediaSource,
                mimetype: content.mimetype || 'image/webp'
            }, sendOpts);
        }
        if (content.react) {
            return (sock as any).message.send(jid, {
                type: 'reaction',
                emoji: content.react.text || content.react.emoji || '',
                target: content.react.key
            }, sendOpts);
        }
        if (content.audio) {
            const mediaSource = typeof content.audio === 'object' && content.audio !== null && 'url' in content.audio ? content.audio.url : content.audio;
            return (sock as any).message.send(jid, {
                type: 'audio',
                media: mediaSource,
                mimetype: content.mimetype || 'audio/mpeg',
                ptt: Boolean(content.ptt)
            }, sendOpts);
        }
        if (content.document && !content.buttons) {
            const mediaSource = typeof content.document === 'object' && content.document !== null && 'url' in content.document ? content.document.url : content.document;
            return (sock as any).message.send(jid, {
                type: 'document',
                media: mediaSource,
                mimetype: content.mimetype || 'application/octet-stream',
                fileName: content.fileName || content.filename || 'document'
            }, sendOpts);
        }
        if (typeof content === 'object' && content !== null && typeof content.text === 'string' && !content.type && !content.buttons) {
            return (sock as any).message.send(jid, {
                type: 'text',
                text: content.text
            }, sendOpts);
        }
        if (typeof content === 'string') {
            return (sock as any).message.send(jid, content, sendOpts);
        }
        if (content.buttons && Array.isArray(content.buttons)) {
            return extendedSock.sendButtons(jid, content, options);
        }
        if (content.type === 'bottom_sheet') {
            return extendedSock.sendButtons(jid, content, options);
        }
        if (content.type === 'carousel' || content.carousel) {
            return extendedSock.sendButtons(jid, content, options);
        }
        if (content.type === 'template') {
            return extendedSock.sendButtons(jid, content, options);
        }
        if (content.type === 'location_buttons') {
            return extendedSock.sendButtons(jid, content, options);
        }
        if (content.type === 'review_and_pay') {
            return extendedSock.sendButtons(jid, content, options);
        }
        if (content.type === 'album' || content.album) {
            return extendedSock.sendAlbum(jid, content.medias || content.album || [], options);
        }
        if (content.type === 'product') {
            return extendedSock.sendProduct(jid, content, options);
        }
        if (content.type === 'order') {
            return extendedSock.sendOrder(jid, content, options);
        }
        if (content.type === 'poll') {
            return extendedSock.sendPoll(jid, content, options);
        }
        if (content.type === 'poll_snapshot') {
            return extendedSock.sendPollSnapshot(jid, content, options);
        }
        if (content.type === 'event') {
            return extendedSock.sendEvent(jid, content, options);
        }
        if (content.type === 'booking_confirmation') {
            return extendedSock.sendBooking(jid, content, options);
        }
        if (content.type === 'link_preview') {
            return extendedSock.sendLinkPreview(jid, content, options);
        }
        if (content.type === 'raw') {
            return extendedSock.sendRawMessage(jid, content.message, options);
        }
        if (content.type === 'ai_rich' || typeof content.send === 'function') {
            return extendedSock.sendAIRich(jid, content, options);
        }
        return originalMessageSend(jid, content, sendOpts);
    };

    extendedSock.relayMessage = async (jid: string, message: any, options: ZapoHelperOptions = {}) => {
        const targetJid = jid || (options as any)?.chat || (options as any)?.from || (options?.quoted ? (options.quoted as any).key?.remoteJid : '');
        if (!targetJid) {
            throw new TypeError('relayMessage: target recipient JID is missing or undefined.');
        }
        const sendOpts: WaSendMessageOptions = options.quoted ? { quote: options.quoted as any, ...options } : { ...options };
        const msgToSend = (message && typeof message === 'object' && 'message' in message && Object.keys(message).length === 1)
            ? message.message
            : message;
        return originalMessageSend(targetJid, msgToSend, sendOpts);
    };

    Object.defineProperty(extendedSock, 'user', {
        get() {
            const creds = sock.getCredentials();
            return { id: creds?.meJid || '' };
        },
        configurable: true
    });

    extendedSock.waUploadToServer = async (source: Buffer | Uint8Array, opts: any = {}) => {
        return sock.message.upload(Buffer.isBuffer(source) ? source : Buffer.from(source), opts);
    };

    extendedSock.sendButtons = async (jid: string, content: SendButtonsContentInput = {}, options: ZapoHelperOptions = {}) => {
        const contextInfo = buildContextInfo(options, content.contextInfo || {});
        const sendOpts: WaSendMessageOptions = options.quoted ? { quote: options.quoted as any, ...options } : { ...options };

        if (content.buttonsMessage || content.templateMessage || content.listMessage || content.productMessage || content.carouselMessage || content.interactiveMessage) {
            return originalMessageSend(jid, content as any, sendOpts);
        }

        if (content.type === 'bottom_sheet') {
            const header = await buildHeader(content);
            const buttons = convertButtons(content.buttons || []);
            const payload = {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            header: {
                                title: content.title || '',
                                subtitle: content.subtitle || '',
                                hasMediaAttachment: header.hasMediaAttachment || false,
                                ...(header.imageMessage && { imageMessage: header.imageMessage }),
                                ...(header.videoMessage && { videoMessage: header.videoMessage }),
                                ...(header.documentMessage && { documentMessage: header.documentMessage })
                            },
                            body: { text: content.text || '' },
                            footer: { text: content.footer || '' },
                            contextInfo,
                            nativeFlowMessage: {
                                buttons,
                                messageParamsJson: JSON.stringify({ is_bottom_sheet_mode: true, ...(content.messageParams || {}) })
                            }
                        }
                    }
                }
            };
            return originalMessageSend(jid, payload as any, sendOpts);
        }

        if (content.type === 'carousel' || content.carousel) {
            const cardsData = content.carousel || content.cards || [];
            const cards = await Promise.all(
                cardsData.map(async (card) => {
                    const mediaHeader = await buildHeader(card);
                    return {
                        header: {
                            title: card.title || '',
                            hasMediaAttachment: mediaHeader.hasMediaAttachment || false,
                            ...(mediaHeader.imageMessage && { imageMessage: mediaHeader.imageMessage }),
                            ...(mediaHeader.videoMessage && { videoMessage: mediaHeader.videoMessage })
                        },
                        body: { text: card.body || card.text || '' },
                        footer: { text: card.footer || content.footer || '' },
                        nativeFlowMessage: { buttons: convertButtons(card.buttons || []), messageParamsJson: '' }
                    };
                })
            );

            const payload = {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            body: { text: content.text || '' },
                            footer: { text: content.footer || '' },
                            contextInfo,
                            carouselMessage: { cards, messageVersion: 1, carouselCardType: 1 }
                        }
                    }
                }
            };
            return originalMessageSend(jid, payload as any, sendOpts);
        }

        if (content.type === 'template') {
            const hydratedButtons = (content.buttons || []).map((btn) => {
                if (btn.url) return { urlButton: { displayText: btn.displayText || btn.text, merchantUrl: btn.url } };
                if (btn.call) return { callButton: { displayText: btn.displayText || btn.text, phoneNumber: btn.call } };
                return { quickReplyButton: { displayText: btn.displayText || btn.text, id: btn.id || btn.text } };
            });
            const payload = {
                templateMessage: {
                    hydratedTemplate: {
                        hydratedContentText: content.text || '',
                        hydratedFooterText: content.footer || '',
                        hydratedTitleText: content.title || '',
                        hydratedButtons,
                        contextInfo
                    }
                }
            };
            return originalMessageSend(jid, payload as any, sendOpts);
        }

        if (content.type === 'location_buttons') {
            let jpegThumbnail = content.jpegThumbnail || Buffer.from([]);
            if (content.thumbnail) {
                try {
                    const buff = await fetchMediaBuffer(content.thumbnail);
                    if (buff && buff.length > 0) {
                        jpegThumbnail = buff;
                    }
                } catch {}
            }

            const rawButtons = (content.buttons || []).map((btn, i) => {
                const text = btn.displayText || btn.text || '';
                return {
                    buttonId: btn.id || btn.buttonId || `btn_${i}`,
                    buttonText: { displayText: text },
                    type: 1
                };
            });

            const payload = {
                buttonsMessage: {
                    locationMessage: {
                        degreesLatitude: content.lat || 0,
                        degreesLongitude: content.lng || 0,
                        jpegThumbnail: new Uint8Array(jpegThumbnail)
                    },
                    contentText: content.text || '',
                    footerText: content.footer || '',
                    buttons: rawButtons,
                    headerType: 6,
                    contextInfo
                }
            };
            return originalMessageSend(jid, payload as any, sendOpts);
        }

        if (content.type === 'review_and_pay') {
            let imageMessage: Record<string, unknown> | undefined;
            if (content.image) {
                const m = await uploadMedia({ image: content.image });
                imageMessage = m.imageMessage;
            }

            const payParams = {
                currency: content.paymentParams?.currency || 'IDR',
                payment_type: '',
                payment_configuration: '',
                transaction_id: '',
                total_amount: content.paymentParams?.total_amount || { value: 0, offset: 100 },
                reference_id: content.paymentParams?.reference_id || `REF-${Date.now()}`,
                order_request_id: content.paymentParams?.order_request_id || crypto.randomUUID(),
                type: content.paymentParams?.type || 'digital-goods',
                payment_method: '',
                payment_status: 'captured',
                payment_timestamp: Math.floor(Date.now() / 1000),
                order: content.paymentParams?.order || {},
                additional_note: content.paymentParams?.additional_note || '',
                native_payment_methods: [JSON.stringify({ name: 'PIX', enabled: false })],
                share_payment_status: true,
                is_soft_deleted: false
            };

            const payload = {
                interactiveMessage: {
                    header: {
                        title: content.title || '',
                        subtitle: content.subtitle || '',
                        hasMediaAttachment: Boolean(imageMessage),
                        ...(imageMessage && { imageMessage })
                    },
                    body: { text: content.text || '' },
                    footer: { text: content.footer || '' },
                    contextInfo,
                    nativeFlowMessage: {
                        buttons: [{ name: 'review_and_pay', buttonParamsJson: JSON.stringify(payParams) }]
                    }
                }
            };
            return originalMessageSend(jid, payload as any, sendOpts);
        }

        const header = await buildHeader(content);
        const buttons = convertButtons(content.buttons || []);
        const messageParamsJson = content.messageParams ? JSON.stringify(content.messageParams) : '';

        const payload = {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        header: {
                            title: content.title || '',
                            subtitle: content.subtitle || '',
                            hasMediaAttachment: header.hasMediaAttachment || false,
                            ...(header.imageMessage && { imageMessage: header.imageMessage }),
                            ...(header.videoMessage && { videoMessage: header.videoMessage }),
                            ...(header.documentMessage && { documentMessage: header.documentMessage }),
                            ...(header.locationMessage && { locationMessage: header.locationMessage })
                        },
                        body: { text: content.text || '' },
                        footer: { text: content.footer || '' },
                        contextInfo,
                        nativeFlowMessage: { buttons, messageParamsJson }
                    }
                }
            }
        };

        return originalMessageSend(jid, payload as any, sendOpts);
    };

    extendedSock.sendList = async (jid: string, content: SendButtonsContentInput = {}, options: ZapoHelperOptions = {}) => {
        const contextInfo = buildContextInfo(options, content.contextInfo || {});
        const sendOpts: WaSendMessageOptions = options.quoted ? { quote: options.quoted as any, ...options } : { ...options };
        return originalMessageSend(
            jid,
            {
                listMessage: {
                    title: content.title || '',
                    description: content.text || '',
                    buttonText: content.buttonText || 'Pilih',
                    footerText: content.footer || '',
                    listType: 1,
                    sections: (content.sections as any) || [],
                    contextInfo
                }
            } as any,
            sendOpts
        );
    };

    extendedSock.sendTemplate = async (jid: string, content: SendButtonsContentInput = {}, options: ZapoHelperOptions = {}) => {
        return extendedSock.sendButtons(jid, { ...content, type: 'template' }, options);
    };

    extendedSock.sendLocationButtons = async (jid: string, content: SendButtonsContentInput = {}, options: ZapoHelperOptions = {}) => {
        return extendedSock.sendButtons(jid, { ...content, type: 'location_buttons' }, options);
    };

    extendedSock.sendProduct = async (jid: string, content: SendButtonsContentInput = {}, options: ZapoHelperOptions = {}) => {
        const contextInfo = buildContextInfo(options, content.contextInfo || {});
        const sendOpts: WaSendMessageOptions = options.quoted ? { quote: options.quoted as any, ...options } : { ...options };

        let productImage: Record<string, unknown> | undefined;
        if (content.image) {
            const m = await uploadMedia({ image: content.image });
            productImage = m.imageMessage;
        }

        const myJid = sock.getCredentials()?.meJid || '';

        if (content.buttons && content.buttons.length > 0) {
            const buttons = convertButtons(content.buttons);
            const payload = {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            header: {
                                title: content.title || '',
                                hasMediaAttachment: true,
                                productMessage: {
                                    product: {
                                        productImage,
                                        productId: content.productId || '',
                                        title: content.title || '',
                                        description: content.description || '',
                                        currencyCode: content.currency || 'IDR',
                                        priceAmount1000: (content.price || 0) * 1000,
                                        retailerId: content.retailerId || '',
                                        url: content.url || '',
                                        productImageCount: 1
                                    },
                                    businessOwnerJid: content.businessJid || myJid
                                }
                            },
                            body: { text: content.text || content.description || '' },
                            footer: { text: content.footer || '' },
                            contextInfo,
                            nativeFlowMessage: { buttons, messageParamsJson: '' }
                        }
                    }
                }
            };
            return originalMessageSend(jid, payload as any, sendOpts);
        }

        const payloadBare = {
            productMessage: {
                product: {
                    productImage,
                    productId: content.productId || '',
                    title: content.title || '',
                    description: content.description || '',
                    currencyCode: content.currency || 'IDR',
                    priceAmount1000: (content.price || 0) * 1000,
                    retailerId: content.retailerId || '',
                    url: content.url || '',
                    productImageCount: 1
                },
                businessOwnerJid: content.businessJid || myJid,
                contextInfo
            }
        };
        return originalMessageSend(jid, payloadBare as any, sendOpts);
    };

    extendedSock.sendOrder = async (jid: string, content: SendButtonsContentInput = {}, options: ZapoHelperOptions = {}) => {
        const contextInfo = buildContextInfo(options, content.contextInfo || {});
        const sendOpts: WaSendMessageOptions = options.quoted ? { quote: options.quoted as any, ...options } : { ...options };
        const myJid = sock.getCredentials()?.meJid || '';

        return originalMessageSend(
            jid,
            {
                orderMessage: {
                    orderId: content.orderId || `ORDER-${Date.now()}`,
                    thumbnail: content.thumbnail || '',
                    itemCount: content.itemCount || 1,
                    status: content.status || 1,
                    surface: content.surface || 1,
                    message: content.text || '',
                    orderTitle: content.title || '',
                    sellerJid: content.sellerJid || myJid,
                    token: content.token || 'token',
                    totalAmount1000: (content.total || 0) * 1000,
                    totalCurrencyCode: content.currency || 'IDR',
                    contextInfo
                }
            } as any,
            sendOpts
        );
    };

    extendedSock.sendPoll = async (jid: string, content: SendButtonsContentInput = {}, options: ZapoHelperOptions = {}) => {
        const sendOpts: WaSendMessageOptions = options.quoted ? { quote: options.quoted as any, ...options } : { ...options };
        const rawOptions = (content.options || content.values || []) as readonly string[];
        return originalMessageSend(
            jid,
            {
                type: 'poll',
                name: content.title || content.name || content.text || '',
                options: rawOptions.map((v) => ({ name: String(v) })),
                selectableCount: content.selectableCount ?? 1
            },
            sendOpts
        );
    };

    extendedSock.sendPollSnapshot = async (jid: string, content: SendButtonsContentInput = {}, options: ZapoHelperOptions = {}) => {
        const contextInfo = buildContextInfo(options, content.contextInfo || {});
        const sendOpts: WaSendMessageOptions = options.quoted ? { quote: options.quoted as any, ...options } : { ...options };
        return originalMessageSend(
            jid,
            {
                pollResultSnapshotMessage: {
                    name: content.name || content.title || '',
                    pollVotes: (content.pollVotes || []).map((v) => ({
                        optionName: v.optionName || v.name || '',
                        optionVoteCount: String(v.optionVoteCount ?? v.count ?? 0)
                    })),
                    contextInfo,
                    pollType: 0
                }
            } as any,
            sendOpts
        );
    };

    extendedSock.getFile = async (PATH: any, saveToFile: boolean = false) => {
        let res: Buffer | undefined;
        let filename: string | undefined;
        let data: Buffer;

        if (Buffer.isBuffer(PATH)) {
            data = PATH;
        } else if (PATH instanceof Uint8Array) {
            data = Buffer.from(PATH);
        } else if (typeof PATH === 'object' && PATH?.url) {
            data = await fetchMediaBuffer(PATH.url);
        } else if (typeof PATH === 'string') {
            const trimmed = PATH.trim();
            if (/^data:.*?\/.*?;base64,/i.test(trimmed)) {
                data = Buffer.from(trimmed.split(',')[1], 'base64');
            } else if (/^https?:\/\//.test(trimmed)) {
                data = await fetchMediaBuffer(trimmed);
            } else {
                const fs = await import('node:fs/promises');
                const { existsSync } = await import('node:fs');
                if (existsSync(trimmed)) {
                    filename = trimmed;
                    data = await fs.readFile(trimmed);
                } else {
                    data = Buffer.from(trimmed);
                }
            }
        } else {
            data = Buffer.alloc(0);
        }

        let mime = 'application/octet-stream';
        let ext = '.bin';

        if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
            mime = 'image/jpeg';
            ext = '.jpg';
        } else if (data.length >= 8 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
            mime = 'image/png';
            ext = '.png';
        } else if (data.length >= 4 && data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46) {
            if (data.length >= 12 && data.toString('utf8', 8, 12) === 'WEBP') {
                mime = 'image/webp';
                ext = '.webp';
            }
        } else if (data.length >= 8 && data.toString('utf8', 4, 8) === 'ftyp') {
            mime = 'video/mp4';
            ext = '.mp4';
        }

        return {
            res,
            filename,
            mime,
            ext,
            data
        };
    };

    const sendAlbumMessageHandler = async (jid: string, medias: readonly any[] = [], options: ZapoHelperOptions = {}) => {
        if (!Array.isArray(medias) || medias.length === 0) {
            throw new Error('Album minimal berisi 1 media.');
        }

        const sendOpts: WaSendMessageOptions = options.quoted ? { quote: options.quoted as any, ...options } : { ...options };

        const normalizedMedias: Array<{ image?: Buffer; video?: Buffer; caption: string; mimetype: string }> = [];

        for (const item of medias) {
            if (!item) continue;
            let rawMedia: any;
            let caption = '';
            let forceType: 'image' | 'video' | null = null;

            if (typeof item === 'string') {
                rawMedia = item;
            } else if (typeof item === 'object') {
                caption = item.caption || item.text || '';
                if (item.image) {
                    rawMedia = item.image;
                    forceType = 'image';
                } else if (item.video) {
                    rawMedia = item.video;
                    forceType = 'video';
                } else if (item.url) {
                    rawMedia = item.url;
                } else if (item.data) {
                    rawMedia = item.data;
                }
            }

            if (!rawMedia) continue;

            const file = await extendedSock.getFile(rawMedia);
            const isVideo = forceType === 'video' || file.mime.startsWith('video/');
            const mime = item?.mimetype || file.mime || (isVideo ? 'video/mp4' : 'image/jpeg');

            if (isVideo) {
                normalizedMedias.push({
                    video: file.data,
                    caption,
                    mimetype: mime
                });
            } else {
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

        if (normalizedMedias.length === 1) {
            const m = normalizedMedias[0];
            const isVid = Boolean(m.video);
            const content = isVid
                ? { type: 'video' as const, media: (m.video || m.image)!, caption: m.caption || '' }
                : { type: 'image' as const, media: (m.video || m.image)!, caption: m.caption || '' };
            return originalMessageSend(jid, content, sendOpts);
        }

        const albumKeyId = (options.id || ('3EB0' + crypto.randomBytes(14).toString('hex').toUpperCase()));
        const expectedImageCount = normalizedMedias.filter(m => m.image).length;
        const expectedVideoCount = normalizedMedias.filter(m => m.video).length;

        try {
            await originalMessageSend(
                jid,
                {
                    albumMessage: {
                        expectedImageCount,
                        expectedVideoCount
                    },
                    messageContextInfo: {
                        messageSecret: crypto.randomBytes(32)
                    }
                } as any,
                {
                    ...sendOpts,
                    id: albumKeyId
                }
            );

            const results: unknown[] = [];
            const delayMs = (options as any).delay ?? 500;

            for (const media of normalizedMedias) {
                const isVid = Boolean(media.video);
                const buf = (media.video || media.image)!;
                const mime = media.mimetype;
                const childId = ('3EB0' + crypto.randomBytes(14).toString('hex').toUpperCase());

                try {
                    const uploaded = await sock.message.upload(buf, {
                        type: isVid ? 'video' : 'image',
                        mimetype: mime
                    });

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

                    const res = await originalMessageSend(jid, childMsg as any, { id: childId });
                    results.push(res);
                } catch (uploadErr) {
                    logger.warn('Failed uploading album child with association, falling back to direct send', uploadErr);
                    const fallbackContent = isVid
                        ? { type: 'video' as const, media: buf, mimetype: mime, caption: media.caption || '' }
                        : { type: 'image' as const, media: buf, mimetype: mime, caption: media.caption || '' };
                    const res = await originalMessageSend(jid, fallbackContent, sendOpts);
                    results.push(res);
                }

                if (delayMs > 0) {
                    await new Promise(r => setTimeout(r, delayMs));
                }
            }

            return { id: albumKeyId, results };
        } catch (albumErr) {
            logger.warn('Failed sending native albumMessage, falling back to individual sends', albumErr);
            const results: unknown[] = [];
            for (const media of normalizedMedias) {
                const isVid = Boolean(media.video);
                const buf = (media.video || media.image)!;
                const content = isVid
                    ? { type: 'video' as const, media: buf, mimetype: media.mimetype, caption: media.caption || '' }
                    : { type: 'image' as const, media: buf, mimetype: media.mimetype, caption: media.caption || '' };
                const res = await originalMessageSend(jid, content, sendOpts);
                results.push(res);
            }
            return results;
        }
    };

    extendedSock.sendAlbum = sendAlbumMessageHandler;
    extendedSock.sendAlbumMessage = sendAlbumMessageHandler;

    extendedSock.sendLinkPreview = async (jid: string, content: SendButtonsContentInput = {}, options: ZapoHelperOptions = {}) => {
        const sendOpts: WaSendMessageOptions = options.quoted ? { quote: options.quoted as any, ...options } : { ...options };
        let thumbBytes: Uint8Array | undefined;
        if (content.thumbnail) {
            try {
                const buf = await fetchMediaBuffer(content.thumbnail);
                thumbBytes = new Uint8Array(buf);
            } catch {}
        }
        return originalMessageSend(
            jid,
            {
                type: 'text',
                text: content.text || content.url || '',
                linkPreview: {
                    matchedText: content.url || '',
                    title: content.title,
                    description: content.description,
                    ...(thumbBytes ? { thumbnail: { bytes: thumbBytes } } : {})
                }
            },
            sendOpts
        );
    };

    extendedSock.sendEvent = async (jid: string, content: SendButtonsContentInput = {}, options: ZapoHelperOptions = {}) => {
        const sendOpts: WaSendMessageOptions = options.quoted ? { quote: options.quoted as any, ...options } : { ...options };
        const startTime = content.startTime ? Math.floor(new Date(content.startTime).getTime() / 1000) : Math.floor(Date.now() / 1000);
        return originalMessageSend(
            jid,
            {
                type: 'event',
                name: content.name || content.title || '',
                startTime,
                extraGuestsAllowed: content.extraGuestsAllowed ?? false,
                isScheduleCall: content.isScheduleCall ?? false,
                hasReminder: content.hasReminder ?? true,
                reminderOffsetSec: content.reminderOffsetSec || 3600
            },
            sendOpts
        );
    };

    extendedSock.createEvent = (options: Record<string, any> = {}): EventBuilder => {
        let _title = options.title || '';
        let _startTime: number | string | null = options.startTime || null;
        let _hasReminder = options.hasReminder ?? true;
        let _reminderOffsetSec = options.reminderOffsetSec || 3600;
        let _extraGuestsAllowed = options.extraGuestsAllowed ?? false;
        let _isScheduleCall = options.isScheduleCall ?? false;
        let _buttons: Array<{ name: string; buttonParamsJson: string }> = [];
        let _footer = options.footer || '';
        let _quoted = options.quoted || null;

        const builder: EventBuilder = {
            setTitle(title: string) {
                _title = title;
                return builder;
            },
            setStartTime(t: number | string) {
                _startTime = t;
                return builder;
            },
            setReminder(sec: number) {
                _reminderOffsetSec = sec;
                return builder;
            },
            setFooter(footer: string) {
                _footer = footer;
                return builder;
            },
            setQuoted(q: unknown) {
                _quoted = q;
                return builder;
            },
            addButton(name: string, params: Record<string, unknown> = {}) {
                _buttons.push({ name, buttonParamsJson: JSON.stringify(params) });
                return builder;
            },
            async send(jid: string, opts: ZapoHelperOptions = {}) {
                const startTime = _startTime ? Math.floor(new Date(_startTime).getTime() / 1000) : Math.floor(Date.now() / 1000);
                const quoted = _quoted || opts.quoted;
                const sendOpts: WaSendMessageOptions = quoted ? { quote: quoted as any, ...opts } : { ...opts };

                if (_buttons.length > 0) {
                    const payload = {
                        interactiveMessage: {
                            header: { title: _title, hasMediaAttachment: false },
                            body: { text: '' },
                            footer: { text: _footer },
                            nativeFlowMessage: { buttons: _buttons, messageParamsJson: '' }
                        }
                    };
                    return originalMessageSend(jid, payload as any, sendOpts);
                }

                return originalMessageSend(
                    jid,
                    {
                        type: 'event',
                        name: _title,
                        startTime,
                        extraGuestsAllowed: _extraGuestsAllowed,
                        isScheduleCall: _isScheduleCall,
                        hasReminder: _hasReminder,
                        reminderOffsetSec: _reminderOffsetSec
                    },
                    sendOpts
                );
            }
        };
        return builder;
    };

    extendedSock.sendBooking = async (jid: string, content: SendButtonsContentInput = {}, options: ZapoHelperOptions = {}) => {
        const sendOpts: WaSendMessageOptions = options.quoted ? { quote: options.quoted as any, ...options } : { ...options };
        const params = {
            start_datetime: content.start_datetime || '',
            end_datetime: content.end_datetime || '',
            location: content.location || '',
            booking_url: content.booking_url || '',
            phone_number: content.phone_number || '',
            booking_management_url: content.booking_management_url || '',
            description: content.description || '',
            email: content.email || '',
            display_text: content.display_text || 'Book Now',
            display_content: content.display_content || {}
        };
        const payload = {
            interactiveMessage: {
                header: { title: content.title || '', hasMediaAttachment: false },
                body: { text: content.text || '' },
                footer: { text: content.footer || '' },
                nativeFlowMessage: {
                    buttons: [{ name: 'booking_confirmation', buttonParamsJson: JSON.stringify(params) }],
                    messageParamsJson: ''
                }
            }
        };
        return originalMessageSend(jid, payload as any, sendOpts);
    };

    extendedSock.sendRawMessage = async (jid: string, message: unknown, options: ZapoHelperOptions = {}) => {
        const sendOpts: WaSendMessageOptions = options.quoted ? { quote: options.quoted as any, ...options } : { ...options };
        return originalMessageSend(jid, message as any, sendOpts);
    };

    function extractIE(text: string, { extract = true, hyperlink = true, citation = true, latex = true } = {}): { text: string; ie: any[] } {
        if (!extract) return { text, ie: [] };
        let ie: any[] = [];
        let result = '';
        let last = 0;
        let citation_index = 1;
        let hyperlink_index = 0;
        let latex_index = 0;
        let stack: number[] = [];

        for (let i = 0; i < text.length; i++) {
            if (text[i] === '[' && text[i - 1] !== '\\') {
                stack.push(i);
            } else if (text[i] === ']' && (text[i + 1] === '(' || text[i + 1] === '<')) {
                let start = stack.pop();
                if (start == null) continue;
                let open = text[i + 1];
                let close = open === '(' ? ')' : '>';
                let type = open === '(' ? 'link' : 'latex';
                let end = i + 2;
                let depth = 1;
                while (end < text.length && depth) {
                    if (text[end] === open && text[end - 1] !== '\\') depth++;
                    else if (text[end] === close && text[end - 1] !== '\\') depth--;
                    end++;
                }
                if (depth) continue;
                let raw = text.slice(start + 1, i).trim();
                let url = text.slice(i + 2, end - 1).trim();
                let key: string;
                let tag: string;
                let data: any;
                if (type === 'latex') {
                    if (!latex) continue;
                    let [txt = '', width = null, height = null, font_height = null, padding = null] = raw.split('|');
                    key = `NIXEL_LATEX_${latex_index++}`;
                    tag = `{{${key}}}${txt || 'image'}{{/${key}}}`;
                    data = { type: 'latex', ie: { key, text: txt, url, width, height, font_height, padding } };
                } else if (raw) {
                    if (!hyperlink) continue;
                    key = `NIXEL_HYPERLINK_${hyperlink_index++}`;
                    tag = `{{${key}}}${url}{{/${key}}}`;
                    data = { type: 'hyperlink', ie: { key, text: raw, url } };
                } else {
                    if (!citation) continue;
                    key = `NIXEL_CITATION_${citation_index - 1}`;
                    tag = `{{${key}}}${url}{{/${key}}}`;
                    data = { type: 'citation', ie: { reference_id: citation_index++, key, text: '', url } };
                }
                result += text.slice(last, start) + tag;
                last = end;
                ie.push(data);
                i = end - 1;
            }
        }
        result += text.slice(last);
        return { text: result, ie };
    }

    function aiRichTokenizer(code: string, lang = 'javascript'): { codeBlock: any[]; unified_codeBlock: any[] } {
        const keywordsMap: Record<string, Set<string>> = {
            javascript: new Set(['break','case','catch','continue','debugger','delete','do','else','finally','for','function','if','in','instanceof','new','return','switch','this','throw','try','typeof','var','void','while','with','true','false','null','undefined','class','const','let','super','extends','export','import','yield','static','constructor','async','await','get','set']),
            typescript: new Set(['break','case','catch','continue','debugger','delete','do','else','finally','for','function','if','in','instanceof','new','return','switch','this','throw','try','typeof','var','void','while','with','true','false','null','undefined','class','const','let','super','extends','export','import','yield','static','constructor','async','await','get','set','type','interface','readonly','declare','as','any','string','number','boolean'])
        };
        const TYPE_MAP: Record<number, string> = { 0: 'DEFAULT', 1: 'KEYWORD', 2: 'METHOD', 3: 'STR', 4: 'NUMBER', 5: 'COMMENT' };
        const keywords = keywordsMap[lang] || keywordsMap.javascript;
        const tokens: Array<{ codeContent: string; highlightType: number }> = [];
        let i = 0;
        const push = (content: string, type: number) => {
            if (!content) return;
            const last = tokens[tokens.length - 1];
            if (last && last.highlightType === type) last.codeContent += content;
            else tokens.push({ codeContent: content, highlightType: type });
        };
        while (i < code.length) {
            const c = code[i];
            if (/\s/.test(c)) { let s = i; while (i < code.length && /\s/.test(code[i])) i++; push(code.slice(s, i), 0); continue; }
            if (c === '/' && code[i + 1] === '/') { let s = i; i += 2; while (i < code.length && code[i] !== '\n') i++; push(code.slice(s, i), 5); continue; }
            if (c === '"' || c === "'" || c === '`') {
                let s = i; let q = c; i++;
                while (i < code.length) {
                    if (code[i] === '\\' && i + 1 < code.length) i += 2;
                    else if (code[i] === q) { i++; break; }
                    else i++;
                }
                push(code.slice(s, i), 3); continue;
            }
            if (/[0-9]/.test(c)) { let s = i; while (i < code.length && /[0-9.]/.test(code[i])) i++; push(code.slice(s, i), 4); continue; }
            if (/[a-zA-Z_$]/.test(c)) {
                let s = i;
                while (i < code.length && /[a-zA-Z0-9_$]/.test(code[i])) i++;
                const word = code.slice(s, i);
                let type = 0;
                if (keywords.has(word)) type = 1;
                else { let j = i; while (j < code.length && /\s/.test(code[j])) j++; if (code[j] === '(') type = 2; }
                push(word, type); continue;
            }
            push(c, 0); i++;
        }
        return {
            codeBlock: tokens,
            unified_codeBlock: tokens.map((t) => ({ content: t.codeContent, type: TYPE_MAP[t.highlightType] }))
        };
    }

    function toTableMetadata(data: any): { title: string; rows: any[]; unified_rows: any[] } {
        if (!Array.isArray(data) || data.length === 0) {
            throw new TypeError('Table must be a non-empty array of objects or 2D array');
        }
        let grid: string[][] = [];
        if (typeof data[0] === 'object' && !Array.isArray(data[0]) && data[0] !== null) {
            const headers = Array.from(new Set(data.flatMap((obj: any) => Object.keys(obj))));
            grid.push(headers);
            for (const item of data) {
                grid.push(headers.map((h) => String(item?.[h] ?? '')));
            }
        } else if (Array.isArray(data[0])) {
            grid = data.map((row: any) =>
                Array.isArray(row) ? row.map((cell: any) => String(cell ?? '')) : [String(row ?? '')]
            );
        } else {
            grid = [data.map((c: any) => String(c ?? ''))];
        }

        const [header, ...rows] = grid;
        const maxLen = Math.max(header.length, ...rows.map((r) => r.length));
        const normalize = (r: string[]) => [...r, ...Array(maxLen - r.length).fill('')];
        const unified_rows = [
            { is_header: true, cells: normalize(header) },
            ...rows.map((r) => ({ is_header: false, cells: normalize(r) }))
        ];
        const rowsMeta = unified_rows.map((r) => ({ items: r.cells, ...(r.is_header ? { isHeading: true } : {}) }));
        return { title: '', rows: rowsMeta, unified_rows };
    }

    function buildAIRichFallback(builder: any): string {
        const parts: string[] = [];
        if (builder._title) {
            parts.push(`╭───「 *${String(builder._title).toUpperCase()}* 」`);
        }

        if (Array.isArray(builder._sections)) {
            for (const sec of builder._sections) {
                const vm = sec?.view_model;
                const prim = vm?.primitive || (Array.isArray(vm?.primitives) ? vm.primitives : []);
                const prims = Array.isArray(prim) ? prim : [prim];

                for (const p of prims) {
                    if (!p) continue;
                    if (p.text) {
                        parts.push(p.text);
                    } else if (p.language && p.code_blocks) {
                        const code = Array.isArray(p.code_blocks)
                            ? p.code_blocks.map((b: any) => b.content || '').join('')
                            : String(p.code_blocks);
                        parts.push(`\`\`\`${p.language}\n${code}\n\`\`\``);
                    } else if (p.rows) {
                        const tableLines: string[] = [];
                        for (const r of p.rows) {
                            if (r.cells) {
                                tableLines.push(`│ ${r.cells.join(' │ ')} │`);
                            }
                        }
                        if (tableLines.length > 0) {
                            parts.push(tableLines.join('\n'));
                        }
                    } else if (p.media?.url) {
                        parts.push(`🖼️ ${p.media.url}`);
                    } else if (p.prompt_text) {
                        parts.push(`💡 _Sugesti:_ *${p.prompt_text}*`);
                    }
                }
            }
        }

        if (builder._footer) {
            parts.push(`╰─── _${builder._footer}_`);
        } else if (builder._title) {
            parts.push(`╰──────────────────────`);
        }

        return parts.join('\n\n');
    }

    extendedSock.sendAIRich = async (recipient: any, builder: any = {}, options: ZapoHelperOptions = {}) => {
        let jid = '';
        if (typeof recipient === 'string') {
            jid = recipient;
        } else if (recipient && typeof recipient === 'object') {
            jid = recipient.from || recipient.chatJid || recipient.event?.from || recipient.key?.remoteJid || '';
        }

        if (!jid) {
            throw new TypeError('sendAIRich: Target recipient JID is missing or undefined.');
        }

        const sendOpts: WaSendMessageOptions = options.quoted ? { quote: options.quoted as any, ...options } : { ...options };
        const title = builder._title || '';
        const footer = builder._footer || '';
        const submessages = builder._submessages || [];
        const allSections = builder._sections || [];
        const richResponseSources = builder._richResponseSources || [];
        const extraPayload = builder._extraPayload || {};

        const fallbackText = buildAIRichFallback(builder);

        const forward = {
            forwardingScore: 1,
            isForwarded: true,
            forwardedAiBotMessageInfo: { botJid: '0@bot' },
            forwardOrigin: 4
        };

        const qObj = options.quoted ? buildContextInfo(options) : {};

        const payload: Record<string, unknown> = {
            messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
                botMetadata: {
                    messageDisclaimerText: footer || title || 'Meta AI',
                    richResponseSourcesMetadata: { sources: richResponseSources }
                }
            },
            ...extraPayload,
            botForwardedMessage: {
                message: {
                    richResponseMessage: {
                        messageType: 1,
                        submessages,
                        unifiedResponse: {
                            data: Buffer.from(
                                JSON.stringify({
                                    response_id: crypto.randomUUID(),
                                    sections: allSections
                                })
                            ).toString('base64')
                        },
                        contextInfo: {
                            ...forward,
                            ...qObj,
                            ...(options.contextInfo || {})
                        }
                    }
                }
            }
        };

        return originalMessageSend(jid, payload as any, sendOpts);
    };

    extendedSock.createAIRich = (options: Record<string, any> = {}): AIRichBuilder => {
        let _title = options.title || '';
        let _footer = options.footer || '';
        let _contextInfo: Record<string, any> = options.contextInfo || {};
        let _extraPayload: Record<string, any> = options.extraPayload || {};
        let _autoDownload: boolean = options.autoDownload !== undefined ? Boolean(options.autoDownload) : (extendedSock.autoDownload !== false);
        let _submessages: any[] = [];
        let _sections: any[] = [];
        let _richResponseSources: any[] = [];

        const newLayout = (name: string, data: any) => ({
            view_model: {
                [Array.isArray(data) ? 'primitives' : 'primitive']: data,
                __typename: `GenAI${name}LayoutViewModel`
            }
        });

        const builder: AIRichBuilder = {
            setTitle(title: string) {
                _title = title;
                return builder;
            },
            setFooter(footer: string) {
                _footer = footer;
                return builder;
            },
            setContextInfo(obj: Record<string, unknown>) {
                _contextInfo = obj;
                return builder;
            },
            addPayload(obj: Record<string, unknown>) {
                Object.assign(_extraPayload, obj);
                return builder;
            },
            setAutoDownload(enabled: boolean = true) {
                _autoDownload = enabled;
                return builder;
            },
            addText(text: string, { hyperlink = true, citation = true, latex = true } = {}) {
                const extractedIE = extractIE(text, { hyperlink, citation, latex });
                const inline_entities = extractedIE.ie.map(({ type, ie }) => {
                    if (type === 'hyperlink') return { key: ie.key, metadata: { display_name: ie.text, is_trusted: true, url: ie.url, __typename: 'GenAIInlineLinkItem' } };
                    if (type === 'citation') return { key: ie.key, metadata: { reference_id: ie.reference_id, reference_url: ie.url, reference_title: ie.url, reference_display_name: ie.url, sources: [], __typename: 'GenAISearchCitationItem' } };
                    if (type === 'latex') return { key: ie.key, metadata: { latex_expression: ie.text, latex_image: { url: ie.url, width: Number(ie.width) || 100, height: Number(ie.height) || 100 }, font_height: Number(ie.font_height) || 83.333333333333, padding: Number(ie.padding) || 15, __typename: 'GenAILatexItem' } };
                });
                _sections.push(newLayout('Single', { text: extractedIE.text, ...(inline_entities.length ? { inline_entities } : {}), __typename: 'GenAIMarkdownTextUXPrimitive' }));
                return builder;
            },
            addCode(language: string, code: string) {
                const meta = aiRichTokenizer(code, language);
                _submessages.push({ messageType: 5, codeMetadata: { codeLanguage: language, codeBlocks: meta.codeBlock } });
                _sections.push(newLayout('Single', { language, code_blocks: meta.unified_codeBlock, __typename: 'GenAICodeUXPrimitive' }));
                return builder;
            },
            addTable(table: string[][]) {
                const meta = toTableMetadata(table);
                _submessages.push({ messageType: 4, tableMetadata: { title: meta.title, rows: meta.rows } });
                _sections.push(newLayout('Single', { rows: meta.unified_rows, __typename: 'GenATableUXPrimitive' }));
                return builder;
            },
            addSource(sources: any[]) {
                if (sources.every((item) => typeof item === 'string')) sources = [sources];
                const source = sources.map(([profile_url, url, text]) => ({
                    source_type: 'THIRD_PARTY',
                    source_display_name: text ?? '',
                    source_subtitle: 'AI',
                    source_url: url ?? '',
                    favicon: { url: profile_url ?? '', mime_type: 'image/jpeg', width: 16, height: 16 }
                }));
                _sections.push(newLayout('Single', { sources: source, __typename: 'GenAISearchResultPrimitive' }));
                return builder;
            },
            addImage(imageUrl: string | string[]) {
                const imageUrls = (Array.isArray(imageUrl) ? imageUrl : [imageUrl]).map((url) => ({
                    imagePreviewUrl: url,
                    imageHighResUrl: url,
                    sourceUrl: 'https://whatsapp.com'
                }));
                _submessages.push({ messageType: 1, gridImageMetadata: { gridImageUrl: { imagePreviewUrl: Array.isArray(imageUrl) ? imageUrl[0] : imageUrl }, imageUrls } });
                imageUrls.forEach(({ imagePreviewUrl }) => {
                    _sections.push(newLayout('Single', { media: { url: imagePreviewUrl, mime_type: 'image/png' }, imagine_type: 'IMAGE', status: { status: 'READY' }, __typename: 'GenAIImaginePrimitive' }));
                });
                return builder;
            },
            addVideo(videoUrl: string | string[]) {
                const videoUrls = (Array.isArray(videoUrl) ? videoUrl : [videoUrl]).map((item) => {
                    const [url, duration = 0] = String(item).split('|');
                    return { videoPreviewUrl: url, videoHighResUrl: url, duration: Number(duration) || 0, sourceUrl: 'https://whatsapp.com' };
                });
                _submessages.push({ messageType: 2, messageText: '[ CANNOT_LOAD_VIDEO ]' });
                videoUrls.forEach(({ videoPreviewUrl, duration }) => {
                    _sections.push(newLayout('Single', { media: { url: videoPreviewUrl, mime_type: 'video/mp4', duration }, imagine_type: 'ANIMATE', status: { status: 'READY' }, __typename: 'GenAIImaginePrimitive' }));
                });
                return builder;
            },
            addReels(reelsItems: any[] | any) {
                const items = Array.isArray(reelsItems) ? reelsItems : [reelsItems];
                _submessages.push({ messageType: 9, contentItemsMetadata: { contentType: 1, itemsMetadata: items.map((item: any) => ({ reelItem: { title: item.username ?? '', profileIconUrl: item.profileIconUrl ?? item.profile_url ?? '', thumbnailUrl: item.thumbnailUrl ?? item.thumbnail ?? '', videoUrl: item.videoUrl ?? item.url ?? '' } })) } });
                items.forEach((item: any, idx: number) => {
                    _richResponseSources.push({ provider: 'NIXEL', thumbnailCDNURL: item.thumbnailUrl ?? item.thumbnail ?? '', sourceProviderURL: item.videoUrl ?? item.url ?? '', sourceQuery: '', faviconCDNURL: item.profileIconUrl ?? item.profile_url ?? '', citationNumber: idx + 1, sourceTitle: item.username ?? '' });
                });
                _sections.push(newLayout('HScroll', items.map((item: any) => ({ reels_url: item.videoUrl ?? item.url ?? '', thumbnail_url: item.thumbnailUrl ?? item.thumbnail ?? '', creator: item.username ?? item.title ?? '', avatar_url: item.profileIconUrl ?? item.profile_url ?? '', reels_title: item.reels_title ?? item.title ?? '', likes_count: item.likes_count ?? item.like ?? 0, shares_count: item.shares_count ?? item.share ?? 0, view_count: item.view_count ?? item.view ?? 0, reel_source: item.reel_source ?? item.source ?? 'IG', is_verified: Boolean(item.is_verified || item.verified), __typename: 'GenAIReelPrimitive' }))));
                return builder;
            },
            addProduct(data: any) {
                const items = Array.isArray(data) ? data : [data];
                _submessages.push({ messageType: 2, messageText: '[ CANNOT_LOAD_PRODUCT ]' });
                const product = items.map((item: any) => ({ title: item.title, brand: item.brand, price: item.price, sale_price: item.sale_price, product_url: item.product_url ?? item.url, image: { url: item.image_url ?? item.image }, additional_images: [{ url: item.icon_url ?? item.icon }], __typename: 'GenAIProductItemCardPrimitive' }));
                _sections.push(newLayout(Array.isArray(data) ? 'HScroll' : 'Single', Array.isArray(data) ? product : product[0]));
                return builder;
            },
            addPost(data: any) {
                const posts = Array.isArray(data) ? data : [data];
                _submessages.push({ messageType: 2, messageText: '[ CANNOT_LOAD_POST ]' });
                const primitives = posts.map((p: any) => ({ title: p.title ?? '', subtitle: p.subtitle ?? '', username: p.username ?? '', profile_picture_url: p.profile_picture_url ?? p.profile_url ?? '', is_verified: Boolean(p.is_verified || p.verified), thumbnail_url: p.thumbnail_url ?? p.thumbnail ?? '', post_caption: p.post_caption ?? p.caption ?? '', likes_count: p.likes_count ?? p.like ?? 0, comments_count: p.comments_count ?? p.comment ?? 0, shares_count: p.shares_count ?? p.share ?? 0, post_url: p.post_url ?? p.url ?? '', post_deeplink: p.post_deeplink ?? p.deeplink ?? '', source_app: p.source_app || p.source || 'INSTAGRAM', footer_label: p.footer_label ?? p.footer ?? '', footer_icon: p.footer_icon ?? p.icon ?? '', is_carousel: posts.length > 1, orientation: p.orientation ?? 'LANDSCAPE', post_type: p.post_type ?? 'VIDEO', __typename: 'GenAIPostPrimitive' }));
                _sections.push(newLayout('HScroll', primitives));
                return builder;
            },
            addTip(text: string) {
                _sections.push(newLayout('Single', { text, __typename: 'GenAIMetadataTextPrimitive' }));
                return builder;
            },
            addSuggest(suggestion: string | string[] | Array<{ text?: string; prompt?: string }>) {
                const list = Array.isArray(suggestion) ? suggestion : [suggestion];
                _sections.push(newLayout('ActionRow', list.map((t) => {
                    const prompt = typeof t === 'string' ? t : (t as any)?.text || (t as any)?.prompt || '';
                    return {
                        prompt_text: prompt,
                        prompt_type: 'SUGGESTED_PROMPT',
                        __typename: 'GenAIFollowUpSuggestionPillPrimitive'
                    };
                })));
                return builder;
            },
            async send(recipient: any, opts: ZapoHelperOptions = {}) {
                return extendedSock.sendAIRich(recipient, { _title, _footer, _submessages, _sections, _richResponseSources, _extraPayload, _contextInfo }, opts);
            },
            async sendAsButtons(recipient: any, opts: ZapoHelperOptions = {}) {
                const text = buildAIRichFallback({ _title, _footer, _sections });
                const buttons = (_sections || []).flatMap((sec: any) => {
                    const vm = sec?.view_model;
                    const prims = Array.isArray(vm?.primitives) ? vm.primitives : [vm?.primitive];
                    return prims.filter((p: any) => p?.prompt_text).map((p: any) => ({
                        text: p.prompt_text,
                        id: p.prompt_text
                    }));
                });
                return extendedSock.sendButtons(recipient, {
                    title: _title,
                    text,
                    footer: _footer,
                    buttons: buttons.length ? buttons : [{ text: 'OK', id: 'ok' }]
                }, opts);
            }
        };
        return builder;
    };

    return extendedSock;
}

export default makeHelper;
