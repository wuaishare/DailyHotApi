import { createRouteData, getJson, stripHtml } from "../utils/aiSources.js";
import type { ListItem } from "../types.js";

const meta = {
  name: "meta-ai-blog",
  title: "Meta AI",
  type: "官方 AI 动态",
  description: "Meta 官方 AI 动态与 Llama 相关新闻",
  link: "https://about.fb.com/news/",
};

type MetaNewsPost = {
  id: number;
  date: string;
  link: string;
  title: { rendered: string };
  excerpt: { rendered: string };
};

const META_NEWS_ENDPOINTS = [
  "https://about.fb.com/wp-json/wp/v2/posts?search=Meta%20AI&per_page=8&_fields=id,date,link,title,excerpt",
  "https://about.fb.com/wp-json/wp/v2/posts?search=AI&per_page=8&_fields=id,date,link,title,excerpt",
  "https://about.fb.com/wp-json/wp/v2/posts?search=Llama&per_page=8&_fields=id,date,link,title,excerpt",
];

const META_KEYWORDS = ["ai", "meta ai", "llama", "machine learning", "compute", "infrastructure"];

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const results = await Promise.all(
    META_NEWS_ENDPOINTS.map((url) => getJson<MetaNewsPost[]>(url, noCache)),
  );

  const merged = new Map<number, MetaNewsPost>();
  results.forEach((result) => {
    result.data.forEach((post) => {
      merged.set(post.id, post);
    });
  });

  const data: ListItem[] = [];
  [...merged.values()]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .filter((post) => {
      const title = stripHtml(post.title?.rendered || "");
      const desc = stripHtml(post.excerpt?.rendered || "");
      const haystack = `${title} ${desc}`.toLowerCase();
      return META_KEYWORDS.some((keyword) => haystack.includes(keyword));
    })
    .slice(0, 30)
    .forEach((post) => {
      const title = stripHtml(post.title?.rendered || "");
      const desc = stripHtml(post.excerpt?.rendered || "");
      const url = post.link;
      if (!title || !url) return;

      data.push({
        id: `meta-ai-${post.id}`,
        title,
        desc,
        hot: undefined,
        timestamp: Number.isFinite(Date.parse(post.date)) ? Date.parse(post.date) : undefined,
        url,
        mobileUrl: url,
      });
    });

  const latestUpdate = results
    .map((item) => item.updateTime)
    .sort()
    .pop();

  return createRouteData(meta, {
    fromCache: results.every((item) => item.fromCache),
    updateTime: latestUpdate || new Date().toISOString(),
    data,
    message: "当前通过 Meta 官方 Newsroom API 聚合 AI / Meta AI / Llama 相关动态。",
  });
};
