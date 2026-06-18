import type { ListItem } from "../types.js";
import { createRouteData, getHtml, textToHot } from "../utils/aiSources.js";
import { load } from "cheerio";

const meta = {
  name: "arena-ai",
  title: "Arena AI",
  type: "综合对话榜",
  description: "Arena AI 多模态与场景对战排行榜",
  link: "https://arena.ai/leaderboard",
};

const SUBTYPE_CONFIG = {
  text: { path: "/leaderboard/text", typeLabel: "综合对话榜" },
  agent: { path: "/leaderboard/agent", typeLabel: "Agent 对战榜" },
  "code-webdev": { path: "/leaderboard/code/webdev", typeLabel: "WebDev 对战榜" },
  "code-webdev-html": {
    path: "/leaderboard/code/webdev/html",
    typeLabel: "HTML WebDev 榜",
  },
  "code-webdev-react": {
    path: "/leaderboard/code/webdev/react",
    typeLabel: "React WebDev 榜",
  },
  "code-image-to-webdev": {
    path: "/leaderboard/code/image-to-webdev",
    typeLabel: "Image to WebDev 榜",
  },
  vision: { path: "/leaderboard/vision", typeLabel: "Vision 对战榜" },
  document: { path: "/leaderboard/document", typeLabel: "Document 对战榜" },
  search: { path: "/leaderboard/search", typeLabel: "Search 对战榜" },
  "text-to-image": { path: "/leaderboard/text-to-image", typeLabel: "Text to Image 榜" },
  "image-edit": { path: "/leaderboard/image-edit", typeLabel: "Image Edit 榜" },
  "text-to-video": { path: "/leaderboard/text-to-video", typeLabel: "Text to Video 榜" },
  "image-to-video": { path: "/leaderboard/image-to-video", typeLabel: "Image to Video 榜" },
  "video-edit": { path: "/leaderboard/video-edit", typeLabel: "Video Edit 榜" },
} as const;

type ArenaAiSubtype = keyof typeof SUBTYPE_CONFIG;

const cleanText = (value = "") => value.replace(/\s+/g, " ").trim();
const buildDescription = (values: string[]) =>
  values.filter(Boolean).filter((value, index, array) => array.indexOf(value) === index).join(" · ");

export const handleRoute = async (
  c: { req?: { query?: (key: string) => string | undefined } },
  noCache: boolean
) => {
  const subtype = (c?.req?.query?.("type") || "text") as ArenaAiSubtype;
  const config = SUBTYPE_CONFIG[subtype] || SUBTYPE_CONFIG.text;
  const result = await getHtml(`https://arena.ai${config.path}`, noCache);
  const $ = load(result.data);

  const rows = $("table tbody tr").toArray();
  const rawRows = rows
    .map((row, index) => {
      const cols = $(row).find("td");
      if (!cols.length) return null;
      const modelCell = cols.eq(2);
      const modelLink = modelCell.find('a[href^="https://"], a[href^="/models/"]').first();
      const title =
        cleanText(modelLink.text()) ||
        cleanText(modelCell.text()) ||
        cleanText(cols.eq(0).text());
      if (!title) return null;
      const href = modelLink.attr("href") || `https://arena.ai${config.path}`;
      const rank = cleanText(cols.eq(0).text()) || String(index + 1);
      const providerMeta =
        cleanText(modelCell.find(".text-text-secondary").text()) ||
        cleanText(modelCell.find("span").last().text());
      const elo = cleanText(cols.eq(3).text());
      const votes = cleanText(cols.eq(4).text());
      const price = cleanText(cols.eq(5).text());
      const contextWindow = cleanText(cols.eq(6).text());
      return {
        id: `${title}-${index}`,
        title,
        desc: buildDescription([
          providerMeta,
          elo ? `Elo ${elo}` : "",
          votes ? `样本 ${votes}` : "",
          price ? `价格 ${price}` : "",
          contextWindow ? `上下文 ${contextWindow}` : "",
        ]),
        hot: textToHot(rank),
        timestamp: undefined,
        url: href.startsWith("http") ? href : `https://arena.ai${href}`,
        mobileUrl: href.startsWith("http") ? href : `https://arena.ai${href}`,
      } satisfies ListItem;
    })
    .filter(Boolean);
  const data = rawRows as ListItem[];

  return createRouteData(
    {
      ...meta,
      type: config.typeLabel,
      link: `https://arena.ai${config.path}`,
    },
    {
      fromCache: result.fromCache,
      updateTime: result.updateTime,
      data,
    }
  );
};
