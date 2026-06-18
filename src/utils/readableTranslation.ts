import type { ListItem } from "../types.js";
import { get, post } from "./getData.js";
import { getCache, setCache } from "./cache.js";

const TARGET_LANGUAGE_MAP: Record<string, string> = {
  "zh-CN": "chinese_simplified",
  "zh-TW": "chinese_traditional",
};

const READABLE_TRANSLATION_SOURCES = new Set([
  "openai",
  "openai-news",
  "openai-research",
  "anthropic-news",
  "deepmind-blog",
  "meta-ai-blog",
  "huggingface",
  "huggingface-blog",
  "mistral-news",
  "cohere-blog",
  "hf-papers",
  "paperswithcode",
  "producthunt-ai",
  "hackernews-ai",
  "sina-ai",
  "perplexity-blog",
  "xai-news",
  "reddit-localllama",
  "reddit-machinelearning",
  "reddit-artificial",
]);

const TRANSLATE_ENDPOINTS = [
  "https://api.translate.zvo.cn/translate.json",
  "https://america.api.translate.zvo.cn/translate.json",
];
const READABLE_TITLE_CACHE_TTL = 7 * 24 * 60 * 60;
const GOOGLE_TRANSLATE_TARGET_MAP: Record<string, string> = {
  "zh-CN": "zh-CN",
  "zh-TW": "zh-TW",
};

const chunkTitles = (titles: string[], size = 5) => {
  const chunks: string[][] = [];
  for (let index = 0; index < titles.length; index += size) {
    chunks.push(titles.slice(index, index + size));
  }
  return chunks;
};

const looksTranslatableSentence = (text = "") => {
  if (!/[A-Za-z]/.test(text)) return false;
  if (/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(text)) return false;
  if (/^[A-Za-z0-9._/-]+$/.test(text)) return false;
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return text.length >= 24 || wordCount >= 4;
};

const buildTitleCacheKey = (locale: string, title: string) =>
  `readable-title:${locale}:${title}`;

const translateTitles = async (
  titles: string[],
  locale: string,
  _noCache: boolean
) => {
  const targetLanguage = TARGET_LANGUAGE_MAP[locale];
  if (!targetLanguage || !titles.length) return new Map<string, string>();

  const translatedMap = new Map<string, string>();
  const uncachedTitles: string[] = [];

  for (const title of titles) {
    const cached = await getCache(buildTitleCacheKey(locale, title));
    const cachedValue = String(cached?.data || "").trim();
    if (cachedValue) {
      translatedMap.set(title, cachedValue);
      continue;
    }
    uncachedTitles.push(title);
  }

  for (const titleChunk of chunkTitles(uncachedTitles, 3)) {
    const payload = new URLSearchParams();
    payload.set("from", "auto");
    payload.set("to", targetLanguage);
    payload.set("text", JSON.stringify(titleChunk));

    for (const endpoint of TRANSLATE_ENDPOINTS) {
      try {
        const result = await post<{
          result: number;
          text?: string[];
        }>({
          url: endpoint,
          body: payload.toString(),
          noCache: true,
          timeout: 15000,
          headers: {
            "content-type": "application/x-www-form-urlencoded",
          },
        });

        if (result?.data?.result === 1 && Array.isArray(result?.data?.text)) {
          for (const [index, title] of titleChunk.entries()) {
            const translated = String(result.data.text?.[index] || "").trim();
            if (translated && translated !== title) {
              translatedMap.set(title, translated);
              await setCache(
                buildTitleCacheKey(locale, title),
                {
                  updateTime: new Date().toISOString(),
                  data: translated,
                },
                READABLE_TITLE_CACHE_TTL
              );
            }
          }
          break;
        }
      } catch {
        continue;
      }
    }
  }

  return translatedMap;
};

const translateSingleTitle = async (title: string, locale: string) => {
  const targetLanguage = TARGET_LANGUAGE_MAP[locale];
  if (!targetLanguage) return "";

  const payload = new URLSearchParams();
  payload.set("from", "auto");
  payload.set("to", targetLanguage);
  payload.set("text", JSON.stringify([title]));

  for (const endpoint of TRANSLATE_ENDPOINTS) {
    try {
      const result = await post<{
        result: number;
        text?: string[];
      }>({
        url: endpoint,
        body: payload.toString(),
        noCache: true,
        timeout: 15000,
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
      });

      const translated = String(result?.data?.text?.[0] || "").trim();
      if (result?.data?.result === 1 && translated && translated !== title) {
        await setCache(
          buildTitleCacheKey(locale, title),
          {
            updateTime: new Date().toISOString(),
            data: translated,
          },
          READABLE_TITLE_CACHE_TTL
        );
        return translated;
      }
    } catch {
      continue;
    }
  }

  const googleTargetLanguage = GOOGLE_TRANSLATE_TARGET_MAP[locale];
  if (!googleTargetLanguage) return "";

  try {
    const googleResult = await get<any[]>({
      url: "https://translate.googleapis.com/translate_a/single",
      params: {
        client: "gtx",
        sl: "auto",
        tl: googleTargetLanguage,
        dt: "t",
        q: title,
      },
      noCache: true,
      timeout: 10000,
    });
    const translated = Array.isArray(googleResult?.data?.[0])
      ? googleResult.data[0]
          .map((item: any[]) => String(item?.[0] || ""))
          .join("")
          .trim()
      : "";
    if (translated && translated !== title) {
      await setCache(
        buildTitleCacheKey(locale, title),
        {
          updateTime: new Date().toISOString(),
          data: translated,
        },
        READABLE_TITLE_CACHE_TTL
      );
      return translated;
    }
  } catch {
    return "";
  }

  return "";
};

export const applyReadableTitleEnhancement = async ({
  sourceName,
  locale,
  noCache,
  data,
  offset = 0,
  limit = 0,
}: {
  sourceName: string;
  locale?: string;
  noCache: boolean;
  data: ListItem[];
  offset?: number;
  limit?: number;
}) => {
  if (!READABLE_TRANSLATION_SOURCES.has(sourceName)) return data;
  if (!locale || !TARGET_LANGUAGE_MAP[locale]) return data;
  if (!Array.isArray(data) || !data.length) return data;

  const safeOffset = Math.max(0, Number(offset) || 0);
  const safeLimit = Math.max(0, Number(limit) || 0);
  const end = safeLimit > 0 ? Math.min(data.length, safeOffset + safeLimit) : data.length;

  const targetIndexes = Array.from({ length: Math.max(0, end - safeOffset) }, (_, index) => index + safeOffset);
  const titles = Array.from(
    new Set(
      targetIndexes
        .map((index) => String(data[index]?.title || "").trim())
        .filter((title) => title && looksTranslatableSentence(title))
    )
  );

  if (!titles.length) return data;

  const translatedMap = await translateTitles(titles, locale, noCache);
  const unresolvedTitles = titles.filter((title) => !translatedMap.has(title));
  for (const title of unresolvedTitles) {
    const translated = await translateSingleTitle(title, locale);
    if (translated) {
      translatedMap.set(title, translated);
    }
  }
  if (!translatedMap.size) return data;

  return data.map((item, index) => {
    if (index < safeOffset || index >= end) return item;
    const originalTitle = String(item?.title || "").trim();
    const translatedTitle = translatedMap.get(originalTitle);
    if (!translatedTitle) return item;
    return {
      ...item,
      originalTitle,
      title: translatedTitle,
    };
  });
};
