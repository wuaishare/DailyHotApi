import type { ListItem, RouterData } from "../types.js";
import { createRouteData, postJson, textToHot } from "../utils/aiSources.js";

const meta = {
  name: "designarena",
  title: "DesignArena",
  type: "排行榜",
  description: "设计与前端 AI 模型排行榜",
  link: "https://www.designarena.ai/leaderboard",
};

const typeMap: Record<string, string> = {
  website: "Website",
  uicomponent: "UI Component",
  gamedev: "Game Dev",
  "3d": "3D Design",
  dataviz: "Data Visualization",
  svg: "SVG",
  slides: "Slides",
  image: "Image Generation",
  video: "Video",
};

interface DesignArenaRow {
  modelId: string;
  wins: number;
  losses: number;
  battles: number;
  winRate: number;
  elo: number;
  avgGenerationTimeMs?: number;
}

interface DesignArenaResponse {
  success?: boolean;
  arenaType?: string;
  category?: string;
  data?: DesignArenaRow[];
}

export const handleRoute = async (c: RouterData | any, noCache: boolean) => {
  const type = c?.req?.query?.("type") || "website";
  const category = typeMap[type] ? type : "website";
  const result = await postJson<DesignArenaResponse>(
    "https://www.designarena.ai/api/leaderboard",
    { arenaType: "models", category, variationName: "public" },
    noCache,
    {
      Origin: "https://www.designarena.ai",
      Referer: "https://www.designarena.ai/leaderboard",
    }
  );

  const list = result.data?.data || [];
  const data: ListItem[] = list.map((item) => ({
    id: item.modelId,
    title: item.modelId,
    desc: `ELO ${item.elo} · 胜率 ${item.winRate}% · 对战 ${item.battles}`,
    hot: item.elo,
    timestamp: undefined,
    url: meta.link,
    mobileUrl: meta.link,
  }));

  return createRouteData(
    {
      ...meta,
      type: `排行榜 · ${typeMap[category] || category}`,
      params: {
        type: {
          name: "榜单分类",
          type: typeMap,
        },
      },
    },
    {
      fromCache: result.fromCache,
      updateTime: result.updateTime,
      data,
    }
  );
};
