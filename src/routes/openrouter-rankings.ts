import { buildUnavailable } from "../utils/aiSources.js";

const meta = {
  name: "openrouter-rankings",
  title: "OpenRouter",
  type: "排行榜",
  description: "OpenRouter 官方模型使用热度排行榜",
  link: "https://openrouter.ai/rankings",
};

export const handleRoute = async () =>
  buildUnavailable(
    meta,
    "OpenRouter Rankings 当前为客户端动态渲染，公开稳定数据口尚未确认，已纳入高优先级待攻坚来源。"
  );
