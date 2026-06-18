import type { ListContext } from "../types";
import { post } from "../utils/getData.js";

const TARGET_LANGUAGE_MAP: Record<string, string> = {
  "zh-CN": "chinese_simplified",
  "zh-TW": "chinese_traditional",
};

const TRANSLATE_ENDPOINTS = [
  "https://api.translate.zvo.cn/translate.json",
  "https://america.api.translate.zvo.cn/translate.json",
];

const normalizeTexts = (input: unknown) =>
  Array.from(
    new Set(
      (Array.isArray(input) ? input : [])
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  ).slice(0, 50);

export const handleRoute = async (c: ListContext, noCache: boolean) => {
  const body = await c.req.json().catch(() => ({}));
  const locale = String(body?.locale || "zh-CN");
  const texts = normalizeTexts(body?.texts);
  const targetLanguage =
    TARGET_LANGUAGE_MAP[locale] || TARGET_LANGUAGE_MAP["zh-CN"];

  if (!texts.length) {
    return {
      name: "readable-translate",
      title: "Readable Translate",
      type: "translation",
      total: 0,
      success: true,
      data: [],
      fromCache: false,
      updateTime: new Date().toISOString(),
    };
  }

  const payload = new URLSearchParams();
  payload.set("from", "auto");
  payload.set("to", targetLanguage);
  payload.set("text", JSON.stringify(texts));

  let lastError: unknown = null;

  for (const endpoint of TRANSLATE_ENDPOINTS) {
    try {
      const result = await post<{
        result: number;
        info?: string;
        text?: string[];
      }>({
        url: endpoint,
        body: payload.toString(),
        noCache: true,
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
      });

      if (result?.data?.result === 1 && Array.isArray(result?.data?.text)) {
        return {
          name: "readable-translate",
          title: "Readable Translate",
          type: "translation",
          total: texts.length,
          locale,
          success: true,
          data: texts.map((original, index) => ({
            id: index,
            original,
            translated: String(result.data.text?.[index] || original).trim() || original,
          })),
          fromCache: result.fromCache,
          updateTime: result.updateTime,
        };
      }

      lastError = new Error(result?.data?.info || "translation failed");
    } catch (error) {
      lastError = error;
    }
  }

  return {
    name: "readable-translate",
    title: "Readable Translate",
    type: "translation",
    total: texts.length,
    locale,
    success: false,
    data: texts.map((original, index) => ({
      id: index,
      original,
      translated: original,
    })),
    fromCache: false,
    updateTime: new Date().toISOString(),
    message:
      lastError instanceof Error ? lastError.message : "translation failed",
  };
};
