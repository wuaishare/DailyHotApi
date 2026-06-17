import type { ListItem } from "../types.js";
import { createRouteData, extractJsonLd, getHtml, textToHot } from "../utils/aiSources.js";

const meta = {
  name: "aicpb-rankings",
  title: "AICPB",
  type: "排行榜",
  description: "AICPB 全球 AI 产品排行榜",
  link: "https://www.aicpb.com/ai-rankings/products/global-ai-rankings",
};

interface JsonLdItemList {
  "@type"?: string | string[];
  name?: string;
  itemListElement?: Array<{
    position?: number;
    item?: {
      name?: string;
      url?: string;
      description?: string;
    };
  }>;
}

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const result = await getHtml(meta.link, noCache);
  const jsonlds = extractJsonLd<JsonLdItemList>(result.data);
  const ranking = jsonlds
    .flatMap((item) => {
      const graph = (item as any)["@graph"];
      return Array.isArray(graph) ? graph : [item];
    })
    .find((item: any) => {
      const types = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
      return types.includes("ItemList") && /Website/i.test(item.name || "");
    });

  const data: ListItem[] = ((ranking as any)?.itemListElement || []).map((entry: any, index: number) => ({
    id: `${entry.item?.name || "aicpb"}-${index}`,
    title: entry.item?.name || `AICPB ${index + 1}`,
    desc: entry.item?.description || "AICPB 全球 AI Website 榜单",
    hot: entry.position ? 100 - entry.position : undefined,
    timestamp: undefined,
    url: entry.item?.url || meta.link,
    mobileUrl: entry.item?.url || meta.link,
  }));

  return createRouteData(meta, {
    fromCache: result.fromCache,
    updateTime: result.updateTime,
    data,
  });
};
