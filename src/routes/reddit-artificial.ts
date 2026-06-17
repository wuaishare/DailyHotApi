import { buildUnavailable } from "../utils/aiSources.js";

const meta = {
  name: "reddit-artificial",
  title: "Reddit /r/artificial",
  type: "社区热议",
  description: "artificial 社区热门讨论",
  link: "https://www.reddit.com/r/artificial/",
};

export const handleRoute = async () =>
  buildUnavailable(
    meta,
    "Reddit 当前对本环境请求有限制，/r/artificial 已纳入高优先级待攻坚来源。"
  );
