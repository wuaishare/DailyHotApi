import type { ListItem } from "../types.js";
import { createRouteData, getHtml, parseFirstTable, textToHot } from "../utils/aiSources.js";

const meta = {
  name: "artificialanalysis",
  title: "Artificial Analysis",
  type: "排行榜",
  description: "Artificial Analysis 大模型综合排行榜",
  link: "https://artificialanalysis.ai/leaderboards/models",
};

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const result = await getHtml(meta.link, noCache);
  const data: ListItem[] = parseFirstTable(result.data, (cols, index) => {
    if (cols.length < 4) return null;
    const [model, context, creator, score, price, speed, latency, totalResponse] = cols;
    return {
      id: `${model}-${index}`,
      title: model,
      desc: `${creator} · 上下文 ${context} · 智能指数 ${score}${price ? ` · 价格 ${price}` : ""}${speed ? ` · 速度 ${speed}` : ""}${latency ? ` · 延迟 ${latency}` : ""}${totalResponse ? ` · 响应 ${totalResponse}` : ""}`,
      hot: textToHot(score),
      timestamp: undefined,
      url: meta.link,
      mobileUrl: meta.link,
    };
  });
  return createRouteData(meta, {
    fromCache: result.fromCache,
    updateTime: result.updateTime,
    data,
  });
};
