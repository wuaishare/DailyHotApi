import type { ListItem } from "../types.js";
import { createRouteData, getHtml, makeAbsoluteUrl } from "../utils/aiSources.js";
import { load } from "cheerio";

const meta = {
  name: "paperswithcode",
  title: "Papers with Code",
  type: "论文与代码趋势榜",
  description: "Papers with Code 热门论文与代码（当前由 Hugging Face Trending Papers 承载）",
  link: "https://huggingface.co/papers/trending",
};

type HuggingFaceTrendingPaper = {
  title: string;
  summary?: string;
  thumbnail?: string;
  publishedAt?: string;
  upvotes?: number;
  paper: {
    id: string;
    title: string;
    summary?: string;
    publishedAt?: string;
    upvotes?: number;
    githubRepo?: string;
    projectPage?: string;
  };
};

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const result = await getHtml(meta.link, noCache);
  const $ = load(result.data);
  const raw = $('[data-target="DailyPapers"]').attr("data-props");
  const dailyPapers = raw
    ? (JSON.parse(raw) as { dailyPapers?: HuggingFaceTrendingPaper[] }).dailyPapers || []
    : [];
  const data: ListItem[] = [];

  dailyPapers.slice(0, 30).forEach((item, index) => {
    const paper = item.paper || ({} as HuggingFaceTrendingPaper["paper"]);
    const href = `/papers/${paper.id}`;
    const title = paper.title || item.title;
    if (!paper.id || !title) return;

    const fallbackUrl = makeAbsoluteUrl(href, "https://huggingface.co");
    const url = paper.githubRepo || paper.projectPage || fallbackUrl;

    data.push({
      id: `pwc-${paper.id}`,
      title,
      desc: (paper.summary || item.summary || "").replace(/\s+/g, " ").trim(),
      cover: item.thumbnail ? makeAbsoluteUrl(item.thumbnail, "https://huggingface.co") : undefined,
      hot: paper.upvotes || item.upvotes || undefined,
      timestamp: Number.isFinite(Date.parse(item.publishedAt || paper.publishedAt || ""))
        ? Date.parse(item.publishedAt || paper.publishedAt || "")
        : undefined,
      url,
      mobileUrl: fallbackUrl,
    });
  });

  return createRouteData(meta, {
    fromCache: result.fromCache,
    updateTime: result.updateTime,
    data,
  });
};
