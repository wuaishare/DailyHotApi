import type { ListItem } from "../types.js";
import { createRouteData, makeAbsoluteUrl } from "../utils/aiSources.js";
import { get } from "../utils/getData.js";
import { load } from "cheerio";

const meta = {
  name: "anthropic-news",
  title: "Anthropic",
  type: "官方资讯",
  description: "Anthropic 官方新闻与发布动态",
  link: "https://www.anthropic.com/news",
};

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const result = await get<string>({
    url: meta.link,
    noCache,
    responseType: "text",
    timeout: 15000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      Referer: "https://www.anthropic.com/",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  const $ = load(result.data);
  const seen = new Set<string>();
  let data: ListItem[] = [];
  $('a[href^="/news/"]').each((index, el) => {
    if (index > 29) return false;
    const href = $(el).attr("href") || "";
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (!href || !text || seen.has(href) || text.length < 8) return;
    seen.add(href);
    const parts = text.split(/(?=Announcements|Product|Policy|Research|Jun |May |Apr )/);
    const title = parts[0]?.replace(/^(Announcements|Product|Policy|Research)/, "").trim() || text;
    const desc = parts.slice(1).join(" ").trim() || "Anthropic 官方新闻";
    const url = makeAbsoluteUrl(href, "https://www.anthropic.com");
    data.push({
      id: `anthropic-${index}`,
      title,
      desc,
      hot: undefined,
      timestamp: undefined,
      url,
      mobileUrl: url,
    });
  });

  if (!data.length) {
    const links = [...new Set(result.data.match(/href="(\/news\/[^"]+)"/g)?.map((v) => v.slice(6, -1)) || [])];
    data = links.map((href, index) => ({
      id: `anthropic-${index}`,
      title: href.split("/").pop()?.replace(/-/g, " ") || href,
      desc: "Anthropic 官方新闻",
      hot: undefined,
      timestamp: undefined,
      url: makeAbsoluteUrl(href, "https://www.anthropic.com"),
      mobileUrl: makeAbsoluteUrl(href, "https://www.anthropic.com"),
    }));
  }

  return createRouteData(meta, {
    fromCache: result.fromCache,
    updateTime: result.updateTime,
    data,
  });
};
