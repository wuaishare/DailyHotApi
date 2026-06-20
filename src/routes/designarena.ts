import type { ListItem, RouterData } from "../types.js";
import { createRouteData, getJson, postJson } from "../utils/aiSources.js";

const DESIGNARENA_BASE_URL = "https://www.designarena.ai";
const DESIGNARENA_LEADERBOARD_URL = `${DESIGNARENA_BASE_URL}/api/leaderboard`;
const DESIGNARENA_JUDGE_SCORES_URL = `${DESIGNARENA_BASE_URL}/api/leaderboard/judge-scores`;

const meta = {
  name: "designarena",
  title: "DesignArena",
  type: "排行榜",
  description: "设计与前端 AI 模型排行榜",
  link: `${DESIGNARENA_BASE_URL}/leaderboard`,
};

type SupportedLocale = "zh-CN" | "zh-TW" | "en" | "ja" | "ko";
type DesignArenaMetric = "elo" | "winRate";

type DesignArenaLeaderboardMeta = {
  title: string;
  category: string;
  arenaType: "models" | "agents" | "builders";
  href: string;
  metric: DesignArenaMetric;
  description: string;
  inputModality?: string;
};

type DesignArenaSignalMeta = {
  title: string;
  dataset: string;
  metric: string;
  description: string;
  descBuilder: (
    item: DesignArenaSignalRow,
    value: number,
    labels: DesignArenaMetricLabels,
  ) => string;
};

type DesignArenaRow = {
  modelId?: string;
  model?: string;
  id?: string;
  wins?: number;
  losses?: number;
  battles?: number;
  winRate?: number;
  elo?: number;
};

type DesignArenaResponse = {
  success?: boolean;
  timestamp?: string;
  data?: DesignArenaRow[];
};

type DesignArenaSignalRow = Record<string, string | number | undefined> & {
  model_id?: string;
  modelId?: string;
  model?: string;
  scored_generations?: number;
  avg_composite?: number;
  avg_schema_design?: number;
  avg_data_seeding?: number;
  avg_api_functionality?: number;
  avg_auth_implementation?: number;
  avg_crud_operations?: number;
  avg_e2e_persistence?: number;
  avg_error_handling?: number;
  deviation?: number;
  margin?: number;
  rate?: number;
};

type DesignArenaJudgeScoresResponse = Record<string, DesignArenaSignalRow[] | unknown>;

type DesignArenaMetricLabels = {
  winRate: string;
  battles: string;
  composite: string;
  samples: string;
  backend: string;
  auth: string;
  persistence: string;
  reachDeviation: string;
  dailyUsageDeviation: string;
  retentionDeviation: string;
  returnRate: string;
  downloadsDeviation: string;
  downloadRate: string;
  margin: string;
};

