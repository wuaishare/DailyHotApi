import { createRouteData, getHtml, mapRssToListItems } from "../utils/aiSources.js";

const meta = {
  name: "openai-news",
  title: "OpenAI",
  type: "官方新闻",
  description: "OpenAI 官方新闻与产品更新",
  link: "https://openai.com/news/",
};

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const result = await getHtml("https://openai.com/news/rss.xml", noCache);
  const listData = await mapRssToListItems(result, {
    fallbackAuthor: "OpenAI",
  });
  return createRouteData(meta, listData);
};
