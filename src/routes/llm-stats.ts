import type { ListItem } from "../types.js";
import { createRouteData, getHtml, textToHot } from "../utils/aiSources.js";
import { load } from "cheerio";

const meta = {
  name: "llm-stats",
  title: "LLM Stats",
  type: "模型性能 / 价格榜",
  description: "LLM Stats 模型性能与价格排行榜",
  link: "https://llm-stats.com/",
};

const SUBTYPE_CONFIG = {
  "llm-leaderboard": {
    path: "/leaderboards/llm-leaderboard",
    typeLabel: "排行榜总榜",
  },
  "open-llm-leaderboard": {
    path: "/leaderboards/open-llm-leaderboard",
    typeLabel: "开放模型总榜",
  },
  "best-ai-for-coding": {
    path: "/leaderboards/best-ai-for-coding",
    typeLabel: "编程能力榜",
  },
  "best-ai-for-writing": {
    path: "/leaderboards/best-ai-for-writing",
    typeLabel: "写作能力榜",
  },
  "best-ai-for-math": {
    path: "/leaderboards/best-ai-for-math",
    typeLabel: "数学能力榜",
  },
  "best-ai-for-research": {
    path: "/leaderboards/best-ai-for-research",
    typeLabel: "研究能力榜",
  },
  "best-ai-for-long-context": {
    path: "/leaderboards/best-ai-for-long-context",
    typeLabel: "长上下文榜",
  },
  "best-ai-for-tool-calling": {
    path: "/leaderboards/best-ai-for-tool-calling",
    typeLabel: "工具调用榜",
  },
  "best-ai-for-reasoning": {
    path: "/leaderboards/best-ai-for-reasoning",
    typeLabel: "推理能力榜",
  },
  "best-ai-for-image-generation": {
    path: "/leaderboards/best-ai-for-image-generation",
    typeLabel: "图像生成榜",
  },
  "best-ai-for-video-generation": {
    path: "/leaderboards/best-ai-for-video-generation",
    typeLabel: "视频生成榜",
  },
} as const;

type LlmStatsSubtype = keyof typeof SUBTYPE_CONFIG;

const cleanText = (value = "") => value.replace(/\s+/g, " ").trim();

const buildRowDescription = (values: string[]) => {
  const unique = values.filter(Boolean).filter((value, index, array) => array.indexOf(value) === index);
  return unique.slice(0, 5).join(" · ");
};

export const handleRoute = async (
  c: { req?: { query?: (key: string) => string | undefined } },
  noCache: boolean
) => {
  const subtype = (c?.req?.query?.("type") || "llm-leaderboard") as LlmStatsSubtype;
  const config = SUBTYPE_CONFIG[subtype] || SUBTYPE_CONFIG["llm-leaderboard"];
  const result = await getHtml(`https://llm-stats.com${config.path}`, noCache);
  const $ = load(result.data);

  const results: Array<ListItem | null> = $("table tbody tr")
    .toArray()
    .map((row, index) => {
      const cols = $(row).find("td");
      if (!cols.length) return null;

      const modelCell = cols.eq(0);
      const modelLink = modelCell.find('a[href^="/models/"]').first();
      const title = cleanText(modelLink.text());
      const href = modelLink.attr("href") || "";
      if (!title || !href) return null;

      const provider = cleanText(modelCell.find("div").last().text());
      const summary = cleanText(cols.eq(1).text());
      const strengths = cleanText(cols.eq(2).text());
      const caveat = cleanText(cols.eq(3).text());
      const pricingCell = cols.eq(4).clone();
      pricingCell.find("div").remove();
      const pricing = cleanText(pricingCell.text());
      const contextWindow = cleanText(cols.eq(4).find("div").text());

      return {
        id: `${title}-${index}`,
        title,
        desc: buildRowDescription([
          provider,
          summary,
          strengths,
          caveat,
          [pricing, contextWindow].filter(Boolean).join(" · "),
        ]),
        hot: textToHot(String(index + 1)),
        timestamp: undefined,
        url: href.startsWith("http") ? href : `https://llm-stats.com${href}`,
        mobileUrl: href.startsWith("http") ? href : `https://llm-stats.com${href}`,
      } satisfies ListItem;
    });

  return createRouteData(
    {
      ...meta,
      type: config.typeLabel,
      link: `https://llm-stats.com${config.path}`,
    },
    {
      fromCache: result.fromCache,
      updateTime: result.updateTime,
      data: results.filter((item): item is ListItem => item !== null),
    }
  );
};
