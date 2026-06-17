import type { ListItem, RouterData } from "../types.js";
import { get } from "../utils/getData.js";
import { load } from "cheerio";
import { createRouteData, keywordFilter, stripHtml } from "../utils/aiSources.js";

const meta = {
  name: "hackernews-ai",
  title: "Hacker News",
  type: "AI 热门讨论",
  description: "Hacker News 上的 AI 热门讨论",
  link: "https://news.ycombinator.com/",
};

const AI_KEYWORDS = [
  "ai",
  "llm",
  "gpt",
  "claude",
  "gemini",
  "openai",
  "anthropic",
  "deepmind",
  "hugging face",
  "mistral",
  "perplexity",
  "llama",
  "model",
];

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const baseUrl = "https://news.ycombinator.com";
  const result = await get<string>({
    url: baseUrl,
    noCache,
    responseType: "text",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    },
  });
  const $ = load(result.data);
  const stories: ListItem[] = [];
  $(".athing").each((_, el) => {
    const item = $(el);
    const id = item.attr("id") || "";
    const title = item.find(".titleline a").first().text().trim();
    const url = item.find(".titleline a").first().attr("href");
    const scoreText = $(`#score_${id}`).text().match(/\d+/)?.[0];
    const hot = scoreText ? parseInt(scoreText, 10) : undefined;

    if (id && title) {
      stories.push({
        id,
        title,
        desc: stripHtml(item.text()),
        hot,
        timestamp: undefined,
        url: url || `${baseUrl}/item?id=${id}`,
        mobileUrl: url || `${baseUrl}/item?id=${id}`,
      });
    }
  });
  const data = keywordFilter(stories, AI_KEYWORDS);
  return createRouteData(meta, {
    fromCache: result.fromCache,
    updateTime: result.updateTime,
    data,
  });
};
