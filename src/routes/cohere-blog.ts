import type { ListItem } from "../types.js";
import { createRouteData, getHtml, makeAbsoluteUrl } from "../utils/aiSources.js";
import { load } from "cheerio";

const meta = {
  name: "cohere-blog",
  title: "Cohere",
  type: "官方博客",
  description: "Cohere 官方博客与研究更新",
  link: "https://cohere.com/blog",
};

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const result = await getHtml(meta.link, noCache);
  const $ = load(result.data);
  const seen = new Set<string>();
  const data: ListItem[] = [];
  $('a[href*="/blog/"], a[href*="/research/"]').each((index, el) => {
    if (index > 29) return false;
    const href = $(el).attr("href") || "";
    const title = $(el).text().replace(/\s+/g, " ").trim();
    if (!href || !title || seen.has(href)) return;
    if (/^\/(blog|research)$/.test(href)) return;
    if (/^\/blog\/tag\//.test(href) || /^\/blog\/authors\//.test(href)) return;
    if (title.length < 8) return;
    seen.add(href);
    const url = makeAbsoluteUrl(href, "https://cohere.com");
    data.push({
      id: `cohere-${index}`,
      title,
      desc: "Cohere 官方博客",
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
