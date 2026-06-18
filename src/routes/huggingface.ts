import { handleRoute as blogHandleRoute } from "./huggingface-blog.js";
import { handleRoute as modelsHandleRoute } from "./hf-models.js";
import { handleRoute as papersHandleRoute } from "./hf-papers.js";
import type { RouterData } from "../types.js";

const meta = {
  name: "huggingface",
  title: "Hugging Face",
  type: "官方博客",
  subtitle: "官方博客",
  description: "Hugging Face 官方博客、模型与论文趋势榜",
  link: "https://huggingface.co/blog",
};

export const handleRoute = async (
  c: { req?: { query?: (key: string) => string | undefined } },
  noCache: boolean
): Promise<RouterData> => {
  const type = c?.req?.query?.("type") || "blog";
  const delegated =
    type === "models"
      ? await modelsHandleRoute(undefined, noCache)
      : type === "papers"
      ? await papersHandleRoute(undefined, noCache)
      : await blogHandleRoute(undefined, noCache);

  const link =
    type === "models"
      ? "https://huggingface.co/models?sort=trending"
      : type === "papers"
      ? "https://huggingface.co/papers/trending"
      : "https://huggingface.co/blog";

  return {
    ...delegated,
    ...meta,
    title: "Hugging Face",
    type: delegated.type,
    subtitle: delegated.subtitle || delegated.type,
    description: delegated.description || meta.description,
    link,
  };
};
