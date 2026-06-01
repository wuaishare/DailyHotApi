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
    type: typeMap[type],
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

const getList = async (options: Options, noCache: boolean) => {
  const { type } = options;
  const rssUrl = `https://hostloc.com/forum.php?mod=guide&view=${type}&rss=1`;
  const unavailable: RouterResType = {
    fromCache: false,
    updateTime: new Date().toISOString(),
    data: [],
    message: "Hostloc 当前未返回可公开抓取的数据",
  };
  const result = await get<string>({
    url: rssUrl,
    noCache,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
    },
  }).catch(() => unavailable);
  if (typeof result.data === "string" && result.data.includes("<rss")) {
    const list = await parseRSS(result.data).catch(() => []);
    if (list.length) {
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
    }
  }

  const htmlResult = await get<string>({
    url: `https://www.hostloc.net/forum.php?mod=guide&view=${type}`,
    noCache,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    },
  }).catch(() => unavailable);

  if (typeof htmlResult.data !== "string") {
    return {
      ...htmlResult,
      ...unavailable,
    };
  }

  const htmlList = parseHostlocHtml(htmlResult.data);
  if (!htmlList.length) {
    return {
      ...htmlResult,
      ...unavailable,
    };
  }

  return {
    ...htmlResult,
    data: htmlList,
    message: "Hostloc 主站 RSS 不可用，当前数据来自 hostloc.net 公开页面",
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