const LEADERBOARD_TYPES: Record<string, DesignArenaLeaderboardMeta> = {
  fullstack: {
    title: "Agentic 全栈应用模型榜",
    category: "fullstack",
    arenaType: "agents",
    href: "/leaderboard/fullstack",
    metric: "elo",
    description: "DesignArena Agentic 全栈应用生成与后端能力模型排行",
  },
  "fullstack-win-rate": {
    title: "Agentic 全栈应用胜率榜",
    category: "fullstack",
    arenaType: "agents",
    href: "/leaderboard/fullstack",
    metric: "winRate",
    description: "DesignArena Agentic 全栈应用生成模型胜率排行",
  },
  agon_webapps: {
    title: "Agentic 前端模型榜",
    category: "agon_webapps",
    arenaType: "agents",
    href: "/leaderboard/webapps",
    metric: "elo",
    inputModality: "text",
    description: "DesignArena Agentic 前端 WebDev 模型排行榜",
  },
  "agon_webapps-win-rate": {
    title: "Agentic 前端胜率榜",
    category: "agon_webapps",
    arenaType: "agents",
    href: "/leaderboard/webapps",
    metric: "winRate",
    inputModality: "text",
    description: "DesignArena Agentic 前端 WebDev 模型胜率排行",
  },
  mobileapps: {
    title: "移动 App 模型榜",
    category: "mobileapps",
    arenaType: "agents",
    href: "/leaderboard/mobileapps",
    metric: "elo",
    description: "DesignArena 移动 App 生成与移动开发模型排行",
  },
  nativeapps: {
    title: "原生 App 模型榜",
    category: "nativeapps",
    arenaType: "agents",
    href: "/leaderboard/android",
    metric: "elo",
    description: "DesignArena 原生 App 生成与端侧应用开发模型排行",
  },
  agentic_gamedev: {
    title: "Agentic 游戏开发模型榜",
    category: "agentic_gamedev",
    arenaType: "agents",
    href: "/leaderboard/agentic-game-dev",
    metric: "elo",
    description: "DesignArena Agentic 游戏开发模型排行",
  },
  website: {
    title: "Website 模型榜",
    category: "website",
    arenaType: "models",
    href: "/leaderboard",
    metric: "elo",
    description: "DesignArena 网站生成与前端设计模型排行",
  },
  "website-win-rate": {
    title: "Website 胜率榜",
    category: "website",
    arenaType: "models",
    href: "/leaderboard",
    metric: "winRate",
    description: "DesignArena 网站生成与前端设计模型胜率排行",
  },
  uicomponent: {
    title: "UI Component 模型榜",
    category: "uicomponent",
    arenaType: "models",
    href: "/leaderboard",
    metric: "elo",
    description: "DesignArena UI 组件生成与界面设计模型排行",
  },
  dataviz: {
    title: "Data Visualization 模型榜",
    category: "dataviz",
    arenaType: "models",
    href: "/leaderboard",
    metric: "elo",
    description: "DesignArena 数据可视化与图表生成模型排行",
  },
  gamedev: {
    title: "Game Dev 模型榜",
    category: "gamedev",
    arenaType: "models",
    href: "/leaderboard/game-dev",
    metric: "elo",
    description: "DesignArena 游戏开发与互动场景生成模型排行",
  },
  "3d": {
    title: "3D Design 模型榜",
    category: "3d",
    arenaType: "models",
    href: "/leaderboard",
    metric: "elo",
    description: "DesignArena 3D 设计与空间生成模型排行",
  },
  svg: {
    title: "SVG 模型榜",
    category: "svg",
    arenaType: "models",
    href: "/leaderboard/svgs",
    metric: "elo",
    description: "DesignArena SVG 生成与矢量设计模型排行",
  },
  ascii: {
    title: "ASCII Art 模型榜",
    category: "ascii",
    arenaType: "models",
    href: "/leaderboard/ascii",
    metric: "elo",
    description: "DesignArena ASCII Art 生成模型排行",
  },
  agon_slides: {
    title: "Agentic 演示文稿模型榜",
    category: "agon_slides",
    arenaType: "agents",
    href: "/leaderboard/agentic-slides",
    metric: "elo",
    description: "DesignArena Agentic 演示文稿生成模型排行",
  },
  agon_slides_html: {
    title: "Agentic HTML 演示文稿模型榜",
    category: "agon_slides_html",
    arenaType: "agents",
    href: "/leaderboard/agentic-html-slides",
    metric: "elo",
    description: "DesignArena Agentic HTML 演示文稿生成模型排行",
  },
  slides: {
    title: "演示文稿模型榜",
    category: "slides",
    arenaType: "models",
    href: "/leaderboard/slides",
    metric: "elo",
    description: "DesignArena 演示文稿与幻灯片生成模型排行",
  },
  image: {
    title: "Image Generation 模型榜",
    category: "image",
    arenaType: "models",
    href: "/leaderboard/image",
    metric: "elo",
    description: "DesignArena 图像生成与视觉创作模型排行",
  },
  imagetoimage: {
    title: "Image Editing 模型榜",
    category: "imagetoimage",
    arenaType: "models",
    href: "/leaderboard/image-to-image",
    metric: "elo",
    description: "DesignArena 图像编辑与图生图模型排行",
  },
  graphicdesign: {
    title: "Graphic Design 模型榜",
    category: "graphicdesign",
    arenaType: "models",
    href: "/leaderboard/graphic-design",
    metric: "elo",
    description: "DesignArena 平面设计与视觉创意模型排行",
  },
  logo: {
    title: "Logo 模型榜",
    category: "logo",
    arenaType: "models",
    href: "/leaderboard/logos",
    metric: "elo",
    description: "DesignArena Logo 生成与品牌视觉模型排行",
  },
  video: {
    title: "Video 模型榜",
    category: "video",
    arenaType: "models",
    href: "/leaderboard/video",
    metric: "elo",
    description: "DesignArena 视频生成与动态内容创作模型排行",
  },
  videotovideo: {
    title: "Video Editing 模型榜",
    category: "videotovideo",
    arenaType: "models",
    href: "/leaderboard/video-to-video",
    metric: "elo",
    description: "DesignArena 视频编辑与视频到视频模型排行",
  },
  imagetovideo: {
    title: "Image to Video 模型榜",
    category: "imagetovideo",
    arenaType: "models",
    href: "/leaderboard/image-to-video",
    metric: "elo",
    description: "DesignArena 图像转视频模型排行",
  },
  multitovideo: {
    title: "Multi to Video 模型榜",
    category: "multitovideo",
    arenaType: "models",
    href: "/leaderboard/multi-to-video",
    metric: "elo",
    description: "DesignArena 多输入视频生成模型排行",
  },
  multimodaltovideo: {
    title: "Multimodal to Video 模型榜",
    category: "multimodaltovideo",
    arenaType: "models",
    href: "/leaderboard/multimodal-to-video",
    metric: "elo",
    description: "DesignArena 多模态视频生成模型排行",
  },
  tts: {
    title: "TTS 模型榜",
    category: "tts",
    arenaType: "models",
    href: "/leaderboard/tts",
    metric: "elo",
    description: "DesignArena 文本转语音模型排行",
  },
  builders: {
    title: "AI Builder 榜",
    category: "website",
    arenaType: "builders",
    href: "/leaderboard/builder",
    metric: "elo",
    description: "DesignArena AI 应用构建器与建站工具排行",
  },
};

