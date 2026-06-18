import type { ListItem } from "../types.js";
import { createRouteData, extractJsonLd, getHtml, textToHot } from "../utils/aiSources.js";

const meta = {
  name: "aicpb-rankings",
  title: "AICPB",
  type: "全球 AI 产品热度榜",
  description: "AICPB 全球 AI 产品排行榜",
  link: "https://www.aicpb.com/ai-rankings/products/global-ai-rankings",
};

interface JsonLdItemList {
  "@type"?: string | string[];
  name?: string;
  description?: string;
  itemListElement?: Array<{
    position?: number;
    item?: {
      name?: string;
      url?: string;
      description?: string;
    };
  }>;
}

const SUBTYPE_CONFIG = {
  "global-web": {
    path: "/ai-rankings/products/global-ai-rankings/websites",
    rankingName: "Website",
    typeLabel: "全球网站热度榜",
  },
  "global-app": {
    path: "/ai-rankings/products/global-ai-rankings/apps",
    rankingName: "App",
    typeLabel: "全球 App 热度榜",
  },
  "china-web": {
    path: "/ai-rankings/products/china-ai-rankings",
    rankingName: "Website",
    typeLabel: "中国 AI 热度榜",
  },
  "chatbot-web": {
    path: "/ai-rankings/products/ai-chatbot-rankings",
    rankingName: "Website",
    typeLabel: "AI ChatBot 热度榜",
  },
  "search-web": {
    path: "/ai-rankings/products/ai-search-rankings",
    rankingName: "Website",
    typeLabel: "AI Search 热度榜",
  },
  "vibe-coding-web": {
    path: "/ai-rankings/products/vibe-coding-rankings",
    rankingName: "Website",
    typeLabel: "AI Vibe Coding 热度榜",
  },
  "agent-web": {
    path: "/ai-rankings/products/ai-agent-rankings",
    rankingName: "Website",
    typeLabel: "AI Agent 热度榜",
  },
  "openclaw-agent-web": {
    path: "/ai-rankings/products/openclaw-agent",
    rankingName: "Website",
    typeLabel: "Claw Agent 热度榜",
  },
  "character-web": {
    path: "/ai-rankings/products/ai-character-rankings",
    rankingName: "Website",
    typeLabel: "AI Character 热度榜",
  },
  "image-generator-web": {
    path: "/ai-rankings/products/ai-image-generator-rankings",
    rankingName: "Website",
    typeLabel: "AI Image Generator 热度榜",
  },
  "image-editor-web": {
    path: "/ai-rankings/products/ai-image-editor-rankings",
    rankingName: "Website",
    typeLabel: "AI Image Editor 热度榜",
  },
  "video-generator-web": {
    path: "/ai-rankings/products/ai-video-generators-rankings",
    rankingName: "Website",
    typeLabel: "AI Video Generator 热度榜",
  },
  "video-editor-web": {
    path: "/ai-rankings/products/ai-video-editing-rankings",
    rankingName: "Website",
    typeLabel: "AI Video Editor 热度榜",
  },
  "ppt-web": {
    path: "/ai-rankings/products/ai-ppt-rankings",
    rankingName: "Website",
    typeLabel: "AI PPT 热度榜",
  },
  "music-web": {
    path: "/ai-rankings/products/ai-music-generator-rankings",
    rankingName: "Website",
    typeLabel: "AI Music 热度榜",
  },
  "meeting-web": {
    path: "/ai-rankings/products/ai-meeting-assistant-rankings",
    rankingName: "Website",
    typeLabel: "AI Meeting 热度榜",
  },
  "ai-cloud-web": {
    path: "/ai-rankings/products/ai-cloud-rankings",
    rankingName: "Website",
    typeLabel: "AI Cloud 热度榜",
  },
  "global-growth-web": {
    path: "/ai-rankings/products/ai-global-growth-rate-ranking",
    rankingName: "Website",
    typeLabel: "全球增长榜",
  },
  "china-growth-web": {
    path: "/ai-rankings/products/china-ai-growth-rate-ranking",
    rankingName: "Website",
    typeLabel: "中国增长榜",
  },
  "openclaw-growth-web": {
    path: "/ai-rankings/products/claw-agent-growth-rate",
    rankingName: "Website",
    typeLabel: "Claw 增长榜",
  },
  "global-slowdown-web": {
    path: "/ai-rankings/products/ai-global-slowdown-rankings",
    rankingName: "Website",
    typeLabel: "全球放缓榜",
  },
} as const;

type AicpbSubtype = keyof typeof SUBTYPE_CONFIG;

const extractItemLists = (html: string) =>
  extractJsonLd<JsonLdItemList>(html).flatMap((item) => {
    const graph = (item as any)["@graph"];
    const nodes = Array.isArray(graph) ? graph : [item];
    return nodes.filter((node: any) => {
      const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
      return types.includes("ItemList");
    });
  });

export const handleRoute = async (
  c: { req?: { query?: (key: string) => string | undefined } },
  noCache: boolean
) => {
  const subtype = (c?.req?.query?.("type") || "global-web") as AicpbSubtype;
  const config = SUBTYPE_CONFIG[subtype] || SUBTYPE_CONFIG["global-web"];
  const url = `https://www.aicpb.com${config.path}`;
  const result = await getHtml(url, noCache);
  const itemLists = extractItemLists(result.data);
  const ranking =
    itemLists.find((item) => (item.name || "").includes(config.rankingName)) ||
    itemLists[0];

  const data: ListItem[] = ((ranking as any)?.itemListElement || []).map(
    (entry: any, index: number) => ({
      id: `${entry.item?.name || subtype}-${index}`,
      title: entry.item?.name || `${config.typeLabel} ${index + 1}`,
      desc: config.typeLabel,
      hot: textToHot(String(entry.position || 100 - index)),
      timestamp: undefined,
      url: entry.item?.url || url,
      mobileUrl: entry.item?.url || url,
    })
  );

  return createRouteData(
    {
      ...meta,
      type: config.typeLabel,
      link: url,
    },
    {
      fromCache: result.fromCache,
      updateTime: result.updateTime,
      data,
    }
  );
};
