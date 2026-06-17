import { buildUnavailable } from "../utils/aiSources.js";

const meta = {
  name: "perplexity-blog",
  title: "Perplexity",
  type: "官方资讯",
  description: "Perplexity 官方博客与产品更新",
  link: "https://www.perplexity.ai/hub/blog",
};

export const handleRoute = async () =>
  buildUnavailable(
    meta,
    "Perplexity Blog 当前受站点防护限制，已纳入高优先级待攻坚来源。"
  );
