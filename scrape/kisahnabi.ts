import axios from 'axios';

export interface KisahNabiData {
    name: string;
    thn_kelahiran: string | number;
    usia: string | number;
    tmp: string;
    description: string;
    image_url?: string;
    icon_url?: string;
}

export const LIST_25_NABI = [
    'adam', 'idris', 'nuh', 'hud', 'sholeh',
    'ibrahim', 'luth', 'ismail', 'ishaq', 'yaqub',
    'yusuf', 'ayyub', 'syuaib', 'musa', 'harun',
    'dzulkifli', 'daud', 'sulaiman', 'ilyas', 'ilyasa',
    'yunus', 'zakariya', 'yahya', 'isa', 'muhammad'
] as const;

const NAME_ALIASES: Record<string, string> = {
    'zakaria': 'zakariya',
    'zulkifli': 'dzulkifli',
    'saleh': 'sholeh',
    'ayub': 'ayyub',
    'syuib': 'syuaib',
    'shuaib': 'syuaib',
    'yakub': 'yaqub',
    'ishak': 'ishaq',
    'elias': 'ilyas',
    'elisha': 'ilyasa'
};

export function normalizeProphetName(name: string): string {
    const clean = name.toLowerCase().replace(/^(nabi|rasul)\s+/i, '').trim();
    return NAME_ALIASES[clean] || clean;
}

export async function fetchKisahNabi(inputName: string): Promise<KisahNabiData> {
    const prophetName = normalizeProphetName(inputName);
    const url = `https://raw.githubusercontent.com/ZeroChanBot/Api-Freee/a9da6483809a1fbf164cdf1dfbfc6a17f2814577/data/kisahNabi/${prophetName}.json`;

    const { data } = await axios.get<KisahNabiData>(url, {
        timeout: 15000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
    });

    return data;
}
