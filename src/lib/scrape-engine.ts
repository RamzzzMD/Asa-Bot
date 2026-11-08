import fs from 'node:fs';
import nodeModule from 'node:module';
import path from 'node:path';
import type { PluginRegistryLike } from '../../types/plugin.js';
import { PluginLoader } from '../core/plugins.js';
import { chat as deepChat } from '../../scrape/deepchat.js';
import { deepaiChat } from '../../scrape/deepai.js';
import { DeepSeekThinking } from '../../scrape/deepseek.js';
import { notrackChat } from '../../scrape/notrack.js';
import { chatgpt } from '../../scrape/chatgpt.js';

export type ScrapeCategory =
    | 'downloader'
    | 'search'
    | 'ai'
    | 'tools'
    | 'maker'
    | 'islamic'
    | 'anime';

export type ScrapeInputMode = 'url' | 'query' | 'optional_query';

export interface ScrapeAnalysis {
    readonly scrapeName: string;
    readonly mainFunctionName: string;
    readonly exportedFunctions: readonly string[];
    readonly category: ScrapeCategory;
    readonly inputMode: ScrapeInputMode;
    readonly commands: readonly string[];
    readonly description: string;
    readonly paramNames: readonly string[];
}

export interface DeployScrapeResult {
    readonly analysis: ScrapeAnalysis;
    readonly scrapeRelPath: string;
    readonly pluginRelPath: string;
    readonly scrapeCode: string;
    readonly pluginCode: string;
    readonly generatorUsed: string;
    readonly isUpdate: boolean;
    readonly hotRegistered: boolean;
}

const RESERVED_IDENTIFIERS = new Set([
    'if',
    'for',
    'while',
    'switch',
    'catch',
    'function',
    'return',
    'async',
    'await',
    'require',
    'import',
    'export',
    'default',
    'const',
    'let',
    'var',
    'class',
    'constructor',
    'new',
    'Promise',
    'Object',
    'Array',
    'String',
    'Number',
    'Boolean',
    'Buffer',
    'Error',
    'RegExp',
    'Date',
    'Math',
    'JSON',
    'console',
    'setTimeout',
    'setInterval',
    'clearTimeout',
    'clearInterval',
    'fetch',
    'axios',
    'cheerio'
]);

const HELPER_FUNC_NAMES = new Set([
    'uuid',
    'random',
    'randomnumber',
    'randomstring',
    'randomid',
    'sleep',
    'delay',
    'wait',
    'parse',
    'parsesse',
    'parsehtml',
    'parsejson',
    'clean',
    'cleanhtml',
    'striphtml',
    'format',
    'formatnumber',
    'formatsize',
    'formatbytes',
    'formatduration',
    'headers',
    'getheaders',
    'makeheaders',
    'makecookie',
    'makecookieheader',
    'getcookie',
    'gettoken',
    'generatetoken',
    'hash',
    'md5',
    'sha256',
    'encrypt',
    'decrypt',
    ' solvepow',
    'basecfg',
    'tohistorymessages'
]);

/**
 * Checks whether a raw message sent by the Owner looks like standalone scraper code.
 */
