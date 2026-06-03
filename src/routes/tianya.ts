import type { ListContext, ListItem, RouterData, RouterResType } from "../types.js";
import { get } from "../utils/getData.js";

const origin = "https://www.tianya.net";
const boardId = "1100";
const boardAlias = "legend";

const typeMap: Record<string, string> = {
  index: "官方首页",
  default: "默认",
  rank: "排行",
  featured: "精品",
  latest: "最新",
};

const defaultType = "index";
const cacheTtl = 21600;
const requestTimeout = 20000;

interface TianyaIndexPost {
  id: number | string;
  title: string;
  author?: string;
  boardName?: string;
  boardAlias?: string;
}

interface TianyaIndexResponse {
  status?: string;
  data?: Record<string, TianyaIndexPost[]>;
}

interface TianyaPost {
  id: string;
  title: string;
  author?: string;
  clickCount?: number;
  replyCount?: number;
  lastUpdateTime?: string;
  isSticky?: boolean;
}

interface TianyaListResponse {
  status?: string;
  code?: number;
  boardName?: string;
  boardAlias?: string;
  posts?: TianyaPost[];
  pagination?: {
    totalCount?: number;
  };
}

const indexSections: Array<[string, string]> = [
  ["mostVisited", "最多访问"],
  ["annualHot", "年度热帖"],
  ["recentReply", "最近回复"],
  ["readingHot", "阅读热帖"],
  ["newPublish", "最新发表"],
];

export const handleRoute = async (c: ListContext, noCache: boolean) => {
  const type = normalizeType(c.req.query("type"));
  const listData = await getList(type, noCache);
  const routeData: RouterData = {
    name: "tianya",
    title: "天涯",
    type: typeMap[type],
    description: "天涯社区官方 tianya.net 已恢复开放的天涯荟萃数据",
    params: {
      type: {
        name: "榜单分类",
        type: typeMap,
      },
    },
    link: `${origin}/`,
    total: listData.data?.length || 0,
    ...listData,
  };
  return routeData;
};

const normalizeType = (type?: string) => {
  if (type && type in typeMap) return type;
  return defaultType;
};

const buildPostUrl = (id: string | number) => `${origin}/post-${boardAlias}-${id}-1.html`;

const buildIndexItem = (
  post: TianyaIndexPost,
  sectionLabel: string,
): ListItem => ({
  id: `${sectionLabel}-${post.id}`,
  title: post.title,
  author: post.author || "",
  desc: `${sectionLabel}${post.boardName ? ` · ${post.boardName}` : ""}`,
  hot: undefined,
  timestamp: undefined,
  url: buildPostUrl(post.id),
  mobileUrl: buildPostUrl(post.id),
});

const buildListItem = (post: TianyaPost, index: number): ListItem => ({
  id: post.id || index + 1,
  title: post.title,
  author: post.author || "",
  desc: `点击 ${Number(post.clickCount || 0).toLocaleString()} · 回复 ${Number(
    post.replyCount || 0,
  ).toLocaleString()}${post.isSticky ? " · 置顶" : ""}`,
  hot: post.clickCount || post.replyCount || undefined,
  timestamp: undefined,
  url: buildPostUrl(post.id),
  mobileUrl: buildPostUrl(post.id),
});

const getIndexList = async (noCache: boolean): Promise<RouterResType> => {
  const result = await get<TianyaIndexResponse>({
    url: `${origin}/api/index_main`,
    noCache,
    ttl: cacheTtl,
    timeout: requestTimeout,
    headers: {
      Referer: `${origin}/`,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
    },
  });
  const seen = new Set<string | number>();
  const data = indexSections.flatMap(([key, label]) => {
    const posts = result.data?.data?.[key] || [];
    return posts.flatMap((post) => {
      if (!post?.id || !post?.title || seen.has(post.id)) return [];
      seen.add(post.id);
      return [buildIndexItem(post, label)];
    });
  });
  return {
    ...result,
    data,
  };
};

const getBoardList = async (type: string, noCache: boolean): Promise<RouterResType> => {
  const result = await get<TianyaListResponse>({
    url: `${origin}/api/bbs_list?boardId=${boardId}&tab=${type}&page=1`,
    noCache,
    ttl: cacheTtl,
    timeout: requestTimeout,
    headers: {
      Referer: `${origin}/board-${boardAlias}-${type}-1.html`,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
    },
  });
  const posts = result.data?.posts || [];
  return {
    ...result,
    data: posts.map(buildListItem),
  };
};

const getList = async (type: string, noCache: boolean): Promise<RouterResType> => {
  if (type === "index") {
    return getIndexList(noCache);
  }
  return getBoardList(type, noCache);
};
