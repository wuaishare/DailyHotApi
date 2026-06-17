import { load } from "cheerio";
import type { ListItem, RouterData } from "../types.js";
import { get, post, type RequestResult } from "./getData.js";
import { getTime } from "./getTime.js";
import { normalizeText, firstHtmlParagraphText, htmlToText, truncateText } from "./text.js";
import { parseRSS } from "./parseRSS.js";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
};

export interface AiRouteMeta {
  name: string;
  title: string;
  type: string;
  description?: string;
  link: string;
  params?: Record<string, string | object>;
}

export const createRouteData = (meta: AiRouteMeta, listData: { data: ListItem[]; fromCache: boolean; updateTime: string | number; message?: string; params?: Record<string, string | object> }) => {
  const routeData: RouterData = {
    ...meta,
    subtitle: meta.type,
    total: listData.data?.length || 0,
    ...listData,
  };
  return routeData;
};

export const getHtml = async (url: string, noCache: boolean, headers?: Record<string, string>) =>
  get<string>({
    url,
    noCache,
    responseType: "text",
    headers: {
      ...DEFAULT_HEADERS,
      ...(headers || {}),
    },
  });

export const postJson = async <T>(
  url: string,
  body: Record<string, unknown>,
  noCache: boolean,
  headers?: Record<string, string>
) =>
  post<T>({
    url,
    body,
    noCache,
    headers: {
      ...DEFAULT_HEADERS,
      "Content-Type": "application/json",
      ...(headers || {}),
    },
  });

export const getJson = async <T>(
  url: string,
  noCache: boolean,
  headers?: Record<string, string>
) =>
  get<T>({
    url,
    noCache,
    headers: {
      ...DEFAULT_HEADERS,
      ...(headers || {}),
    },
  });

export const mapRssToListItems = async (
  result: RequestResult<string>,
  options: {
    fallbackAuthor?: string;
    titleMaxLength?: number;
    maxItems?: number;
    coverExtractor?: (html?: string) => string | undefined;
    descExtractor?: (html?: string, contentSnippet?: string) => string;
    itemMapper?: (item: Awaited<ReturnType<typeof parseRSS>>[number], index: number) => Partial<ListItem>;
  } = {}
) => {
  const items = (await parseRSS(result.data)).slice(0, options.maxItems || 60);
  return {
    fromCache: result.fromCache,
    updateTime: result.updateTime,
    data: items.map((item, index) => {
      const desc =
        options.descExtractor?.(item.content, item.contentSnippet) ||
        firstHtmlParagraphText(item.content) ||
        item.contentSnippet ||
        "";
      return {
        id: item.guid || item.link || index,
        title: truncateText(item.title || "", options.titleMaxLength || 90),
        desc: normalizeText(desc),
        cover: options.coverExtractor?.(item.content),
        author: item.author || options.fallbackAuthor || "",
        timestamp: getTime(item.pubDate || 0),
        hot: undefined,
        url: item.link || "",
        mobileUrl: item.link || "",
        ...(options.itemMapper?.(item, index) || {}),
      } satisfies ListItem;
    }),
  };
};

export const findCoverFromHtml = (html?: string) => {
  if (!html) return undefined;
  const $ = load(html);
  const src =
    $("img").first().attr("src") ||
    $("img").first().attr("data-src") ||
    $("img").first().attr("data-original");
  return src || undefined;
};

export const parseSimpleArticleList = (
  html: string,
  options: {
    itemSelector: string;
    titleSelector: string;
    linkSelector?: string;
    descSelector?: string;
    coverSelector?: string;
    timeSelector?: string;
    authorSelector?: string;
    linkBase?: string;
    hotSelector?: string;
    hotParser?: (value: string) => number | undefined;
  }
): ListItem[] => {
  const $ = load(html);
  const results: Array<ListItem | null> = $(options.itemSelector)
    .toArray()
    .map((node, index) => {
      const item = $(node);
      const linkNode = options.linkSelector
        ? item.find(options.linkSelector).first()
        : item.find(options.titleSelector).first();
      const title = normalizeText(item.find(options.titleSelector).first().text());
      const href = linkNode.attr("href") || "";
      if (!title || !href) return null;
      const url = href.startsWith("http")
        ? href
        : options.linkBase
        ? new URL(href, options.linkBase).toString()
        : href;
      const coverRaw = options.coverSelector
        ? item.find(options.coverSelector).first().attr("src") ||
          item.find(options.coverSelector).first().attr("data-src") ||
          item.find(options.coverSelector).first().attr("data-original")
        : undefined;
      const hotText = options.hotSelector
        ? normalizeText(item.find(options.hotSelector).first().text())
        : "";
      return {
        id: `${title}-${index}`,
        title,
        desc: options.descSelector
          ? normalizeText(item.find(options.descSelector).first().text())
          : undefined,
        cover: coverRaw || undefined,
        author: options.authorSelector
          ? normalizeText(item.find(options.authorSelector).first().text())
          : "",
        timestamp: getTime(
          options.timeSelector
            ? normalizeText(item.find(options.timeSelector).first().text())
            : 0
        ),
        hot: options.hotParser ? options.hotParser(hotText) : undefined,
        url,
        mobileUrl: url,
      } satisfies ListItem;
    });
  return results.filter((item): item is ListItem => item !== null);
};

export const parseFirstTable = (
  html: string,
  rowMapper: (row: string[], index: number) => ListItem | null
): ListItem[] => {
  const $ = load(html);
  const rows = $("table tbody tr").toArray();
  const results: Array<ListItem | null> = rows
    .map((row, index) => {
      const cols = $(row)
        .find("td")
        .map((_, td) => normalizeText($(td).text()))
        .get();
      return rowMapper(cols, index);
    });
  return results.filter((item): item is ListItem => item !== null);
};

export const extractJsonLd = <T = unknown>(html: string): T[] => {
  const $ = load(html);
  return $('script[type="application/ld+json"]')
    .toArray()
    .flatMap((node) => {
      const raw = $(node).html() || "";
      try {
        const parsed = JSON.parse(raw);
        return [parsed];
      } catch {
        return [];
      }
    }) as T[];
};

export const extractNuxtConfig = (html: string) => {
  const match = html.match(/window\.__NUXT__=\{\};window\.__NUXT__\.config=(\{.*?\});/s);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
};

export const buildUnavailable = (meta: AiRouteMeta, message: string) =>
  createRouteData(meta, {
    fromCache: false,
    updateTime: new Date().toISOString(),
    data: [],
    message,
  });

export const keywordFilter = (items: ListItem[], keywords: string[]) =>
  items.filter((item) => {
    const haystack = `${item.title} ${item.desc || ""}`.toLowerCase();
    return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
  });

export const textToHot = (value: string) => {
  const match = value.match(/[\d.]+/);
  if (!match) return undefined;
  const num = Number.parseFloat(match[0]);
  return Number.isFinite(num) ? num : undefined;
};

export const makeAbsoluteUrl = (href: string, base: string) => {
  if (!href) return "";
  return href.startsWith("http") ? href : new URL(href, base).toString();
};

export const stripHtml = (html?: string) => truncateText(htmlToText(html || ""), 160);
