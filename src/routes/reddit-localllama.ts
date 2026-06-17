import { buildUnavailable } from "../utils/aiSources.js";

const meta = {
  name: "reddit-localllama",
  title: "Reddit /r/LocalLLaMA",
  type: "社区热议",
  description: "LocalLLaMA 社区热门讨论",
  link: "https://www.reddit.com/r/LocalLLaMA/",
};

export const handleRoute = async () =>
  buildUnavailable(
    meta,
    "Reddit 当前对本环境请求有限制，LocalLLaMA 已纳入高优先级待攻坚来源。"
  );
