import type { ListItem } from "../types.js";
import { createRouteData, getHtml, textToHot } from "../utils/aiSources.js";
import { load } from "cheerio";

const meta = {
  name: "llm-stats",
  title: "LLM Stats",
  type: "排行榜",
  description: "LLM Stats 模型性能与价格排行榜",
  link: "https://llm-stats.com/",
};

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const result = await getHtml(meta.link, noCache);
  const $ = load(result.data);
  const results: Array<ListItem | null> = $("table tbody tr")
    .toArray()
    .map((row, index) => {
      const cols = $(row).find("td");
      const modelCell = cols.eq(1);
      const modelTitle = modelCell.find('a[href^="/models/"]').first().text().replace(/\s+/g, " ").trim();
      const provider = modelCell.find("img").first().attr("alt") || "";
      const href = modelCell.find('a[href^="/models/"]').first().attr("href") || "";
      const llmStats = cols.eq(2).text().replace(/\s+/g, " ").trim();
      const reasoning = cols.eq(3).text().replace(/\s+/g, " ").trim();
      const coding = cols.eq(4).text().replace(/\s+/g, " ").trim();
      if (!modelTitle) return null;
      return {
        id: `${modelTitle}-${index}`,
        title: modelTitle,
        desc: `${provider} · LLM Stats ${llmStats} · Reasoning ${reasoning} · Coding ${coding}`,
        hot: textToHot(llmStats),
        timestamp: undefined,
        url: href ? `https://llm-stats.com${href}` : meta.link,
        mobileUrl: href ? `https://llm-stats.com${href}` : meta.link,
      } satisfies ListItem;
    });
  const data: ListItem[] = results.filter((item): item is ListItem => item !== null);
  return createRouteData(meta, {
    fromCache: result.fromCache,
    updateTime: result.updateTime,
    data,
  });
};
