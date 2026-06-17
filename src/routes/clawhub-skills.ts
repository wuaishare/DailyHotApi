import type { ListItem } from "../types.js";
import { buildUnavailable, createRouteData, postJson } from "../utils/aiSources.js";

const meta = {
  name: "clawhub-skills",
  title: "ClawHub Skills",
  type: "Skills 推荐榜",
  description: "ClawHub 官方 Skills 生态与热门实用技能",
  link: "https://clawhub.ai/skills",
};

type ClawHubSkillItem = {
  ownerHandle: string;
  owner?: { image?: string; handle?: string };
  skill: {
    _id: string;
    displayName: string;
    slug: string;
    summary?: string;
    updatedAt?: number;
    stats?: {
      installsCurrent?: number;
      installsAllTime?: number;
      stars?: number;
      downloads?: number;
    };
  };
  latestVersion?: {
    version?: string;
    createdAt?: number;
  };
};

type ClawHubSkillResponse = {
  status: string;
  value: {
    page: ClawHubSkillItem[];
    hasMore?: boolean;
    nextCursor?: string | null;
  };
};

const SKILL_PRESET_MAP = {
  recommended: {
    typeLabel: "Skills 推荐榜",
    args: { dir: "desc", highlightedOnly: false, numItems: 25 },
  },
  featured: {
    typeLabel: "Skills 精选榜",
    args: { dir: "desc", highlightedOnly: true, numItems: 25 },
  },
  stars: {
    typeLabel: "Skills 星标榜",
    args: { dir: "desc", highlightedOnly: false, numItems: 25, sort: "stars" },
  },
  installs: {
    typeLabel: "Skills 安装榜",
    args: { dir: "desc", highlightedOnly: false, numItems: 25, sort: "installs" },
  },
  updated: {
    typeLabel: "Skills 最近更新榜",
    args: { dir: "desc", highlightedOnly: false, numItems: 25, sort: "updated" },
  },
  newest: {
    typeLabel: "Skills 最新发布榜",
    args: { dir: "desc", highlightedOnly: false, numItems: 25, sort: "newest" },
  },
  name: {
    typeLabel: "Skills 名称排序",
    args: { dir: "desc", highlightedOnly: false, numItems: 25, sort: "name" },
  },
  "mcp-tools": {
    typeLabel: "MCP Tools 技能榜",
    args: {
      dir: "desc",
      highlightedOnly: false,
      numItems: 25,
      categorySlug: "mcp-tools",
      categoryKeywords: ["mcp", "tool", "server"],
    },
  },
  prompts: {
    typeLabel: "Prompts 技能榜",
    args: {
      dir: "desc",
      highlightedOnly: false,
      numItems: 25,
      categorySlug: "prompts",
      categoryKeywords: ["prompt", "template", "system"],
    },
  },
  workflows: {
    typeLabel: "Workflows 技能榜",
    args: {
      dir: "desc",
      highlightedOnly: false,
      numItems: 25,
      categorySlug: "workflows",
      categoryKeywords: ["workflow", "pipeline", "chain"],
    },
  },
  "dev-tools": {
    typeLabel: "Dev Tools 技能榜",
    args: {
      dir: "desc",
      highlightedOnly: false,
      numItems: 25,
      categorySlug: "dev-tools",
      categoryKeywords: ["dev", "debug", "lint", "test", "build"],
    },
  },
  data: {
    typeLabel: "Data & APIs 技能榜",
    args: {
      dir: "desc",
      highlightedOnly: false,
      numItems: 25,
      categorySlug: "data",
      categoryKeywords: ["api", "data", "fetch", "http", "rest", "graphql"],
    },
  },
  security: {
    typeLabel: "Security 技能榜",
    args: {
      dir: "desc",
      highlightedOnly: false,
      numItems: 25,
      categorySlug: "security",
      categoryKeywords: ["security", "scan", "auth", "encrypt"],
    },
  },
  automation: {
    typeLabel: "Automation 技能榜",
    args: {
      dir: "desc",
      highlightedOnly: false,
      numItems: 25,
      categorySlug: "automation",
      categoryKeywords: ["auto", "cron", "schedule", "bot"],
    },
  },
  other: {
    typeLabel: "Other 技能榜",
    args: {
      dir: "desc",
      highlightedOnly: false,
      numItems: 25,
      categorySlug: "other",
      excludeCategoryKeywords: [
        "mcp",
        "tool",
        "server",
        "prompt",
        "template",
        "system",
        "workflow",
        "pipeline",
        "chain",
        "dev",
        "debug",
        "lint",
        "test",
        "build",
        "api",
        "data",
        "fetch",
        "http",
        "rest",
        "graphql",
        "security",
        "scan",
        "auth",
        "encrypt",
        "auto",
        "cron",
        "schedule",
        "bot",
      ],
    },
  },
} as const;

const formatNumber = (value?: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("zh-CN", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value)
    : "";

export const handleRoute = async (c: { req?: { query?: (key: string) => string | undefined } }, noCache: boolean) => {
  const type = c?.req?.query?.("type") || "recommended";
  const preset = SKILL_PRESET_MAP[type as keyof typeof SKILL_PRESET_MAP] || SKILL_PRESET_MAP.recommended;
  try {
    const result = await postJson<ClawHubSkillResponse>(
      "https://wry-manatee-359.convex.cloud/api/query",
      {
        path: "skills:listPublicPageV4",
        format: "convex_encoded_json",
        args: [preset.args],
      },
      noCache,
    );

    const data: ListItem[] = (result.data.value?.page || []).map((item) => ({
      id: item.skill._id,
      title: item.skill.displayName,
      desc: `@${item.ownerHandle} · 安装 ${formatNumber(item.skill.stats?.installsCurrent || item.skill.stats?.installsAllTime)} · Star ${formatNumber(item.skill.stats?.stars)}${item.latestVersion?.version ? ` · v${item.latestVersion.version}` : ""}`,
      hot: item.skill.stats?.installsCurrent || item.skill.stats?.installsAllTime,
      timestamp: item.skill.updatedAt || item.latestVersion?.createdAt,
      url: `https://clawhub.ai/${item.ownerHandle}/${item.skill.slug}`,
      mobileUrl: `https://clawhub.ai/${item.ownerHandle}/${item.skill.slug}`,
    }));

    return createRouteData(
      { ...meta, type: preset.typeLabel },
      {
        fromCache: result.fromCache,
        updateTime: result.updateTime,
        data,
      },
    );
  } catch (error: any) {
    const status = error?.response?.status;
    return buildUnavailable(
      { ...meta, type: preset.typeLabel },
      `ClawHub Skills 请求失败${status ? `（${status}）` : ""}，请稍后重试。`,
    );
  }
};
