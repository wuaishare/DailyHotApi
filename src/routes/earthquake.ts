import type { RouterData } from "../types.js";
import { get } from "../utils/getData.js";
import { getTime } from "../utils/getTime.js";

const mappings: Record<string, string> = {
  O_TIME: "发震时刻(UTC+8)",
  LOCATION_C: "参考位置",
  M: "震级(M)",
  EPI_LAT: "纬度(°)",
  EPI_LON: "经度(°)",
  EPI_DEPTH: "深度(千米)",
  SAVE_TIME: "录入时间",
};

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const listData = await getList(noCache);
  const routeData: RouterData = {
    name: "earthquake",
    title: "中国地震台",
    type: "地震速报",
    link: "https://news.ceic.ac.cn/",
    total: listData.data?.length || 0,
    ...listData,
  };
  return routeData;
};

interface EarthquakeItem extends Record<string, string> {
  EventID: string;
  time: string;
  ReportTime: string;
  location: string;
  placeName: string;
  magnitude: string;
  depth: string;
  latitude: string;
  longitude: string;
  intensity: string;
}

const getList = async (noCache: boolean) => {
  const url = "https://api.wolfx.jp/cenc_eqlist.json";
  const result = await get<Record<string, EarthquakeItem>>({ url, noCache, ttl: 300 });
  const list = Object.values(result.data);
  return {
    ...result,
    data: list.map((v) => {
      const contentBuilder: string[] = [];
      const normalized = {
        NEW_DID: v.EventID,
        LOCATION_C: v.location || v.placeName,
        M: v.magnitude,
        O_TIME: v.time,
        EPI_LAT: v.latitude,
        EPI_LON: v.longitude,
        EPI_DEPTH: v.depth,
        SAVE_TIME: v.ReportTime,
      };
      for (const mappingsKey in mappings) contentBuilder.push(`${mappings[mappingsKey]}：${normalized[mappingsKey as keyof typeof normalized]}`);
      return {
        id: v.EventID,
        title: `${normalized.LOCATION_C}发生${v.magnitude}级地震`,
        desc: contentBuilder.join("\n"),
        timestamp: getTime(v.time),
        hot: undefined,
        url: `https://news.ceic.ac.cn/${v.EventID}.html`,
        mobileUrl: `https://news.ceic.ac.cn/${v.EventID}.html`,
      };
    }),
  };
};
