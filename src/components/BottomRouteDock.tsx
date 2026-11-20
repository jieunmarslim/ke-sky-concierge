import { Fragment } from 'react'
import { Button } from '@/components/ui/button'
import {
  OFFICIAL_DATA_SOURCES,
  type BigDataPipelineMeta,
  type EscapeEvaluation,
  type GlobalRouteNode,
} from '@/types/aviation'

interface BottomRouteDockProps {
  routes: GlobalRouteNode[]
  evaluations: Record<string, EscapeEvaluation>
  selectedRouteId: string
  pipeline: BigDataPipelineMeta | null
  onSelectRoute: (routeId: string) => void
}

export function BottomRouteDock({
  routes,
  evaluations,
  selectedRouteId,
  pipeline,
  onSelectRoute,
}: BottomRouteDockProps) {
  const sortedRoutes = [...routes].sort((a, b) => {
    const ea = evaluations[a.routeId]
    const eb = evaluations[b.routeId]
    const ra = ea?.reachable ? 1 : 0
    const rb = eb?.reachable ? 1 : 0
    if (ra !== rb) return rb - ra
    return (eb?.netLocalHours || 0) - (ea?.netLocalHours || 0)
  })

  return (
    <div className="pointer-events-auto max-w-full space-y-1.5">
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto rounded-2xl bg-[#081021]/82 p-1.5 backdrop-blur-xl">
        {sortedRoutes.map((route) => {
          const isActive = route.routeId === selectedRouteId
          const evalInfo = evaluations[route.routeId]
          const isReachable = evalInfo?.reachable ?? false
          return (
            <Button
              key={route.routeId}
              type="button"
              size="xs"
              variant={isActive ? 'default' : 'secondary'}
              onClick={() => onSelectRoute(route.routeId)}
              className={`shrink-0 rounded-xl ${
                !isActive && !isReachable ? 'opacity-45 hover:opacity-80' : ''
              }`}
            >
              <span className="text-xs">{route.destCity.split('(')[0]}</span>
              {isReachable && evalInfo && (
                <span className="font-mono text-[10px] opacity-80 tabular-nums">
                  {evalInfo.netLocalHours}h
                </span>
              )}
            </Button>
          )
        })}
      </div>

      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 px-1 text-[11px] text-[#7E95B4] tabular-nums">
        <span>
          참고 데이터
          {pipeline ? `(${pipeline.analyzedFlightRecords.toLocaleString()}편)` : ''}:
        </span>
        {OFFICIAL_DATA_SOURCES.map((src, idx) => (
          <Fragment key={src.url}>
            {idx > 0 && <span aria-hidden="true">·</span>}
            <a
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-white/25 underline-offset-2 transition-colors hover:text-[#7CC3F7]"
            >
              {src.shortLabel}
            </a>
          </Fragment>
        ))}
      </p>
    </div>
  )
}
