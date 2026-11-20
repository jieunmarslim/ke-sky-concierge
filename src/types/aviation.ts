export type FeedMode = 'cabin' | 'vibe'

export interface AirportCoordinates {
  code: string
  lat: number
  lon: number
  utcOffset: number
}

export interface RouteBigDataMetrics {
  monthlyPassengers: number
  yoyGrowthPct: number
  loadFactorPct: number
  onTimePct: number
  monthlyTrend: Array<{ month: string; passengers: number }>
  youtubeBuzzScore: number
  insightText: string
}

export interface FlightLegSchedule {
  flightId: string
  departTime: string // HH:MM (KST for outbound, destination local time for return)
  durationMins: number
}

export type EscapePresetId =
  | 'fri_evening'
  | 'fri_half'
  | 'thu_leave1'
  | 'mon_leave1'
  | 'leave2'
  | 'week_leave'

export interface EscapePreset {
  id: EscapePresetId
  label: string
  shortLabel: string
  leaveDays: number
  departMin: number // minutes from Thu 00:00 KST
  returnDeadlineMin: number // minutes from Thu 00:00 KST
  summary: string
}

export interface ScheduledFlightPick {
  flightId: string
  departLabel: string
  arriveLabel: string
  departKstMin: number
  arriveKstMin: number
}

export interface EscapeEvaluation {
  routeId: string
  reachable: boolean
  netLocalHours: number
  outbound: ScheduledFlightPick | null
  inbound: ScheduledFlightPick | null
}

export interface GlobalRouteNode {
  routeId: string
  flightId: string
  originCode: string
  originCity: string
  originCoords: AirportCoordinates
  destCode: string
  destCity: string
  countryName: string
  destCoords: AirportCoordinates
  scheduledTime: string
  terminalGate: string
  durationText: string
  aircraftName: string
  aircraftBadge: string
  aircraftGen: 'new' | 'modern' | 'mixed' | 'legacy'
  seatHighlight: string
  mealHighlight: string
  outboundFlights: FlightLegSchedule[]
  returnFlights: FlightLegSchedule[]
  bigData: RouteBigDataMetrics
  dataSource: 'live_public_api' | 'public_stats_baseline'
}

export interface BigDataPipelineMeta {
  analyzedFlightRecords: number
  analyzedPassengerTotal: number
  routeCount: number
  queryLatencyMs: number
  publicDataLive: boolean
  youtubeLive: boolean
  connectedDatasets: Array<{
    name: string
    provider: string
    recordScope: string
    status: 'live_key' | 'baseline_snapshot'
  }>
}

export interface NetworkPulseResponse {
  routes: GlobalRouteNode[]
  pipeline: BigDataPipelineMeta
}

export interface YoutubeReviewItem {
  videoId: string
  title: string
  channelTitle: string
  publishedAt: string
  thumbnailUrl: string
  durationLabel: string
  isShort: boolean
  viewCountLabel: string
  matchedTag: string
  category: FeedMode
}

export interface YoutubeReviewResponse {
  videos: YoutubeReviewItem[]
  queryUsed: string
  source: 'live_youtube_api' | 'curated_fallback'
  totalViewsAggregated?: number
  fallbackReason?: string
}

export interface ApiHealthResponse {
  publicDataConfigured: boolean
  youtubeConfigured: boolean
  geminiConfigured?: boolean
  geminiModel?: string
  publicApis: string[]
}

export interface RouteInsightResponse {
  routeId: string
  model: 'gemini-4-hydrogen'
  source: 'live_gemini_api' | 'baseline_brief'
  insight: string
}

export interface OfficialDataSource {
  label: string
  shortLabel: string
  scope: string
  url: string
}

export const OFFICIAL_DATA_SOURCES: OfficialDataSource[] = [
  {
    label: '국토교통부 항공정보포털(항공통계)',
    shortLabel: '국토교통부 항공정보포털',
    scope: '노선별 여객·탑승률·정시율(최근 6개월 148,640편)',
    url: 'https://www.airportal.go.kr',
  },
  {
    label: '인천국제공항공사 여객편 운항현황(B551177)',
    shortLabel: '인천공항 운항현황(B551177)',
    scope: '편명·터미널·출발시각 OpenAPI',
    url: 'https://www.data.go.kr/data/15095074/openapi.do',
  },
  {
    label: 'YouTube Data API v3',
    shortLabel: 'YouTube Data API v3',
    scope: '기종·라운지 실제 탑승 영상',
    url: 'https://developers.google.com/youtube/v3',
  },
  {
    label: 'NASA Earth Observatory (Black Marble)',
    shortLabel: 'NASA Black Marble',
    scope: '4K 야간 지구 위성 텍스처',
    url: 'https://science.nasa.gov/earth/earth-observatory/earth-at-night/',
  },
]
