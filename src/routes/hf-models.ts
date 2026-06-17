import type { ListItem } from "../types.js";
import { createRouteData, getHtml, makeAbsoluteUrl } from "../utils/aiSources.js";
import { load } from "cheerio";

const meta = {
  name: "hf-models",
  title: "Hugging Face Models",
  type: "开源模型趋势榜",
  description: "Hugging Face 模型趋势榜",
  link: "https://huggingface.co/models?sort=trending",
};

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const result = await getHtml(meta.link, noCache);
  const $ = load(result.data);
  const data: ListItem[] = [];
  $("article.overview-card-wrapper").each((index, el) => {
    const item = $(el);
    const href = item.find("a").first().attr("href") || "";
    const title = item.find("h4").first().text().trim();
    const summary = item.text().replace(/\s+/g, " ").trim();
    if (!href || !title) return;
    const cover =
      item.find("img").first().attr("src") ||
      item.find("img").first().attr("data-src") ||
      undefined;
    const url = makeAbsoluteUrl(href, "https://huggingface.co");
    data.push({
      id: title,
      title,
      desc: summary,
      cover,
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
