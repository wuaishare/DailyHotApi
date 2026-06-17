import type { RouterData } from "../types.js";
import { parseChineseNumber } from "../utils/getNum.js";
import { get } from "../utils/getData.js";

const meta = {
  name: "sina-ai",
  title: "新浪 AI",
  type: "官方资讯",
  description: "新浪 AI 热榜，补充中文 AI 资讯视角",
  link: "https://sinanews.sina.cn/",
};

interface SinaBase {
  base: {
    uniqueId: string;
    url: string;
  };
}

interface SinaInfo {
  title: string;
  hotValue: string;
}

interface SinaHotItem {
  base: SinaBase;
  info: SinaInfo;
}

interface SinaResponse {
  data: {
    hotList: SinaHotItem[];
  };
}

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const url = "https://newsapp.sina.cn/api/hotlist?newsId=HB-1-snhs%2Ftop_news_list-ai";
  const result = await get<SinaResponse>({ url, noCache });
  const list = result.data.data.hotList;
  const routeData: RouterData = {
    ...meta,
    total: list.length,
    fromCache: result.fromCache,
    updateTime: result.updateTime,
    data: list.map((v) => ({
      id: v.base.base.uniqueId,
      title: v.info.title,
      hot: parseChineseNumber(v.info.hotValue),
      timestamp: undefined,
      url: v.base.base.url,
      mobileUrl: v.base.base.url,
    })),
  };
  return routeData;
};
