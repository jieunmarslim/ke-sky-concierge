import { useEffect, useMemo, useState } from 'react'
import { GlobalNetworkGlobe } from '@/components/aerospace/GlobalNetworkGlobe'
import { BottomRouteDock } from '@/components/BottomRouteDock'
import { RoutePulsePanel } from '@/components/RoutePulsePanel'
import { TopPipelineHud } from '@/components/TopPipelineHud'
import { ESCAPE_PRESETS, evaluateEscapeRoute } from '@/lib/escapeEngine'
import type {
  BigDataPipelineMeta,
  EscapeEvaluation,
  EscapePresetId,
  FeedMode,
  GlobalRouteNode,
  NetworkPulseResponse,
  RouteInsightResponse,
  YoutubeReviewItem,
  YoutubeReviewResponse,
} from '@/types/aviation'

export function App() {
  const [routes, setRoutes] = useState<GlobalRouteNode[]>([])
  const [pipeline, setPipeline] = useState<BigDataPipelineMeta | null>(null)
  const [presetId, setPresetId] = useState<EscapePresetId>('fri_evening')
  const [selectedRouteId, setSelectedRouteId] = useState<string>('BKK')

  const [insightData, setInsightData] = useState<RouteInsightResponse | null>(null)
  const [insightLoading, setInsightLoading] = useState<boolean>(false)

  const [feedMode, setFeedMode] = useState<FeedMode>('cabin')
  const [videos, setVideos] = useState<YoutubeReviewItem[]>([])
  const [videosLoading, setVideosLoading] = useState<boolean>(false)
  const [videoSource, setVideoSource] = useState<'live_youtube_api' | 'curated_fallback'>(
    'curated_fallback'
  )
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)

  const activePreset =
    ESCAPE_PRESETS.find((p) => p.id === presetId) || ESCAPE_PRESETS[0]

  useEffect(() => {
    fetch('/api/network/pulse')
      .then((res) => (res.ok ? (res.json() as Promise<NetworkPulseResponse>) : null))
      .then((data) => {
        if (!data) return
        setRoutes(data.routes)
        setPipeline(data.pipeline)
        if (!data.routes.some((r) => r.routeId === 'BKK') && data.routes[0]) {
          setSelectedRouteId(data.routes[0].routeId)
        }
      })
      .catch(() => {})
  }, [])

  const evaluations = useMemo(() => {
    const map: Record<string, EscapeEvaluation> = {}
    for (const route of routes) {
      map[route.routeId] = evaluateEscapeRoute(route, activePreset)
    }
    return map
  }, [routes, activePreset])

  const reachableCount = useMemo(
    () => Object.values(evaluations).filter((e) => e.reachable).length,
    [evaluations]
  )

  const selectedRoute =
    routes.find((r) => r.routeId === selectedRouteId) || routes[0] || null
  const selectedEval = selectedRoute ? evaluations[selectedRoute.routeId] || null : null

  const handleSelectPreset = (nextId: EscapePresetId) => {
    setPresetId(nextId)
    const nextPreset = ESCAPE_PRESETS.find((p) => p.id === nextId) || ESCAPE_PRESETS[0]
    if (routes.length === 0) return
    const currentRoute = routes.find((r) => r.routeId === selectedRouteId)
    const currentEval = currentRoute ? evaluateEscapeRoute(currentRoute, nextPreset) : null
    if (!currentEval?.reachable) {
      // Focus the farthest reachable destination for this newly chosen leave schedule
      const reachable = routes
        .map((r) => ({ route: r, ev: evaluateEscapeRoute(r, nextPreset) }))
        .filter((item) => item.ev.reachable)
        .sort((a, b) => b.ev.netLocalHours - a.ev.netLocalHours)
      if (reachable[0]) {
        setSelectedRouteId(reachable[0].route.routeId)
      }
    }
  }

  const evalNetHours = selectedEval?.netLocalHours ?? null
  const evalOutFlight = selectedEval?.outbound?.flightId ?? ''
  const evalRetFlight = selectedEval?.inbound?.flightId ?? ''

  useEffect(() => {
    if (!selectedRouteId || evalNetHours === null) return
    let cancelled = false
    setInsightLoading(true)

    const params = new URLSearchParams({
      routeId: selectedRouteId,
      preset: presetId,
      netHours: String(evalNetHours),
    })
    if (evalOutFlight) params.set('outFlight', evalOutFlight)
    if (evalRetFlight) params.set('retFlight', evalRetFlight)

    fetch(`/api/route/insight?${params.toString()}`)
      .then((res) => (res.ok ? (res.json() as Promise<RouteInsightResponse>) : null))
      .then((data) => {
        if (cancelled || !data) return
        setInsightData(data)
      })
      .catch(() => {
        if (!cancelled) setInsightData(null)
      })
      .finally(() => {
        if (!cancelled) setInsightLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedRouteId, presetId, evalNetHours, evalOutFlight, evalRetFlight])

  useEffect(() => {
    if (!selectedRouteId) return
    let cancelled = false
    setVideosLoading(true)
    setPlayingVideoId(null)

    const params = new URLSearchParams({
      routeId: selectedRouteId,
      mode: feedMode,
    })

    fetch(`/api/youtube/route-feed?${params.toString()}`)
      .then((res) => (res.ok ? (res.json() as Promise<YoutubeReviewResponse>) : null))
      .then((data) => {
        if (cancelled || !data) return
        setVideos(data.videos)
        setVideoSource(data.source)
      })
      .catch(() => {
        if (!cancelled) setVideos([])
      })
      .finally(() => {
        if (!cancelled) setVideosLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedRouteId, feedMode])

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#040915] text-[#F5F8FC]">
      <GlobalNetworkGlobe
        routes={routes}
        evaluations={evaluations}
        selectedRouteId={selectedRouteId}
        onSelectRoute={setSelectedRouteId}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-44 bg-gradient-to-b from-[#040915]/90 to-transparent" />

      <div className="pointer-events-none absolute top-4 right-4 left-4 z-20 sm:top-6 sm:right-auto sm:left-6">
        <TopPipelineHud
          activePreset={activePreset}
          reachableCount={reachableCount}
          totalCount={routes.length}
          onSelectPreset={handleSelectPreset}
        />
      </div>

      {selectedRoute && (
        <div className="pointer-events-none absolute right-4 bottom-20 left-4 z-20 lg:top-5 lg:right-5 lg:bottom-5 lg:left-auto">
          <RoutePulsePanel
            route={selectedRoute}
            evaluation={selectedEval}
            insightData={insightData}
            insightLoading={insightLoading}
            feedMode={feedMode}
            videos={videos}
            videosLoading={videosLoading}
            videoSource={videoSource}
            playingVideoId={playingVideoId}
            onFeedModeChange={setFeedMode}
            onPlayVideo={setPlayingVideoId}
          />
        </div>
      )}

      {routes.length > 0 && (
        <div className="pointer-events-none absolute right-4 bottom-4 left-4 z-20 flex justify-center lg:right-auto lg:left-6 lg:justify-start">
          <BottomRouteDock
            routes={routes}
            evaluations={evaluations}
            selectedRouteId={selectedRouteId}
            pipeline={pipeline}
            onSelectRoute={setSelectedRouteId}
          />
        </div>
      )}
    </div>
  )
}

export default App
