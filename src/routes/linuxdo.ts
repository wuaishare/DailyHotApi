import type { ListContext, RouterData } from "../types.js";
import { get } from "../utils/getData.js";
import { getTime } from "../utils/getTime.js";
import { parseRSS } from "../utils/parseRSS.js";
import { load } from "cheerio";

const DAILY_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  Referer: "https://linux.do/top",
};

const RSS_HEADERS = {
  "Accept": "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  Referer: "https://linux.do/top",
};

const SUBTYPE_CONFIG = {
  daily: {
    typeLabel: "日榜",
    link: "https://linux.do/top?period=daily",
    mode: "html",
  },
  weekly: {
    typeLabel: "周榜",
    link: "https://linux.do/top.rss?period=weekly",
    mode: "rss",
  },
} as const;

type LinuxDoSubtype = keyof typeof SUBTYPE_CONFIG;

export const handleRoute = async (
  c: ListContext | undefined,
  noCache: boolean
) => {
  const subtype = (c?.req?.query?.("type") || "daily") as LinuxDoSubtype;
  const config = SUBTYPE_CONFIG[subtype] || SUBTYPE_CONFIG.daily;
  const listData =
    config.mode === "html"
      ? await getDailyListWithFallback(noCache)
      : await getWeeklyList(noCache);
  const routeData: RouterData = {
    name: "linuxdo",
    title: "Linux.do",
    description: "Linux 技术社区热搜",
    ...listData,
    type: listData.typeLabel || config.typeLabel,
    link: listData.link || config.link,
    total: listData.data?.length || 0,
  };
  return routeData;
};

const parseDateText = (value = "") => {
  const match = value.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (!match) return undefined;
  const [, year, month, day] = match;
  return getTime(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")} 00:00:00`);
};

const getDailyList = async (noCache: boolean) => {
  const url = "https://linux.do/top?period=daily";
  const result = await get<string>({
    url,
    noCache,
    timeout: 20000,
    headers: DAILY_HEADERS,
    responseType: "text",
  });

  const $ = load(result.data);
  const list = $(".topic-list-item")
    .toArray()
    .map((row, index) => {
      const item = $(row);
      const titleLink = item.find(".raw-topic-link").first();
      const title = titleLink.text().trim();
      const link = titleLink.attr("href") || "";
      if (!title || !link) return null;
      const category = item.find(".category-name").first().text().trim();
      const tags = item
        .find(".discourse-tags .discourse-tag")
        .toArray()
        .map((tag) => $(tag).text().trim())
        .filter(Boolean)
        .slice(0, 4);
      const posts = parseInt(item.find(".posts").first().text().trim() || "0", 10);
      const views = parseInt(item.find(".views").first().text().trim() || "0", 10);
      const timestamp = parseDateText(item.find("td").last().text().trim());
      return {
        id: `linux.do-topic-${link.match(/\/topic\/(\d+)/)?.[1] || index}`,
        title,
        desc: [category, ...tags].filter(Boolean).join(" · "),
        hot: Number.isFinite(posts) && posts > 0 ? posts : Number.isFinite(views) ? views : undefined,
        timestamp,
        url: link,
        mobileUrl: link,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    ...result,
    typeLabel: SUBTYPE_CONFIG.daily.typeLabel,
    link: SUBTYPE_CONFIG.daily.link,
    data: list,
  };
};

const getDailyListWithFallback = async (noCache: boolean) => {
  try {
    return await getDailyList(noCache);
  } catch (error) {
    const weekly = await getWeeklyList(noCache);
    return {
      ...weekly,
      typeLabel: SUBTYPE_CONFIG.weekly.typeLabel,
      link: SUBTYPE_CONFIG.weekly.link,
    };
  }
};

const getWeeklyList = async (noCache: boolean) => {
  const url = "https://linux.do/top.rss?period=weekly";
  const result = await get<string>({
    url,
    noCache,
    timeout: 20000,
    headers: RSS_HEADERS,
    responseType: "text",
  });

  const items = await parseRSS(result.data);
  const list = items.map((item, index) => {
    const link = item.link || "";
    return {
      id: item.guid || link || index,
      title: item.title || "",
      desc: item.contentSnippet?.trim() || item.content?.trim() || "",
      author: item.author,
      timestamp: getTime(item.pubDate || 0),
      url: link,
      mobileUrl: link,
      hot: undefined,
    };
  });

  return {
    ...result,
    typeLabel: SUBTYPE_CONFIG.weekly.typeLabel,
    link: SUBTYPE_CONFIG.weekly.link,
    data: list,
  };
};
