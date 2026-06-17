import type { ListItem } from "../types.js";
import { createRouteData, getHtml, parseFirstTable, textToHot } from "../utils/aiSources.js";

const meta = {
  name: "skills-rank",
  title: "Skills Rank",
  type: "Agent Skills 安装榜",
  description: "Agent Skills 安装量排行榜",
  link: "https://skills-rank.com/",
};

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const result = await getHtml(meta.link, noCache);
  const data: ListItem[] = parseFirstTable(result.data, (cols, index) => {
    if (cols.length < 5) return null;
    const [rank, skill, repo, desc, installs] = cols;
    return {
      id: `${skill}-${index}`,
      title: skill,
      desc: `${repo} · ${desc}`.trim(),
      hot: textToHot(installs),
      timestamp: undefined,
      url: `${meta.link}?q=${encodeURIComponent(skill)}`,
      mobileUrl: `${meta.link}?q=${encodeURIComponent(skill)}`,
    };
  });

  return createRouteData(meta, {
    fromCache: result.fromCache,
    updateTime: result.updateTime,
    data,
  });
};
