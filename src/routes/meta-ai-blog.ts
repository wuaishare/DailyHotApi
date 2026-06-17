import { createRouteData, getHtml, makeAbsoluteUrl } from "../utils/aiSources.js";
import type { ListItem } from "../types.js";
import { load } from "cheerio";

const meta = {
  name: "meta-ai-blog",
  title: "Meta AI",
  type: "官方资讯",
  description: "Meta AI 官方博客与研究动态",
  link: "https://ai.meta.com/blog/",
};

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const result = await getHtml(meta.link, noCache);
  const $ = load(result.data);
  const seen = new Set<string>();
  const data: ListItem[] = [];
  $('a[href*="/blog/"]').each((index, el) => {
    if (index > 29) return false;
    const href = $(el).attr("href") || "";
    const title = $(el).text().replace(/\s+/g, " ").trim();
    if (!href || !title || seen.has(href) || title.length < 8) return;
    seen.add(href);
    const url = makeAbsoluteUrl(href, "https://ai.meta.com");
    data.push({
      id: `meta-ai-${index}`,
      title,
      desc: "Meta AI 官方博客",
      hot: undefined,
      timestamp: undefined,
      url,
      mobileUrl: url,
    });
  });
  return createRouteData(meta, {
    fromCache: result.fromCache,
    updateTime: result.updateTime,
    data,
  });
};
