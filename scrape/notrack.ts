import axios from "axios";
import crypto from "crypto";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const BASE_URL = "https://notrack.ai";

export interface NotrackChatOptions {
  prompt: string;
  session_id?: string | null;
  chat_id?: string | null;
  persona?: string;
  mode?: string;
}

export interface NotrackChatResult {
  prompt: string;
  result: string;
  session_id: string;
  chat_id: string | null;
}

export async function notrackChat({
  prompt,
  session_id = null,
  chat_id = null,
  persona = "normal",
  mode = "usual"
}: NotrackChatOptions): Promise<NotrackChatResult> {
  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("Parameter prompt wajib diisi");
  }

  const effectiveSessionId = session_id || crypto.randomUUID();
  const cookieStr = `uid=${effectiveSessionId}`;

  const payload = {
    user_input: prompt.trim(),
    mode: mode || "usual",
    model: "C",
    persona: persona || "normal",
    max_turns: 10,
    chat_id: chat_id || null,
    attachments: [],
    regenerate: false,
    edit: false,
    edit_mid: null,
    via: "text"
  };

  const res = await axios.post(`${BASE_URL}/api/dispatch`, payload, {
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/json",
      Origin: BASE_URL,
      Referer: `${BASE_URL}/id/chat`,
      Cookie: cookieStr,
      Accept: "text/event-stream"
    },
    responseType: "stream",
    timeout: 35000
  });

  let fullAnswer = "";
  let returnedChatId: string | null = chat_id || null;

  await new Promise<void>((resolve, reject) => {
    let hasError = false;

    res.data.on("data", (chunk: Buffer) => {
      const lines = chunk.toString().split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.type === "chat_meta" && evt.chat_id) {
              returnedChatId = evt.chat_id;
            } else if (evt.type === "delta" && evt.chunk) {
              fullAnswer += evt.chunk;
            } else if ((evt.type === "message" || evt.type === "consensus") && evt.content) {
              fullAnswer = evt.content;
            } else if (evt.type === "error") {
              hasError = true;
              reject(new Error(evt.content || "Terjadi kesalahan dari NoTrack AI"));
            }
          } catch {
          }
        }
      }
    });

    res.data.on("end", () => {
      if (!hasError) resolve();
    });

    res.data.on("error", (err: any) => {
      if (!hasError) reject(err);
    });
  });

  if (!fullAnswer.trim()) {
    throw new Error("NoTrack AI tidak memberikan respon jawaban");
  }

  return {
    prompt: prompt.trim(),
    result: fullAnswer.trim(),
    session_id: effectiveSessionId,
    chat_id: returnedChatId
  };
}

export default notrackChat;
