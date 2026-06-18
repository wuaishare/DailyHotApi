import type { ListContext, RouterData } from "../types.js";
import { getCache, setCache } from "../utils/cache.js";
import { getTime } from "../utils/getTime.js";
import { load } from "cheerio";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const HTML_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  Referer: "https://linux.do/top",
};

const SUBTYPE_CONFIG = {
  daily: {
    typeLabel: "日榜",
    link: "https://linux.do/top?period=daily",
  },
  weekly: {
    typeLabel: "周榜",
    link: "https://linux.do/top?period=weekly",
  },
  monthly: {
    typeLabel: "月榜",
    link: "https://linux.do/top?period=monthly",
  },
} as const;

type LinuxDoSubtype = keyof typeof SUBTYPE_CONFIG;

type LinuxDoListData = {
  fromCache: boolean;
  updateTime: string;
  typeLabel: string;
  link: string;
  data: Array<{
    id: string;
    title: string;
    desc: string;
    hot: number | undefined;
    timestamp: number | undefined;
    url: string;
    mobileUrl: string;
  }>;
};

export const handleRoute = async (
  c: ListContext | undefined,
  noCache: boolean
) => {
  const subtype = (c?.req?.query?.("type") || "daily") as LinuxDoSubtype;
  const listData = await getLinuxDoList(subtype, noCache);
  const routeData: RouterData = {
    name: "linuxdo",
    title: "Linux.do",
    description: "Linux 技术社区热搜",
    ...listData,
    type: listData.typeLabel,
    link: listData.link,
    total: listData.data?.length || 0,
  };
  return routeData;
};

const buildCacheKey = (period: LinuxDoSubtype) => `linuxdo:top:${period}:html:v3`;

const parseDateText = (value = "") => {
  const match = value.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (!match) return undefined;
  const [, year, month, day] = match;
  return getTime(
    `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")} 00:00:00`
  );
};

const fetchTopHtml = async (period: LinuxDoSubtype) => {
  const url = `https://linux.do/top?period=${period}`;
  const headerArgs = Object.entries(HTML_HEADERS).flatMap(([key, value]) => [
    "-H",
    `${key}: ${value}`,
  ]);
  const { stdout } = await execFileAsync(
    "curl",
    ["-L", "-sS", "--max-time", "20", url, ...headerArgs],
    {
      maxBuffer: 10 * 1024 * 1024,
    }
  );
  if (/Just a moment/i.test(stdout)) {
    throw new Error("linux.do blocked by Cloudflare");
  }
  return stdout;
};

const parseTopHtml = (html: string) => {
  const $ = load(html);
  const raw = $("#data-preloaded").attr("data-preloaded") || "";
  if (!raw) {
    throw new Error("linux.do topic payload missing");
  }
  const parsed = JSON.parse(raw);
  const topicList = JSON.parse(parsed.topic_list || "{}");
  const topics = topicList.topic_list?.topics || topicList.topics || [];
  if (!Array.isArray(topics) || !topics.length) {
    throw new Error("linux.do topic payload empty");
  }
  return topics
    .map((topic: any, index: number) => {
      const title = String(topic.title || topic.fancy_title || "").trim();
      if (!title || !topic.id) return null;
      const link = `https://linux.do/t/topic/${topic.id}`;
      const tags = Array.isArray(topic.tags)
        ? topic.tags.map((tag: any) => String(tag?.name || "").trim()).filter(Boolean).slice(0, 4)
        : [];
      const timestamp = getTime(
        topic.last_posted_at || topic.bumped_at || topic.created_at || 0
      );
      const hotValue =
        Number(topic.reply_count || 0) > 0
          ? Number(topic.reply_count || 0)
          : Number(topic.views || 0) > 0
          ? Number(topic.views || 0)
          : undefined;
      return {
        id: `linux.do-topic-${topic.id || index}`,
        title,
        desc: tags.join(" · "),
        hot: hotValue,
        timestamp,
        url: link,
        mobileUrl: link,
      };
    })
    .filter((item: any): item is NonNullable<typeof item> => item !== null);
};

const buildListData = async (
  period: LinuxDoSubtype,
  noCache: boolean
): Promise<LinuxDoListData> => {
  const cacheKey = buildCacheKey(period);
  const cached = await getCache(cacheKey);
  if (!noCache && cached?.data) {
    return {
      fromCache: true,
      updateTime: cached.updateTime,
      typeLabel: SUBTYPE_CONFIG[period].typeLabel,
      link: SUBTYPE_CONFIG[period].link,
      data: cached.data as LinuxDoListData["data"],
    };
  }

  try {
    const html = await fetchTopHtml(period);
    const data = parseTopHtml(html);
    const updateTime = new Date().toISOString();
    await setCache(cacheKey, { data, updateTime }, 3600);
    return {
      fromCache: false,
      updateTime,
      typeLabel: SUBTYPE_CONFIG[period].typeLabel,
      link: SUBTYPE_CONFIG[period].link,
      data,
    };
  } catch (error) {
    if (cached?.data) {
      return {
        fromCache: true,
        updateTime: cached.updateTime,
        typeLabel: SUBTYPE_CONFIG[period].typeLabel,
        link: SUBTYPE_CONFIG[period].link,
        data: cached.data as LinuxDoListData["data"],
      };
    }
    throw error;
  }
};

const getLinuxDoList = async (
  period: LinuxDoSubtype,
  noCache: boolean
): Promise<LinuxDoListData> => {
  if (period !== "daily") {
    return buildListData(period, noCache);
  }
  try {
    return await buildListData("daily", noCache);
  } catch {
    const fallback = await buildListData("weekly", noCache);
    return {
      ...fallback,
      typeLabel: SUBTYPE_CONFIG.weekly.typeLabel,
      link: SUBTYPE_CONFIG.weekly.link,
    };
  }
};
