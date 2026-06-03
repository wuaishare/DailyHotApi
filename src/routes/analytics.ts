import type { ListContext } from "../types.js";
import { config } from "../config.js";
import {
  appendAnalyticsEvent,
  buildAnalyticsDashboard,
  buildAnalyticsIdentity,
  readAnalyticsEvents,
  type AnalyticsEventPayload,
  type StoredAnalyticsEvent,
} from "../utils/analytics.js";

const getClientIp = (c: ListContext) =>
  c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
  c.req.header("x-real-ip") ||
  "0.0.0.0";

const getRequestPath = (c: ListContext) => {
  const url = new URL(c.req.url);
  return `${url.pathname}${url.search}`;
};

export const handleRoute = async (c: ListContext) => {
  const method = c.req.method.toUpperCase();

  if (method === "POST") {
    const payload = (await c.req.json()) as AnalyticsEventPayload;
    const userAgent = c.req.header("user-agent") || "";
    const { ipHash, uaHash } = buildAnalyticsIdentity(getClientIp(c), userAgent);
    const createdAt = new Date().toISOString();
    const event: StoredAnalyticsEvent = {
      id: `${createdAt}-${Math.random().toString(36).slice(2, 10)}`,
      createdAt,
      day: createdAt.slice(0, 10),
      ipHash,
      uaHash,
      path: getRequestPath(c),
      ...payload,
    };
    appendAnalyticsEvent(event);
    return {
      name: "analytics",
      title: "Analytics",
      type: "collect",
      total: 1,
      updateTime: createdAt,
      fromCache: false,
      data: [],
      message: "ok",
    };
  }

  const authHeader = c.req.header("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!config.ANALYTICS_ADMIN_TOKEN || token !== config.ANALYTICS_ADMIN_TOKEN) {
    return {
      name: "analytics",
      title: "Analytics",
      type: "dashboard",
      total: 0,
      updateTime: new Date().toISOString(),
      fromCache: false,
      data: [],
      message: "Unauthorized",
    };
  }

  const days = Number(c.req.query("days") || 30);
  const events = readAnalyticsEvents(days);
  const dashboard = buildAnalyticsDashboard(events);

  return {
    name: "analytics",
    title: "Analytics",
    type: "dashboard",
    total: events.length,
    updateTime: new Date().toISOString(),
    fromCache: false,
    data: [],
    dashboard,
  };
};