const formatNumber = (value: unknown, digits = 0) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  return number.toFixed(digits);
};

const formatInteger = (value: unknown) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  return String(Math.round(number));
};

const formatSignedPercent = (value: unknown) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0.0%";
  return `${number > 0 ? "+" : ""}${number.toFixed(1)}%`;
};

const SIGNAL_TYPES: Record<string, DesignArenaSignalMeta> = {
  "fullstack-quality": {
    title: "全栈应用质量榜",
    dataset: "judge_fullstack",
    metric: "avg_composite",
    description: "DesignArena 全栈应用质量综合评分榜",
    descBuilder: (item, value, labels) =>
      `${labels.composite} ${formatNumber(value, 2)} · ${labels.samples} ${formatInteger(item.scored_generations)}`,
  },
  "fullstack-backend": {
    title: "后端能力评分榜",
    dataset: "judge_fullstack",
    metric: "backendScore",
    description: "DesignArena 全栈应用后端能力评分榜",
    descBuilder: (item, value, labels) =>
      `${labels.backend} ${formatNumber(value, 2)} · API ${formatNumber(item.avg_api_functionality, 2)} · ${labels.auth} ${formatNumber(item.avg_auth_implementation, 2)} · ${labels.persistence} ${formatNumber(item.avg_e2e_persistence, 2)}`,
  },
  "real-world-reach": {
    title: "Real-World Reach 榜",
    dataset: "adoption",
    metric: "deviation",
    description: "DesignArena 模型生成应用真实用户触达表现榜",
    descBuilder: (item, value, labels) =>
      `${labels.reachDeviation} ${formatSignedPercent(value)} · ${labels.margin} ±${formatNumber(item.margin, 1)}%`,
  },
  "daily-usage": {
    title: "Daily Usage 榜",
    dataset: "dau_curves",
    metric: "deviation",
    description: "DesignArena 模型生成应用日活用户表现榜",
    descBuilder: (item, value, labels) =>
      `${labels.dailyUsageDeviation} ${formatSignedPercent(value)} · ${labels.margin} ±${formatNumber(item.margin, 1)}%`,
  },
  retention: {
    title: "Returning Users 榜",
    dataset: "retention",
    metric: "deviation",
    description: "DesignArena 模型生成应用回访用户表现榜",
    descBuilder: (item, value, labels) =>
      `${labels.retentionDeviation} ${formatSignedPercent(value)} · ${labels.returnRate} ${item.rate || 0}% · ${labels.margin} ±${formatNumber(item.margin, 1)}%`,
  },
  downloads: {
    title: "App Downloads 榜",
    dataset: "arena_downloads",
    metric: "deviation",
    description: "DesignArena 模型生成应用源码下载率表现榜",
    descBuilder: (item, value, labels) =>
      `${labels.downloadsDeviation} ${formatSignedPercent(value)} · ${labels.downloadRate} ${item.rate || 0}% · ${labels.margin} ±${formatNumber(item.margin, 1)}%`,
  },
};

