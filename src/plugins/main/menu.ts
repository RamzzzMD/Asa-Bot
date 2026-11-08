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

function buildStatusHeader(botName: string): string {
    return [
        `┇👋 Hai welcome saya *${botName}*`,
        '┇ WhatsApp Bot pintar & multifungsi',
        '┇ Dirancang untuk memudahkan harimu',
        '┇ Semua fitur sudah aktif dan lengkap',
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
    description: 'Menampilkan daftar menu bot dengan pilihan kategori',
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
            : (context.isGroup && context.isAdmin)
            ? 'Admin Group'
            : context.isPremium
            ? 'Premium'
            : 'Free User';

        const isPrefixOff = context.db.getSetting('bot', 'noprefix') === '1';
        const activePrefix = context.db.getSetting('bot', 'prefix') || context.config.prefixes[0] || '.';
        const displayPrefix = isPrefixOff ? 'None (No-Prefix)' : activePrefix;

        const headerText = buildHeaderBlock({
            botName: context.config.botName,
            ownerName: context.config.ownerName || 'Ranzz Suaminya Asa',
            prefix: displayPrefix,
            botVersion: '1.0.0',
            botMode: (context.db.getSetting('bot', 'mode') || context.config.mode || 'public').toUpperCase(),
            pushName: context.pushName || 'User',
            statusLabel
        });

        const isFiltering = Boolean(filterCategory && categories.has(filterCategory));
        const isShowAll = filterCategory === 'all';

        const usedPrefix = context.usedPrefix || context.prefix;
        const statusHeaderText = buildStatusHeader(context.config.botName);

        let footerContent = '';

        if (isFiltering) {
            const plugins = categories.get(filterCategory) ?? [];
            const commandList: string[] = [];
            for (const plugin of plugins) {
                const primary = plugin.commands?.[0] ?? (Array.isArray(plugin.command) ? plugin.command[0] : plugin.command) ?? plugin.name ?? 'cmd';
                const badge = getPluginBadge(plugin);
                commandList.push(`${usedPrefix}${primary}${badge}`);
            }
            footerContent = [statusHeaderText, buildKategoriBlock(filterCategory, commandList)].join('\n\n');
        } else if (isShowAll) {
            const categoryBlocks: string[] = [];
            for (const cat of sortedCategories) {
                const plugins = categories.get(cat) ?? [];
                if (plugins.length === 0) {
                    continue;
                }
                const commandList: string[] = [];
                for (const plugin of plugins) {
                    const primary = plugin.commands?.[0] ?? (Array.isArray(plugin.command) ? plugin.command[0] : plugin.command) ?? plugin.name ?? 'cmd';
                    const badge = getPluginBadge(plugin);
                    commandList.push(`${usedPrefix}${primary}${badge}`);
                }
                categoryBlocks.push(buildKategoriBlock(cat, commandList));
            }
            footerContent = [statusHeaderText, categoryBlocks.join('\n\n')].join('\n\n');
        } else {
            footerContent = headerText;
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

        await global.button.list(context, {
            text: '',
            buttonText: 'pilih kategori',
            header: `*${context.config.botName.toLowerCase()} menu*`,
            footer: footerContent,
            image: context.config.thumbnailUrl,
            sections
        });

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
};

export default handler;
