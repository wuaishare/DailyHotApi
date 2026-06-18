import type { ListItem } from "../types.js";
import { createRouteData, getHtml, textToHot } from "../utils/aiSources.js";
import { load } from "cheerio";

const meta = {
  name: "artificialanalysis",
  title: "Artificial Analysis",
  type: "模型综合评测榜",
  description: "Artificial Analysis 大模型综合排行榜",
  link: "https://artificialanalysis.ai/leaderboards/models",
};

const SUBTYPE_CONFIG = {
  models: {
    path: "/leaderboards/models",
    typeLabel: "模型综合评测榜",
  },
  providers: {
    path: "/leaderboards/providers",
    typeLabel: "模型厂商榜",
  },
} as const;

type ArtificialAnalysisSubtype = keyof typeof SUBTYPE_CONFIG;

const cleanText = (value = "") => value.replace(/\s+/g, " ").trim();
const buildDescription = (values: string[]) =>
  values.filter(Boolean).filter((value, index, array) => array.indexOf(value) === index).join(" · ");

const parseModelRows = (html: string) => {
  const $ = load(html);
  return $("table tbody tr")
    .toArray()
    .map((row, index) => {
      const cols = $(row).find("td");
      if (!cols.length) return null;
      const titleCell = cols.eq(0);
      const title =
        cleanText(titleCell.find(".font-semibold").clone().children().remove().end().text()) ||
        cleanText(titleCell.text());
      if (!title) return null;
      const provider = cleanText(cols.eq(2).text());
      const contextWindow = cleanText(cols.eq(1).text());
      const speed = cleanText(cols.eq(3).text());
      const price = cleanText(cols.eq(4).text());
      const href =
        $(row).find('a[href^="/models/"]').first().attr("href") ||
        $(row).find('a[href^="/"]').first().attr("href") ||
        "/leaderboards/models";
      return {
        id: `${title}-${index}`,
        title,
        desc: buildDescription([
          provider,
          contextWindow ? `上下文 ${contextWindow}` : "",
          speed ? `速度 ${speed}` : "",
          price ? `价格 ${price}` : "",
        ]),
        hot: textToHot(String(index + 1)),
        timestamp: undefined,
        url: href.startsWith("http")
          ? href
          : `https://artificialanalysis.ai${href}`,
        mobileUrl: href.startsWith("http")
          ? href
          : `https://artificialanalysis.ai${href}`,
      } satisfies ListItem;
    })
    .filter(Boolean) as ListItem[];
};

const parseProviderRows = (html: string) => {
  const regex =
    /\\\"short_name\\\":\\\"([^\\\"]+)\\\"[^]{0,200}?\\\"model_label\\\":\\\"([^\\\"]+)\\\"[^]{0,200}?\\\"host_label\\\":\\\"([^\\\"]+)\\\"[^]{0,400}?\\\"hosts_url\\\":\\\"([^\\\"]+)\\\"[^]{0,400}?\\\"price_1m_blended_0_3_1\\\":([^,}]+)[^]{0,500}?\\\"context_window_formatted\\\":\\\"([^\\\"]+)\\\"[^]{0,1800}?\\\"median_output_speed\\\":([^,}]+)[^]{0,600}?\\\"median_time_to_first_chunk\\\":([^,}]+)/g;
  const seen = new Set<string>();
  const data: ListItem[] = [];

  for (const match of html.matchAll(regex)) {
    const shortName = cleanText(match[1]?.replace(/\\u0026/g, "&"));
    const hostLabel = cleanText(match[3]?.replace(/\\u0026/g, "&"));
    const hostsUrl = cleanText(match[4]);
    if (!shortName || !hostLabel || !hostsUrl || seen.has(shortName)) {
      continue;
    }
    seen.add(shortName);
    const price = Number(match[5]);
    const contextWindow = cleanText(match[6]);
    const outputSpeed = Number(match[7]);
    const ttft = Number(match[8]);
    data.push({
      id: `${shortName}-${data.length}`,
      title: shortName,
      desc: buildDescription([
        hostLabel,
        Number.isFinite(outputSpeed) ? `速度 ${outputSpeed.toFixed(1)} tok/s` : "",
        Number.isFinite(ttft) ? `首 token ${ttft.toFixed(1)}s` : "",
        Number.isFinite(price) ? `混合价 $${price.toFixed(2)}/1M` : "",
        contextWindow ? `上下文 ${contextWindow}` : "",
      ]),
      hot: textToHot(String(data.length + 1)),
      timestamp: undefined,
      url: hostsUrl.startsWith("http")
        ? hostsUrl
        : `https://artificialanalysis.ai${hostsUrl}`,
      mobileUrl: hostsUrl.startsWith("http")
        ? hostsUrl
        : `https://artificialanalysis.ai${hostsUrl}`,
    });
  }

  return data;
};

export const handleRoute = async (
  c: { req?: { query?: (key: string) => string | undefined } },
  noCache: boolean
) => {
  const subtype = (c?.req?.query?.("type") || "models") as ArtificialAnalysisSubtype;
  const config = SUBTYPE_CONFIG[subtype] || SUBTYPE_CONFIG.models;
  const result = await getHtml(`https://artificialanalysis.ai${config.path}`, noCache);
  const data =
    subtype === "providers"
      ? parseProviderRows(result.data)
      : parseModelRows(result.data);

  return createRouteData(
    {
      ...meta,
      type: config.typeLabel,
      link: `https://artificialanalysis.ai${config.path}`,
    },
    {
      fromCache: result.fromCache,
      updateTime: result.updateTime,
      data,
    }
  );
};