const TITLE_LOCALIZATIONS: Record<string, Partial<Record<SupportedLocale, string>>> = {
  fullstack: {
    "zh-CN": "Agentic 全栈应用模型榜",
    "zh-TW": "Agentic 全棧應用模型榜",
    en: "Agentic Full-Stack App Models",
    ja: "Agenticフルスタックアプリモデル",
    ko: "Agentic 풀스택 앱 모델",
  },
  "fullstack-win-rate": {
    "zh-CN": "Agentic 全栈应用胜率榜",
    "zh-TW": "Agentic 全棧應用勝率榜",
    en: "Agentic Full-Stack App Win Rate",
    ja: "Agenticフルスタックアプリ勝率",
    ko: "Agentic 풀스택 앱 승률",
  },
  agon_webapps: {
    "zh-CN": "Agentic 前端模型榜",
    "zh-TW": "Agentic 前端模型榜",
    en: "Agentic Frontend Models",
    ja: "Agenticフロントエンドモデル",
    ko: "Agentic 프론트엔드 모델",
  },
  "agon_webapps-win-rate": {
    "zh-CN": "Agentic 前端胜率榜",
    "zh-TW": "Agentic 前端勝率榜",
    en: "Agentic Frontend Win Rate",
    ja: "Agenticフロントエンド勝率",
    ko: "Agentic 프론트엔드 승률",
  },
  "fullstack-quality": {
    "zh-CN": "全栈应用质量榜",
    "zh-TW": "全棧應用品質榜",
    en: "Fullstack App Quality",
    ja: "フルスタックアプリ品質",
    ko: "풀스택 앱 품질",
  },
  "fullstack-backend": {
    "zh-CN": "后端能力评分榜",
    "zh-TW": "後端能力評分榜",
    en: "Backend Scores",
    ja: "バックエンドスコア",
    ko: "백엔드 점수",
  },
  "daily-usage": {
    "zh-CN": "日活使用榜",
    "zh-TW": "日活使用榜",
    en: "Daily Usage",
    ja: "デイリー利用",
    ko: "일일 사용량",
  },
  "real-world-reach": {
    "zh-CN": "真实触达榜",
    "zh-TW": "真實觸達榜",
    en: "Real-World Reach",
    ja: "実利用リーチ",
    ko: "실사용 도달",
  },
  retention: {
    "zh-CN": "回访用户榜",
    "zh-TW": "回訪使用者榜",
    en: "Returning Users",
    ja: "リピート利用者",
    ko: "재방문 사용자",
  },
  downloads: {
    "zh-CN": "应用下载榜",
    "zh-TW": "應用下載榜",
    en: "App Downloads",
    ja: "アプリダウンロード",
    ko: "앱 다운로드",
  },
  mobileapps: {
    "zh-CN": "移动 App 模型榜",
    "zh-TW": "行動 App 模型榜",
    en: "Mobile App Model Rankings",
    ja: "モバイルAppモデルランキング",
    ko: "모바일 앱 모델 랭킹",
  },
  nativeapps: {
    "zh-CN": "原生 App 模型榜",
    "zh-TW": "原生 App 模型榜",
    en: "Native App Model Rankings",
    ja: "ネイティブAppモデルランキング",
    ko: "네이티브 앱 모델 랭킹",
  },
  agentic_gamedev: {
    "zh-CN": "Agentic 游戏开发模型榜",
    "zh-TW": "Agentic 遊戲開發模型榜",
    en: "Agentic Game Dev Model Rankings",
    ja: "Agenticゲーム開発モデルランキング",
    ko: "Agentic 게임 개발 모델 랭킹",
  },
  website: {
    "zh-CN": "网站模型榜",
    "zh-TW": "網站模型榜",
    en: "Website Model Rankings",
    ja: "Webサイトモデルランキング",
    ko: "웹사이트 모델 랭킹",
  },
  "website-win-rate": {
    "zh-CN": "网站胜率榜",
    "zh-TW": "網站勝率榜",
    en: "Website Win Rate Rankings",
    ja: "Webサイト勝率ランキング",
    ko: "웹사이트 승률 랭킹",
  },
  uicomponent: {
    "zh-CN": "UI 组件模型榜",
    "zh-TW": "UI 元件模型榜",
    en: "UI Component Model Rankings",
    ja: "UIコンポーネントモデルランキング",
    ko: "UI 컴포넌트 모델 랭킹",
  },
  dataviz: {
    "zh-CN": "数据可视化模型榜",
    "zh-TW": "資料視覺化模型榜",
    en: "Data Visualization Model Rankings",
    ja: "データ可視化モデルランキング",
    ko: "데이터 시각화 모델 랭킹",
  },
  gamedev: {
    "zh-CN": "游戏开发模型榜",
    "zh-TW": "遊戲開發模型榜",
    en: "Game Dev Model Rankings",
    ja: "ゲーム開発モデルランキング",
    ko: "게임 개발 모델 랭킹",
  },
  "3d": {
    "zh-CN": "3D 设计模型榜",
    "zh-TW": "3D 設計模型榜",
    en: "3D Design Model Rankings",
    ja: "3Dデザインモデルランキング",
    ko: "3D 디자인 모델 랭킹",
  },
  svg: {
    "zh-CN": "SVG 模型榜",
    "zh-TW": "SVG 模型榜",
    en: "SVG Model Rankings",
    ja: "SVGモデルランキング",
    ko: "SVG 모델 랭킹",
  },
  ascii: {
    "zh-CN": "ASCII Art 模型榜",
    "zh-TW": "ASCII Art 模型榜",
    en: "ASCII Art Model Rankings",
    ja: "ASCII Artモデルランキング",
    ko: "ASCII Art 모델 랭킹",
  },
  agon_slides: {
    "zh-CN": "Agentic 演示文稿模型榜",
    "zh-TW": "Agentic 簡報模型榜",
    en: "Agentic Slides Model Rankings",
    ja: "Agenticスライドモデルランキング",
    ko: "Agentic 슬라이드 모델 랭킹",
  },
  agon_slides_html: {
    "zh-CN": "Agentic HTML 演示文稿模型榜",
    "zh-TW": "Agentic HTML 簡報模型榜",
    en: "Agentic HTML Slides Model Rankings",
    ja: "Agentic HTMLスライドモデルランキング",
    ko: "Agentic HTML 슬라이드 모델 랭킹",
  },
  slides: {
    "zh-CN": "演示文稿模型榜",
    "zh-TW": "簡報模型榜",
    en: "Slides Model Rankings",
    ja: "スライドモデルランキング",
    ko: "슬라이드 모델 랭킹",
  },
  image: {
    "zh-CN": "图像生成模型榜",
    "zh-TW": "圖像生成模型榜",
    en: "Image Generation Model Rankings",
    ja: "画像生成モデルランキング",
    ko: "이미지 생성 모델 랭킹",
  },
  imagetoimage: {
    "zh-CN": "图像编辑模型榜",
    "zh-TW": "圖像編輯模型榜",
    en: "Image Editing Model Rankings",
    ja: "画像編集モデルランキング",
    ko: "이미지 편집 모델 랭킹",
  },
  graphicdesign: {
    "zh-CN": "平面设计模型榜",
    "zh-TW": "平面設計模型榜",
    en: "Graphic Design Model Rankings",
    ja: "グラフィックデザインモデルランキング",
    ko: "그래픽 디자인 모델 랭킹",
  },
  logo: {
    "zh-CN": "Logo 模型榜",
    "zh-TW": "Logo 模型榜",
    en: "Logo Model Rankings",
    ja: "Logoモデルランキング",
    ko: "Logo 모델 랭킹",
  },
  video: {
    "zh-CN": "视频生成模型榜",
    "zh-TW": "影片生成模型榜",
    en: "Video Model Rankings",
    ja: "動画生成モデルランキング",
    ko: "비디오 생성 모델 랭킹",
  },
  videotovideo: {
    "zh-CN": "视频编辑模型榜",
    "zh-TW": "影片編輯模型榜",
    en: "Video Editing Model Rankings",
    ja: "動画編集モデルランキング",
    ko: "비디오 편집 모델 랭킹",
  },
  imagetovideo: {
    "zh-CN": "图像转视频模型榜",
    "zh-TW": "圖像轉影片模型榜",
    en: "Image to Video Model Rankings",
    ja: "画像から動画モデルランキング",
    ko: "이미지 비디오 모델 랭킹",
  },
  multitovideo: {
    "zh-CN": "多输入转视频模型榜",
    "zh-TW": "多輸入轉影片模型榜",
    en: "Multi to Video Model Rankings",
    ja: "マルチ入力動画モデルランキング",
    ko: "멀티 입력 비디오 모델 랭킹",
  },
  multimodaltovideo: {
    "zh-CN": "多模态转视频模型榜",
    "zh-TW": "多模態轉影片模型榜",
    en: "Multimodal to Video Model Rankings",
    ja: "マルチモーダル動画モデルランキング",
    ko: "멀티모달 비디오 랭킹",
  },
  tts: {
    "zh-CN": "TTS 模型榜",
    "zh-TW": "TTS 模型榜",
    en: "TTS Model Rankings",
    ja: "TTSモデルランキング",
    ko: "TTS 모델 랭킹",
  },
  builders: {
    "zh-CN": "AI 构建器榜",
    "zh-TW": "AI 建構器榜",
    en: "AI Builder Rankings",
    ja: "AIビルダーランキング",
    ko: "AI 빌더 랭킹",
  },
};

