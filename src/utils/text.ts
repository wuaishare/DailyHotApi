import { load } from "cheerio";

export const normalizeText = (text?: string) =>
  (text || "")
    .replace(/\s+/g, " ")
    .replace(/\s*([，。！？；：、])\s*/g, "$1")
    .trim();

export const htmlToText = (html?: string) =>
  normalizeText(load(html || "").text());

export const firstHtmlParagraphText = (html?: string) => {
  if (!html) return "";
  const $ = load(html);
  const firstParagraph = $("p").first().text();
  return normalizeText(firstParagraph || $.text());
};

export const stripLeadingTags = (text?: string) =>
  normalizeText(
    (text || "")
      .replace(/^(?:#([^#]+)#\s*)+/, "")
      .replace(/^(?:[「『〖【\[][^」』〗】\]]+[」』〗】\]]\s*)+/, "")
  );

export const truncateText = (text: string, maxLength = 72) => {
  const normalized = normalizeText(text);
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
};
