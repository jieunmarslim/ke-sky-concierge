import type { AirportCoordinates } from '@/types/aviation'

export interface Point3D {
  x: number
  y: number
  z: number
}

export interface GreatCircleMetrics {
  distanceKm: number
  distanceNm: number
  bearingDeg: number
  bearingLabel: string
  timeDiffLabel: string
}

const DEG2RAD = Math.PI / 180
const RAD2DEG = 180 / Math.PI
const EARTH_RADIUS_KM = 6371

export function latLonToCartesian(lat: number, lon: number, radius: number): Point3D {
  const phi = (90 - lat) * DEG2RAD
  const theta = (lon + 180) * DEG2RAD
  const x = -radius * Math.sin(phi) * Math.cos(theta)
  const z = radius * Math.sin(phi) * Math.sin(theta)
  const y = radius * Math.cos(phi)
  return { x, y, z }
}

function normalize3D(p: Point3D): Point3D {
  const len = Math.hypot(p.x, p.y, p.z) || 1
  return { x: p.x / len, y: p.y / len, z: p.z / len }
}

export function buildGreatCircleArcPoints(
  origin: AirportCoordinates,
  dest: AirportCoordinates,
  radius: number,
  segments = 72
): { arcPoints: Point3D[]; surfacePoints: Point3D[] } {
  const a = normalize3D(latLonToCartesian(origin.lat, origin.lon, 1))
  const b = normalize3D(latLonToCartesian(dest.lat, dest.lon, 1))
  const dot = Math.min(1, Math.max(-1, a.x * b.x + a.y * b.y + a.z * b.z))
  const omega = Math.acos(dot)
  const sinOmega = Math.sin(omega)

  // Scale cruise arch height with route angular distance so short hops stay low and long-haul arcs soar cleanly.
  const maxLift = Math.min(0.28, Math.max(0.055, omega * 0.16))

  const arcPoints: Point3D[] = []
  const surfacePoints: Point3D[] = []

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments
    let dir: Point3D
    if (sinOmega < 1e-4) {
      dir = normalize3D({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: a.z + (b.z - a.z) * t,
      })
    } else {
      const s0 = Math.sin((1 - t) * omega) / sinOmega
      const s1 = Math.sin(t * omega) / sinOmega
      dir = normalize3D({
        x: s0 * a.x + s1 * b.x,
        y: s0 * a.y + s1 * b.y,
        z: s0 * a.z + s1 * b.z,
      })
    }

    const lift = Math.sin(Math.PI * t) * maxLift
    const elevatedR = radius + lift
    const surfR = radius + 0.004

    arcPoints.push({ x: dir.x * elevatedR, y: dir.y * elevatedR, z: dir.z * elevatedR })
    surfacePoints.push({ x: dir.x * surfR, y: dir.y * surfR, z: dir.z * surfR })
  }

  return { arcPoints, surfacePoints }
}

export function computeGreatCircleMetrics(
  origin: AirportCoordinates,
  dest: AirportCoordinates
): GreatCircleMetrics {
  const lat1 = origin.lat * DEG2RAD
  const lat2 = dest.lat * DEG2RAD
  const dLat = (dest.lat - origin.lat) * DEG2RAD
  const dLon = (dest.lon - origin.lon) * DEG2RAD

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  const distanceKm = Math.round(EARTH_RADIUS_KM * c)
  const distanceNm = Math.round(distanceKm * 0.539957)

  const y = Math.sin(dLon) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  const bearingDeg = Math.round(((Math.atan2(y, x) * RAD2DEG) + 360) % 360)
  const bearingLabel = `${String(bearingDeg).padStart(3, '0')}°`

  const diff = dest.utcOffset - 9
  let timeDiffLabel = '서울과 시차 없음'
  if (diff > 0) {
    timeDiffLabel = `서울 대비 +${diff}시간`
  } else if (diff < 0) {
    timeDiffLabel = `서울 대비 ${diff}시간`
  }

  return {
    distanceKm,
    distanceNm,
    bearingDeg,
    bearingLabel,
    timeDiffLabel,
  }
}

