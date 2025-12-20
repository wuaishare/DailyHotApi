import type { ListItem } from "../types.js";

/**
 * 将 HTTP URL 转换为 HTTPS URL
 * @param url 原始 URL
 * @returns 转换后的 HTTPS URL，如果输入无效则返回原值
 */
export const normalizeUrl = (url: string | undefined): string | undefined => {
  if (!url || typeof url !== "string") {
    return url;
  }
  // 如果 URL 以 http:// 开头，替换为 https://
  if (url.startsWith("http://")) {
    return url.replace("http://", "https://");
  }
  return url;
};

/**
 * 处理列表数据中的封面图 URL，将 HTTP 转换为 HTTPS
 * @param items 列表数据项数组
 * @returns 处理后的列表数据项数组
 */
export const normalizeCoverUrls = (items: ListItem[]): ListItem[] => {
  if (!Array.isArray(items)) {
    return items;
  }
  return items.map((item) => {
    if (item.cover) {
      return {
        ...item,
        cover: normalizeUrl(item.cover),
      };
    }
    return item;
  });
};

