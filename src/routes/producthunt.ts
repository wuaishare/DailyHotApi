import type { ListItem, RouterData } from "../types.js";
import { get } from "../utils/getData.js";
import { parseRSS } from "../utils/parseRSS.js";
import { getTime } from "../utils/getTime.js";

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const listData = await getList(noCache);
  const routeData: RouterData = {
    name: "producthunt",
    title: "Product Hunt",
    type: "Today",
    description: "The best new products, every day",
    link: "https://www.producthunt.com/",
    total: listData.data?.length || 0,
    ...listData,
  };
  return routeData;
};

const getList = async (noCache: boolean) => {
  const url = "https://www.producthunt.com/feed";
  const result = await get<string>({
    url,
    noCache,
  });
  const list = await parseRSS(result.data);
  const data: ListItem[] = list.map((v, i) => ({
    id: v.guid || v.link || i,
    title: v.title || "",
    desc: v.contentSnippet || v.content || "",
    author: v.author || "",
    timestamp: getTime(v.pubDate || 0),
    hot: undefined,
    url: v.link || "",
    mobileUrl: v.link || "",
  }));

  return {
    ...result,
    data,
  };
};
