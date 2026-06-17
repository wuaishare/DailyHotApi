import { createRouteData, getHtml, mapRssToListItems } from "../utils/aiSources.js";

const meta = {
  name: "huggingface-blog",
  title: "Hugging Face",
  type: "官方博客",
  description: "Hugging Face 官方博客与生态更新",
  link: "https://huggingface.co/blog",
};

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const result = await getHtml("https://huggingface.co/blog/feed.xml", noCache);
  const listData = await mapRssToListItems(result, {
    fallbackAuthor: "Hugging Face",
  });
  return createRouteData(meta, listData);
};
