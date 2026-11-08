export interface LyricItem {
  id: number;
  name: string;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

export async function searchLyrics(query: string): Promise<LyricItem[]> {
  if (!query) throw new Error("Parameter query wajib diisi");

  const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`, {
    headers: {
      "Content-Type": "application/json"
    },
    signal: AbortSignal.timeout(30000)
  });

  if (!res.ok) {
    throw new Error(`Gagal mengambil lirik (Status ${res.status})`);
  }

  const data = (await res.json()) as LyricItem[];
  return data;
}

export default searchLyrics;
