import type { ListItem } from "../types.js";
import { createRouteData, getHtml, makeAbsoluteUrl } from "../utils/aiSources.js";
import { load } from "cheerio";

const meta = {
  name: "paperswithcode",
  title: "Papers with Code",
  type: "开源 / 论文",
  description: "Papers with Code 热门论文与代码",
  link: "https://paperswithcode.com/sota",
};

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const result = await getHtml(meta.link, noCache);
  const $ = load(result.data);
  const data: ListItem[] = [];
  $("article").each((index, el) => {
    if (index > 29) return false;
    const item = $(el);
    const titleLink = item.find('a[href^="/papers/"]').first();
    const href = titleLink.attr("href") || "";
    const title = titleLink.text().replace(/\s+/g, " ").trim();
    if (!href || !title) return;
    const desc = item.text().replace(/\s+/g, " ").trim();
    data.push({
      id: `pwc-${index}`,
      title,
      desc,
      hot: undefined,
      timestamp: undefined,
      url: makeAbsoluteUrl(href, "https://paperswithcode.com"),
      mobileUrl: makeAbsoluteUrl(href, "https://paperswithcode.com"),
    });
  });
  return createRouteData(meta, {
    fromCache: result.fromCache,
    updateTime: result.updateTime,
    data,
  });
};
