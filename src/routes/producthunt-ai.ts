import type { ListItem } from "../types.js";
import { get } from "../utils/getData.js";
import { parseRSS } from "../utils/parseRSS.js";
import { getTime } from "../utils/getTime.js";
import { firstHtmlParagraphText, truncateText } from "../utils/text.js";
import { createRouteData, findCoverFromHtml, keywordFilter } from "../utils/aiSources.js";

const meta = {
  name: "producthunt-ai",
  title: "Product Hunt",
  type: "产品发现",
  description: "Product Hunt 中与 AI 相关的产品发现流",
  link: "https://www.producthunt.com/topics/artificial-intelligence",
};

const AI_KEYWORDS = [
  "ai",
  "llm",
  "agent",
  "openai",
  "gpt",
  "claude",
  "gemini",
  "voice",
  "image",
  "video",
  "design",
  "copilot",
];

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const result = await get<string>({
    url: "https://www.producthunt.com/feed",
    noCache,
    responseType: "text",
  });
  const list = await parseRSS(result.data);
  const data: ListItem[] = list.map((v, i) => {
    const desc = firstHtmlParagraphText(v.content) || v.contentSnippet || "";
    return {
      id: v.guid || v.link || i,
      title: truncateText(v.title || "", 80),
      desc,
      cover: findCoverFromHtml(v.content),
      author: v.author || "",
      timestamp: getTime(v.pubDate || 0),
      hot: undefined,
      url: v.link || "",
      mobileUrl: v.link || "",
    };
  });
  return createRouteData(meta, {
    fromCache: result.fromCache,
    updateTime: result.updateTime,
    data: keywordFilter(data, AI_KEYWORDS),
  });
};
