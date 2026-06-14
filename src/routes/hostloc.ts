import type {
  RouterData,
  ListContext,
  Options,
  RouterResType,
  ListItem,
} from "../types.js";
import { load } from "cheerio";
import { get } from "../utils/getData.js";
import { parseRSS } from "../utils/parseRSS.js";
import { getTime } from "../utils/getTime.js";

const LEGACY_HOSTLOC_RSS_BASE = "https://hostloc.com/forum.php?mod=guide";
const LEGACY_HOSTLOC_HTML_BASE = "https://www.hostloc.net/forum.php?mod=guide";
const JIZA_BASE = "https://jiza.net";
const JIZA_HOSTING_CATEGORY_ID = 7;
const JIZA_HOSTING_CATEGORY_SLUG = "zhuji";
const HOSTLOC_DOMAIN_NOTICE_KEYWORD = "JIZA.NET";

const typeMap: Record<string, string> = {
  hot: "最新热门",
  digest: "最新精华",
  new: "最新回复",
  newthread: "最新发表",
};

export const handleRoute = async (c: ListContext, noCache: boolean) => {
  const type = c.req.query("type") || "new";
  const listData = await getList({ type }, noCache);
  const routeData: RouterData = {
    name: "hostloc",
    title: "全球主机交流",
    type: typeMap[type] || "最新回复",
    params: {
      type: {
        name: "榜单分类",
        type: typeMap,
      },
    },
    link: "https://hostloc.com/",
    total: listData.data?.length || 0,
    ...listData,
  };
  return routeData;
};

interface JizaTopic {
  id: number;
  title: string;
  fancy_title?: string;
  slug?: string;
  excerpt?: string | null;
  image_url?: string | null;
  created_at?: string;
  last_posted_at?: string;
  views?: number;
  reply_count?: number;
  like_count?: number;
  last_poster_username?: string;
  posters?: Array<{
    user_id?: number;
    description?: string;
  }>;
}

interface JizaTopicListResponse {
  topic_list?: {
    topics?: JizaTopic[];
  };
}

const getUnavailable = (message = "Hostloc 当前未返回可公开抓取的数据"): RouterResType => ({
  fromCache: false,
  updateTime: new Date().toISOString(),
  data: [],
  message,
});

const isJizaTopicListResponse = (value: unknown): value is JizaTopicListResponse => {
  return value !== null && typeof value === "object" && "topic_list" in value;
};

const isLegacyHostlocNoticeSpam = (items: ListItem[]) => {
  if (!items.length) return false;
  const sample = items.slice(0, 5);
  const matchedCount = sample.filter(
    (item) =>
      item.title.includes(HOSTLOC_DOMAIN_NOTICE_KEYWORD) &&
      item.author?.toLowerCase() === "adminz",
  ).length;
  return matchedCount >= Math.min(3, sample.length);
};

const mapLegacyTypeToJizaSource = (type: string) => {
  switch (type) {
    case "hot":
      return {
        url: `${JIZA_BASE}/top.json?category=${JIZA_HOSTING_CATEGORY_ID}`,
        sourceLabel: "JIZA 热门榜",
      };
    case "newthread":
      return {
        url: `${JIZA_BASE}/c/${JIZA_HOSTING_CATEGORY_SLUG}/${JIZA_HOSTING_CATEGORY_ID}.json`,
        sourceLabel: "JIZA 主机分类",
      };
    case "digest":
      return {
        url: `${JIZA_BASE}/top.json?category=${JIZA_HOSTING_CATEGORY_ID}`,
        sourceLabel: "JIZA 热门榜（替代原精华榜）",
      };
    case "new":
    default:
      return {
        url: `${JIZA_BASE}/latest.json?category=${JIZA_HOSTING_CATEGORY_ID}`,
        sourceLabel: "JIZA 最新回复",
      };
  }
};

const buildJizaTopicUrl = (topic: JizaTopic) => {
  const slug = topic.slug || "topic";
  return `${JIZA_BASE}/t/${slug}/${topic.id}`;
};

const mapJizaTopic = (topic: JizaTopic, index: number): ListItem => {
  const title = topic.title || topic.fancy_title || `jiza-topic-${index + 1}`;
  const desc = [topic.excerpt, topic.last_poster_username].filter(Boolean).join(" · ");
  const hot = topic.reply_count || topic.views || topic.like_count || 0;
  return {
    id: `jiza-${topic.id}`,
    title,
    desc: desc || undefined,
    author: topic.last_poster_username || "",
    cover: topic.image_url || undefined,
    timestamp: getTime(topic.last_posted_at || topic.created_at || 0),
    hot,
    url: buildJizaTopicUrl(topic),
    mobileUrl: buildJizaTopicUrl(topic),
  };
};

