const BASE_URL = "https://prompthero.com";
const API_URL =
  "https://prompthero.com/api/trpc/prompt.getModelsForSearch,category.getIndexedOptions,prompt.search";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

function buildPayload(query: string) {
  return {
    "0": { json: null, meta: { values: ["undefined"], v: 1 } },
    "1": { json: null, meta: { values: ["undefined"], v: 1 } },
    "2": {
      json: {
        query,
        searchMode: null,
        searchType: null,
        page: 1,
        pageSize: 24,
        sort: null,
        model: null,
        modelVersion: null,
        type: null,
        timeRange: null,
        nsfw: false,
        nsfwOnly: null,
        sortOverride: null,
        featured: null,
        category: null,
        excludeNsfwDiscoveryContent: null
      },
      meta: {
        values: {
          searchMode: ["undefined"],
          searchType: ["undefined"],
          sort: ["undefined"],
          model: ["undefined"],
          modelVersion: ["undefined"],
          type: ["undefined"],
          timeRange: ["undefined"],
          nsfwOnly: ["undefined"],
          sortOverride: ["undefined"],
          featured: ["undefined"],
          category: ["undefined"],
          excludeNsfwDiscoveryContent: ["undefined"]
        },
        v: 1
      }
    }
  };
}

export interface PromptHeroItem {
  judul: string;
  prompt: string;
  model: string;
  versi: string;
  kategori: string;
  dilihat: number;
  favorit: number;
  gambar: string | null;
  slug: string | null;
  url: string | null;
}

export interface PromptHeroResult {
  keyword: string;
  total: number;
  hasil: PromptHeroItem[];
}

function parseResults(json: any): PromptHeroItem[] {
  const results: PromptHeroItem[] = [];
  const items = json?.[2]?.result?.data?.json?.items || [];

  for (const item of items) {
    if (!item.prompt || !item.asset) continue;

    results.push({
      judul: item.prompt.title || "No Title",
      prompt: item.prompt.prompt || "",
      model: item.prompt.modelUsed || "Unknown",
      versi: item.prompt.modelUsedVersion || "",
      kategori: item.prompt.category || "General",
      dilihat: item.prompt.viewCount || 0,
      favorit: item.prompt.favCount || 0,
      gambar: item.asset.url || null,
      slug: item.prompt.slug || null,
      url: item.prompt.slug ? `${BASE_URL}/${item.prompt.slug}` : null
    });
  }

  return results;
}

export async function searchPrompt(query: string): Promise<PromptHeroResult> {
  if (!query) throw new Error("Parameter query wajib diisi");

  const input = encodeURIComponent(JSON.stringify(buildPayload(query)));
  const url = `${API_URL}?batch=1&input=${input}`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(30000),
    headers: {
      "user-agent": UA,
      accept: "application/json",
      "x-trpc-source": "nextjs-react"
    }
  });

  const json = (await res.json().catch(() => null)) as any;
  if (!json) throw new Error("Gagal parsing response dari PromptHero");

  const hasil = parseResults(json);

  return { keyword: query, total: hasil.length, hasil };
}

export default searchPrompt;
