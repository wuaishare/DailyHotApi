import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { config } from "../config.js";

const analyticsDir = path.resolve("logs/analytics");
const eventsFile = path.join(analyticsDir, "events.jsonl");

export type AnalyticsConsent = "accepted" | "rejected";

export type AnalyticsEventPayload = {
  event: string;
  source?: string;
  subtype?: string;
  category?: string;
  href?: string;
  referrer?: string;
  entry?: string;
  locale?: string;
  tz?: string;
  sessionId?: string;
  consent?: AnalyticsConsent;
  meta?: Record<string, unknown>;
};

export type StoredAnalyticsEvent = AnalyticsEventPayload & {
  id: string;
  createdAt: string;
  day: string;
  ipHash: string;
  uaHash: string;
  path: string;
};

type AggregateBucket = {
  pv: number;
  events: number;
  uniqueVisitors: Set<string>;
};

type RankingMetric = {
  source: string;
  clicks: number;
};

const ensureAnalyticsDir = () => {
  if (!config.ANALYTICS_USE_FILE) return;
  fs.mkdirSync(analyticsDir, { recursive: true });
};

const hashValue = (value: string) =>
  createHash("sha256")
    .update(`${config.ANALYTICS_SALT}:${value}`)
    .digest("hex");

export const buildAnalyticsIdentity = (ip: string, ua: string) => ({
  ipHash: hashValue(ip || "unknown-ip"),
  uaHash: hashValue(ua || "unknown-ua"),
});

export const appendAnalyticsEvent = (event: StoredAnalyticsEvent) => {
  if (!config.ANALYTICS_USE_FILE) return;
  ensureAnalyticsDir();
  fs.appendFileSync(eventsFile, `${JSON.stringify(event)}\n`, "utf8");
};

const toDay = (dateLike: string) => new Date(dateLike).toISOString().slice(0, 10);

const createBucket = (): AggregateBucket => ({
  pv: 0,
  events: 0,
  uniqueVisitors: new Set<string>(),
});

const toSummary = (bucket?: AggregateBucket) => ({
  pv: bucket?.pv || 0,
  uv: bucket?.uniqueVisitors.size || 0,
  events: bucket?.events || 0,
});

export const readAnalyticsEvents = (days: number = 30): StoredAnalyticsEvent[] => {
  if (!config.ANALYTICS_USE_FILE || !fs.existsSync(eventsFile)) return [];
  const minDate = Date.now() - days * 24 * 60 * 60 * 1000;
  const lines = fs.readFileSync(eventsFile, "utf8").split("\n").filter(Boolean);
  return lines
    .map((line) => {
      try {
        return JSON.parse(line) as StoredAnalyticsEvent;
      } catch {
        return null;
      }
    })
    .filter((event): event is StoredAnalyticsEvent => {
      if (!event?.createdAt) return false;
      return new Date(event.createdAt).getTime() >= minDate;
    });
};

export const buildAnalyticsDashboard = (events: StoredAnalyticsEvent[]) => {
  const byDay = new Map<string, AggregateBucket>();
  const byEntry = new Map<string, AggregateBucket>();
  const byCategory = new Map<string, AggregateBucket>();
  const bySource = new Map<string, AggregateBucket>();
  const rankingClicks = new Map<string, RankingMetric>();

  events.forEach((event) => {
    const visitorKey = `${event.ipHash}:${event.uaHash}`;
    const day = event.day || toDay(event.createdAt);
    const entry = event.entry || "direct";
    const category = event.category || "unknown";
    const source = event.source || "unknown";

    const dayBucket = byDay.get(day) || createBucket();
    dayBucket.events += 1;
    dayBucket.uniqueVisitors.add(visitorKey);
    if (event.event === "page_view") {
      dayBucket.pv += 1;
    }
    byDay.set(day, dayBucket);

    const entryBucket = byEntry.get(entry) || createBucket();
    entryBucket.events += 1;
    entryBucket.uniqueVisitors.add(visitorKey);
    if (event.event === "page_view") entryBucket.pv += 1;
    byEntry.set(entry, entryBucket);

    const categoryBucket = byCategory.get(category) || createBucket();
    categoryBucket.events += 1;
    categoryBucket.uniqueVisitors.add(visitorKey);
    if (event.event === "page_view") categoryBucket.pv += 1;
    byCategory.set(category, categoryBucket);

    const sourceBucket = bySource.get(source) || createBucket();
    sourceBucket.events += 1;
    sourceBucket.uniqueVisitors.add(visitorKey);
    if (event.event === "page_view") sourceBucket.pv += 1;
    bySource.set(source, sourceBucket);

    if (event.event === "rank_click" && event.source) {
      const metric = rankingClicks.get(event.source) || {
        source: event.source,
        clicks: 0,
      };
      metric.clicks += 1;
      rankingClicks.set(event.source, metric);
    }
  });

  const totals = events.reduce(
    (acc, event) => {
      if (event.event === "page_view") acc.pageViews += 1;
      acc.events += 1;
      acc.visitors.add(`${event.ipHash}:${event.uaHash}`);
      return acc;
    },
    { pageViews: 0, events: 0, visitors: new Set<string>() }
  );

  const recommendedHomeOrder = Array.from(rankingClicks.values())
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 30);

  return {
    overview: {
      pageViews: totals.pageViews,
      events: totals.events,
      uniqueVisitors: totals.visitors.size,
    },
    daily: Array.from(byDay.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([day, bucket]) => ({
        day,
        ...toSummary(bucket),
        dailyIp: bucket?.uniqueVisitors.size || 0,
      })),
    entries: Array.from(byEntry.entries())
      .sort((a, b) => b[1].pv - a[1].pv)
      .map(([entry, bucket]) => ({ entry, ...toSummary(bucket) })),
    categories: Array.from(byCategory.entries())
      .sort((a, b) => b[1].pv - a[1].pv)
      .map(([category, bucket]) => ({ category, ...toSummary(bucket) })),
    sources: Array.from(bySource.entries())
      .sort((a, b) => b[1].events - a[1].events)
      .map(([source, bucket]) => ({ source, ...toSummary(bucket) })),
    recommendedHomeOrder,
  };
};