const getJizaList = async (type: string, noCache: boolean) => {
  const { url, sourceLabel } = mapLegacyTypeToJizaSource(type);
  const result = await get<JizaTopicListResponse>({
    url,
    noCache,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      Referer: `${JIZA_BASE}/`,
    },
  }).catch(() => getUnavailable("JIZA 当前未返回可公开抓取的数据"));

  const topics = isJizaTopicListResponse(result.data) ? result.data.topic_list?.topics || [] : [];

  const data = topics
    .filter((topic: JizaTopic) => topic?.id && (topic.title || topic.fancy_title))
    .map(mapJizaTopic);

  if (!data.length) {
    return getUnavailable("JIZA 当前未返回可公开抓取的数据");
  }

  const message =
    type === "digest"
      ? `Hostloc 旧站精华榜已不可稳定获取，当前改用 ${sourceLabel}`
      : `Hostloc 旧站数据异常，当前改用 ${sourceLabel}`;

  return {
    ...result,
    data,
    message,
  };
};

const getLegacyHostlocRss = async (type: string, noCache: boolean) => {
  const result = await get<string>({
    url: `${LEGACY_HOSTLOC_RSS_BASE}&view=${type}&rss=1`,
    noCache,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
    },
  }).catch(() => getUnavailable());

  if (typeof result.data !== "string" || !result.data.includes("<rss")) return null;

  const list = await parseRSS(result.data).catch(() => []);
  if (!list.length) return null;

  return {
    ...result,
    data: list.map((v, i) => ({
      id: v.guid || i,
      title: v.title || "",
      desc: v.content || "",
      author: v.author || "",
      timestamp: getTime(v.pubDate || 0),
      hot: undefined,
      url: v.link || "",
      mobileUrl: v.link || "",
    })),
  };
};

const parseHostlocHtml = (html: string): ListItem[] => {
  const $ = load(html);
  const rows = $('tbody[id^="normalthread_"]');
  if (!rows.length) return [];
  return rows
    .toArray()
    .map((item, index) => {
      const row = $(item);
      const titleLink = row.find("a.xst").first();
      const title = titleLink.text().trim();
      const href = titleLink.attr("href") || "";
      if (!title || !href) return null;

      const author = row.find("td.by").eq(1).find("cite a").first().text().trim();
      const firstDesc = row.find("td.by").eq(0).find("a").first().text().trim();
      const replyText = row.find("td.num a").first().text().trim();
      const viewText = row.find("td.num em").first().text().trim();
      const timestampText =
        row.find("td.by").eq(2).find("em a span").first().text().trim() ||
        row.find("td.by").eq(1).find("em span").first().text().trim();
      const absoluteUrl = href.startsWith("http")
        ? href
        : `https://www.hostloc.net/${href.replace(/^\//, "")}`;

      const record: ListItem = {
        id: row.attr("id") || `hostloc-${index + 1}`,
        title,
        desc: [firstDesc, author].filter(Boolean).join(" · "),
        author,
        timestamp: getTime(timestampText || 0),
        hot: Number.parseInt(replyText || "0", 10) || Number.parseInt(viewText || "0", 10) || 0,
        url: absoluteUrl,
        mobileUrl: absoluteUrl,
      };
      return record;
    })
    .filter((item): item is ListItem => Boolean(item));
};

const getLegacyHostlocHtml = async (type: string, noCache: boolean) => {
  const result = await get<string>({
    url: `${LEGACY_HOSTLOC_HTML_BASE}&view=${type}`,
    noCache,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    },
  }).catch(() => getUnavailable());

  if (typeof result.data !== "string") return null;
  const data = parseHostlocHtml(result.data);
  if (!data.length) return null;

  return {
    ...result,
    data,
    message: "Hostloc 主站 RSS 不可用，当前数据来自 hostloc.net 公开页面",
  };
};

const getList = async (options: Options, noCache: boolean) => {
  const type = String(options.type || "new");

  const rssResult = await getLegacyHostlocRss(type, noCache);
  if (rssResult?.data?.length && !isLegacyHostlocNoticeSpam(rssResult.data)) {
    return rssResult;
  }

  const htmlResult = await getLegacyHostlocHtml(type, noCache);
  if (htmlResult?.data?.length && !isLegacyHostlocNoticeSpam(htmlResult.data)) {
    return htmlResult;
  }

  return getJizaList(type, noCache);
};
