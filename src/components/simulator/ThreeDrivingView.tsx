import { useEffect, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { PARKED_VEHICLES, PILLARS, WALLS, type Collision } from '../../engine/collisionDetection'
import { TARGET_PARKING_BAY } from '../../engine/parkingEvaluation'
import type { VehicleState } from '../../engine/vehiclePhysics'

type ThreeDrivingViewProps = {
  vehicle: VehicleState
  danger: Collision | null
  children?: ReactNode
}

function createCar(color: number) {
  const car = new THREE.Group()
  const bodyMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.28 })
  const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x243c46, roughness: 0.16, metalness: 0.18 })
  const tireMaterial = new THREE.MeshStandardMaterial({ color: 0x171b1a, roughness: 0.9 })
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.7, 1.8), bodyMaterial)
  body.position.y = 0.55
  car.add(body)
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.62, 1.5), glassMaterial)
  cabin.position.set(0.2, 1.18, 0)
  car.add(cabin)
  for (const x of [-1.45, 1.45]) {
    for (const z of [-0.91, 0.91]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.2, 14), tireMaterial)
      wheel.rotation.x = Math.PI / 2
      wheel.position.set(x, 0.35, z)
      car.add(wheel)
    }
  }
  const rearLightMaterial = new THREE.MeshBasicMaterial({ color: 0xe84e45 })
  for (const z of [-0.58, 0.58]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.28), rearLightMaterial)
    lamp.position.set(-2.31, 0.62, z)
    car.add(lamp)
  }
  return car
}

function addLine(scene: THREE.Scene, points: [number, number][], color = 0xf7f2cf) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(([x, z]) => new THREE.Vector3(x, 0.018, z)))
  scene.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color })))
}

function buildScene() {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x202724)
  scene.fog = new THREE.Fog(0x202724, 15, 34)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 12),
    new THREE.MeshStandardMaterial({ color: 0x555e5a, roughness: 1 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.set(9, 0, 6)
  scene.add(ground)

  for (const x of [4.95, 7.65, 10.35, 13.05]) addLine(scene, [[x, 5.5], [x, 11.42]])
  addLine(scene, [[4.95, 11.42], [13.05, 11.42]])
  const targetMaterial = new THREE.MeshBasicMaterial({ color: 0x59d3a9, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
  const target = new THREE.Mesh(
    new THREE.PlaneGeometry(TARGET_PARKING_BAY.right - TARGET_PARKING_BAY.left, TARGET_PARKING_BAY.bottom - TARGET_PARKING_BAY.top),
    targetMaterial,
  )
  target.rotation.x = -Math.PI / 2
  target.position.set(TARGET_PARKING_BAY.center.x, 0.025, TARGET_PARKING_BAY.center.y)
  scene.add(target)

  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x303a36, roughness: 0.86 })
  for (const wall of WALLS) {
    const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(wall.width, 2.7, wall.height), wallMaterial)
    wallMesh.position.set(wall.x + wall.width / 2, 1.35, wall.y + wall.height / 2)
    scene.add(wallMesh)
  }
  const pillarMaterial = new THREE.MeshStandardMaterial({ color: 0xc49a51, roughness: 0.72 })
  for (const pillar of PILLARS) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(pillar.width, 2.7, pillar.height), pillarMaterial)
    mesh.position.set(pillar.x + pillar.width / 2, 1.35, pillar.y + pillar.height / 2)
    scene.add(mesh)
  }
  PARKED_VEHICLES.forEach((vehicle, index) => {
    const car = createCar(index ? 0x344b61 : 0xc8cfcc)
    car.position.set(vehicle.x, 0, vehicle.y)
    car.rotation.y = -vehicle.heading
    scene.add(car)
  })

  scene.add(new THREE.HemisphereLight(0xdde9e5, 0x38423e, 2.2))
  const overhead = new THREE.DirectionalLight(0xffffff, 2.4)
  overhead.position.set(4, 9, 3)
  scene.add(overhead)
  return scene
}

