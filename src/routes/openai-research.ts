import { buildUnavailable } from "../utils/aiSources.js";

const meta = {
  name: "openai-research",
  title: "OpenAI Research",
  type: "官方资讯",
  description: "OpenAI 官方研究更新",
  link: "https://openai.com/research/",
};

export const handleRoute = async () =>
  buildUnavailable(
    meta,
    "OpenAI Research 当前请求会触发站点防护，已纳入高优先级待攻坚来源。"
  );
