import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  buildGreatCircleArcPoints,
  computeGreatCircleMetrics,
  latLonToCartesian,
} from '@/lib/aerospaceMath'
import type { EscapeEvaluation, GlobalRouteNode } from '@/types/aviation'

interface GlobalNetworkGlobeProps {
  routes: GlobalRouteNode[]
  evaluations: Record<string, EscapeEvaluation>
  selectedRouteId: string
  onSelectRoute: (routeId: string) => void
}

function createJetlinerMesh(): THREE.Group {
  const jet = new THREE.Group()
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xe6f4fe,
    emissive: 0x65b2e8,
    emissiveIntensity: 0.45,
    metalness: 0.4,
    roughness: 0.2,
  })
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0x051766,
    emissive: 0x65b2e8,
    emissiveIntensity: 0.58,
    roughness: 0.28,
  })

  // Fuselage aligned along +Z (nose forward) and -Z (tail aft)
  const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(0.0072, 0.056, 8, 16), bodyMat)
  fuselage.rotation.x = Math.PI / 2
  jet.add(fuselage)

  // Swept-back main wings (+Z forward -> root leading edge +0.017, wingtips sweep aft to -0.020)
  const wingShape = new THREE.Shape()
  wingShape.moveTo(0, 0.017)
  wingShape.lineTo(0.048, -0.013)
  wingShape.lineTo(0.048, -0.02)
  wingShape.lineTo(0, -0.002)
  wingShape.lineTo(-0.048, -0.02)
  wingShape.lineTo(-0.048, -0.013)
  wingShape.closePath()
  const wings = new THREE.Mesh(
    new THREE.ExtrudeGeometry(wingShape, { depth: 0.0022, bevelEnabled: false }),
    bodyMat
  )
  wings.rotation.x = Math.PI / 2
  wings.position.set(0, 0.0005, 0.002)
  jet.add(wings)

  // Swept-back horizontal stabilizer at tail (-Z)
  const hStabShape = new THREE.Shape()
  hStabShape.moveTo(0, -0.02)
  hStabShape.lineTo(0.019, -0.032)
  hStabShape.lineTo(0.019, -0.036)
  hStabShape.lineTo(0, -0.03)
  hStabShape.lineTo(-0.019, -0.036)
  hStabShape.lineTo(-0.019, -0.032)
  hStabShape.closePath()
  const hStab = new THREE.Mesh(
    new THREE.ExtrudeGeometry(hStabShape, { depth: 0.0018, bevelEnabled: false }),
    bodyMat
  )
  hStab.rotation.x = Math.PI / 2
  hStab.position.set(0, 0.002, 0)
  jet.add(hStab)

  // Swept-back vertical tailfin pointing radially up (+Y) and sweeping aft (-Z)
  const finShape = new THREE.Shape()
  finShape.moveTo(-0.016, 0.004)
  finShape.lineTo(-0.03, 0.023)
  finShape.lineTo(-0.036, 0.023)
  finShape.lineTo(-0.033, 0.004)
  finShape.closePath()
  const vFin = new THREE.Mesh(
    new THREE.ExtrudeGeometry(finShape, { depth: 0.0024, bevelEnabled: false }),
    tailMat
  )
  vFin.rotation.y = -Math.PI / 2
  vFin.position.set(0.0012, 0, 0)
  jet.add(vFin)

  // Twin underwing engine nacelles
  const engineGeo = new THREE.CylinderGeometry(0.003, 0.0025, 0.012, 12)
  const leftEngine = new THREE.Mesh(engineGeo, bodyMat)
  leftEngine.rotation.x = Math.PI / 2
  leftEngine.position.set(-0.017, -0.0032, 0.005)
  jet.add(leftEngine)

  const rightEngine = new THREE.Mesh(engineGeo, bodyMat)
  rightEngine.rotation.x = Math.PI / 2
  rightEngine.position.set(0.017, -0.0032, 0.005)
  jet.add(rightEngine)

  return jet
}

