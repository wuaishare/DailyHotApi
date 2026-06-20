import type { ListItem } from "../types.js";
import { createRouteData, getJson } from "../utils/aiSources.js";

const meta = {
  name: "openrouter-rankings",
  title: "OpenRouter",
  type: "模型周度热度榜",
  description: "OpenRouter 官方模型真实调用热度与生态排行",
  link: "https://openrouter.ai/rankings",
};

type OpenRouterSeriesRow = {
  x: string;
  ys: Record<string, number>;
};

type OpenRouterSeriesResponse = {
  data: OpenRouterSeriesRow[] | { data?: OpenRouterSeriesRow[]; cachedAt?: string };
};

type OpenRouterModelRow = {
  date: string;
  model_permaslug: string;
  variant?: string;
  count?: number;
  total_completion_tokens?: number;
  total_prompt_tokens?: number;
  total_tool_calls?: number;
  change?: number | null;
  variant_permaslug?: string;
};

type OpenRouterModelResponse = {
  data: OpenRouterModelRow[];
};

type OpenRouterPerformanceRow = {
  id: string;
  slug: string;
  name: string;
  author?: string;
  request_count?: number;
  p50_latency?: number;
  p50_throughput?: number;
  best_latency_provider?: string;
  best_latency_price?: number;
  best_throughput_provider?: string;
  best_throughput_price?: number;
  provider_count?: number;
};

type OpenRouterPerformanceResponse = {
  data: OpenRouterPerformanceRow[];
};

type OpenRouterAppRow = {
  app_id: number;
  total_tokens: string;
  total_requests: number;
  rank: number;
  app: {
    title: string;
    description?: string;
    main_url?: string | null;
    origin_url?: string | null;
    slug?: string;
    categories?: string[];
  };
};

type OpenRouterAppResponse = {
  data: {
    day?: OpenRouterAppRow[];
    week?: OpenRouterAppRow[];
    month?: OpenRouterAppRow[];
  };
};

type OpenRouterBenchmarkEntry = {
  uid: string;
  permaslug?: string;
  aa_name?: string;
  heuristic_openrouter_slug?: string;
  score?: number;
};

type OpenRouterBenchmarkResponse = {
  data: {
    aaData?: Record<string, OpenRouterBenchmarkEntry[]>;
  };
};

const SUBTYPE_CONFIG = {
  "models-week": {
    kind: "models",
    url: "https://openrouter.ai/api/frontend/v1/rankings/models?view=week",
    typeLabel: "模型周度热度榜",
  },
  "market-share": {
    kind: "series",
    url: "https://openrouter.ai/api/frontend/v1/rankings/market-share",
    typeLabel: "厂商市场份额周榜",
  },
  performance: {
    kind: "performance",
    url: "https://openrouter.ai/api/frontend/v1/rankings/performance",
    typeLabel: "模型性能 / 吞吐榜",
  },
  tools: {
    kind: "series",
    url: "https://openrouter.ai/api/frontend/v1/rankings/tools",
    typeLabel: "工具调用模型榜",
  },
  images: {
    kind: "series",
    url: "https://openrouter.ai/api/frontend/v1/rankings/images",
    typeLabel: "多模态输入模型榜",
  },
  "image-output": {
    kind: "series",
    url: "https://openrouter.ai/api/frontend/v1/rankings/image-output",
    typeLabel: "图像生成模型榜",
  },
  "apps-week": {
    kind: "apps",
    url: "https://openrouter.ai/api/frontend/v1/rankings/apps",
    typeLabel: "AI 应用周榜",
    period: "week",
  },
  "apps-day": {
    kind: "apps",
    url: "https://openrouter.ai/api/frontend/v1/rankings/apps",
    typeLabel: "AI 应用日榜",
    period: "day",
  },
  "apps-month": {
    kind: "apps",
    url: "https://openrouter.ai/api/frontend/v1/rankings/apps",
    typeLabel: "AI 应用月榜",
    period: "month",
  },
  "benchmarks-aa-intelligence": {
    kind: "benchmarks",
    url: "https://openrouter.ai/api/frontend/v1/rankings/benchmarks",
    typeLabel: "AA 智能基准榜",
    seriesKey: "intelligence",
  },
  "use-case-programming": {
    kind: "series",
    url: "https://openrouter.ai/api/frontend/v1/rankings/use-case-category?category=programming",
    typeLabel: "编程场景模型榜",
  },
  "natural-language-english": {
    kind: "series",
    url: "https://openrouter.ai/api/frontend/v1/rankings/natural-language?tag=English",
    typeLabel: "英文场景模型榜",
  },
  "programming-language-python": {
    kind: "series",
    url: "https://openrouter.ai/api/frontend/v1/rankings/programming-language?tag=Python",
    typeLabel: "Python 场景模型榜",
  },
  "context-length-10k": {
    kind: "series",
    url: "https://openrouter.ai/api/frontend/v1/rankings/context-length?bucket=10K",
    typeLabel: "10K 上下文热度榜",
  },
} as const;

type OpenRouterSubtype = keyof typeof SUBTYPE_CONFIG;

const numberFormatter = new Intl.NumberFormat("en-US");

const formatNumber = (value?: number | string | null) => {
  const num = typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(num as number)) return value ? String(value) : "";
  return numberFormatter.format(num as number);
};

const formatCompact = (value?: number | string | null) => {
  const num = typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(num as number)) return value ? String(value) : "";
  return new Intl.NumberFormat("zh-CN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(num as number);
};

