import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, PluginContext } from '../../../types/plugin.js';

function buildHeaderBlock(info: {
    botName: string;
    ownerName: string;
    prefix: string;
    botVersion: string;
    botMode: string;
    pushName: string;
    statusLabel: string;
}): string {
    return [
        '╭ ┈──ׅ─┈─ׅ─┈─ׅ─┈─ׅ─',
        '│   ---- *⫹ INFO BOT ⫺* ----',
        '│╭ ┈──ׅ───ׅ──ׅ─┈─ׅ─',
        `││ *𖢷 ׁ 𖹭₊  Name   :* ${info.botName}`,
        `││ *𖢷 ׁ 𖹭₊  Owner  :* ${info.ownerName}`,
        `││ *𖢷 ׁ 𖹭₊  Prefix :* ${info.prefix}`,
        `││ *𖢷 ׁ 𖹭₊  Versi  :* ${info.botVersion}`,
        `││ *𖢷 ׁ 𖹭₊  Mode   :* ${info.botMode}`,
        '│╰┈─ׅ──ֺ─ֺ──ׅ──ׅ─ֺ─ֺ',
        '╰┈─ׅ──ֺ─ֺ───ׅ─  ׅ ⏝ׅ︶ ׅ 𝅄',
        '',
        '╭ ┈──ׅ─┈─ׅ─┈─ׅ─┈─ׅ─',
        '│  ---- *⫹ INFO USER ⫺* ----',
        '│╭ ┈──ׅ─┈─ׅ─┈─ׅ──ׅ─',
        `││ *𖢷 ׁ 𖹭₊  Name    :* ${info.pushName}`,
        `││ *𖢷 ׁ 𖹭₊  Status   :* ${info.statusLabel}`,
        '│╰┈─ׅ──ֺ─ֺ──ׅ─ֺ─ֺ─ׅ─',
        '╰┈─ׅ──ֺ─ֺ───ׅ─  ׅ ⏝ׅ︶ ׅ 𝅄'
    ].join('\n');
}

function buildStatusHeader(
    botName: string,
    ownerName: string,
    pushName: string,
    prefix: string,
    customGreeting?: string | null
): string {
    const greetingBlock = customGreeting
        ? customGreeting
              .replace(/\{name\}/gi, pushName)
              .replace(/\{bot\}/gi, botName)
              .replace(/\{owner\}/gi, ownerName)
              .replace(/\{prefix\}/gi, prefix)
        : [
              `┇👋 Hai *${pushName}*, welcome di *${botName}*`,
              '┇ WhatsApp Bot pintar & multifungsi',
              '┇ Dirancang untuk memudahkan harimu',
              '┇ Semua fitur sudah aktif dan lengkap'
          ].join('\n');

    return [
        greetingBlock,
        '',
        '╭ ┈──ׅ─┈─ׅ─┈─ׅ─┈─ׅ',
        '│  --- *⫹ KETERANGAN ⫺* ---',
        '│╭ ┈──ׅ─┈─ׅ─┈─ׅ──ׅ',
        '││ *Ⓛ = Menggunakan Limit*',
        '││ *Ⓟ = Khusus Premium*',
        '││ *Ⓞ = Khusus Owner*',
        '││ *Ⓖ = Khusus Di Grup*',
        '││ *Ⓐ = Khusus Admin Grup*',
        '│╰┈─ׅ──ֺ─ֺ──ׅ─ֺ─ֺ─ׅ─ ╰┈─ׅ──ֺ─ֺ───ׅ─  ׅ ⏝ׅ︶ ׅ 𝅄',
        '',
        '▭▬▭▬▭▬▭▬▭▬▭▬▭'
    ].join('\n');
}

function getPluginBadge(plugin: Plugin): string {
    const badges: string[] = [];
    if (plugin.limit) {
        badges.push('Ⓛ');
    }
    if (plugin.owner || plugin.permissions?.owner) {
        badges.push('Ⓞ');
    }
    if (plugin.admin || plugin.permissions?.admin) {
        badges.push('Ⓐ');
    }
    if (plugin.premium || plugin.permissions?.premium) {
        badges.push('Ⓟ');
    }
    if (plugin.group || plugin.permissions?.group) {
        badges.push('Ⓖ');
    }
    return badges.length > 0 ? ` ${badges.join('')}` : '';
}

function buildKategoriBlock(categoryTitle: string, commandList: string[]): string {
    const lines = [`┇╭─•⪨  *` + '`' + `${categoryTitle.toUpperCase()}` + '`' + `*`, '┇├───────────'];
    commandList.forEach((cmd) => lines.push(`┇│✎ ${cmd}`));
    lines.push('┇╰──────────⌯⌲');
    return lines.join('\n');
}

