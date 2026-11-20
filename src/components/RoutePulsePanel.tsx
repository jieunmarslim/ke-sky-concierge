import { Plane, Play } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { computeGreatCircleMetrics } from '@/lib/aerospaceMath'
import type {
  EscapeEvaluation,
  FeedMode,
  GlobalRouteNode,
  RouteInsightResponse,
  YoutubeReviewItem,
} from '@/types/aviation'

const SAFE_YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/

interface RoutePulsePanelProps {
  route: GlobalRouteNode
  evaluation: EscapeEvaluation | null
  insightData: RouteInsightResponse | null
  insightLoading: boolean
  feedMode: FeedMode
  videos: YoutubeReviewItem[]
  videosLoading: boolean
  videoSource: 'live_youtube_api' | 'curated_fallback'
  playingVideoId: string | null
  onFeedModeChange: (mode: FeedMode) => void
  onPlayVideo: (videoId: string) => void
}

export function RoutePulsePanel({
  route,
  evaluation,
  insightData,
  insightLoading,
  feedMode,
  videos,
  videosLoading,
  videoSource,
  playingVideoId,
  onFeedModeChange,
  onPlayVideo,
}: RoutePulsePanelProps) {
  const metrics = computeGreatCircleMetrics(route.originCoords, route.destCoords)
  const featuredVideo =
    videos.find((v) => v.videoId === playingVideoId) || videos[0] || null
  const validEmbedId =
    playingVideoId && SAFE_YOUTUBE_ID_REGEX.test(playingVideoId) ? playingVideoId : null

  return (
    <Card className="pointer-events-auto flex max-h-[56vh] w-full flex-col gap-5 overflow-y-auto no-scrollbar p-6 lg:max-h-[calc(100vh-2.5rem)] lg:w-[440px]">
      {/* 1. Route Header, Stay Duration & Flight Schedule */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 text-[13px]">
          <span className="text-[#9EB2CC]">{route.aircraftName}</span>
          {evaluation && (
            <span
              className={`font-mono font-semibold tabular-nums ${
                evaluation.reachable ? 'text-[#7CC3F7]' : 'text-[#F59E8B]'
              }`}
            >
              {evaluation.reachable
                ? `순수 현지 ${evaluation.netLocalHours}시간`
                : '일정 부족 · 연차 추가 필요'}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="font-mono text-[26px] font-bold tracking-tight text-white">
              {route.originCode}
            </div>
            <div className="mt-0.5 text-xs text-[#9EB2CC]">{route.originCity}</div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col items-center px-2 text-center">
            <span className="font-mono text-xs text-[#9EB2CC] tabular-nums">
              {route.durationText}
            </span>
            <div className="my-2 flex w-full items-center gap-2">
              <div className="h-px flex-1 bg-white/15" />
              <Plane className="size-4 shrink-0 text-[#7CC3F7]" />
              <div className="h-px flex-1 bg-white/15" />
            </div>
            <span className="font-mono text-[11px] text-[#7E95B4] tabular-nums">
              {metrics.distanceKm.toLocaleString()} km
            </span>
          </div>

          <div className="min-w-0 text-right">
            <div className="font-mono text-[26px] font-bold tracking-tight text-white">
              {route.destCode}
            </div>
            <div className="mt-0.5 text-xs text-[#9EB2CC]">{route.destCity}</div>
          </div>
        </div>

        {evaluation?.outbound && evaluation.inbound && (
          <div className="space-y-1.5 text-[13px] tabular-nums">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#8FA3BF]">출국 · {evaluation.outbound.flightId}</span>
              <span className="font-mono text-[#E6EFFA]">
                {evaluation.outbound.departLabel} → {evaluation.outbound.arriveLabel}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#8FA3BF]">귀국 · {evaluation.inbound.flightId}</span>
              <span className="font-mono text-[#E6EFFA]">
                {evaluation.inbound.departLabel} → {evaluation.inbound.arriveLabel}
              </span>
            </div>
          </div>
        )}

        {/* Top Route Escape Insight (gemini-4-hydrogen) */}
        <div className="space-y-1.5 rounded-xl bg-white/[0.05] px-4 py-3.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-[#7CC3F7]">단기 탈출 인사이트</span>
            <span className="font-mono text-[11px] text-[#7E95B4]">
              {insightData?.source === 'live_gemini_api'
                ? 'gemini-4-hydrogen · 실시간'
                : 'gemini-4-hydrogen · 요약'}
            </span>
          </div>
          {insightLoading && !insightData ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <p className="text-[13px] leading-[1.65] text-[#EDF3FA]">
              {insightData?.insight || route.bigData.insightText}
            </p>
          )}
        </div>
      </div>

      <Separator className="bg-white/[0.08]" />

      {/* 2. YouTube Cabin & Lounge Video */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Tabs
            value={feedMode}
            onValueChange={(v) => {
              if (v === 'cabin' || v === 'vibe') onFeedModeChange(v)
            }}
          >
            <TabsList>
              <TabsTrigger value="cabin">기내 · 좌석</TabsTrigger>
              <TabsTrigger value="vibe">라운지 · 현지</TabsTrigger>
            </TabsList>
          </Tabs>

          <span className="shrink-0 text-xs text-[#7E95B4]">
            {videoSource === 'live_youtube_api' ? 'YouTube 실시간' : 'YouTube 영상'}
          </span>
        </div>

        {videosLoading ? (
          <div className="space-y-2.5">
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : featuredVideo ? (
          <div className="space-y-2.5">
            {validEmbedId ? (
              <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
                <iframe
                  title={featuredVideo.title}
                  src={`https://www.youtube-nocookie.com/embed/${validEmbedId}?autoplay=1&rel=0`}
                  className="size-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onPlayVideo(featuredVideo.videoId)}
                className="group relative aspect-video w-full cursor-pointer overflow-hidden rounded-xl bg-black text-left"
              >
                <img
                  src={featuredVideo.thumbnailUrl}
                  alt={featuredVideo.title}
                  className="size-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-white text-[#051766] shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
                    <Play className="ml-0.5 size-4 fill-current" />
                  </div>
                </div>
                <div className="absolute right-3.5 bottom-3 left-3.5 space-y-1">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-medium text-[#7CC3F7]">{featuredVideo.matchedTag}</span>
                    <span className="rounded bg-black/75 px-1.5 py-0.5 font-mono text-white tabular-nums">
                      {featuredVideo.durationLabel}
                    </span>
                  </div>
                  <div className="line-clamp-1 text-[13px] font-semibold text-white">
                    {featuredVideo.title}
                  </div>
                </div>
              </button>
            )}

            <div className="divide-y divide-white/[0.06]">
              {videos.slice(0, 2).map((v, idx) => {
                const isPlaying = v.videoId === playingVideoId
                return (
                  <button
                    key={v.videoId}
                    type="button"
                    onClick={() => onPlayVideo(v.videoId)}
                    className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                      isPlaying
                        ? 'bg-[rgba(101,178,232,0.16)] text-white'
                        : 'text-[#DCE6F4] hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex min-w-0 items-baseline gap-2.5">
                      <span className="shrink-0 font-mono text-xs text-[#7CC3F7] tabular-nums">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="truncate text-[13px] font-medium">{v.title}</span>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-[#8FA3BF] tabular-nums">
                      {v.durationLabel}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-[13px] text-[#8FA3BF]">
            재생 가능한 영상을 불러오는 중입니다.
          </div>
        )}
      </div>

      <Separator className="bg-white/[0.08]" />

      {/* 3. Public Aviation Stats (Airy 3-column typographic row) */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="text-xs text-[#8FA3BF]">정시 출발률</div>
          <div className="mt-1 font-mono text-lg font-semibold text-white tabular-nums">
            {route.bigData.onTimePct}%
          </div>
        </div>

        <div>
          <div className="text-xs text-[#8FA3BF]">평균 탑승률</div>
          <div className="mt-1 font-mono text-lg font-semibold text-[#7CC3F7] tabular-nums">
            {route.bigData.loadFactorPct}%
          </div>
        </div>

        <div>
          <div className="text-xs text-[#8FA3BF]">월간 이용객</div>
          <div className="mt-1 font-mono text-lg font-semibold text-white tabular-nums">
            {(route.bigData.monthlyPassengers / 10000).toFixed(1)}만명
          </div>
        </div>
      </div>
    </Card>
  )
}
