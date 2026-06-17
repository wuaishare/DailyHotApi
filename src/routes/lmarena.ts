import type { ListItem } from "../types.js";
import { createRouteData, getHtml, textToHot } from "../utils/aiSources.js";
import { load } from "cheerio";

const meta = {
  name: "lmarena",
  title: "LMArena",
  type: "排行榜",
  description: "LMArena 文本模型对战排行榜",
  link: "https://lmarena.ai/leaderboard/text",
};

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const result = await getHtml(meta.link, noCache);
  const $ = load(result.data);
  const results: Array<ListItem | null> = $("table tbody tr")
    .toArray()
    .map((row, index) => {
      const cols = $(row).find("td");
      const title = cols.eq(2).find("a").first().text().replace(/\s+/g, " ").trim();
      const provider = cols.eq(2).find("svg title").first().text().trim();
      const score = cols.eq(3).text().replace(/\s+/g, " ").trim();
      const votes = cols.eq(4).text().replace(/\s+/g, " ").trim();
      const price = cols.eq(5).text().replace(/\s+/g, " ").trim();
      const context = cols.eq(6).text().replace(/\s+/g, " ").trim();
      const href = cols.eq(2).find("a").first().attr("href") || meta.link;
      if (!title) return null;
      return {
        id: `${title}-${index}`,
        title,
        desc: `${provider} · 评分 ${score} · 票数 ${votes}${price ? ` · 价格 ${price}` : ""}${context ? ` · 上下文 ${context}` : ""}`,
        hot: textToHot(score),
        timestamp: undefined,
        url: href.startsWith("http") ? href : meta.link,
        mobileUrl: href.startsWith("http") ? href : meta.link,
      } satisfies ListItem;
    });
  const data: ListItem[] = results.filter((item): item is ListItem => item !== null);
  return createRouteData(meta, {
    fromCache: result.fromCache,
    updateTime: result.updateTime,
    data,
  });
};
