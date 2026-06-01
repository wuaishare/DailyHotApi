import type { ListContext, RouterData, RouterResType } from "../types.js";
import { get } from "../utils/getData.js";

const typeMap: Record<string, string> = {
  movie_showing: "影院热映",
  movie_hot_gaia: "热门电影",
  movie_hot: "新片榜",
  movie_latest: "最新电影",
  tv_hot: "电视剧综合",
  tv_domestic: "国产剧",
  show_hot: "综艺",
  tv_american: "欧美剧",
  tv_japanese: "日剧",
  tv_korean: "韩剧",
  tv_animation: "动画",
  tv_documentary: "纪录片",
};

const defaultType = "movie_showing";

export const handleRoute = async (c: ListContext, noCache: boolean) => {
  const type = c.req.query("type") || defaultType;
  const listData = await getList(type, noCache);
  const routeData: RouterData = {
    name: "douban-movie",
    title: "豆瓣电影",
    type: typeMap[type] || typeMap[defaultType],
    params: {
      type: {
        name: "榜单分类",
        type: typeMap,
      },
    },
    link: "https://movie.douban.com/",
    total: listData.data?.length || 0,
    ...listData,
  };
  return routeData;
};

interface DoubanCollection {
  name?: string;
  description?: string;
}

interface DoubanRating {
  count?: number;
  value?: number;
}

interface DoubanPic {
  large?: string;
  normal?: string;
}

interface DoubanCover {
  url?: string;
}

interface DoubanItem {
  id: string;
  title?: string;
  card_subtitle?: string;
  info?: string;
  comment?: string;
  description?: string;
  episodes_info?: string;
  year?: string;
  release_date?: string;
  rating?: DoubanRating | null;
  pic?: DoubanPic;
  cover?: DoubanCover;
  url?: string;
}

interface DoubanResponse {
  start?: number;
  count?: number;
  total?: number;
  subject_collection?: DoubanCollection;
  subject_collection_items?: DoubanItem[];
}

const getNumbers = (text: string | undefined): number => {
  if (!text) return 0;
  const match = text.match(/\d+/);
  return match ? Number(match[0]) : 0;
};

const buildDesc = (item: DoubanItem) => {
  return (
    item.card_subtitle ||
    item.info ||
    item.episodes_info ||
    item.comment ||
    item.description ||
    ""
  );
};

const buildTitle = (item: DoubanItem) => {
  const score = item.rating?.value || 0;
  if (score > 0) {
    return `【${score.toFixed(1)}】${item.title || ""}`;
  }
  return item.title || "";
};

const buildLink = (item: DoubanItem) => {
  const id = getNumbers(item.id);
  if (id) {
    return {
      url: `https://movie.douban.com/subject/${id}/`,
      mobileUrl: `https://m.douban.com/movie/subject/${id}/`,
    };
  }
  return {
    url: item.url || "https://movie.douban.com/",
    mobileUrl: item.url || "https://m.douban.com/movie/",
  };
};

const getList = async (type: string, noCache: boolean): Promise<RouterResType> => {
  const url = `https://m.douban.com/rexxar/api/v2/subject_collection/${type}/items?count=18&start=0`;
  const result = await get<DoubanResponse>({
    url,
    noCache,
    headers: {
      Referer: "https://m.douban.com/",
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
    },
  });

  const list = result.data?.subject_collection_items || [];
  return {
    ...result,
    data: list.map((item, index) => {
      const links = buildLink(item);
      return {
        id: item.id || `${type}-${index + 1}`,
        title: buildTitle(item),
        cover: item.cover?.url || item.pic?.large || item.pic?.normal,
        desc: buildDesc(item),
        timestamp: undefined,
        hot: item.rating?.count || undefined,
        url: links.url,
        mobileUrl: links.mobileUrl,
      };
    }),
  };
};
