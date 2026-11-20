import type { EscapeEvaluation, EscapePreset, GlobalRouteNode } from '@/types/aviation'

const DAY_NAMES = ['목', '금', '토', '일', '월', '화', '수'] as const

function parseHhMm(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((v) => Number.parseInt(v, 10))
  return (Number.isNaN(h) ? 0 : h) * 60 + (Number.isNaN(m) ? 0 : m)
}

export function formatWeekMinute(minFromThu0: number): string {
  const rounded = Math.round(minFromThu0)
  const totalDays = Math.floor(rounded / 1440)
  const dayIdx = ((totalDays % 7) + 7) % 7
  const rem = ((rounded % 1440) + 1440) % 1440
  const hh = String(Math.floor(rem / 60)).padStart(2, '0')
  const mm = String(rem % 60).padStart(2, '0')
  const prefix = totalDays >= 7 ? '차주 ' : ''
  return `${prefix}${DAY_NAMES[dayIdx]} ${hh}:${mm}`
}

// Minutes measured from Thu 00:00 KST (Thu=0, Fri=1440, Sat=2880, Sun=4320, Mon=5760, Tue=7200)
export const ESCAPE_PRESETS: EscapePreset[] = [
  {
    id: 'fri_evening',
    label: '연차 0일 · 금 퇴근~일 밤',
    shortLabel: '연차 0일 (금~일)',
    leaveDays: 0,
    departMin: 1440 + 18 * 60, // 금 18:00
    returnDeadlineMin: 4320 + 23 * 60, // 일 23:00
    summary: '금 18:00 출발 가능 ~ 일 23:00 인천 귀가',
  },
  {
    id: 'fri_half',
    label: '반차 · 금 오후~일 밤',
    shortLabel: '반차 (금 오후~일)',
    leaveDays: 0.5,
    departMin: 1440 + 14 * 60, // 금 14:00
    returnDeadlineMin: 4320 + 23 * 60, // 일 23:00
    summary: '금 14:00 출발 가능 ~ 일 23:00 인천 귀가',
  },
  {
    id: 'thu_leave1',
    label: '연차 1일 · 목 퇴근~일 밤',
    shortLabel: '연차 1일 (목~일)',
    leaveDays: 1,
    departMin: 18 * 60, // 목 18:00
    returnDeadlineMin: 4320 + 23 * 60, // 일 23:00
    summary: '목 18:00 출발 가능 ~ 일 23:00 인천 귀가',
  },
  {
    id: 'mon_leave1',
    label: '연차 1일 · 금 퇴근~월 밤',
    shortLabel: '연차 1일 (금~월)',
    leaveDays: 1,
    departMin: 1440 + 18 * 60, // 금 18:00
    returnDeadlineMin: 5760 + 23 * 60, // 월 23:00
    summary: '금 18:00 출발 가능 ~ 월 23:00 인천 귀가',
  },
  {
    id: 'leave2',
    label: '연차 2일 · 목 퇴근~월 밤',
    shortLabel: '연차 2일 (목~월)',
    leaveDays: 2,
    departMin: 18 * 60, // 목 18:00
    returnDeadlineMin: 5760 + 23 * 60, // 월 23:00
    summary: '목 18:00 출발 가능 ~ 월 23:00 인천 귀가',
  },
  {
    id: 'week_leave',
    label: '연차 5일 · 금 퇴근~차주 일 밤',
    shortLabel: '연차 일주일 (9일)',
    leaveDays: 5,
    departMin: 1440 + 18 * 60, // 금 18:00
    returnDeadlineMin: 10 * 1440 + 23 * 60, // 차주 일 23:00
    summary: '금 18:00 출발 가능 ~ 차주 일 23:00 인천 귀가',
  },
]

export function evaluateEscapeRoute(
  route: GlobalRouteNode,
  preset: EscapePreset
): EscapeEvaluation {
  const tzDiffMin = (route.destCoords.utcOffset - 9) * 60
  const earliestBoardKst = preset.departMin + 120 // 2h transfer + ICN T2 check-in
  const latestLandKst = preset.returnDeadlineMin - 90 // 1.5h arrival immigration + transit
  const maxDay = Math.ceil(preset.returnDeadlineMin / 1440) + 1

  // Find earliest catchable outbound flight
  let bestOut: { flightId: string; departKst: number; arriveKst: number } | null = null
  for (let day = 0; day <= maxDay; day += 1) {
    for (const leg of route.outboundFlights) {
      const departKst = day * 1440 + parseHhMm(leg.departTime)
      if (departKst >= earliestBoardKst) {
        if (!bestOut || departKst < bestOut.departKst) {
          bestOut = {
            flightId: leg.flightId,
            departKst,
            arriveKst: departKst + leg.durationMins,
          }
        }
      }
    }
  }

  // Find latest return flight landing at ICN <= latestLandKst
  let bestIn: { flightId: string; departKst: number; arriveKst: number } | null = null
  for (let day = 0; day <= maxDay; day += 1) {
    for (const leg of route.returnFlights) {
      const departLocal = day * 1440 + parseHhMm(leg.departTime)
      const departKst = departLocal - tzDiffMin
      const arriveKst = departKst + leg.durationMins
      if (arriveKst <= latestLandKst) {
        if (!bestIn || departKst > bestIn.departKst) {
          bestIn = {
            flightId: leg.flightId,
            departKst,
            arriveKst,
          }
        }
      }
    }
  }

  if (!bestOut || !bestIn) {
    return {
      routeId: route.routeId,
      reachable: false,
      netLocalHours: 0,
      outbound: null,
      inbound: null,
    }
  }

  // Subtract 2.5h (150m) for destination immigration, baggage, and return check-in buffer
  const rawNetMins = bestIn.departKst - bestOut.arriveKst - 150
  const netLocalHours = Math.max(0, Math.round(rawNetMins / 60))
  const roundTripFlightHours =
    (bestOut.arriveKst - bestOut.departKst + (bestIn.arriveKst - bestIn.departKst)) / 60
  // Require at least 18h locally AND stay duration >= 1.8x round-trip flight time
  const minRecommendedHours = Math.max(18, Math.ceil(roundTripFlightHours * 1.8))

  return {
    routeId: route.routeId,
    reachable: netLocalHours >= minRecommendedHours,
    netLocalHours,
    outbound: {
      flightId: bestOut.flightId,
      departLabel: formatWeekMinute(bestOut.departKst),
      arriveLabel: formatWeekMinute(bestOut.arriveKst + tzDiffMin),
      departKstMin: bestOut.departKst,
      arriveKstMin: bestOut.arriveKst,
    },
    inbound: {
      flightId: bestIn.flightId,
      departLabel: formatWeekMinute(bestIn.departKst + tzDiffMin),
      arriveLabel: formatWeekMinute(bestIn.arriveKst),
      departKstMin: bestIn.departKst,
      arriveKstMin: bestIn.arriveKst,
    },
  }
}