const PARAM_NAME_BY_LOCALE: Record<SupportedLocale, string> = {
  "zh-CN": "榜单分类",
  "zh-TW": "榜單分類",
  en: "Leaderboard Type",
  ja: "ランキング分類",
  ko: "랭킹 분류",
};

const METRIC_LABELS: Record<SupportedLocale, DesignArenaMetricLabels> = {
  "zh-CN": {
    winRate: "胜率",
    battles: "对战",
    composite: "综合",
    samples: "评分样本",
    backend: "后端",
    auth: "认证",
    persistence: "持久化",
    reachDeviation: "触达偏离",
    dailyUsageDeviation: "日活偏离",
    retentionDeviation: "回访偏离",
    returnRate: "回访率",
    downloadsDeviation: "下载偏离",
    downloadRate: "下载率",
    margin: "误差",
  },
  "zh-TW": {
    winRate: "勝率",
    battles: "對戰",
    composite: "綜合",
    samples: "評分樣本",
    backend: "後端",
    auth: "認證",
    persistence: "持久化",
    reachDeviation: "觸達偏離",
    dailyUsageDeviation: "日活偏離",
    retentionDeviation: "回訪偏離",
    returnRate: "回訪率",
    downloadsDeviation: "下載偏離",
    downloadRate: "下載率",
    margin: "誤差",
  },
  en: {
    winRate: "Win Rate",
    battles: "Battles",
    composite: "Composite",
    samples: "Samples",
    backend: "Backend",
    auth: "Auth",
    persistence: "Persistence",
    reachDeviation: "Reach Deviation",
    dailyUsageDeviation: "Daily Usage Deviation",
    retentionDeviation: "Retention Deviation",
    returnRate: "Return Rate",
    downloadsDeviation: "Download Deviation",
    downloadRate: "Download Rate",
    margin: "Margin",
  },
  ja: {
    winRate: "勝率",
    battles: "対戦",
    composite: "総合",
    samples: "評価サンプル",
    backend: "バックエンド",
    auth: "認証",
    persistence: "永続化",
    reachDeviation: "リーチ偏差",
    dailyUsageDeviation: "日次利用偏差",
    retentionDeviation: "再訪偏差",
    returnRate: "再訪率",
    downloadsDeviation: "ダウンロード偏差",
    downloadRate: "ダウンロード率",
    margin: "誤差",
  },
  ko: {
    winRate: "승률",
    battles: "대전",
    composite: "종합",
    samples: "평가 샘플",
    backend: "백엔드",
    auth: "인증",
    persistence: "지속성",
    reachDeviation: "도달 편차",
    dailyUsageDeviation: "일일 사용량 편차",
    retentionDeviation: "재방문 편차",
    returnRate: "재방문율",
    downloadsDeviation: "다운로드 편차",
    downloadRate: "다운로드율",
    margin: "오차",
  },
};

