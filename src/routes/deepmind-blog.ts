import { createRouteData, getHtml, mapRssToListItems } from "../utils/aiSources.js";

const meta = {
  name: "deepmind-blog",
  title: "DeepMind",
  type: "官方博客",
  description: "Google DeepMind 官方新闻与研究博客",
  link: "https://deepmind.google/blog/",
};

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const result = await getHtml("https://deepmind.google/blog/rss.xml", noCache);
  const listData = await mapRssToListItems(result, {
    fallbackAuthor: "Google DeepMind",
  });
  return createRouteData(meta, listData);
};
