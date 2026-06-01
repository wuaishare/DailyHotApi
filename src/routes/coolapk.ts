import type { ListItem, RouterData } from "../types.js";
import { get } from "../utils/getData.js";
import { genHeaders } from "../utils/getToken/coolapk.js";
import { getTime } from "../utils/getTime.js";
import { parseRSS } from "../utils/parseRSS.js";

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const listData = await getList(noCache);
  const routeData: RouterData = {
    name: "coolapk",
    title: "酷安",
    type: "热榜",
    link: "https://www.coolapk.com/",
    total: listData.data?.length || 0,
    ...listData,
  };
  return routeData;
};

interface CoolapkItem {
  id: string;
  message: string;
  tpic: string;
  username: string;
  ttitle: string;
  shareUrl: string;
}

interface CoolapkResponse {
  data: CoolapkItem[];
}

const getList = async (noCache: boolean) => {
  const url = `https://api.coolapk.com/v6/page/dataList?url=/feed/statList?cacheExpires=300&statType=day&sortField=detailnum&title=今日热门&title=今日热门&subTitle=&page=1`;
  try {
    const result = await get<CoolapkResponse>({
      url,
      noCache,
      headers: genHeaders(),
    });
    const list = result.data.data;
    return {
      ...result,
      data: list.map((v) => ({
        id: v.id,
        title: v.message,
        cover: v.tpic,
        author: v.username,
        desc: v.ttitle,
        timestamp: undefined,
        hot: undefined,
        url: v.shareUrl,
        mobileUrl: v.shareUrl,
      })),
    };
  } catch {
    const fallbackUrl = "https://rss.quickso.cn/coolapk/hot";
    const result = await get<string>({
      url: fallbackUrl,
      noCache,
      ttl: 300,
    });
    const list = await parseRSS(result.data);
    const data: ListItem[] = list.map((v, i) => {
      const cover = v.content?.match(/<img[^>]+src="([^"]+)"/i)?.[1];
      return {
        id: v.guid || v.link || i,
        title: v.title || "",
        cover,
        author: v.author || "",
        desc: v.contentSnippet || "",
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
  }
};