const handler: Plugin = {
    command: ['menu', 'help'],
    category: 'main',
    description: 'Menampilkan daftar menu bot dengan pilihan kategori dan 7 gaya tampilan (setmenu)',
    owner: false,
    premium: false,
    group: false,
    private: false,
    admin: false,
    botadmin: false,
    execute: async (context: PluginContext): Promise<void> => {
        const categories = context.registry.getPluginsByCategory();
        const sortedCategories = Array.from(categories.keys()).sort();
        let filterCategory = (context.args[0] || '').toLowerCase().trim();

        if (filterCategory === 'grup' && !categories.has('grup') && categories.has('group')) {
            filterCategory = 'group';
        } else if (filterCategory === 'group' && !categories.has('group') && categories.has('grup')) {
            filterCategory = 'grup';
        }

        const statusLabel = context.isOwner
            ? 'Owner'
            : context.isGroup && context.isAdmin
              ? 'Admin Group'
              : context.isPremium
                ? 'Premium'
                : 'Free User';

        const isPrefixOff = context.db.getSetting('bot', 'noprefix') === '1';
        const activePrefix = context.db.getSetting('bot', 'prefix') || context.config.prefixes[0] || '.';
        const displayPrefix = isPrefixOff ? 'None (No-Prefix)' : activePrefix;
        const usedPrefix = context.usedPrefix || context.prefix || activePrefix;

        const botName = context.config.botName;
        const ownerName = context.config.ownerName || 'Ranzz Suaminya Asa';
        const pushName = context.pushName || 'User';

        // Ambil pengaturan kustom dari setmenu
        const menuType = (context.db.getSetting('menu', 'type') || 'list').toLowerCase();
        const customThumbUrl = context.db.getSetting('menu', 'thumb_url');
        const customGreeting = context.db.getSetting('menu', 'greeting');
        const customFooter = context.db.getSetting('menu', 'footer') || `${botName} • ${ownerName}`;
        const isAudioEnabled = context.db.getSetting('menu', 'audio') !== '0';

        const thumbnailSource = customThumbUrl || context.config.thumbnailUrl;

        const headerText = buildHeaderBlock({
            botName,
            ownerName,
            prefix: displayPrefix,
            botVersion: '1.0.0',
            botMode: (context.db.getSetting('bot', 'mode') || context.config.mode || 'public').toUpperCase(),
            pushName,
            statusLabel
        });

        const isFiltering = Boolean(filterCategory && categories.has(filterCategory));
        const isShowAll = filterCategory === 'all';
        const statusHeaderText = buildStatusHeader(botName, ownerName, pushName, usedPrefix, customGreeting);

        const buildAllCategoriesText = (): string => {
            const categoryBlocks: string[] = [];
            for (const cat of sortedCategories) {
                const plugins = categories.get(cat) ?? [];
                if (plugins.length === 0) continue;
                const commandList: string[] = [];
                for (const plugin of plugins) {
                    const primary =
                        plugin.commands?.[0] ??
                        (Array.isArray(plugin.command) ? plugin.command[0] : plugin.command) ??
                        plugin.name ??
                        'cmd';
                    const badge = getPluginBadge(plugin);
                    commandList.push(`${usedPrefix}${primary}${badge}`);
                }
                categoryBlocks.push(buildKategoriBlock(cat, commandList));
            }
            return categoryBlocks.join('\n\n');
        };

        let bodyContent = '';
        if (isFiltering) {
            const plugins = categories.get(filterCategory) ?? [];
            const commandList: string[] = [];
            for (const plugin of plugins) {
                const primary =
                    plugin.commands?.[0] ??
                    (Array.isArray(plugin.command) ? plugin.command[0] : plugin.command) ??
                    plugin.name ??
                    'cmd';
                const badge = getPluginBadge(plugin);
                commandList.push(`${usedPrefix}${primary}${badge}`);
            }
            bodyContent = [statusHeaderText, buildKategoriBlock(filterCategory, commandList)].join('\n\n');
        } else if (isShowAll || ['thumb', 'image', 'gif'].includes(menuType)) {
            bodyContent = [headerText, statusHeaderText, buildAllCategoriesText(), `_${customFooter}_`].join('\n\n');
        } else {
            bodyContent = headerText;
        }

        const sections = [
            {
                title: 'semua kategori',
                rows: [
                    {
                        id: `${usedPrefix}menu all`,
                        title: 'tampilkan semua',
                        description: 'seluruh perintah bot'
                    }
                ]
            },
            {
                title: 'kategori',
                rows: sortedCategories.map((cat) => ({
                    id: `${usedPrefix}menu ${cat}`,
                    title: `menu ${cat.toLowerCase()}`,
                    description: `perintah kategori ${cat.toLowerCase()}`
                }))
            }
        ];

        // Render sesuai gaya menu yang dipilih lewat .setmenu
        if (menuType === 'carousel' && !isFiltering && !isShowAll) {
            const cards = sortedCategories.slice(0, 10).map((cat) => {
                const plugins = categories.get(cat) ?? [];
                const cmdPreview = plugins
                    .slice(0, 12)
                    .map((p) => {
                        const primary =
                            p.commands?.[0] ??
                            (Array.isArray(p.command) ? p.command[0] : p.command) ??
                            p.name ??
                            'cmd';
                        return `• ${usedPrefix}${primary}${getPluginBadge(p)}`;
                    })
                    .join('\n');

                return {
                    title: `📂 KATEGORI ${cat.toUpperCase()}`,
                    subtitle: `${plugins.length} Fitur Tersedia`,
                    body: cmdPreview + (plugins.length > 12 ? `\n...dan ${plugins.length - 12} lainnya` : ''),
                    footer: customFooter,
                    image: thumbnailSource,
                    buttons: [
                        {
                            type: 'reply' as const,
                            id: `${usedPrefix}menu ${cat}`,
                            text: `Buka ${cat.toUpperCase()}`
                        }
                    ]
                };
            });

            await global.coroseul(context, {
                text: `${headerText}\n\n${statusHeaderText}`,
                footer: customFooter,
                cards
            });
        } else if (menuType === 'button') {
            await global.buttonv2.send(context, {
                header: {
                    title: `*${botName.toLowerCase()} menu*`,
                    image: thumbnailSource
                },
                text: bodyContent,
                footer: customFooter,
                buttons: [
                    {
                        type: 'reply',
                        id: `${usedPrefix}menu all`,
                        text: '📜 Semua Menu'
                    },
                    {
                        type: 'reply',
                        id: `${usedPrefix}owner`,
                        text: '👑 Owner'
                    },
                    {
                        type: 'reply',
                        id: `${usedPrefix}runtime`,
                        text: '⚡ Runtime'
                    },
                    {
                        type: 'select',
                        title: '📂 Pilih Kategori',
                        sections
                    }
                ]
            });
        } else if (menuType === 'document') {
            const docBuffer = fs.existsSync(path.resolve(context.config.thumbnailUrl))
                ? fs.readFileSync(path.resolve(context.config.thumbnailUrl))
                : Buffer.from(botName);

            await global.buttonv2.send(context, {
                header: {
                    title: `${botName} — Official Menu`,
                    subtitle: ownerName,
                    document: docBuffer,
                    thumbnail: thumbnailSource
                },
                text: bodyContent,
                footer: customFooter,
                buttons: [
                    {
                        type: 'reply',
                        id: `${usedPrefix}menu all`,
                        text: '📜 Semua Menu'
                    },
                    {
                        type: 'select',
                        title: '📂 Pilih Kategori',
                        sections
                    }
                ]
            });
        } else if (menuType === 'thumb') {
            await global.thumb.link(context, {
                text: bodyContent,
                url: 'https://github.com/RamzzzMD/Asa-Bot',
                title: `${botName} — Multi-Device Bot`,
                description: `Created by ${ownerName}`,
                thumbnail: thumbnailSource
            });
        } else if (menuType === 'image') {
            await global.thumb.image(context, {
                image: thumbnailSource,
                caption: bodyContent
            });
        } else if (menuType === 'gif') {
            const videoPath = path.resolve('assets/menu.mp4');
            if (fs.existsSync(videoPath)) {
                const vidBuffer = fs.readFileSync(videoPath);
                await context.client.sendMessage(
                    context.chatJid,
                    {
                        video: vidBuffer,
                        gifPlayback: true,
                        caption: bodyContent
                    },
                    { quoted: context.raw }
                );
            } else {
                await global.thumb.image(context, {
                    image: thumbnailSource,
                    caption: bodyContent
                });
            }
        } else {
            // Default: 'list' (1. Interactive List Menu)
            await global.button.list(context, {
                text: '',
                buttonText: 'pilih kategori',
                header: `*${botName.toLowerCase()} menu*`,
                footer: bodyContent,
                image: thumbnailSource,
                sections
            });
        }

        // Kirim Audio VN jika diaktifkan
        if (isAudioEnabled) {
            const audioPath = path.resolve('assets/menu.opus');
            if (fs.existsSync(audioPath)) {
                try {
                    const audioBuffer = fs.readFileSync(audioPath);
                    await context.client.sendMessage(
                        context.chatJid,
                        {
                            audio: audioBuffer,
                            mimetype: 'audio/ogg; codecs=opus',
                            ptt: true
                        },
                        { quoted: context.raw }
                    );
                } catch {}
            }
        }
    }
};

export default handler;
