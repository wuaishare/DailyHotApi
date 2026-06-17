import type { ListItem } from "../types.js";
import { buildUnavailable, createRouteData, makeAbsoluteUrl } from "../utils/aiSources.js";
import { load } from "cheerio";

const meta = {
  name: "openai-research",
  title: "OpenAI Research",
  type: "官方资讯",
  description: "OpenAI 官方研究更新",
  link: "https://openai.com/research/",
};

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const response = await fetch(meta.link, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      "Cache-Control": noCache ? "no-cache" : "max-age=0",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    return buildUnavailable(
      meta,
      `OpenAI Research 请求失败（${response.status}），当前已自动切回降级状态。`,
    );
  }

  const html = await response.text();
  const $ = load(html);
  const seen = new Set<string>();
  const data: ListItem[] = [];

  $('a[href^="/index/"]').each((index, el) => {
    const href = $(el).attr("href") || "";
    const url = makeAbsoluteUrl(href, "https://openai.com");
    if (!href || !url || seen.has(url)) return;

    const title = $(el)
      .find("p")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();
    if (!title) return;

    seen.add(url);

    const tag = $(el)
      .find("span")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();
    const dateRaw = $(el).find("time").first().attr("dateTime") || $(el).find("time").first().text();
    const metaLine = $(el)
      .find("p")
      .eq(1)
      .text()
      .replace(/\s+/g, " ")
      .trim();
    const desc =
      metaLine
        .replace(/([A-Za-z])([A-Z][a-z]{2} \d{1,2}, \d{4})/, "$1 · $2")
        .replace(/(\d{4})(\d+ min read)/i, "$1 · $2") ||
      [tag, dateRaw].filter(Boolean).join(" · ");

    data.push({
      id: `openai-research-${index}`,
      title,
      desc,
      hot: undefined,
      timestamp: Number.isFinite(Date.parse(dateRaw)) ? Date.parse(dateRaw) : undefined,
      url,
      mobileUrl: url,
    });
  });

  return createRouteData(meta, {
    fromCache: false,
    updateTime: new Date().toISOString(),
    data: data.slice(0, 30),
  });
};
