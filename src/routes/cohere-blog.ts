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
  const candidateMap = new Map<string, { title: string; url: string }>();
  const data: ListItem[] = [];
  $('a[href*="/blog/"], a[href*="/research/"]').each((_, el) => {
    const href = $(el).attr("href") || "";
    const title = $(el).text().replace(/\s+/g, " ").trim();
    if (!href || !title) return;
    if (/^\/(blog|research)$/.test(href)) return;
    if (/^\/blog\/tag\//.test(href) || /^\/blog\/authors\//.test(href)) return;
    if (/^learn more$/i.test(title)) return;
    if (/^(blog|research|papers)$/i.test(title)) return;
    if (title.length < 8) return;
    const url = makeAbsoluteUrl(href, "https://cohere.com");
    const current = candidateMap.get(href);
    if (!current || title.length > current.title.length) {
      candidateMap.set(href, { title, url });
    }
  });
  [...candidateMap.values()].slice(0, 30).forEach((item, index) => {
    data.push({
      id: `cohere-${index}`,
      title: item.title,
      desc: "Cohere 官方博客",
      hot: undefined,
      timestamp: undefined,
      url: item.url,
      mobileUrl: item.url,
    });
  });
  return createRouteData(meta, {
    fromCache: result.fromCache,
    updateTime: result.updateTime,
    data,
  });
};
