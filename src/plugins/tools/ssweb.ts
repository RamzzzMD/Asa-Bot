import type { Plugin, PluginContext } from '../../../types/plugin.js';
import { scrapeScreenshot, POPULAR_CONFIGS, type ScreenshotDeviceConfig } from '../../../scrape/ssweb.js';

const handler: Plugin = {
    command: ['ssweb', 'screenshotweb', 'ss'],
    category: 'tools',
    description: 'Screenshot tampilan website dengan 3 config populer (desktop, tablet, mobile)',
    owner: false,
    premium: false,
    group: false,
    private: false,
    admin: false,
    botadmin: false,
    limit: true,
    execute: async (context: PluginContext): Promise<void> => {
        let text = context.text.trim();

        if (!text) {
            const quotedText =
                context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
                context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text;

            if (quotedText) {
                text = quotedText.trim();
            }
        }

        if (!text) {
            await context.reply(
                `📸 *WEBSITE SCREENSHOT*\n\n` +
                `⚙️ *Format Penggunaan:*\n` +
                `› *${context.usedPrefix || '.'}${context.command} <url>|<config>*\n` +
                `› *${context.usedPrefix || '.'}${context.command} <url> <config>*\n\n` +
                `📱 *3 Config Populer:*\n` +
                `1. *desktop*  › Resolusi Desktop 1920x1080 (Default)\n` +
                `2. *tablet*   › Resolusi Tablet / iPad 800x1024\n` +
                `3. *mobile*   › Resolusi Smartphone 375x812\n\n` +
                `📌 *Contoh:*\n` +
                `› *${context.usedPrefix || '.'}${context.command} https://github.com|desktop*\n` +
                `› *${context.usedPrefix || '.'}${context.command} https://google.com|mobile*\n` +
                `› *${context.usedPrefix || '.'}${context.command} https://instagram.com|tablet*`
            );
            return;
        }

        let targetUrl = '';
        let configName: ScreenshotDeviceConfig = 'desktop';

        if (text.includes('|')) {
            const parts = text.split('|');
            targetUrl = parts[0].trim();
            const candidateConfig = parts[1]?.toLowerCase().trim() || 'desktop';
            if (candidateConfig in POPULAR_CONFIGS) {
                configName = candidateConfig as ScreenshotDeviceConfig;
            } else if (candidateConfig === 'hp' || candidateConfig === 'phone') {
                configName = 'mobile';
            } else if (candidateConfig === 'tab' || candidateConfig === 'ipad') {
                configName = 'tablet';
            }
        } else {
            const parts = text.split(/\s+/);
            const candidateLast = parts[parts.length - 1]?.toLowerCase();
            if (parts.length > 1 && (candidateLast in POPULAR_CONFIGS || candidateLast === 'hp' || candidateLast === 'tab')) {
                configName = (candidateLast === 'hp' ? 'mobile' : candidateLast === 'tab' ? 'tablet' : candidateLast) as ScreenshotDeviceConfig;
                targetUrl = parts.slice(0, -1).join(' ').trim();
            } else {
                targetUrl = text;
            }
        }

        const matchUrl = targetUrl.match(/https?:\/\/[^\s]+/i);
        if (!matchUrl && !targetUrl.includes('.')) {
            await context.reply(`❌ Masukkan URL website yang valid (contoh: https://google.com).`);
            return;
        }

        const finalUrl = matchUrl ? matchUrl[0] : (targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);

        await context.reply(global.mess?.wait || '⏳ Sedang mengambil screenshot website, mohon tunggu...');

        try {
            const result = await scrapeScreenshot(finalUrl, { config: configName });
            const configInfo = POPULAR_CONFIGS[result.config];

            const caption =
                `🌐 *WEBSITE SCREENSHOT*\n\n` +
                `• *URL:* ${result.url}\n` +
                `• *Config:* ${configInfo.label}\n` +
                `• *Resolusi:* ${result.width}x${result.height}\n` +
                `• *Mesin:* ${result.source === 'microlink' ? 'Microlink Engine' : 'High-Res Render Engine'}\n\n` +
                `_Enami Asa Ai - Website Screenshot Tool_`;

            await context.client.sendMessage(
                context.chatJid,
                {
                    image: result.buffer,
                    caption
                },
                { quoted: context.raw }
            );
        } catch (err: any) {
            await context.reply(`❌ Gagal mengambil screenshot: ${err.message || err}`);
        }
    }
};

export default handler;
