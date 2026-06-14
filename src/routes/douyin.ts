import type { RouterData } from "../types.js";
import { get } from "../utils/getData.js";
import { getTime } from "../utils/getTime.js";

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const listData = await getList(noCache);
  const routeData: RouterData = {
    name: "douyin",
    title: "抖音",
    type: "热榜",
    description: "实时上升热点",
    link: "https://www.douyin.com",
    total: listData.data?.length || 0,
    ...listData,
  };
  return routeData;
};

interface DouyinWordItem {
  sentence_id: string;
  word: string;
  event_time: string;
  hot_value: number;
  word_cover?: {
    uri?: string;
    url_list?: string[];
  };
}

interface DouyinResponse {
  data: {
    word_list?: DouyinWordItem[];
    trending_list?: DouyinWordItem[];
  };
}

const getList = async (noCache: boolean) => {
  const url =
    "https://www.douyin.com/aweme/v1/web/hot/search/list/?device_platform=webapp&aid=6383&channel=channel_pc_web&detail_list=1";
  const result = await get<DouyinResponse>({
    url,
    noCache,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      Referer: "https://www.douyin.com/hot",
      Accept: "application/json, text/plain, */*",
    },
  });
  const list = result.data?.data?.word_list || result.data?.data?.trending_list || [];
  return {
    ...result,
    data: list.map((v) => ({
      id: v.sentence_id,
      title: v.word,
      cover: v.word_cover?.url_list?.[0],
      timestamp: getTime(v.event_time),
      hot: v.hot_value,
      url: `https://www.douyin.com/hot/${v.sentence_id}`,
      mobileUrl: `https://www.douyin.com/hot/${v.sentence_id}`,
    })),
  };
};