export function ThreeDrivingView({ vehicle, danger, children }: ThreeDrivingViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const vehicleRef = useRef(vehicle)
  const dangerRef = useRef(danger)

  useEffect(() => {
    vehicleRef.current = vehicle
    dangerRef.current = danger
  }, [danger, vehicle])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.setScissorTest(true)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    const scene = buildScene()
    const userCar = createCar(0x087858)
    scene.add(userCar)
    const mainCamera = new THREE.PerspectiveCamera(62, 1, 0.08, 50)
    const leftCamera = new THREE.PerspectiveCamera(72, 1, 0.08, 35)
    const rightCamera = new THREE.PerspectiveCamera(72, 1, 0.08, 35)
    const rearCamera = new THREE.PerspectiveCamera(78, 1, 0.08, 35)
    let frame = 0

    const renderCamera = (camera: THREE.PerspectiveCamera, x: number, y: number, width: number, height: number, mirror = false) => {
      camera.aspect = Math.max(0.1, width / height)
      camera.updateProjectionMatrix()
      if (mirror) camera.projectionMatrix.elements[0] *= -1
      renderer.setViewport(x, y, width, height)
      renderer.setScissor(x, y, width, height)
      renderer.clearDepth()
      renderer.render(scene, camera)
    }

    const draw = () => {
      const width = Math.max(1, canvas.clientWidth)
      const height = Math.max(1, canvas.clientHeight)
      renderer.setSize(width, height, false)
      const state = vehicleRef.current
      const forward = new THREE.Vector3(Math.cos(state.heading), 0, Math.sin(state.heading))
      const side = new THREE.Vector3(-forward.z, 0, forward.x)
      const center = new THREE.Vector3(state.x, 0, state.y)
      userCar.position.copy(center)
      userCar.rotation.y = -state.heading
      const body = userCar.children[0] as THREE.Mesh
      ;(body.material as THREE.MeshStandardMaterial).color.setHex(dangerRef.current ? 0xb56b28 : 0x087858)

      mainCamera.position.copy(center).addScaledVector(forward, 0.65).addScaledVector(side, -0.34).setY(1.38)
      mainCamera.lookAt(center.clone().addScaledVector(forward, 9).setY(1.05))
      leftCamera.position.copy(center).addScaledVector(forward, 0.45).addScaledVector(side, -0.92).setY(1.3)
      leftCamera.lookAt(leftCamera.position.clone().addScaledVector(forward, -8).addScaledVector(side, -1.3).setY(0.85))
      rightCamera.position.copy(center).addScaledVector(forward, 0.45).addScaledVector(side, 0.92).setY(1.3)
      rightCamera.lookAt(rightCamera.position.clone().addScaledVector(forward, -8).addScaledVector(side, 1.3).setY(0.85))
      rearCamera.position.copy(center).addScaledVector(forward, -2.33).setY(0.78)
      rearCamera.lookAt(rearCamera.position.clone().addScaledVector(forward, -8).setY(0.45))

      renderer.setScissor(0, 0, width, height)
      renderer.setViewport(0, 0, width, height)
      renderer.setClearColor(0x202724)
      renderer.clear(true, true, true)
      renderCamera(mainCamera, 0, 0, width, height)
      const mirrorWidth = Math.round(width * 0.3)
      const mirrorHeight = Math.round(height * 0.2)
      renderCamera(leftCamera, Math.round(width * 0.015), height - mirrorHeight - Math.round(height * 0.02), mirrorWidth, mirrorHeight, true)
      renderCamera(rightCamera, width - mirrorWidth - Math.round(width * 0.015), height - mirrorHeight - Math.round(height * 0.02), mirrorWidth, mirrorHeight, true)
      if (state.gear === 'R') {
        const rearWidth = Math.round(width * 0.27)
        const rearHeight = Math.round(height * 0.3)
        renderCamera(rearCamera, width - rearWidth - Math.round(width * 0.025), Math.round(height * 0.39), rearWidth, rearHeight)
      }
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      cancelAnimationFrame(frame)
      renderer.dispose()
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        object.geometry.dispose()
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach((material) => material.dispose())
      })
    }
  }, [])

  return (
    <div className="parking-canvas-frame three-driving-frame">
      <canvas ref={canvasRef} className="three-driving-canvas" aria-label="운전자 시점 3D 주차 연습 화면" />
      <div className="three-view-label left-mirror-label">좌측 미러</div>
      <div className="three-view-label right-mirror-label">우측 미러</div>
      {vehicle.gear === 'R' && <div className="three-view-label rear-camera-label">후방카메라 · R 자동</div>}
      {children}
    </div>
  )
}