const normalizeLocale = (locale = ""): SupportedLocale => {
  const value = String(locale || "").toLowerCase();
  if (value === "zh-tw" || value === "zh_tw" || value === "zh-hant") return "zh-TW";
  if (
    value === "zh-cn" ||
    value === "zh_cn" ||
    value === "zh-hans" ||
    value === "zh" ||
    value.startsWith("zh-cn")
  ) {
    return "zh-CN";
  }
  if (value.startsWith("en")) return "en";
  if (value.startsWith("ja") || value.startsWith("jp")) return "ja";
  if (value.startsWith("ko") || value.startsWith("kr")) return "ko";
  return "zh-CN";
};

const absoluteUrl = (href = "/leaderboard") =>
  href.startsWith("http")
    ? href
    : `${DESIGNARENA_BASE_URL}${href.startsWith("/") ? href : `/${href}`}`;

const getLocalizedTitle = (
  type: string,
  itemMeta: DesignArenaLeaderboardMeta | DesignArenaSignalMeta,
  locale: SupportedLocale,
) => TITLE_LOCALIZATIONS[type]?.[locale] || itemMeta.title;

const getTypeParams = (locale: SupportedLocale) =>
  Object.fromEntries(
    [
      ...Object.entries(LEADERBOARD_TYPES),
      ...Object.entries(SIGNAL_TYPES),
    ].map(([key, itemMeta]) => [key, getLocalizedTitle(key, itemMeta, locale)]),
  );

