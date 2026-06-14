import type { ListItem, RouterData } from "../types.js";
import { getCache, setCache } from "../utils/cache.js";
import { post } from "../utils/getData.js";
import { parseChineseNumber } from "../utils/getNum.js";
import UserAgent from "user-agents";

const KUAISHOU_CACHE_KEY = "route:kuaishou:hot-rank:v3";
const KUAISHOU_CACHE_TTL = 300;
const KUAISHOU_GRAPHQL_URL = "https://www.kuaishou.com/graphql";
const KUAISHOU_GRAPHQL_QUERY = `query hotRankQuery($page: String) {
  visionHotRank(page: $page) {
    result
    pcursor
    webPageArea
    items {
      rank
      id
      name
      viewCount
      hotValue
      iconUrl
      poster
      tagType
      photoIds
      __typename
    }
  }
}`;

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const listData = await getList(noCache);
  const routeData: RouterData = {
    name: "kuaishou",
    title: "快手",
    type: "热榜",
    description: "快手，拥抱每一种生活",
    link: "https://www.kuaishou.com/",
    total: listData.data?.length || 0,
    ...listData,
  };
  return routeData;
};

interface KuaishouHotItem {
  rank?: number;
  id: string;
  name: string;
  poster?: string | null;
  hotValue?: string | null;
  iconUrl?: string | null;
  photoIds?: string[];
  tagType?: string | null;
}

interface KuaishouGraphqlResponse {
  data?: {
    visionHotRank?: {
      result?: number;
      pcursor?: string;
      webPageArea?: string;
      items?: KuaishouHotItem[];
    };
  };
}

const normalizeKuaishouUrl = (url?: string | null) => {
  if (!url) return undefined;
  return url.replace(/^http:\/\//, "https://");
};

const parseHotValue = (hotValue?: string | null) => {
  if (!hotValue) return undefined;
  const value = parseChineseNumber(hotValue);
  return Number.isFinite(value) ? value : undefined;
};

const buildKuaishouItemUrl = (item: KuaishouHotItem) => {
  const photoId = item.photoIds?.[0];
  if (photoId) return `https://www.kuaishou.com/short-video/${photoId}`;
  return `https://www.kuaishou.com/search/${encodeURIComponent(item.name)}`;
};

const mapKuaishouItem = (item: KuaishouHotItem): ListItem => {
  const itemUrl = buildKuaishouItemUrl(item);
  return {
    id: item.id,
    title: item.name,
    cover: normalizeKuaishouUrl(item.poster),
    hot: parseHotValue(item.hotValue),
    timestamp: undefined,
    url: itemUrl,
    mobileUrl: itemUrl,
  };
};

const getList = async (noCache: boolean) => {
  const cachedData = await getCache(KUAISHOU_CACHE_KEY);
  if (!noCache && cachedData) {
    return {
      fromCache: true,
      updateTime: cachedData.updateTime,
      data: (cachedData.data as ListItem[]) || [],
    };
  }

  const userAgent = new UserAgent({
    deviceCategory: "desktop",
  });
  const result = await post<KuaishouGraphqlResponse>({
    url: KUAISHOU_GRAPHQL_URL,
    // 路由层只缓存解析成功后的榜单结果，避免把上游异常响应缓存成持续故障。
    noCache: true,
    headers: {
      "User-Agent": userAgent.toString(),
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      Origin: "https://www.kuaishou.com",
      Referer: "https://www.kuaishou.com/?isHome=1",
    },
    body: {
      operationName: "hotRankQuery",
      variables: {
        page: "home",
      },
      query: KUAISHOU_GRAPHQL_QUERY,
    },
  });

  const hotRankResult = result.data?.data?.visionHotRank;
  if (hotRankResult?.result !== 1) {
    throw new Error(
      `快手官方热榜接口返回异常: ${JSON.stringify(hotRankResult || result.data).slice(0, 300)}`,
    );
  }

  const listData = (hotRankResult.items || [])
    .filter((item) => item?.id && item?.name)
    .map(mapKuaishouItem);

  if (!listData.length) {
    throw new Error("快手官方热榜接口未返回有效榜单数据");
  }

  await setCache(
    KUAISHOU_CACHE_KEY,
    {
      data: listData,
      updateTime: result.updateTime,
    },
    KUAISHOU_CACHE_TTL,
  );

  return {
    fromCache: false,
    updateTime: result.updateTime,
    data: listData,
  };
};
