import type { ListItem, RouterData } from "../types.js";
import { get } from "../utils/getData.js";
import { parseRSS } from "../utils/parseRSS.js";
import { getTime } from "../utils/getTime.js";
import { firstHtmlParagraphText, truncateText } from "../utils/text.js";

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const listData = await getList(noCache);
  const routeData: RouterData = {
    name: "producthunt",
    title: "Product Hunt",
    type: "官方 Feed",
    description: "Product Hunt 官方 Atom Feed，按 Feed 更新时间排序",
    link: "https://www.producthunt.com/feed",
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
  const data: ListItem[] = list.map((v, i) => {
    const desc = firstHtmlParagraphText(v.content) || v.contentSnippet || "";
    return {
      id: v.guid || v.link || i,
      title: truncateText(v.title || "", 80),
      desc,
      author: v.author || "",
      timestamp: getTime(v.pubDate || 0),
      hot: undefined,
      url: v.link || "",
      mobileUrl: v.link || "",
    };
  });

  return {
    ...result,
    data,
  };
};
