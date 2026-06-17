import { handleRoute as pluginHandleRoute } from "./clawhub-plugins.js";
import { handleRoute as skillHandleRoute } from "./clawhub-skills.js";
import type { RouterData } from "../types.js";

const meta = {
  name: "clawhub",
  title: "ClawHub",
  type: "Skills 推荐榜",
  subtitle: "Skills 推荐榜",
  description: "ClawHub 技能与插件生态榜单",
  link: "https://clawhub.ai/skills",
};

const toDelegatedContext = (value: string) => ({
  req: {
    query: (key: string) => (key === "type" ? value : undefined),
  },
});

export const handleRoute = async (
  c: { req?: { query?: (key: string) => string | undefined } },
  noCache: boolean,
): Promise<RouterData> => {
  const type = c?.req?.query?.("type") || "skills-recommended";
  const isPlugin = type.startsWith("plugins-");
  const delegatedType = type.replace(/^skills-/, "").replace(/^plugins-/, "");
  const delegatedContext = toDelegatedContext(delegatedType);
  const routeData = isPlugin
    ? await pluginHandleRoute(delegatedContext, noCache)
    : await skillHandleRoute(delegatedContext, noCache);

  return {
    ...routeData,
    ...meta,
    title: "ClawHub",
    type: routeData.type,
    subtitle: routeData.subtitle || routeData.type,
    description: routeData.description || meta.description,
    link: isPlugin ? "https://clawhub.ai/plugins" : "https://clawhub.ai/skills",
  };
};
