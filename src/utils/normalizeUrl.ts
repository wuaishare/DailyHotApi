import type { ListItem } from "../types.js";

const HTTP_PREFIX = "http://";
const HTTPS_PREFIX = "https://";

export const normalizeUrl = (url: string | undefined): string | undefined => {
  if (!url?.startsWith(HTTP_PREFIX)) {
    return url;
  }

  return `${HTTPS_PREFIX}${url.slice(HTTP_PREFIX.length)}`;
};

export const normalizeCoverUrls = (items: ListItem[]): ListItem[] =>
  items.map((item) => {
    if (!item.cover) {
      return item;
    }

    return {
      ...item,
      cover: normalizeUrl(item.cover),
    };
  });