const mapLatestSeries = (rows: OpenRouterSeriesRow[], descPrefix: string): ListItem[] => {
  const latest = rows[rows.length - 1];
  if (!latest?.ys) return [];
  return Object.entries(latest.ys)
    .filter(([name]) => name && name !== "Others" && name !== "others")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([name, value], index) => ({
      id: `${latest.x}-${name}-${index}`,
      title: name,
      desc: `${descPrefix} ${latest.x} · 总量 ${formatCompact(value)}`,
      hot: value,
      timestamp: Date.parse(latest.x),
      url: meta.link,
      mobileUrl: meta.link,
    }));
};

export const handleRoute = async (c: { req?: { query?: (key: string) => string | undefined } }, noCache: boolean) => {
  const subtype = (c?.req?.query?.("type") || "models-week") as OpenRouterSubtype;
  const config = SUBTYPE_CONFIG[subtype] || SUBTYPE_CONFIG["models-week"];

  if (config.kind === "models") {
    const result = await getJson<OpenRouterModelResponse>(config.url, noCache);
    const latestDate = result.data.data
      .map((item) => item.date)
      .sort()
      .pop();
    const data = result.data.data
      .filter((item) => item.date === latestDate)
      .map((item) => {
        const totalTokens =
          (item.total_prompt_tokens || 0) + (item.total_completion_tokens || 0);
        return {
          item,
          totalTokens,
          title:
            item.variant_permaslug && item.variant_permaslug !== item.model_permaslug
              ? item.variant_permaslug
              : item.model_permaslug,
        };
      })
      .sort((a, b) => b.totalTokens - a.totalTokens)
      .slice(0, 50)
      .map(({ item, totalTokens, title }, index) => ({
        id: `${item.date}-${title}-${index}`,
        title,
        desc: `统计日 ${item.date} · 请求 ${formatNumber(item.count)} · 总 tokens ${formatCompact(totalTokens)}${item.total_tool_calls ? ` · 工具调用 ${formatNumber(item.total_tool_calls)}` : ""}`,
        hot: totalTokens,
        timestamp: Date.parse(item.date),
        url: meta.link,
        mobileUrl: meta.link,
      }));

    return createRouteData(
      { ...meta, type: config.typeLabel },
      {
        fromCache: result.fromCache,
        updateTime: result.updateTime,
        data,
      },
    );
  }

  if (config.kind === "series") {
    const result = await getJson<OpenRouterSeriesResponse>(config.url, noCache);
    const rows = Array.isArray(result.data.data)
      ? result.data.data
      : result.data.data?.data || [];
    const data = mapLatestSeries(rows, "统计周");
    return createRouteData(
      { ...meta, type: config.typeLabel },
      {
        fromCache: result.fromCache,
        updateTime: result.updateTime,
        data,
      },
    );
  }

  if (config.kind === "performance") {
    const result = await getJson<OpenRouterPerformanceResponse>(config.url, noCache);
    const data = (result.data.data || [])
      .slice()
      .sort((a, b) => (b.request_count || 0) - (a.request_count || 0))
      .slice(0, 50)
      .map((item) => ({
        id: item.id,
        title: item.name,
        desc: `${item.author || "OpenRouter"} · 请求 ${formatNumber(item.request_count)} · P50 延迟 ${formatNumber(item.p50_latency)}ms · 吞吐 ${formatNumber(item.p50_throughput)} tok/s${item.best_latency_provider ? ` · 最快提供商 ${item.best_latency_provider}` : ""}`,
        hot: item.request_count,
        timestamp: undefined,
        url: meta.link,
        mobileUrl: meta.link,
      }));
    return createRouteData(
      { ...meta, type: config.typeLabel },
      {
        fromCache: result.fromCache,
        updateTime: result.updateTime,
        data,
      },
    );
  }

  if (config.kind === "apps") {
    const result = await getJson<OpenRouterAppResponse>(config.url, noCache);
    const periodRows = result.data.data?.[config.period] || [];
    const data = periodRows.slice(0, 50).map((item) => ({
      id: `${config.period}-${item.app_id}`,
      title: item.app?.title || `App ${item.app_id}`,
      desc: `${(item.app?.categories || []).join(" / ") || "AI App"} · 请求 ${formatNumber(item.total_requests)} · Tokens ${formatCompact(item.total_tokens)}`,
      hot: Number.parseInt(item.total_tokens, 10),
      timestamp: undefined,
      url: item.app?.main_url || item.app?.origin_url || meta.link,
      mobileUrl: item.app?.main_url || item.app?.origin_url || meta.link,
    }));
    return createRouteData(
      { ...meta, type: config.typeLabel },
      {
        fromCache: result.fromCache,
        updateTime: result.updateTime,
        data,
      },
    );
  }

  if (config.kind === "benchmarks") {
    const result = await getJson<OpenRouterBenchmarkResponse>(config.url, noCache);
    const rows = result.data.data?.aaData?.[config.seriesKey] || [];
    const data = rows.slice(0, 50).map((item, index) => ({
      id: `${item.uid}-${index}`,
      title: item.heuristic_openrouter_slug || item.permaslug || item.aa_name || item.uid,
      desc: `${item.aa_name || item.uid} · 基准分 ${item.score}`,
      hot: item.score,
      timestamp: undefined,
      url: meta.link,
      mobileUrl: meta.link,
    }));
    return createRouteData(
      { ...meta, type: config.typeLabel },
      {
        fromCache: result.fromCache,
        updateTime: result.updateTime,
        data,
      },
    );
  }

  return createRouteData(meta, {
    fromCache: false,
    updateTime: new Date().toISOString(),
    data: [],
    message: "OpenRouter 榜单子分类暂未实现。",
  });
};