const getBackendScore = (item: DesignArenaSignalRow) => {
  const fields = [
    "avg_schema_design",
    "avg_data_seeding",
    "avg_api_functionality",
    "avg_auth_implementation",
    "avg_crud_operations",
    "avg_e2e_persistence",
    "avg_error_handling",
  ];
  const values = fields
    .map((field) => Number(item[field]))
    .filter((value) => Number.isFinite(value));
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const getSignalMetricValue = (item: DesignArenaSignalRow, metric: string) => {
  if (metric === "backendScore") return getBackendScore(item);
  const value = Number(item[metric]);
  return Number.isFinite(value) ? value : 0;
};

const normalizeLeaderboardData = (
  items: DesignArenaRow[] = [],
  itemMeta: DesignArenaLeaderboardMeta,
  locale: SupportedLocale,
): ListItem[] => {
  const metric = itemMeta.metric === "winRate" ? "winRate" : "elo";
  const url = absoluteUrl(itemMeta.href);
  const labels = METRIC_LABELS[locale];
  return items
    .slice()
    .sort((a, b) => Number(b[metric] || 0) - Number(a[metric] || 0))
    .map((item) => {
      const modelName = String(item.modelId || item.model || item.id || "").trim();
      const elo = Number(item.elo || 0);
      const winRate = Number(item.winRate || 0);
      const battles = Number(item.battles || 0);
      return {
        id: modelName,
        title: modelName,
        originalTitle: modelName,
        desc: `ELO ${formatInteger(elo)} · ${labels.winRate} ${formatNumber(winRate, 1)}% · ${labels.battles} ${formatInteger(battles)}`,
        hot: metric === "winRate" ? Number(winRate.toFixed(1)) : Math.round(elo),
        timestamp: undefined,
        url,
        mobileUrl: url,
        noAutoTranslate: true,
      };
    })
    .filter((item) => item.title);
};

const normalizeSignalData = (
  items: DesignArenaSignalRow[] = [],
  itemMeta: DesignArenaSignalMeta,
  locale: SupportedLocale,
): ListItem[] => {
  const url = absoluteUrl("/leaderboard");
  const labels = METRIC_LABELS[locale];
  return items
    .slice()
    .map((item) => ({
      item,
      value: getSignalMetricValue(item, itemMeta.metric),
    }))
    .sort((a, b) => b.value - a.value)
    .map(({ item, value }) => {
      const modelName = String(item.model_id || item.modelId || item.model || "").trim();
      return {
        id: modelName,
        title: modelName,
        originalTitle: modelName,
        desc: itemMeta.descBuilder(item, value, labels),
        hot: Number(value.toFixed(2)),
        timestamp: undefined,
        url,
        mobileUrl: url,
        noAutoTranslate: true,
      };
    })
    .filter((item) => item.title);
};

const buildResponse = (
  type: string,
  itemMeta: DesignArenaLeaderboardMeta | DesignArenaSignalMeta,
  data: ListItem[],
  resultMeta: { fromCache: boolean; updateTime: string | number },
  locale: SupportedLocale,
) =>
  createRouteData(
    {
      ...meta,
      type: getLocalizedTitle(type, itemMeta, locale),
      description: itemMeta.description,
      link: "href" in itemMeta ? absoluteUrl(itemMeta.href) : meta.link,
      params: {
        type: {
          name: PARAM_NAME_BY_LOCALE[locale],
          type: getTypeParams(locale),
        },
      },
    },
    {
      fromCache: resultMeta.fromCache,
      updateTime: resultMeta.updateTime,
      data,
    },
  );

const fetchLeaderboard = async (
  type: string,
  itemMeta: DesignArenaLeaderboardMeta,
  noCache: boolean,
  locale: SupportedLocale,
) => {
  const result = await postJson<DesignArenaResponse>(
    DESIGNARENA_LEADERBOARD_URL,
    {
      category: itemMeta.category,
      arenaType: itemMeta.arenaType,
      variationName: "public",
      ...(itemMeta.inputModality ? { inputModality: itemMeta.inputModality } : {}),
    },
    noCache,
    {
      Origin: DESIGNARENA_BASE_URL,
      Referer: `${DESIGNARENA_BASE_URL}/leaderboard`,
    },
  );
  const rows = Array.isArray(result.data?.data) ? result.data.data : [];
  return buildResponse(
    type,
    itemMeta,
    normalizeLeaderboardData(rows, itemMeta, locale),
    {
      fromCache: result.fromCache,
      updateTime: result.data?.timestamp || result.updateTime,
    },
    locale,
  );
};

const fetchSignals = async (
  type: string,
  itemMeta: DesignArenaSignalMeta,
  noCache: boolean,
  locale: SupportedLocale,
) => {
  const result = await getJson<DesignArenaJudgeScoresResponse>(
    DESIGNARENA_JUDGE_SCORES_URL,
    noCache,
    {
      Referer: `${DESIGNARENA_BASE_URL}/leaderboard`,
    },
  );
  const rows = Array.isArray(result.data?.[itemMeta.dataset])
    ? (result.data[itemMeta.dataset] as DesignArenaSignalRow[])
    : [];
  return buildResponse(
    type,
    itemMeta,
    normalizeSignalData(rows, itemMeta, locale),
    {
      fromCache: result.fromCache,
      updateTime: result.updateTime,
    },
    locale,
  );
};

export const handleRoute = async (c: RouterData | any, noCache: boolean) => {
  const type = c?.req?.query?.("type") || "fullstack";
  const locale = normalizeLocale(c?.req?.query?.("locale") || "zh-CN");
  const leaderboardMeta = LEADERBOARD_TYPES[type];
  const signalMeta = SIGNAL_TYPES[type];

  if (leaderboardMeta) {
    return fetchLeaderboard(type, leaderboardMeta, noCache, locale);
  }

  if (signalMeta) {
    return fetchSignals(type, signalMeta, noCache, locale);
  }

  return fetchLeaderboard("fullstack", LEADERBOARD_TYPES.fullstack, noCache, locale);
};
