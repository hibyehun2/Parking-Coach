import {
  PARKED_VEHICLES,
  PILLARS,
  detectCollision,
} from './collisionDetection.ts'
import { TARGET_PARKING_BAY } from './parkingEvaluation.ts'
import type { VehicleState } from './vehiclePhysics'

export type DriverView = 'left' | 'rear' | 'right'

type LocalPoint = { side: number; rear: number }

function toLocal(vehicle: VehicleState, x: number, y: number): LocalPoint {
  const deltaX = x - vehicle.x
  const deltaY = y - vehicle.y
  const cosine = Math.cos(vehicle.heading)
  const sine = Math.sin(vehicle.heading)
  return {
    side: -deltaX * sine + deltaY * cosine,
    rear: -(deltaX * cosine + deltaY * sine),
  }
}

export function rearSensorDistance(vehicle: VehicleState, maximumDistance = 5) {
  const step = 0.05
  for (let distance = 0; distance <= maximumDistance; distance += step) {
    const probe = {
      ...vehicle,
      x: vehicle.x - Math.cos(vehicle.heading) * distance,
      y: vehicle.y - Math.sin(vehicle.heading) * distance,
    }
    if (detectCollision(probe)) return Math.round(distance * 100) / 100
  }
  return null
}

function drawParkingBay(
  context: CanvasRenderingContext2D,
  vehicle: VehicleState,
  project: (point: LocalPoint) => [number, number],
) {
  const corners = [
    [TARGET_PARKING_BAY.left, TARGET_PARKING_BAY.top],
    [TARGET_PARKING_BAY.right, TARGET_PARKING_BAY.top],
    [TARGET_PARKING_BAY.right, TARGET_PARKING_BAY.bottom],
    [TARGET_PARKING_BAY.left, TARGET_PARKING_BAY.bottom],
  ] as const
  context.strokeStyle = '#8be2c4'
  context.lineWidth = 2
  context.setLineDash([5, 4])
  context.beginPath()
  corners.forEach(([x, y], index) => {
    const [screenX, screenY] = project(toLocal(vehicle, x, y))
    if (index === 0) context.moveTo(screenX, screenY)
    else context.lineTo(screenX, screenY)
  })
  context.closePath()
  context.stroke()
  context.setLineDash([])
}

export function renderDriverView(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  vehicle: VehicleState,
  view: DriverView,
) {
  context.clearRect(0, 0, width, height)
  const isRear = view === 'rear'
  const scale = Math.max(9, Math.min(width / 12, height / 7))
  const originX = width / 2
  const originY = isRear ? height * 0.16 : height * 0.22
  const project = ({ side, rear }: LocalPoint): [number, number] => [
    originX + side * scale,
    originY + rear * scale,
  ]

  const gradient = context.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, isRear ? '#15221e' : '#253531')
  gradient.addColorStop(1, '#53605b')
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)

  context.save()
  context.beginPath()
  context.rect(0, 0, width, height)
  context.clip()
  drawParkingBay(context, vehicle, project)

  if (isRear) {
    context.strokeStyle = 'rgba(255, 216, 98, .9)'
    context.lineWidth = 2
    for (const direction of [-1, 1]) {
      context.beginPath()
      context.moveTo(originX + direction * scale * 0.65, originY)
      context.lineTo(originX + direction * scale * 1.5, originY + scale * 4.5)
      context.stroke()
    }
    for (const distance of [1, 2, 3]) {
      context.strokeStyle = distance === 1 ? '#ff756b' : distance === 2 ? '#ffd862' : '#77e0b9'
      context.beginPath()
      context.moveTo(originX - scale * (0.65 + distance * 0.18), originY + scale * distance)
      context.lineTo(originX + scale * (0.65 + distance * 0.18), originY + scale * distance)
      context.stroke()
    }
  }

  const obstacles = [
    ...PARKED_VEHICLES.map((item) => ({ ...item, width: 1.8, length: 4.6, color: '#d9e0dd' })),
    ...PILLARS.map((item) => ({ ...item, length: item.height, color: '#d6ad68', heading: 0 })),
  ]
  for (const obstacle of obstacles) {
    const local = toLocal(vehicle, obstacle.x, obstacle.y)
    const visibleInMirror = view === 'left' ? local.side <= 1.2 : view === 'right' ? local.side >= -1.2 : true
    if (!visibleInMirror || local.rear < -2.5 || local.rear > 8) continue
    const [x, y] = project(local)
    context.fillStyle = obstacle.color
    context.strokeStyle = 'rgba(255,255,255,.65)'
    context.lineWidth = 1.5
    context.beginPath()
    context.roundRect(x - scale * 0.65, y - scale * 0.38, scale * 1.3, scale * 0.76, 4)
    context.fill()
    context.stroke()
  }
  context.restore()

  if (!isRear) {
    context.strokeStyle = 'rgba(225,239,234,.75)'
    context.lineWidth = 4
    context.strokeRect(2, 2, width - 4, height - 4)
    context.fillStyle = 'rgba(255,255,255,.8)'
    context.font = '700 10px sans-serif'
    context.fillText('거울에 보이는 사물은 실제보다 가까이 있습니다', 8, height - 9)
  }
}
