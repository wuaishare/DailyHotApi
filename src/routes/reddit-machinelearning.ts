import { buildUnavailable } from "../utils/aiSources.js";

const meta = {
  name: "reddit-machinelearning",
  title: "Reddit /r/MachineLearning",
  type: "社区热议",
  description: "MachineLearning 社区热门讨论",
  link: "https://www.reddit.com/r/MachineLearning/",
};

export const handleRoute = async () =>
  buildUnavailable(
    meta,
    "Reddit 当前对本环境请求有限制，MachineLearning 已纳入高优先级待攻坚来源。"
  );