export function GlobalNetworkGlobe({
  routes,
  evaluations,
  selectedRouteId,
  onSelectRoute,
}: GlobalNetworkGlobeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const pinRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const routesRef = useRef<GlobalRouteNode[]>(routes)
  routesRef.current = routes

  const [webglUnsupported, setWebglUnsupported] = useState(false)

  const apiRef = useRef<{
    rebuildNetwork: (
      list: GlobalRouteNode[],
      activeId: string,
      evals: Record<string, EscapeEvaluation>
    ) => void
    focusRoute: (route: GlobalRouteNode) => void
  } | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    } catch {
      setWebglUnsupported(true)
      return
    }

    const applyCameraLayout = (cam: THREE.PerspectiveCamera, w: number, h: number) => {
      cam.aspect = w / h
      if (w >= 1024) {
        cam.setViewOffset(w, h, Math.round(w * 0.14), 0, w, h)
      } else {
        cam.clearViewOffset()
      }
      cam.updateProjectionMatrix()
    }

    const initW = container.clientWidth || window.innerWidth
    const initH = container.clientHeight || window.innerHeight
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(initW, initH)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.22
    container.replaceChildren(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x040915)

    const camera = new THREE.PerspectiveCamera(38, initW / initH, 0.1, 100)
    applyCameraLayout(camera, initW, initH)
    camera.position.set(-1.5, 1.45, -1.75)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.enablePan = false
    controls.minDistance = 1.55
    controls.maxDistance = 4.2

    let tweenPos: THREE.Vector3 | null = null
    const stopTween = () => {
      tweenPos = null
    }
    controls.addEventListener('start', stopTween)

    // Lighting tuned for NASA Black Marble night lights & subtle ocean/terrain relief
    scene.add(new THREE.AmbientLight(0xcbe2ff, 1.45))
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.55)
    keyLight.position.set(4, 3, 4)
    scene.add(keyLight)
    const rimLight = new THREE.DirectionalLight(0x65b2e8, 1.25)
    rimLight.position.set(-4, -2, -3)
    scene.add(rimLight)

    // Subtle deep-space starfield
    const starCount = 1200
    const starPositions = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i += 1) {
      const r = 10 + (i % 9) * 1.1
      const theta = ((i * 137.508) % 360) * (Math.PI / 180)
      const phi = Math.acos(1 - (2 * (i + 0.5)) / starCount)
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      starPositions[i * 3 + 1] = r * Math.cos(phi)
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    const starMat = new THREE.PointsMaterial({
      color: 0xa5cdf0,
      size: 0.036,
      transparent: true,
      opacity: 0.55,
    })
    scene.add(new THREE.Points(starGeo, starMat))

    // High-resolution NASA Black Marble 4K Earth + Elevation Bump Map
    const textureLoader = new THREE.TextureLoader()
    const nightTex = textureLoader.load('/assets/earth-night.jpg')
    nightTex.colorSpace = THREE.SRGBColorSpace
    nightTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())

    const bumpTex = textureLoader.load('/assets/earth-topology.png')
    bumpTex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())

    const earthGeo = new THREE.SphereGeometry(1, 96, 96)
    const earthMat = new THREE.MeshStandardMaterial({
      map: nightTex,
      bumpMap: bumpTex,
      bumpScale: 0.032,
      emissiveMap: nightTex,
      emissive: new THREE.Color(0xffe0a8),
      emissiveIntensity: 0.52,
      roughness: 0.78,
      metalness: 0.08,
    })
    scene.add(new THREE.Mesh(earthGeo, earthMat))

    // Soft Fresnel Atmosphere Halo
    const atmoGeo = new THREE.SphereGeometry(1.068, 64, 64)
    const atmoMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.64 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.2);
          gl_FragColor = vec4(0.38, 0.68, 0.92, 1.0) * intensity * 1.1;
        }
      `,
    })
    scene.add(new THREE.Mesh(atmoGeo, atmoMat))

    const networkGroup = new THREE.Group()
    scene.add(networkGroup)

    let activeCurve: THREE.CatmullRomCurve3 | null = null
    let jetMesh: THREE.Group | null = null
    let destBeaconRing: THREE.Mesh | null = null
    let photonStreams: Array<{
      curve: THREE.CatmullRomCurve3
      mesh: THREE.Mesh
      phase: number
      speed: number
    }> = []

    const disposeGroup = (group: THREE.Group) => {
      while (group.children.length > 0) {
        const child = group.children[0]
        group.remove(child)
        child.traverse((obj) => {
          if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
            obj.geometry.dispose()
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose())
            else obj.material.dispose()
          }
        })
      }
    }

    const rebuildNetwork = (
      list: GlobalRouteNode[],
      activeId: string,
      evals: Record<string, EscapeEvaluation>
    ) => {
      disposeGroup(networkGroup)
      activeCurve = null
      jetMesh = null
      destBeaconRing = null
      photonStreams = []

      if (list.length === 0) return

      // Incheon (ICN) hub marker
      const icnPos = latLonToCartesian(37.4602, 126.4407, 1.008)
      const icnVec = new THREE.Vector3(icnPos.x, icnPos.y, icnPos.z)
      const icnDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.015, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      )
      icnDot.position.copy(icnVec)
      networkGroup.add(icnDot)

      const icnRing = new THREE.Mesh(
        new THREE.RingGeometry(0.023, 0.034, 32),
        new THREE.MeshBasicMaterial({
          color: 0x7cc3f7,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        })
      )
      icnRing.position.copy(icnVec)
      icnRing.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        icnVec.clone().normalize()
      )
      networkGroup.add(icnRing)

      const photonGeo = new THREE.SphereGeometry(0.008, 10, 10)

      list.forEach((route, idx) => {
        const isActive = route.routeId === activeId
        const isReachable = evals[route.routeId]?.reachable ?? true
        const { arcPoints, surfacePoints } = buildGreatCircleArcPoints(
          route.originCoords,
          route.destCoords,
          1.0,
          76
        )
        const arcVecs = arcPoints.map((p) => new THREE.Vector3(p.x, p.y, p.z))
        const curve = new THREE.CatmullRomCurve3(arcVecs)

        if (isActive) {
          activeCurve = curve
          const surfVecs = surfacePoints.map((p) => new THREE.Vector3(p.x, p.y, p.z))
          networkGroup.add(
            new THREE.Line(
              new THREE.BufferGeometry().setFromPoints(surfVecs),
              new THREE.LineBasicMaterial({
                color: isReachable ? 0x65b2e8 : 0x64748b,
                transparent: true,
                opacity: isReachable ? 0.45 : 0.22,
              })
            )
          )

          const tube = new THREE.Mesh(
            new THREE.TubeGeometry(curve, 80, 0.0052, 8, false),
            new THREE.MeshStandardMaterial({
              color: isReachable ? 0x9ad4fb : 0x94a3b8,
              emissive: isReachable ? 0x65b2e8 : 0x475569,
              emissiveIntensity: isReachable ? 0.85 : 0.35,
              roughness: 0.2,
            })
          )
          networkGroup.add(tube)

          const destPos = latLonToCartesian(route.destCoords.lat, route.destCoords.lon, 1.008)
          const destVec = new THREE.Vector3(destPos.x, destPos.y, destPos.z)
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.02, 0.031, 32),
            new THREE.MeshBasicMaterial({
              color: 0xffffff,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.85,
            })
          )
          ring.position.copy(destVec)
          ring.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 0, 1),
            destVec.clone().normalize()
          )
          destBeaconRing = ring
          networkGroup.add(ring)

          jetMesh = createJetlinerMesh()
          networkGroup.add(jetMesh)
        } else if (isReachable) {
          // Reachable destination under current leave schedule: luminous Korean Air Sky Blue
          networkGroup.add(
            new THREE.Line(
              new THREE.BufferGeometry().setFromPoints(arcVecs),
              new THREE.LineBasicMaterial({
                color: 0x65b2e8,
                transparent: true,
                opacity: 0.38,
              })
            )
          )

          const photonMesh = new THREE.Mesh(
            photonGeo,
            new THREE.MeshBasicMaterial({ color: 0xdcf0fc })
          )
          networkGroup.add(photonMesh)
          photonStreams.push({
            curve,
            mesh: photonMesh,
            phase: (idx * 0.13) % 1,
            speed: 0.12 + (idx % 3) * 0.035,
          })
        } else {
          // Unreachable under current schedule: quiet dim arc
          networkGroup.add(
            new THREE.Line(
              new THREE.BufferGeometry().setFromPoints(arcVecs),
              new THREE.LineBasicMaterial({
                color: 0x64748b,
                transparent: true,
                opacity: 0.1,
              })
            )
          )
        }
      })
    }

    const focusRoute = (route: GlobalRouteNode) => {
      const o = latLonToCartesian(route.originCoords.lat, route.originCoords.lon, 1)
      const d = latLonToCartesian(route.destCoords.lat, route.destCoords.lon, 1)
      const oVec = new THREE.Vector3(o.x, o.y, o.z).normalize()
      const dVec = new THREE.Vector3(d.x, d.y, d.z).normalize()
      const mid = oVec.clone().add(dVec)
      if (mid.lengthSq() < 1e-4) mid.set(0, 1, 0)
      else mid.normalize()

      const metrics = computeGreatCircleMetrics(route.originCoords, route.destCoords)
      const dist =
        metrics.distanceKm > 7500 ? 2.65 : metrics.distanceKm > 3000 ? 2.28 : 1.92
      tweenPos = mid.multiplyScalar(dist)
    }

    apiRef.current = { rebuildNetwork, focusRoute }
    if (routes.length > 0) {
      rebuildNetwork(routes, selectedRouteId, evaluations)
      const initial = routes.find((r) => r.routeId === selectedRouteId) || routes[0]
      focusRoute(initial)
      if (tweenPos) camera.position.copy(tweenPos)
      tweenPos = null
    }

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return
      const w = container.clientWidth || window.innerWidth
      const h = container.clientHeight || window.innerHeight
      applyCameraLayout(camera, w, h)
      renderer.setSize(w, h)
    })
    resizeObserver.observe(container)

    let rafId = 0
    let activeFlightProgress = 0
    let lastTime = performance.now()
    const tempUp = new THREE.Vector3()
    const tempTan = new THREE.Vector3()
    const tempLook = new THREE.Vector3()
    const tempProj = new THREE.Vector3()
    const tempNormal = new THREE.Vector3()
    const tempCamDir = new THREE.Vector3()

    const animate = (now: number) => {
      rafId = window.requestAnimationFrame(animate)
      const dt = Math.min(0.05, (now - lastTime) / 1000)
      lastTime = now

      if (tweenPos) {
        camera.position.lerp(tweenPos, 0.065)
        if (camera.position.distanceTo(tweenPos) < 0.015) {
          tweenPos = null
        }
      }

      controls.autoRotate = !tweenPos
      controls.autoRotateSpeed = 0.14
      controls.update()

      if (activeCurve && jetMesh) {
        activeFlightProgress = (activeFlightProgress + dt * 0.13) % 1
        const pos = activeCurve.getPointAt(activeFlightProgress)
        const ahead = activeCurve.getPointAt(Math.min(1, activeFlightProgress + 0.015))
        jetMesh.position.copy(pos)
        tempUp.copy(pos).normalize()
        tempTan.copy(ahead).sub(pos)
        if (tempTan.lengthSq() > 1e-8) {
          jetMesh.up.copy(tempUp)
          tempLook.copy(pos).add(tempTan)
          jetMesh.lookAt(tempLook)
        }
      }

      for (const stream of photonStreams) {
        stream.phase = (stream.phase + dt * stream.speed) % 1
        stream.mesh.position.copy(stream.curve.getPointAt(stream.phase))
      }

      if (destBeaconRing) {
        const s = 1 + Math.sin(now * 0.0045) * 0.28
        destBeaconRing.scale.setScalar(s)
      }

      const w = container.clientWidth || window.innerWidth
      const h = container.clientHeight || window.innerHeight
      for (const route of routesRef.current) {
        const el = pinRefs.current[route.routeId]
        if (!el) continue
        const pt = latLonToCartesian(route.destCoords.lat, route.destCoords.lon, 1.015)
        tempProj.set(pt.x, pt.y, pt.z)
        tempNormal.copy(tempProj).normalize()
        tempCamDir.copy(camera.position).sub(tempProj).normalize()
        const facing = tempNormal.dot(tempCamDir)

        tempProj.project(camera)
        const isVisible = facing > 0.16 && tempProj.z < 1
        if (!isVisible) {
          el.style.opacity = '0'
          el.style.pointerEvents = 'none'
          continue
        }

        const px = (tempProj.x * 0.5 + 0.5) * w
        const py = (-tempProj.y * 0.5 + 0.5) * h
        el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) translate(-50%, -120%)`
        el.style.opacity = '1'
        el.style.pointerEvents = 'auto'
      }

      renderer.render(scene, camera)
    }

    rafId = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
      controls.removeEventListener('start', stopTween)
      controls.dispose()
      disposeGroup(networkGroup)
      starGeo.dispose()
      starMat.dispose()
      earthGeo.dispose()
      earthMat.dispose()
      nightTex.dispose()
      bumpTex.dispose()
      atmoGeo.dispose()
      atmoMat.dispose()
      renderer.dispose()
      apiRef.current = null
    }
    // Mount 3D scene once; reactive route & schedule updates run through apiRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (routes.length === 0) return
    apiRef.current?.rebuildNetwork(routes, selectedRouteId, evaluations)
    const active = routes.find((r) => r.routeId === selectedRouteId)
    if (active) {
      apiRef.current?.focusRoute(active)
    }
  }, [routes, selectedRouteId, evaluations])

  if (webglUnsupported) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#040915] text-sm text-[#8FA3BF]">
        3D WebGL 환경을 초기화하지 못했습니다. 우측 패널에서 노선별 일정을 확인할 수 있습니다.
      </div>
    )
  }

  return (
    <div className="relative h-full w-full select-none">
      <div ref={containerRef} className="h-full w-full cursor-grab active:cursor-grabbing" />

      {/* 3D-Projected Clickable Destination Tags */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {routes.map((route) => {
          const isSelected = route.routeId === selectedRouteId
          const evalInfo = evaluations[route.routeId]
          const isReachable = evalInfo?.reachable ?? false
          return (
            <button
              key={route.routeId}
              ref={(el) => {
                pinRefs.current[route.routeId] = el
              }}
              type="button"
              onClick={() => onSelectRoute(route.routeId)}
              style={{ opacity: 0 }}
              className={`absolute top-0 left-0 flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur-md transition-colors ${
                isSelected
                  ? 'bg-[#65B2E8] text-[#041238] shadow-[0_6px_20px_rgba(101,178,232,0.4)]'
                  : isReachable
                    ? 'bg-[#081021]/85 text-[#F5F8FC] hover:bg-[#13254A]'
                    : 'bg-[#081021]/45 text-[#7E95B4] hover:bg-[#102040]/80'
              }`}
            >
              <span>{route.destCity.split('(')[0]}</span>
              <span className="font-mono opacity-85 tabular-nums">
                {isReachable && evalInfo ? `${evalInfo.netLocalHours}h` : route.destCode}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
