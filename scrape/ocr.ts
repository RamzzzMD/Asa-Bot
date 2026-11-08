function getRandomIp() {
  return `${Math.floor(Math.random() * 200) + 20}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

export interface OcrResult {
  text: string;
  source: string;
  language: string;
}

export async function onlineOcr(
  imageBuffer: Buffer,
  filename: string = "image.png",
  language: string = "ENGLISH"
): Promise<OcrResult> {
  if (!imageBuffer) throw new Error("Image buffer wajib diisi");

  const ip = getRandomIp();
  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "X-Forwarded-For": ip,
    "X-Real-IP": ip,
    "Client-IP": ip
  };

  try {
    const pageRes = await fetch("https://www.onlineocr.net/", { headers, signal: AbortSignal.timeout(10000) });
    const cookieHeader = pageRes.headers.get("set-cookie") || "";
    const cookies = cookieHeader.split(",").map(c => c.split(";")[0].trim()).join("; ");
    const html = await pageRes.text();

    const vs = html.match(/id="__VIEWSTATE"\s+value="([^"]+)"/)?.[1];
    const vsg = html.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/)?.[1];
    const ev = html.match(/id="__EVENTVALIDATION"\s+value="([^"]+)"/)?.[1];

    if (vs && ev) {
      const fd = new FormData();
      fd.append("files[]", new Blob([new Uint8Array(imageBuffer)], { type: "image/png" }), filename);

      const upRes = await fetch("https://www.onlineocr.net/FileHandler.ashx", {
        method: "POST",
        headers: { ...headers, "Cookie": cookies },
        body: fd,
        signal: AbortSignal.timeout(12000)
      });

      const upJson = (await upRes.json().catch(() => null)) as any;
      if (upJson?.files?.[0]) {
        const fileInfo = upJson.files[0];
        const originalName = fileInfo.extra_info?.original_name || fileInfo.name;
        const cleanFileName = fileInfo.name;

        const dateStr = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
        const params = new URLSearchParams();
        params.set("ctl00$ScriptManager1", "ctl00$MainContent$UpdatePanel1|ctl00$MainContent$btnOCRConvert");
        params.set("__EVENTTARGET", "");
        params.set("__EVENTARGUMENT", "");
        params.set("__VIEWSTATE", vs);
        params.set("__VIEWSTATEGENERATOR", vsg || "CA0B0334");
        params.set("__EVENTVALIDATION", ev);
        params.set("ctl00$MainContent$comboLanguages", language.toUpperCase());
        params.set("ctl00$MainContent$comboOutput", "Text Plain (txt)");
        params.set("ctl00$MainContent$hdnFullPath", originalName);
        params.set("ctl00$MainContent$hdnFileName", cleanFileName);
        params.set("ctl00$MainContent$hdnFileNameEx", dateStr);
        params.set("__ASYNCPOST", "true");
        params.set("ctl00$MainContent$btnOCRConvert", "Convert File");

        const convRes = await fetch("https://www.onlineocr.net/", {
          method: "POST",
          headers: {
            ...headers,
            "Cookie": cookies,
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-MicrosoftAjax": "Delta=true",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": "https://www.onlineocr.net/",
            "Origin": "https://www.onlineocr.net"
          },
          body: params.toString(),
          signal: AbortSignal.timeout(15000)
        });

        const deltaText = await convRes.text();
        const textMatch = deltaText.match(/txtOCRResultText[^>]*>([\s\S]*?)<\/textarea>/i);
        if (textMatch && textMatch[1].trim()) {
          return {
            text: textMatch[1].trim(),
            source: "onlineocr.net",
            language
          };
        }
      }
    }
  } catch {
  }

  throw new Error("Gagal mengekstrak teks dari gambar");
}

export default onlineOcr;
