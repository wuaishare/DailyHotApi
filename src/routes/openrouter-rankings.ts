import { config } from "../config.js";
import type { ListItem } from "../types.js";
import { buildUnavailable, createRouteData, getJson } from "../utils/aiSources.js";

const meta = {
  name: "openrouter-rankings",
  title: "OpenRouter",
  type: "排行榜",
  description: "OpenRouter 官方模型使用热度排行榜",
  link: "https://openrouter.ai/rankings",
};

type OpenRouterRankingRow = {
  date: string;
  model_permaslug: string;
  total_tokens: string;
};

type OpenRouterRankingResponse = {
  data: OpenRouterRankingRow[];
  meta: {
    as_of: string;
    end_date: string;
    start_date: string;
    version: string;
  };
};

const formatTokenCount = (value: string) => {
  const num = Number.parseInt(value, 10);
  if (!Number.isFinite(num)) return value;
  return new Intl.NumberFormat("en-US").format(num);
};

export const handleRoute = async (_: undefined, noCache: boolean) => {
  if (!config.OPENROUTER_API_KEY) {
    return buildUnavailable(
      meta,
      "OpenRouter Rankings 已接入官方 datasets API，但当前环境未配置 OPENROUTER_API_KEY，暂不展示该榜单。"
    );
  }

  try {
    const result = await getJson<OpenRouterRankingResponse>(
      "https://openrouter.ai/api/v1/datasets/rankings-daily",
      noCache,
      {
        Authorization: `Bearer ${config.OPENROUTER_API_KEY}`,
      },
    );

    const latestDate = result.data.meta.end_date;
    const data: ListItem[] = result.data.data
      .filter((item) => item.date === latestDate && item.model_permaslug !== "other")
      .sort((a, b) => Number.parseInt(b.total_tokens, 10) - Number.parseInt(a.total_tokens, 10))
      .slice(0, 50)
      .map((item, index) => ({
        id: `${item.date}-${item.model_permaslug}-${index}`,
        title: item.model_permaslug,
        desc: `统计日 ${item.date} · 总 tokens ${formatTokenCount(item.total_tokens)}`,
        hot: Number.parseInt(item.total_tokens, 10),
        timestamp: Date.parse(item.date),
        url: meta.link,
        mobileUrl: meta.link,
      }));

    return createRouteData(meta, {
      fromCache: result.fromCache,
      updateTime: result.data.meta.as_of || result.updateTime,
      data,
      message: `来自 OpenRouter 官方 datasets/rankings-daily，当前展示 ${latestDate} 的 Top 50 模型。`,
    });
  } catch (error: any) {
    const status = error?.response?.status;
    return buildUnavailable(
      meta,
      `OpenRouter Rankings 官方接口请求失败${status ? `（${status}）` : ""}，请检查 OPENROUTER_API_KEY 或稍后重试。`,
    );
  }
};
