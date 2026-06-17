import type { ListItem } from "../types.js";
import { createRouteData, getHtml, makeAbsoluteUrl } from "../utils/aiSources.js";
import { load } from "cheerio";

const meta = {
  name: "hf-papers",
  title: "Hugging Face Papers",
  type: "热门论文趋势榜",
  description: "Hugging Face 热门论文榜",
  link: "https://huggingface.co/papers/trending",
};

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const result = await getHtml(meta.link, noCache);
  const $ = load(result.data);
  const data: ListItem[] = [];
  $("article").each((index, el) => {
    if (index > 29) return false;
    const item = $(el);
    const paperLinks = item
      .find('a[href^="/papers/"]')
      .map((_, link) => {
        const node = $(link);
        return {
          href: node.attr("href") || "",
          title: node.text().replace(/\s+/g, " ").trim(),
        };
      })
      .get()
      .filter((entry) => entry.href && entry.title);
    const href = paperLinks[0]?.href || "";
    const title = paperLinks[0]?.title || "";
    if (!href || !title) return;
    const text = item.text().replace(/\s+/g, " ").trim();
    const githubLink =
      item
        .find('a[href^="https://github.com/"]')
        .first()
        .attr("href") || "";
    const arxivLink =
      item
        .find('a[href*="arxiv.org"]')
        .first()
        .attr("href") || "";
    const desc = text.replace(title, "").replace(/\s+/g, " ").trim();
    data.push({
      id: `hf-paper-${index}`,
      title,
      desc,
      author: "",
      hot: undefined,
      timestamp: undefined,
      url: makeAbsoluteUrl(href, "https://huggingface.co"),
      mobileUrl: githubLink || arxivLink || makeAbsoluteUrl(href, "https://huggingface.co"),
    });
  });

  return createRouteData(meta, {
    fromCache: result.fromCache,
    updateTime: result.updateTime,
    data,
  });
};
