import { handleRoute as newsHandleRoute } from "./openai-news.js";
import { handleRoute as researchHandleRoute } from "./openai-research.js";
import type { RouterData } from "../types.js";

const meta = {
  name: "openai",
  title: "OpenAI",
  type: "官方新闻",
  subtitle: "官方新闻",
  description: "OpenAI 官方新闻与研究动态",
  link: "https://openai.com/news/",
};

export const handleRoute = async (
  c: { req?: { query?: (key: string) => string | undefined } },
  noCache: boolean
): Promise<RouterData> => {
  const type = c?.req?.query?.("type") || "news";
  const delegated = type === "research"
    ? await researchHandleRoute(undefined, noCache)
    : await newsHandleRoute(undefined, noCache);

  return {
    ...delegated,
    ...meta,
    title: "OpenAI",
    type: delegated.type,
    subtitle: delegated.subtitle || delegated.type,
    description: delegated.description || meta.description,
    link: type === "research" ? "https://openai.com/research/" : "https://openai.com/news/",
  };
};