// Offline simplified continent coastlines ([lon, lat] pairs) for procedural 2048x1024 Earth CanvasTexture
export const WORLD_CONTINENT_POLYGONS: Array<Array<[number, number]>> = [
  // Eurasia (with Arabian, Indian, Indochina, East China, Korean Peninsula, Kamchatka contours)
  [
    [-9.5, 37], [-9, 43], [-1.5, 43.5], [-4.5, 48.5], [2, 51], [8.5, 54],
    [8.2, 57], [11, 55.5], [5, 60.5], [15, 69], [28, 71], [42, 68],
    [60, 69.5], [72, 72.5], [104, 77], [135, 72], [178, 66], [168, 60],
    [162, 55], [156, 51], [142, 54], [136, 44], [130.5, 42.5], [129.2, 37.8],
    [129.1, 35.1], [126.3, 34.4], [126.7, 37.5], [124.4, 39.8], [121.5, 39],
    [118, 39], [122, 37], [120, 34], [122, 31], [119, 25], [113.5, 22],
    [108, 21.5], [109, 13], [104.5, 8.6], [100.5, 13.5], [103.8, 1.3],
    [98, 8], [96.5, 16], [90, 22], [85, 19], [80, 13], [77.5, 8],
    [72.5, 20], [68.5, 23], [62, 25], [56, 26.5], [49, 29.5], [56.5, 24],
    [59.5, 22.5], [53, 16], [43.5, 12.6], [39, 21.5], [34.8, 29.5], [32.5, 31.2],
    [35.8, 36], [27, 37], [26, 41], [23.5, 38], [20, 39.5], [16, 38],
    [12.5, 42], [13.5, 45.5], [9, 44.4], [4, 43.3], [0, 39.5], [-5.5, 36],
  ],
  // Great Britain & Ireland
  [[-6, 50], [-5.2, 54], [-5.8, 58.6], [-2, 57.7], [1.7, 52.5], [1.2, 51.1], [-3, 50.6]],
  [[-10.2, 51.8], [-9.8, 54.4], [-6.1, 55.2], [-6, 52.2]],
  // Japan Archipelago
  [[130.5, 31.4], [131.5, 34], [135.5, 34.4], [139.8, 35.4], [141, 38.5], [141.5, 41.3], [145.5, 43.5], [141.8, 45.4], [139.8, 40.5], [136.5, 36.8], [131, 34.2]],
  // Taiwan & Philippines
  [[120.2, 22], [120.8, 25.1], [121.9, 25], [121.5, 22.5]],
  [[120, 14.5], [122, 18.5], [123.5, 13.5], [126.3, 7], [122.5, 6.8], [121.5, 11]],
  // Indonesia (Sumatra, Java, Borneo, Sulawesi)
  [[95.5, 5.5], [105.5, -5.8], [114.5, -8.5], [106, -6.8], [98, 2]],
  [[109, -3.2], [110, 1.5], [117, 6.5], [118.8, 1.2], [116, -3.8]],
  // Africa
  [
    [-6, 35.8], [10.5, 37.2], [11.5, 33], [20, 32.5], [32.3, 31.3], [38, 21.5],
    [43.3, 12.5], [51.3, 11.9], [45, 2], [40, -10.5], [35, -20], [32.8, -26.5],
    [28, -33], [20, -34.8], [18.3, -34], [15, -26], [12, -16], [12.3, -6],
    [9.4, 4], [3, 6.4], [-8, 4.5], [-13.5, 9.5], [-17.5, 14.7], [-16, 21],
    [-10, 29.5],
  ],
  // Madagascar
  [[44, -25.2], [44.2, -16.5], [49.3, -12], [50.3, -15.5], [47.5, -24.8]],
  // North America & Central America
  [
    [-168, 65.5], [-161, 70.5], [-141, 70], [-126, 70.5], [-105, 69], [-83, 70],
    [-64, 62], [-55.5, 52], [-64, 44], [-70, 41.7], [-75.5, 35.5], [-81, 31],
    [-80.2, 25.2], [-82.5, 29], [-89, 29.8], [-97, 26], [-96, 19], [-90, 21.3],
    [-87, 21], [-83.5, 15], [-83, 10], [-78, 8.5], [-85, 10.5], [-92.5, 14.5],
    [-105, 19], [-110, 24], [-114, 31], [-117.2, 32.5], [-122.5, 37.8],
    [-124.5, 48.3], [-136, 58], [-149, 60], [-161, 55.5], [-166, 60],
  ],
  // Greenland
  [[-53, 60.5], [-56, 72], [-42, 82], [-18, 81], [-22, 70], [-43, 60]],
  // South America
  [
    [-78, 9], [-72, 12], [-62, 10.5], [-50, 1.5], [-35, -5.5], [-38.5, -13],
    [-40, -22], [-48, -28], [-53.5, -34], [-58, -38.5], [-65, -43], [-68.5, -54],
    [-74.5, -52], [-73.5, -42], [-71.5, -33], [-70.5, -18.5], [-77.5, -12],
    [-81.3, -4.7], [-79, 2],
  ],
  // Australia & New Guinea
  [
    [113.5, -22], [122, -17], [131, -12], [136.5, -12.5], [136, -15.5],
    [141, -17], [142.5, -10.8], [146, -18], [153.5, -28], [150, -37],
    [141, -38.5], [136, -34.5], [129, -31.8], [115.2, -34.2], [114, -27],
  ],
  [[131, -2], [141, -2.5], [150.5, -10.2], [143, -8.5], [135, -4.5]],
  // New Zealand
  [[166.5, -46.2], [172, -41.5], [178.4, -37.7], [174, -35], [172.5, -43.5], [168, -46.5]],
]

export const NETWORK_HUB_DOTS: Array<[number, number]> = [
  [126.44, 37.46], // ICN
  [126.79, 37.55], // GMP
  [126.49, 33.51], // CJU
  [140.39, 35.77], // NRT
  [130.45, 33.58], // FUK
  [121.23, 25.08], // TPE
  [100.75, 13.69], // BKK
  [115.17, -8.75], // DPS
  [103.99, 1.36],  // SIN
  [2.55, 49.01],   // CDG
  [-0.45, 51.47],  // LHR
  [-118.41, 33.94], // LAX
  [-73.78, 40.64],  // JFK
  [-157.92, 21.32], // HNL
]