export function isLikelyRawScrapeCode(rawText: string): boolean {
    if (!rawText || rawText.length < 80) {
        return false;
    }

    const trimmed = rawText.trim();
    if (/^[.#!/>$]/.test(trimmed) || trimmed.startsWith('=>')) {
        return false;
    }

    // Ignore if it is already a Bot Plugin handler file
    if (
        /const\s+handler\s*:\s*Plugin/i.test(trimmed) ||
        /PluginContext/i.test(trimmed) ||
        /types\/plugin/i.test(trimmed) ||
        (/command\s*:\s*\[/i.test(trimmed) && /execute\s*:\s*async/i.test(trimmed))
    ) {
        return false;
    }

    const code = stripMarkdownCodeBlock(trimmed);
    const lines = code.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 5) {
        return false;
    }

    const hasNetworkLibrary =
        /\baxios\b/.test(code) ||
        /\bcheerio\b/.test(code) ||
        /\bfetch\s*\(/.test(code) ||
        /\bFormData\b/.test(code) ||
        /\bgot\s*\(/.test(code) ||
        /\bhttps?\.(?:get|request)\b/.test(code) ||
        /User-Agent/i.test(code);

    const hasFunctionOrExport =
        /\basync\s+function\s+[a-zA-Z_$]/.test(code) ||
        /\bfunction\s+[a-zA-Z_$]/.test(code) ||
        /\bconst\s+[a-zA-Z_$][\w$]*\s*=\s*async\b/.test(code) ||
        /\bmodule\.exports\b/.test(code) ||
        /\bexport\s+(?:async\s+)?(?:function|const|default|class)\b/.test(code);

    return hasNetworkLibrary && hasFunctionOrExport;
}

/**
 * Strips triple-backtick code fences if the user wrapped the code in markdown.
 */
export function stripMarkdownCodeBlock(input: string): string {
    const trimmed = input.trim();
    const fenceMatch = trimmed.match(/```(?:ts|typescript|js|javascript|mjs|cjs)?\s*\r?\n([\s\S]*?)```/i);
    if (fenceMatch && fenceMatch[1]?.trim()) {
        return fenceMatch[1].trim();
    }
    return trimmed
        .replace(/^```(?:ts|typescript|js|javascript|mjs|cjs)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
}

/**
 * Parses user input (command text + optional quoted text) into optional name/category hints and raw code.
 */
export function extractScrapeInput(
    commandText: string,
    quotedText?: string,
    documentBuffer?: Buffer | null,
    documentFileName?: string
): { hintName?: string; hintCategory?: ScrapeCategory; code: string } {
    let hintName: string | undefined;
    let hintCategory: ScrapeCategory | undefined;
    let code = '';

    const parseHintToken = (token: string): boolean => {
        const clean = token.trim().replace(/\.(ts|js|mjs|cjs)$/i, '');
        if (!clean || clean.includes('(') || clean.includes('{') || clean.includes(';') || clean.includes('=')) {
            return false;
        }
        if (clean.includes('/')) {
            const [catPart, namePart] = clean.split('/');
            const normalizedCat = normalizeCategory(catPart);
            const normalizedName = sanitizeIdentifier(namePart || '');
            if (normalizedCat && normalizedName) {
                hintCategory = normalizedCat;
                hintName = normalizedName;
                return true;
            }
        }
        if (/^[a-zA-Z][a-zA-Z0-9_-]{1,30}$/.test(clean) && !['import', 'export', 'const', 'let', 'var', 'async', 'function'].includes(clean)) {
            const asCat = normalizeCategory(clean);
            if (asCat && !hintCategory) {
                hintCategory = asCat;
                return true;
            }
            hintName = sanitizeIdentifier(clean);
            return true;
        }
        return false;
    };

    if (documentBuffer && documentBuffer.length > 0) {
        code = documentBuffer.toString('utf-8');
        if (documentFileName) {
            const base = path.basename(documentFileName, path.extname(documentFileName));
            const cleanBase = sanitizeIdentifier(base);
            if (cleanBase && cleanBase !== 'index' && cleanBase !== 'scrape') {
                hintName = cleanBase;
            }
        }
        const tokens = commandText.trim().split(/\s+/).filter(Boolean);
        for (const tok of tokens.slice(0, 2)) {
            parseHintToken(tok);
        }
        return { hintName, hintCategory, code: stripMarkdownCodeBlock(code) };
    }

    if (quotedText && quotedText.trim().length > 20) {
        code = stripMarkdownCodeBlock(quotedText);
        const tokens = commandText.trim().split(/\s+/).filter(Boolean);
        for (const tok of tokens.slice(0, 2)) {
            parseHintToken(tok);
        }
        return { hintName, hintCategory, code };
    }

    const trimmed = commandText.trim();
    if (!trimmed) {
        return { code: '' };
    }

    const firstLineEnd = trimmed.indexOf('\n');
    const firstWordMatch = trimmed.match(/^([^\s]+)\s+([\s\S]+)$/);

    if (firstWordMatch) {
        const firstToken = firstWordMatch[1];
        const rest = firstWordMatch[2].trim();
        const isFirstTokenCodeKeyword = /^(import|export|const|let|var|async|function|class|\/\*|\/\/|```)$/i.test(firstToken);

        if (!isFirstTokenCodeKeyword && parseHintToken(firstToken)) {
            // Check if second token is also a hint (e.g. ".scrape downloader tiktok <code...>")
            const secondWordMatch = rest.match(/^([^\s]+)\s+([\s\S]+)$/);
            if (secondWordMatch) {
                const secondToken = secondWordMatch[1];
                const isSecondCodeKeyword = /^(import|export|const|let|var|async|function|class|\/\*|\/\/|```)$/i.test(secondToken);
                if (!isSecondCodeKeyword && !hintName && parseHintToken(secondToken)) {
                    return { hintName, hintCategory, code: stripMarkdownCodeBlock(secondWordMatch[2]) };
                }
            }
            return { hintName, hintCategory, code: stripMarkdownCodeBlock(rest) };
        }
    }

    if (firstLineEnd !== -1) {
        const firstLine = trimmed.slice(0, firstLineEnd).trim();
        if (firstLine.split(/\s+/).length <= 2 && parseHintToken(firstLine)) {
            return { hintName, hintCategory, code: stripMarkdownCodeBlock(trimmed.slice(firstLineEnd + 1)) };
        }
    }

    return {
        hintName,
        hintCategory,
        code: stripMarkdownCodeBlock(trimmed)
    };
}

function normalizeCategory(input?: string): ScrapeCategory | undefined {
    if (!input) return undefined;
    const low = input.toLowerCase().trim();
    if (['downloader', 'download', 'dl', 'unduh'].includes(low)) return 'downloader';
    if (['search', 'cari', 'pencarian', 'internet'].includes(low)) return 'search';
    if (['ai', 'artificial', 'chat', 'openai', 'gpt'].includes(low)) return 'ai';
    if (['tools', 'tool', 'utility', 'util', 'stalk', 'stalker'].includes(low)) return 'tools';
    if (['maker', 'canvas', 'image', 'sticker'].includes(low)) return 'maker';
    if (['islamic', 'islam', 'quran', 'doa'].includes(low)) return 'islamic';
    if (['anime', 'wibu', 'manga', 'otaku'].includes(low)) return 'anime';
    return undefined;
}

function sanitizeIdentifier(raw: string): string {
    const cleaned = raw
        .replace(/[^a-zA-Z0-9_$]/g, '')
        .replace(/^[0-9]+/, '');
    return cleaned.toLowerCase();
}

/**
 * Analyzes a scraper code string to determine its main function, parameters, category, and command aliases.
 */
export function analyzeScrapeCode(
    rawCode: string,
    hintName?: string,
    hintCategory?: ScrapeCategory
): ScrapeAnalysis {
    const code = stripMarkdownCodeBlock(rawCode);

    const discoveredFunctions: Array<{ name: string; params: string[]; isExported: boolean; isAsync: boolean }> = [];

    const addCandidate = (name: string, rawParams: string, isExported: boolean, isAsync: boolean) => {
        const cleanName = name.trim();
        if (!cleanName || RESERVED_IDENTIFIERS.has(cleanName)) return;
        const params = rawParams
            .split(',')
            .map((p) => p.trim().split(/[=:]/)[0].replace(/[{}\[\]\s.]/g, '').trim())
            .filter(Boolean);
        const existing = discoveredFunctions.find((f) => f.name === cleanName);
        if (existing) {
            if (isExported) existing.isExported = true;
            if (isAsync) existing.isAsync = true;
            if (params.length > existing.params.length) existing.params = params;
        } else {
            discoveredFunctions.push({ name: cleanName, params, isExported, isAsync });
        }
    };

    // 1. Standard function declarations: [export] [default] [async] function name(params)
    const fnRegex = /(?:(export)\s+(?:default\s+)?)?(async\s+)?function\s+([a-zA-Z_$][\w$]*)\s*\(([^)]*)\)/g;
    for (const match of code.matchAll(fnRegex)) {
        addCandidate(match[3], match[4] || '', Boolean(match[1]), Boolean(match[2]));
    }

    // 2. Arrow / expression functions: [export] const/let/var name = [async] (params) =>
    const arrowRegex = /(?:(export)\s+)?(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*(?::[^=]+)?=\s*(async\s+)?(?:\(([^)]*)\)|([a-zA-Z_$][\w$]*))\s*(?::[^=]+)?=>/g;
    for (const match of code.matchAll(arrowRegex)) {
        addCandidate(match[2], match[4] ?? match[5] ?? '', Boolean(match[1]), Boolean(match[3]));
    }

    // 3. Function expressions: [export] const/let/var name = [async] function(params)
    const fnExprRegex = /(?:(export)\s+)?(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=\s*(async\s+)?function\s*\(([^)]*)\)/g;
    for (const match of code.matchAll(fnExprRegex)) {
        addCandidate(match[2], match[4] || '', Boolean(match[1]), Boolean(match[3]));
    }

    // 4. Check explicit exports: module.exports = { a, b } or module.exports = name or export default name or export { a, b }
    const explicitlyExportedNames = new Set<string>();

    const cjsObjMatch = code.match(/module\.exports\s*=\s*\{([^}]+)\}/);
    if (cjsObjMatch) {
        const items = cjsObjMatch[1].split(',').map((s) => s.trim().split(':')[0].trim());
        for (const item of items) {
            if (/^[a-zA-Z_$][\w$]*$/.test(item)) explicitlyExportedNames.add(item);
        }
    }

    const cjsSingleMatch = code.match(/module\.exports\s*=\s*([a-zA-Z_$][\w$]*)/);
    if (cjsSingleMatch && cjsSingleMatch[1] !== 'class' && cjsSingleMatch[1] !== 'function' && cjsSingleMatch[1] !== 'async') {
        explicitlyExportedNames.add(cjsSingleMatch[1]);
    }

    for (const match of code.matchAll(/exports\.([a-zA-Z_$][\w$]*)\s*=/g)) {
        explicitlyExportedNames.add(match[1]);
    }

    const esmDefaultMatch = code.match(/export\s+default\s+([a-zA-Z_$][\w$]*)/);
    if (esmDefaultMatch && !['function', 'async', 'class'].includes(esmDefaultMatch[1])) {
        explicitlyExportedNames.add(esmDefaultMatch[1]);
    }

    const esmNamedMatch = code.match(/export\s*\{([^}]+)\}/);
    if (esmNamedMatch) {
        const items = esmNamedMatch[1].split(',').map((s) => s.trim().split(/\s+as\s+/i)[0].trim());
        for (const item of items) {
            if (/^[a-zA-Z_$][\w$]*$/.test(item)) explicitlyExportedNames.add(item);
        }
    }

    for (const fn of discoveredFunctions) {
        if (explicitlyExportedNames.has(fn.name)) {
            fn.isExported = true;
        }
    }

    // Filter out internal helper functions if there are other candidates
    const nonHelperFunctions = discoveredFunctions.filter(
        (f) => !HELPER_FUNC_NAMES.has(f.name.toLowerCase())
    );
    const pool = nonHelperFunctions.length > 0 ? nonHelperFunctions : discoveredFunctions;

    // Pick the primary function:
    // Priority: exported + async -> exported -> async -> last declared function
    const exportedAsync = pool.filter((f) => f.isExported && f.isAsync);
    const exportedAny = pool.filter((f) => f.isExported);
    const asyncAny = pool.filter((f) => f.isAsync);

    const chosen =
        exportedAsync[0] ||
        exportedAny[0] ||
        asyncAny[asyncAny.length - 1] ||
        pool[pool.length - 1] || {
            name: hintName ? `${hintName}Scrape` : 'runScrape',
            params: ['input'],
            isExported: true,
            isAsync: true
        };

    const mainFunctionName = chosen.name;
    const exportedFunctions = Array.from(
        new Set([
            ...pool.filter((f) => f.isExported).map((f) => f.name),
            mainFunctionName
        ])
    );

    // Derive clean scrapeName
    let derivedName = hintName || mainFunctionName;
    derivedName = derivedName
        .replace(/^(scrape|fetch|get|download|search|stalk|create|make|generate|ai|chat)(?=[A-Z])/g, '')
        .replace(/(Scrape|Scraper|Download|Downloader|Search|Stalk|Api|Engine|Handler)$/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

    if (!derivedName || derivedName.length < 2) {
        derivedName = sanitizeIdentifier(hintName || mainFunctionName) || `scrape${Date.now().toString().slice(-4)}`;
    }

    // Determine input mode (URL vs Query vs Optional)
    const paramJoined = chosen.params.join(' ').toLowerCase();
    const codeLower = code.toLowerCase();

    let inputMode: ScrapeInputMode = 'query';
    if (chosen.params.length === 0) {
        inputMode = 'optional_query';
    } else if (
        /\b(url|link|uri|video_url|posturl|targeturl)\b/.test(paramJoined) ||
        /valid\s+url|masukkan\s+url|input\s+url|https?:\\\/\\\//i.test(code)
    ) {
        inputMode = 'url';
    }

    // Determine category
    let category: ScrapeCategory = hintCategory || 'tools';
    if (!hintCategory) {
        if (
            inputMode === 'url' &&
            /(download|dl|mp4|mp3|video|audio|tiktok|instagram|igdl|facebook|fbdl|youtube|ytdl|capcut|mediafire|sfile|terabox|spotify|soundcloud|pinterestdl|twitter|xdl|threads|douyin|snackvideo)/i.test(
                `${mainFunctionName} ${derivedName} ${codeLower}`
            )
        ) {
            category = 'downloader';
        } else if (
            /(chat|gpt|deepseek|claude|gemini|llama|mistral|qwen|openai|ai|llm|prompt|assistant|reasoning)/i.test(
                `${mainFunctionName} ${derivedName}`
            )
        ) {
            category = 'ai';
        } else if (
            /(search|cari|find|lirik|lyrics|chord|pinterest|wallpaper|film|movie|anime|manga|komik|resep|berita|news|wiki|kbbi|jadwal|cuaca)/i.test(
                `${mainFunctionName} ${derivedName}`
            )
        ) {
            category = 'search';
        } else if (/(quran|surah|ayat|hadits|doa|sholat|islami)/i.test(`${mainFunctionName} ${derivedName}`)) {
            category = 'islamic';
        } else if (/(maker|canvas|brat|qc|meme|logo|ephoto|textpro)/i.test(`${mainFunctionName} ${derivedName}`)) {
            category = 'maker';
        } else if (inputMode === 'url') {
            category = 'downloader';
        }
    }

    // Build command aliases
    const commandsSet = new Set<string>();
    commandsSet.add(derivedName);
    const cleanMain = sanitizeIdentifier(mainFunctionName);
    if (cleanMain && cleanMain !== derivedName && cleanMain.length <= 18) {
        commandsSet.add(cleanMain);
    }
    if (category === 'downloader' && !derivedName.endsWith('dl')) {
        commandsSet.add(`${derivedName}dl`);
    } else if (category === 'search' && !derivedName.endsWith('search')) {
        commandsSet.add(`${derivedName}search`);
    }

    const commands = Array.from(commandsSet).slice(0, 4);

    const categoryLabel: Record<ScrapeCategory, string> = {
        downloader: `Mengunduh media dari ${derivedName.toUpperCase()}`,
        search: `Mencari informasi atau konten di ${derivedName.toUpperCase()}`,
        ai: `Berinteraksi dengan kecerdasan buatan ${derivedName.toUpperCase()}`,
        tools: `Fitur utilitas ${derivedName.toUpperCase()}`,
        maker: `Membuat kreasi media ${derivedName.toUpperCase()}`,
        islamic: `Fitur Islami ${derivedName.toUpperCase()}`,
        anime: `Fitur Anime & Manga ${derivedName.toUpperCase()}`
    };

    return {
        scrapeName: derivedName,
        mainFunctionName,
        exportedFunctions,
        category,
        inputMode,
        commands,
        description: `${categoryLabel[category]} (No APIKey Scraper)`,
        paramNames: chosen.params.length > 0 ? chosen.params : ['input']
    };
}

/**
 * Converts CommonJS or raw JS/TS scraper code into a valid ESM TypeScript module ready for `scrape/<name>.ts`.
 */
export function normalizeScrapeToTypeScript(rawCode: string, analysis: ScrapeAnalysis): string {
    let code = stripMarkdownCodeBlock(rawCode);

    // 1. Normalize cheerio default imports to namespace imports for cheerio@1.x ESM compatibility
    code = code.replace(
        /import\s+cheerio\s+from\s+['"]cheerio['"]\s*;?/g,
        "import * as cheerio from 'cheerio';"
    );
    code = code.replace(
        /(?:const|let|var)\s+cheerio\s*=\s*require\s*\(\s*['"]cheerio['"]\s*\)\s*;?/g,
        "import * as cheerio from 'cheerio';"
    );

    // 2. Convert CommonJS destructured require: const { a, b: c } = require('pkg')
    code = code.replace(
        /(?:const|let|var)\s+\{([^}]+)\}\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)\s*;?/g,
        (_m, importsRaw: string, pkg: string) => {
            const fixedImports = importsRaw
                .split(',')
                .map((part) => {
                    const [left, right] = part.split(':').map((s) => s.trim());
                    return right ? `${left} as ${right}` : left;
                })
                .filter(Boolean)
                .join(', ');
            return `import { ${fixedImports} } from '${pkg}';`;
        }
    );

    // 3. Convert CommonJS default require: const x = require('pkg')
    code = code.replace(
        /(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)\s*;?/g,
        (_m, varName: string, pkg: string) => {
            if (pkg === 'cheerio') {
                return `import * as ${varName} from 'cheerio';`;
            }
            return `import ${varName} from '${pkg}';`;
        }
    );

    // 4. Convert CommonJS exports
    const exportedNames = new Set<string>(analysis.exportedFunctions);
    code = code.replace(/module\.exports\s*=\s*\{([^}]+)\}\s*;?/g, (_m, body: string) => {
        const names = body
            .split(',')
            .map((s) => s.trim().split(':')[0].trim())
            .filter((s) => /^[a-zA-Z_$][\w$]*$/.test(s));
        names.forEach((n) => exportedNames.add(n));
        return '';
    });

    code = code.replace(
        /module\.exports\s*=\s*([a-zA-Z_$][\w$]*)\s*;?/g,
        (_m, name: string) => {
            if (!['async', 'function', 'class'].includes(name)) {
                exportedNames.add(name);
                return '';
            }
            return _m;
        }
    );

    code = code.replace(
        /module\.exports\s*=\s*(async\s+function|function)/g,
        `export $1 ${analysis.mainFunctionName}`
    );

    code = code.replace(
        /exports\.([a-zA-Z_$][\w$]*)\s*=\s*/g,
        (_m, name: string) => {
            exportedNames.add(name);
            return `export const ${name} = `;
        }
    );

    // 5. Remove or comment out top-level test invocations at the bottom of the file
    // e.g. `(async () => { ... })()` or `mainFunc('...').then(console.log)`
    code = code.replace(
        /\n\s*\(\s*async\s*\(\s*\)\s*=>\s*\{[\s\S]*?\}\s*\)\s*\(\s*\)\s*;?\s*$/,
        '\n'
    );
    const escapedMain = analysis.mainFunctionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const testCallRegex = new RegExp(
        `(^|\\n)\\s*(?:await\\s+|console\\.log\\s*\\(\\s*await\\s+)?${escapedMain}\\s*\\([^)]*\\)\\s*(?:\\.then\\([\\s\\S]*?\\))?(?:\\.catch\\([\\s\\S]*?\\))?\\s*;?\\s*$`,
        'm'
    );
    code = code.replace(testCallRegex, '\n');

    // 6. Ensure main function & discovered exports are exported in ESM
    const hasExportMain = new RegExp(
        `export\\s+(?:default\\s+)?(?:async\\s+)?(?:function|const|let|var)\\s+${escapedMain}\\b|export\\s*\\{[^}]*\\b${escapedMain}\\b[^}]*\\}`
    ).test(code);

    if (!hasExportMain) {
        const funcDefRegex = new RegExp(
            `(^|\\n)(\\s*)(async\\s+function\\s+${escapedMain}\\b|function\\s+${escapedMain}\\b|(?:const|let|var)\\s+${escapedMain}\\s*=)`
        );
        if (funcDefRegex.test(code)) {
            code = code.replace(funcDefRegex, `$1$2export $3`);
        } else if (!/export\s+default\b/.test(code)) {
            // If it's an anonymous function or class expression, wrap or append export
            code += `\n\nexport { ${analysis.mainFunctionName} };\n`;
        }
    }

    if (!/export\s+default\b/.test(code)) {
        code += `\n\nexport default ${analysis.mainFunctionName};\n`;
    }

    // 7. Prepend // @ts-nocheck so strict tsc builds never fail on untyped pasted JS scrapers
    if (!code.startsWith('// @ts-nocheck')) {
        code = `// @ts-nocheck\n/**\n * Scraper: ${analysis.scrapeName}\n * Bot: Enami Asa Ai\n * Owner: Ranzz Suaminya Asa\n */\n${code.trim()}\n`;
    }

    return code;
}

/**
 * Validates that a TypeScript file has valid structure and can be transpiled cleanly.
 */
export function validateTypeScriptSyntax(code: string): { valid: boolean; error?: string } {
    try {
        const stripFn = (nodeModule as any).stripTypeScriptTypes;
        if (typeof stripFn === 'function') {
            stripFn(code, { mode: 'strip' });
        } else {
            transpileToJs(code);
        }
        return { valid: true };
    } catch (err: any) {
        return { valid: false, error: err.message };
    }
}

/**
 * Transpiles TypeScript source code into ES2022 JavaScript for `dist/`.
 */
export function transpileToJs(tsCode: string): string {
    const stripFn = (nodeModule as any).stripTypeScriptTypes;
    if (typeof stripFn === 'function') {
        try {
            return stripFn(tsCode, { mode: 'strip' });
        } catch {
            // Fallback to regex stripper below
        }
    }

    return tsCode
        .replace(/^\s*import\s+type\s+[^;]+;\s*$/gm, '')
        .replace(/,\s*type\s+[A-Za-z0-9_$]+/g, '')
        .replace(/type\s+[A-Za-z0-9_$]+\s*,/g, '')
        .replace(/^\s*(?:export\s+)?interface\s+[A-Za-z0-9_$]+\s*\{[\s\S]*?^\}/gm, '')
        .replace(/^\s*(?:export\s+)?type\s+[A-Za-z0-9_$]+\s*=[^;]+;/gm, '')
        .replace(/:\s*Plugin\s*=/g, ' =')
        .replace(/\(context:\s*PluginContext\):\s*Promise<void>/g, '(context)')
        .replace(/\(([^)]*?):\s*(?:string|number|boolean|any|unknown|Buffer|Record<[^>]+>)\)/g, '($1)')
        .replace(/\s+as\s+(?:any|unknown|string|number|boolean|const)\b/g, '');
}

/**
 * Uses No-APIKey AI scrapers (DeepAI -> DeepSeek -> NoTrack -> ChatGPT) to generate a custom plugin,
 * with automatic validation and fallback to the smart universal plugin template.
 */
export async function generatePluginFromScrape(
    scrapeTsCode: string,
    analysis: ScrapeAnalysis
): Promise<{ pluginCode: string; generatorUsed: string }> {
    const aiPrompt = buildAiPluginPrompt(scrapeTsCode, analysis);

    const aiProviders: Array<{ name: string; run: () => Promise<string> }> = [
        {
            name: 'DeepChat Claude Opus 4.7 (No APIKey)',
            run: async () => {
                const res = await deepChat(aiPrompt, {
                    providerId: 'claude',
                    modelId: 'claude-opus-4-7',
                    writeCode: true
                });
                if (!res.reply) throw new Error('Empty DeepChat Claude response');
                return res.reply;
            }
        },
        {
            name: 'DeepChat GPT-4.1 (No APIKey)',
            run: async () => {
                const res = await deepChat(aiPrompt, {
                    providerId: 'chatgpt',
                    modelId: 'gpt-4.1',
                    writeCode: true
                });
                if (!res.reply) throw new Error('Empty DeepChat GPT-4.1 response');
                return res.reply;
            }
        },
        {
            name: 'DeepAI Engine (No APIKey)',
            run: async () => {
                return await deepaiChat([
                    {
                        role: 'system',
                        content:
                            'You are an expert TypeScript WhatsApp Bot developer for "Enami Asa Ai" (Owner: "Ranzz Suaminya Asa"). Output ONLY valid TypeScript code inside a single ```typescript code block without any explanation.'
                    },
                    { role: 'user', content: aiPrompt }
                ]);
            }
        },
        {
            name: 'DeepSeek AI (No APIKey)',
            run: async () => {
                const res = await DeepSeekThinking(aiPrompt);
                if (!res.success || !res.answer) throw new Error(res.error || 'Empty DeepSeek response');
                return res.answer;
            }
        },
        {
            name: 'NoTrack AI (No APIKey)',
            run: async () => {
                const res = await notrackChat({ prompt: aiPrompt });
                return res.result;
            }
        },
        {
            name: 'ChatGPT Anonymous (No APIKey)',
            run: async () => {
                const res = await chatgpt(aiPrompt);
                if (!res.ok || !res.answer) throw new Error('Empty ChatGPT response');
                return res.answer;
            }
        }
    ];

    for (const provider of aiProviders) {
        try {
            const rawReply = await provider.run();
            const extracted = sanitizeAiPluginOutput(rawReply, analysis);
            if (extracted) {
                return {
                    pluginCode: extracted,
                    generatorUsed: provider.name
                };
            }
        } catch {
            // Try next free AI scraper
        }
    }

    return {
        pluginCode: buildSmartPluginTemplate(analysis),
        generatorUsed: 'Enami Asa Smart AST Engine (No APIKey)'
    };
}

function buildAiPluginPrompt(scrapeTsCode: string, analysis: ScrapeAnalysis): string {
    const truncatedScrape =
        scrapeTsCode.length > 4500 ? scrapeTsCode.slice(0, 4500) + '\n// ... [truncated]' : scrapeTsCode;

    return `Buatkan kode file plugin TypeScript untuk bot WhatsApp "Enami Asa Ai" (Owner: "Ranzz Suaminya Asa") yang memanggil scraper berikut.

INFORMASI SCRAPER:
- Lokasi file scraper: \`../../../scrape/${analysis.scrapeName}.js\`
- Nama fungsi utama yang di-export: \`${analysis.mainFunctionName}\`
- Daftar command plugin: ${JSON.stringify(analysis.commands)}
- Kategori plugin: \`${analysis.category}\`
- Tipe input: \`${analysis.inputMode}\` (${analysis.inputMode === 'url' ? 'membutuhkan input URL http/https' : 'membutuhkan teks/query pencarian'})

ATURAN WAJIB STRUKTUR PLUGIN:
1. Awali file dengan \`// @ts-nocheck\`
2. Gunakan import berikut:
   \`import type { Plugin, PluginContext } from '../../../types/plugin.js';\`
   \`import ${analysis.mainFunctionName}, { ${analysis.mainFunctionName} as named_${analysis.mainFunctionName} } from '../../../scrape/${analysis.scrapeName}.js';\`
3. JANGAN PERNAH menggunakan APIKey, global.API, atau modul eksternal di luar scraper tersebut.
4. Struktur handler WAJIB:
\`\`\`ts
const handler: Plugin = {
    command: ${JSON.stringify(analysis.commands)},
    category: '${analysis.category}',
    description: ${JSON.stringify(analysis.description)},
    execute: async (context: PluginContext): Promise<void> => {
        // Ambil input dari context.text atau pesan yang di-reply (quotedMessage)
        // Tampilkan pesan bantuan jika input kosong
        // Kirim pesan tunggu: await context.reply(global.mess?.wait || '⏳ Sedang memproses...');
        // Panggil fungsi scraper
        // Jika hasil scraper memiliki URL video/audio/gambar atau Buffer, kirim media menggunakan context.client.sendMessage(context.chatJid, { video/image/audio, caption }, { quoted: context.raw })
        // Jika hasil berupa teks/objek/array, format menjadi pesan WhatsApp yang rapi dengan footer "_Enami Asa Ai • ${analysis.scrapeName.toUpperCase()}_"
    }
};
export default handler;
\`\`\`

KODE SCRAPER (\`scrape/${analysis.scrapeName}.ts\`):
\`\`\`ts
${truncatedScrape}
\`\`\`

Keluarkan HANYA kode TypeScript utuh di dalam blok \`\`\`typescript ... \`\`\` tanpa penjelasan tambahan.`;
}

function sanitizeAiPluginOutput(rawAiText: string, analysis: ScrapeAnalysis): string | null {
    if (!rawAiText || rawAiText.trim().length < 100) {
        return null;
    }

    let code = stripMarkdownCodeBlock(rawAiText);

    // Ensure it imports from the right relative path
    code = code.replace(
        /from\s+['"](?:\.\.\/)+scrape\/[^'"]+['"]/g,
        `from '../../../scrape/${analysis.scrapeName}.js'`
    );
    code = code.replace(
        /from\s+['"](?:\.\.\/)+types\/plugin(?:\.js|\.ts)?['"]/g,
        `from '../../../types/plugin.js'`
    );

    const hasHandler =
        /export\s+default\b/.test(code) &&
        /command\s*:/.test(code) &&
        /execute\s*:/.test(code) &&
        code.includes(`../../../scrape/${analysis.scrapeName}.js`);

    if (!hasHandler) {
        return null;
    }

    // Disallow any accidental APIKey references
    if (/global\.API|APIKeys/i.test(code)) {
        return null;
    }

    if (!code.startsWith('// @ts-nocheck')) {
        code = `// @ts-nocheck\n${code}`;
    }

    const syntaxCheck = validateTypeScriptSyntax(code);
    if (!syntaxCheck.valid) {
        return null;
    }

    return code;
}

/**
 * Generates a universal, self-adapting plugin for `src/plugins/<category>/<name>.ts`
 * that inspects the scraper's return value at runtime (automatically sending video/image/audio buffers or URLs,
 * or formatting JSON/arrays/strings into clean WhatsApp messages).
 */
export function buildSmartPluginTemplate(analysis: ScrapeAnalysis): string {
    const titleUpper = analysis.scrapeName.toUpperCase();
    const isUrlMode = analysis.inputMode === 'url';
    const isOptionalMode = analysis.inputMode === 'optional_query';

    return `// @ts-nocheck
import type { Plugin, PluginContext } from '../../../types/plugin.js';
import * as scrapeModule from '../../../scrape/${analysis.scrapeName}.js';

function resolveScraperFn(): (...args: any[]) => Promise<any> {
    const mod = scrapeModule as any;
    if (typeof mod.${analysis.mainFunctionName} === 'function') {
        return mod.${analysis.mainFunctionName};
    }
    if (typeof mod.default === 'function') {
        return mod.default;
    }
    if (mod.default && typeof mod.default.${analysis.mainFunctionName} === 'function') {
        return mod.default.${analysis.mainFunctionName}.bind(mod.default);
    }
    for (const key of Object.keys(mod)) {
        if (typeof mod[key] === 'function') {
            return mod[key];
        }
    }
    throw new Error('Fungsi scraper tidak ditemukan di dalam modul scrape/${analysis.scrapeName}.ts');
}

function formatKeyValue(obj: Record<string, any>, depth = 0): string {
    const indent = '  '.repeat(depth);
    const lines: string[] = [];
    for (const [key, val] of Object.entries(obj)) {
        if (val === undefined || val === null || val === '') continue;
        if (typeof val === 'function' || Buffer.isBuffer(val)) continue;
        const label = key.replace(/_/g, ' ').replace(/\\b\\w/g, (c) => c.toUpperCase());
        if (Array.isArray(val)) {
            if (val.length === 0) continue;
            if (val.every((item) => typeof item === 'string' || typeof item === 'number')) {
                lines.push(\`\${indent}• *\${label}:* \${val.slice(0, 10).join(', ')}\`);
            } else {
                lines.push(\`\${indent}• *\${label}:*\`);
                val.slice(0, 8).forEach((item, idx) => {
                    if (typeof item === 'object' && item !== null) {
                        lines.push(\`\${indent}  *\${idx + 1}.* \${formatKeyValue(item, depth + 2).trim()}\`);
                    } else {
                        lines.push(\`\${indent}  *\${idx + 1}.* \${String(item)}\`);
                    }
                });
            }
        } else if (typeof val === 'object') {
            const nested = formatKeyValue(val, depth + 1);
            if (nested.trim()) {
                lines.push(\`\${indent}• *\${label}:*\\n\${nested}\`);
            }
        } else {
            const strVal = String(val);
            if (strVal.length <= 1500) {
                lines.push(\`\${indent}• *\${label}:* \${strVal}\`);
            }
        }
    }
    return lines.join('\\n');
}

function detectMediaTargets(data: any): {
    video?: string | Buffer;
    image?: string | Buffer;
    audio?: string | Buffer;
} {
    if (!data) return {};
    if (Buffer.isBuffer(data)) {
        return { image: data };
    }
    if (typeof data !== 'object') return {};

    const root = data.data && typeof data.data === 'object' && !Buffer.isBuffer(data.data) ? data.data : data;
    const result = root.result && typeof root.result === 'object' && !Buffer.isBuffer(root.result) ? root.result : root;

    if (Buffer.isBuffer(result.buffer)) {
        return { image: result.buffer };
    }

    const pickUrl = (candidates: any[]): string | undefined => {
        for (const c of candidates) {
            if (typeof c === 'string' && /^https?:\\/\\//i.test(c.trim())) {
                return c.trim();
            }
        }
        return undefined;
    };

    const video = pickUrl([
        result.video,
        result.videoUrl,
        result.video_url,
        result.mp4,
        result.noWatermark,
        result.nowm,
        result.hd,
        result.sd,
        result.play,
        result.download_url,
        result.downloadUrl,
        result.media?.video?.noWatermark,
        result.media?.video?.downloadUrl,
        Array.isArray(result.medias) ? result.medias.find((m: any) => m?.type === 'video')?.download_url || result.medias.find((m: any) => m?.type === 'video')?.url : undefined
    ]);

    const audio = pickUrl([
        result.audio,
        result.audioUrl,
        result.audio_url,
        result.mp3,
        result.music?.playUrl,
        result.music
    ]);

    const image = !video
        ? pickUrl([
              result.image,
              result.imageUrl,
              result.image_url,
              result.img,
              result.thumb,
              result.thumbnail,
              Array.isArray(result.images) ? result.images[0] : undefined,
              Array.isArray(result.medias) ? result.medias.find((m: any) => m?.type === 'image')?.download_url || result.medias.find((m: any) => m?.type === 'image')?.url : undefined
          ])
        : undefined;

    return { video, image, audio };
}

const handler: Plugin = {
    command: ${JSON.stringify(analysis.commands)},
    category: '${analysis.category}',
    description: ${JSON.stringify(analysis.description)},
    execute: async (context: PluginContext): Promise<void> => {
        let input = context.text.trim();

        if (!input) {
            const quotedText =
                context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
                context.event.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text ||
                '';
            if (quotedText) {
                input = quotedText.trim();
            }
        }

        ${
            isOptionalMode
                ? ''
                : isUrlMode
                  ? `const urlMatch = input.match(/https?:\\/\\/[^\\s]+/i);
        if (!urlMatch) {
            await context.reply(
                \`🔗 *${titleUpper}*\\n\\n\` +
                \`⚙️ *Cara Penggunaan:*\\n\` +
                \`› *\${context.usedPrefix || '.'}\${context.command} <url>*\\n\` +
                \`› Atau reply pesan berisi link dengan *\${context.usedPrefix || '.'}\${context.command}*\`
            );
            return;
        }
        const targetInput = urlMatch[0];`
                  : `if (!input) {
            await context.reply(
                \`✨ *${titleUpper}*\\n\\n\` +
                \`⚙️ *Cara Penggunaan:*\\n\` +
                \`› *\${context.usedPrefix || '.'}\${context.command} <${analysis.paramNames[0] || 'query'}>*\\n\` +
                \`› Atau reply pesan dengan *\${context.usedPrefix || '.'}\${context.command}*\`
            );
            return;
        }
        const targetInput = input;`
        }

        await context.reply(global.mess?.wait || '⏳ Sedang memproses permintaan Anda...');

        try {
            const scraperFn = resolveScraperFn();
            const output = await scraperFn(${isOptionalMode ? 'input || undefined' : 'targetInput'});

            if (output === null || output === undefined || output === false) {
                await context.reply('❌ Tidak ada data yang ditemukan dari hasil scrape.');
                return;
            }

            if (typeof output === 'object' && output.status === false && output.error) {
                await context.reply(\`❌ Gagal: \${output.error}\`);
                return;
            }

            if (typeof output === 'string') {
                await context.reply(
                    \`✨ *${titleUpper}*\\n\\n\${output.trim()}\\n\\n_\${context.config.botName} • ${titleUpper}_\`
                );
                return;
            }

            const media = detectMediaTargets(output);
            const summaryText =
                typeof output === 'object' && !Buffer.isBuffer(output)
                    ? formatKeyValue(output)
                    : '';
            const caption =
                \`✨ *${titleUpper}*\\n\\n\` +
                (summaryText ? \`\${summaryText}\\n\\n\` : '') +
                \`_\${context.config.botName} • ${titleUpper}_\`;

            if (media.video) {
                await context.client.sendMessage(
                    context.chatJid,
                    {
                        video: Buffer.isBuffer(media.video) ? media.video : { url: media.video },
                        caption: caption.slice(0, 1024)
                    },
                    { quoted: context.raw }
                );
                if (media.audio && typeof media.audio === 'string') {
                    try {
                        await context.client.sendMessage(
                            context.chatJid,
                            { audio: { url: media.audio }, mimetype: 'audio/mpeg', ptt: false },
                            { quoted: context.raw }
                        );
                    } catch {}
                }
                return;
            }

            if (media.image) {
                await context.client.sendMessage(
                    context.chatJid,
                    {
                        image: Buffer.isBuffer(media.image) ? media.image : { url: media.image },
                        caption: caption.slice(0, 1024)
                    },
                    { quoted: context.raw }
                );
                return;
            }

            if (media.audio) {
                await context.client.sendMessage(
                    context.chatJid,
                    {
                        audio: Buffer.isBuffer(media.audio) ? media.audio : { url: media.audio },
                        mimetype: 'audio/mpeg',
                        ptt: false
                    },
                    { quoted: context.raw }
                );
                if (summaryText) {
                    await context.reply(caption);
                }
                return;
            }

            if (Array.isArray(output)) {
                if (output.length === 0) {
                    await context.reply('❌ Hasil pencarian kosong.');
                    return;
                }
                const listText = output
                    .slice(0, 15)
                    .map((item, idx) => {
                        if (typeof item === 'object' && item !== null) {
                            return \`*\${idx + 1}.*\\n\${formatKeyValue(item, 1)}\`;
                        }
                        return \`*\${idx + 1}.* \${String(item)}\`;
                    })
                    .join('\\n\\n');

                await context.reply(
                    \`✨ *${titleUpper}*\\n\\n\${listText}\\n\\n_\${context.config.botName} • ${titleUpper}_\`
                );
                return;
            }

            await context.reply(
                caption.trim() || \`\`\`\`json\\n\${JSON.stringify(output, null, 2).slice(0, 3500)}\\n\`\`\`\`
            );
        } catch (err: any) {
            await context.reply(\`❌ Terjadi kesalahan pada fitur *${titleUpper}*: \${err.message || err}\`);
        }
    }
};

export default handler;
`;
}

/**
 * Full pipeline: analyzes raw scraper code, converts it to ESM TypeScript in `scrape/<name>.ts`,
 * generates the matching plugin in `src/plugins/<category>/<name>.ts`, transpiles to `dist/` if present,
 * and hot-registers the plugin in the live `PluginRegistry`.
 */
export async function deployScrapeAndPlugin(
    rawCode: string,
    options: {
        hintName?: string;
        hintCategory?: ScrapeCategory;
        registry?: PluginRegistryLike;
    } = {}
): Promise<DeployScrapeResult> {
    const analysis = analyzeScrapeCode(rawCode, options.hintName, options.hintCategory);
    const scrapeCode = normalizeScrapeToTypeScript(rawCode, analysis);

    const { pluginCode, generatorUsed } = await generatePluginFromScrape(scrapeCode, analysis);

    const scrapeRelPath = `scrape/${analysis.scrapeName}.ts`;
    const pluginRelPath = `src/plugins/${analysis.category}/${analysis.scrapeName}.ts`;

    const scrapeAbsPath = path.resolve(scrapeRelPath);
    const pluginAbsPath = path.resolve(pluginRelPath);

    const isUpdate = fs.existsSync(scrapeAbsPath) || fs.existsSync(pluginAbsPath);

    fs.mkdirSync(path.dirname(scrapeAbsPath), { recursive: true });
    fs.mkdirSync(path.dirname(pluginAbsPath), { recursive: true });

    fs.writeFileSync(scrapeAbsPath, scrapeCode, 'utf-8');
    fs.writeFileSync(pluginAbsPath, pluginCode, 'utf-8');

    // Also sync transpiled .js into dist/ if dist/ exists (for production `node index.js` runtime)
    let runtimePluginPath = pluginAbsPath;
    const distRoot = path.resolve('dist');
    if (fs.existsSync(distRoot)) {
        try {
            const distScrapePath = path.resolve(distRoot, 'scrape', `${analysis.scrapeName}.js`);
            const distPluginPath = path.resolve(distRoot, 'src', 'plugins', analysis.category, `${analysis.scrapeName}.js`);

            fs.mkdirSync(path.dirname(distScrapePath), { recursive: true });
            fs.mkdirSync(path.dirname(distPluginPath), { recursive: true });

            fs.writeFileSync(distScrapePath, transpileToJs(scrapeCode), 'utf-8');
            fs.writeFileSync(distPluginPath, transpileToJs(pluginCode), 'utf-8');

            // If running from dist/, load the compiled JS plugin for immediate registration
            if (import.meta.url.includes('/dist/') || import.meta.url.includes('\\dist\\')) {
                runtimePluginPath = distPluginPath;
            }
        } catch {
            // Non-fatal if dist sync fails
        }
    }

    let hotRegistered = false;
    if (options.registry) {
        try {
            const loader = new PluginLoader();
            const loaded = await loader.loadPlugin(runtimePluginPath);
            if (loaded) {
                options.registry.register(runtimePluginPath, loaded);
                hotRegistered = true;
            }
        } catch {
            // Watcher will pick it up if direct load fails
        }
    }

    return {
        analysis,
        scrapeRelPath,
        pluginRelPath,
        scrapeCode,
        pluginCode,
        generatorUsed,
        isUpdate,
        hotRegistered
    };
}
