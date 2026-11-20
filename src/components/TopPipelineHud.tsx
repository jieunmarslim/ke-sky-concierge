import { Button } from '@/components/ui/button'
import { ESCAPE_PRESETS } from '@/lib/escapeEngine'
import type { EscapePreset, EscapePresetId } from '@/types/aviation'

interface TopPipelineHudProps {
  activePreset: EscapePreset
  reachableCount: number
  totalCount: number
  onSelectPreset: (presetId: EscapePresetId) => void
}

export function TopPipelineHud({
  activePreset,
  reachableCount,
  totalCount,
  onSelectPreset,
}: TopPipelineHudProps) {
  return (
    <header className="pointer-events-none max-w-xl select-none space-y-2.5">
      <div className="space-y-1">
        <div className="text-[11px] font-semibold tracking-[0.2em] text-[#7CC3F7]">
          KOREAN AIR · 주말·연차 탈출 시뮬레이터
        </div>
        <h1 className="text-xl font-bold tracking-[-0.03em] text-white sm:text-[25px]">
          이번 일정으로 어디까지 다녀올 수 있을까?
        </h1>
      </div>

      <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
        {ESCAPE_PRESETS.map((preset) => {
          const isSelected = preset.id === activePreset.id
          return (
            <Button
              key={preset.id}
              type="button"
              size="xs"
              variant={isSelected ? 'default' : 'secondary'}
              onClick={() => onSelectPreset(preset.id)}
              className="rounded-full"
            >
              {preset.shortLabel}
            </Button>
          )
        })}
      </div>

      <p className="text-xs text-[#9EB2CC] tabular-nums">
        {activePreset.summary} · 다녀올 수 있는 직항 {reachableCount}/{totalCount}개 도시 (출입국·수속 제외 18시간 이상 기준)
      </p>
    </header>
  )
}
