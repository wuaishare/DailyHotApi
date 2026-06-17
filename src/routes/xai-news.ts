import { buildUnavailable } from "../utils/aiSources.js";

const meta = {
  name: "xai-news",
  title: "xAI",
  type: "官方资讯",
  description: "xAI 官方新闻与发布更新",
  link: "https://x.ai/news",
};

export const handleRoute = async () =>
  buildUnavailable(meta, "xAI News 当前受站点防护限制，已纳入高优先级待攻坚来源。");
