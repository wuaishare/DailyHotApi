import type { ListItem } from "../types.js";
import { buildUnavailable, createRouteData } from "../utils/aiSources.js";

const meta = {
  name: "clawhub-plugins",
  title: "ClawHub Plugins",
  type: "插件推荐榜",
  description: "ClawHub 官方 Plugins 生态与实用插件榜单",
  link: "https://clawhub.ai/plugins",
};

type ClawHubPluginItem = {
  channel: string;
  createdAt: number;
  displayName: string;
  family: string;
  isOfficial: boolean;
  latestVersion?: string | null;
  name: string;
  ownerHandle: string;
  runtimeId?: string;
  stats?: {
    downloads?: number;
    installs?: number;
    stars?: number;
    versions?: number;
  };
  summary?: string;
  updatedAt?: number;
  verificationTier?: string;
};

type ClawHubPluginResponse = {
  items: ClawHubPluginItem[];
  nextCursor?: string | null;
  totalCount?: number;
};

const PLUGIN_PRESET_MAP = {
  recommended: {
    typeLabel: "插件推荐榜",
    params: { sort: "recommended" },
  },
  featured: {
    typeLabel: "插件精选榜",
    params: { featured: "true" },
  },
  installs: {
    typeLabel: "插件安装榜",
    params: { sort: "installs" },
  },
  updated: {
    typeLabel: "插件最近更新榜",
    params: { sort: "updated" },
  },
  official: {
    typeLabel: "官方插件榜",
    params: { isOfficial: "true", sort: "installs" },
  },
  channels: {
    typeLabel: "Channels 插件榜",
    params: { category: "channels", sort: "installs" },
  },
  "mcp-tooling": {
    typeLabel: "MCP & Tooling 插件榜",
    params: { category: "mcp-tooling", sort: "installs" },
  },
  data: {
    typeLabel: "Data & APIs 插件榜",
    params: { category: "data", sort: "installs" },
  },
  security: {
    typeLabel: "Security 插件榜",
    params: { category: "security", sort: "installs" },
  },
  observability: {
    typeLabel: "Observability 插件榜",
    params: { category: "observability", sort: "installs" },
  },
  automation: {
    typeLabel: "Automation 插件榜",
    params: { category: "automation", sort: "installs" },
  },
  deployment: {
    typeLabel: "Deployment 插件榜",
    params: { category: "deployment", sort: "installs" },
  },
  "dev-tools": {
    typeLabel: "Developer Tools 插件榜",
    params: { category: "dev-tools", sort: "installs" },
  },
} as const;

const formatNumber = (value?: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("zh-CN", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value)
    : "";

const familyLabel = (family?: string) => {
  if (family === "code-plugin") return "Code Plugin";
  if (family === "bundle-plugin") return "Bundle Plugin";
  return "Plugin";
};

export const handleRoute = async (c: { req?: { query?: (key: string) => string | undefined } }, noCache: boolean) => {
  const type = c?.req?.query?.("type") || "recommended";
  const preset = PLUGIN_PRESET_MAP[type as keyof typeof PLUGIN_PRESET_MAP] || PLUGIN_PRESET_MAP.recommended;
  const params = new URLSearchParams({ limit: "25", ...preset.params });
  try {
    const response = await fetch(`https://clawhub.ai/api/v1/plugins?${params.toString()}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
        Accept: "application/json",
        Referer: "https://clawhub.ai/plugins",
        Origin: "https://clawhub.ai",
        "Cache-Control": noCache ? "no-cache" : "max-age=0",
      },
    });
    if (!response.ok) {
      return buildUnavailable(
        { ...meta, type: preset.typeLabel },
        `ClawHub Plugins 当前子分类暂无公开稳定数据（${response.status}）。`,
      );
    }
    const payload = (await response.json()) as ClawHubPluginResponse;

    const data: ListItem[] = (payload.items || []).map((item) => ({
      id: item.runtimeId || item.name,
      title: item.displayName,
      desc: `${familyLabel(item.family)} · @${item.ownerHandle} · 安装 ${formatNumber(item.stats?.installs)} · 下载 ${formatNumber(item.stats?.downloads)}${item.isOfficial ? " · 官方" : ""}`,
      hot: item.stats?.installs,
      timestamp: item.updatedAt || item.createdAt,
      url: `https://clawhub.ai/plugins/${encodeURIComponent(item.name)}`,
      mobileUrl: `https://clawhub.ai/plugins/${encodeURIComponent(item.name)}`,
    }));

    return createRouteData(
      { ...meta, type: preset.typeLabel },
      {
        fromCache: false,
        updateTime: new Date().toISOString(),
        data,
      },
    );
  } catch (error: any) {
    const status = error?.response?.status;
    return buildUnavailable(
      { ...meta, type: preset.typeLabel },
      `ClawHub Plugins 当前子分类暂无公开稳定数据${status ? `（${status}）` : ""}。`,
    );
  }
};
