import axios from "axios";
import * as cheerio from "cheerio";

export interface KodeposItem {
  kodepos: string;
  desa: string;
  kecamatan: string;
  kota: string;
  provinsi: string;
}

export async function scrapeKodepos(form: string): Promise<KodeposItem[]> {
  if (!form || typeof form !== "string" || form.trim().length === 0) {
    throw new Error("Form parameter must be a non-empty string");
  }

  const response = await axios.post(
    "https://kodepos.posindonesia.co.id/CariKodepos",
    new URLSearchParams({ kodepos: form.trim() }).toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Cache-Control": "max-age=0",
        Origin: "https://kodepos.posindonesia.co.id",
        Referer: "https://kodepos.posindonesia.co.id/",
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
        Cookie: "ci_session=aqlrvi6tdfajmfelsla8n974p1btd9pb",
      },
      timeout: 30000,
    }
  );

  const html = response.data;
  const $ = cheerio.load(html);
  const result: KodeposItem[] = $("tbody > tr")
    .map((_, el) => {
      const $td = $(el).find("td");
      const kodepos = $td.eq(1).text().trim();
      const desa = $td.eq(2).text().trim();
      const kecamatan = $td.eq(3).text().trim();
      const kota = $td.eq(4).text().trim();
      const provinsi = $td.eq(5).text().trim();
      return {
        kodepos,
        desa,
        kecamatan,
        kota,
        provinsi,
      };
    })
    .get()
    .filter((item) => item.kodepos || item.desa);

  return result;
}

export default scrapeKodepos;
