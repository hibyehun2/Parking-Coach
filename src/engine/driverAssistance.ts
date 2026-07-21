import {
  PARKED_VEHICLES,
  PILLARS,
  detectCollision,
} from './collisionDetection.ts'
import { TARGET_PARKING_BAY } from './parkingEvaluation.ts'
import type { VehicleState } from './vehiclePhysics'

export type DriverView = 'left' | 'rear' | 'right'

type LocalPoint = { side: number; rear: number }
type ScreenPoint = { x: number; y: number; depth: number }

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

function drawParkingBay(context: CanvasRenderingContext2D, vehicle: VehicleState, project: (point: LocalPoint) => ScreenPoint | null) {
  const corners = [
    [TARGET_PARKING_BAY.left, TARGET_PARKING_BAY.top],
    [TARGET_PARKING_BAY.right, TARGET_PARKING_BAY.top],
    [TARGET_PARKING_BAY.right, TARGET_PARKING_BAY.bottom],
    [TARGET_PARKING_BAY.left, TARGET_PARKING_BAY.bottom],
  ] as const
  context.strokeStyle = 'rgba(240, 245, 226, .95)'
  context.lineWidth = 2.5
  for (let index = 0; index < corners.length; index += 1) {
    const [startX, startY] = corners[index]
    const [endX, endY] = corners[(index + 1) % corners.length]
    const start = project(toLocal(vehicle, startX, startY))
    const end = project(toLocal(vehicle, endX, endY))
    if (!start || !end) continue
    context.beginPath()
    context.moveTo(start.x, start.y)
    context.lineTo(end.x, end.y)
    context.stroke()
  }
}

function obstacleCorners(obstacle: { x: number; y: number; length: number; width: number; heading: number }) {
  const cosine = Math.cos(obstacle.heading)
  const sine = Math.sin(obstacle.heading)
  return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([lengthSign, widthSign]) => ({
    x: obstacle.x + cosine * obstacle.length / 2 * lengthSign - sine * obstacle.width / 2 * widthSign,
    y: obstacle.y + sine * obstacle.length / 2 * lengthSign + cosine * obstacle.width / 2 * widthSign,
  }))
}

function drawVehicle(
  context: CanvasRenderingContext2D,
  vehicle: VehicleState,
  obstacle: { x: number; y: number; length: number; width: number; heading: number; color: string },
  project: (point: LocalPoint) => ScreenPoint | null,
) {
  const points = obstacleCorners(obstacle).map((point) => project(toLocal(vehicle, point.x, point.y)))
  if (points.some((point) => !point)) return
  const visible = points as ScreenPoint[]
  context.beginPath()
  visible.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y))
  context.closePath()
  const paint = context.createLinearGradient(0, Math.min(...visible.map((point) => point.y)), 0, Math.max(...visible.map((point) => point.y)))
  paint.addColorStop(0, obstacle.color)
  paint.addColorStop(1, '#66716d')
  context.fillStyle = paint
  context.fill()
  context.strokeStyle = 'rgba(245,250,248,.9)'
  context.lineWidth = 1.2
  context.stroke()

  const center = project(toLocal(vehicle, obstacle.x, obstacle.y))
  if (!center) return
  const apparentWidth = Math.max(8, Math.abs(visible[0].x - visible[1].x))
  const bodyHeight = apparentWidth * .58
  const groundY = Math.max(...visible.map((point) => point.y))
  const bodyTop = groundY - bodyHeight
  context.beginPath()
  context.moveTo(center.x - apparentWidth * .48, groundY)
  context.lineTo(center.x - apparentWidth * .42, bodyTop + bodyHeight * .28)
  context.quadraticCurveTo(center.x - apparentWidth * .3, bodyTop, center.x, bodyTop)
  context.quadraticCurveTo(center.x + apparentWidth * .3, bodyTop, center.x + apparentWidth * .42, bodyTop + bodyHeight * .28)
  context.lineTo(center.x + apparentWidth * .48, groundY)
  context.closePath()
  context.fillStyle = obstacle.color
  context.fill()
  context.strokeStyle = 'rgba(245,250,248,.9)'
  context.stroke()
  context.fillStyle = 'rgba(27,43,49,.9)'
  context.beginPath()
  context.moveTo(center.x - apparentWidth * .28, bodyTop + bodyHeight * .17)
  context.lineTo(center.x + apparentWidth * .28, bodyTop + bodyHeight * .17)
  context.lineTo(center.x + apparentWidth * .34, bodyTop + bodyHeight * .52)
  context.lineTo(center.x - apparentWidth * .34, bodyTop + bodyHeight * .52)
  context.closePath()
  context.fill()
  context.fillStyle = '#232a28'
  context.fillRect(center.x - apparentWidth * .52, groundY - bodyHeight * .27, apparentWidth * .08, bodyHeight * .31)
  context.fillRect(center.x + apparentWidth * .44, groundY - bodyHeight * .27, apparentWidth * .08, bodyHeight * .31)
  context.fillStyle = 'rgba(24,36,42,.82)'
  context.fillRect(center.x - apparentWidth * .22, groundY - bodyHeight * .18, apparentWidth * .44, Math.max(2, apparentWidth * .06))
  context.fillStyle = '#ef5852'
  context.fillRect(center.x - apparentWidth * .38, groundY - bodyHeight * .2, Math.max(2, apparentWidth * .14), 3)
  context.fillRect(center.x + apparentWidth * .24, groundY - bodyHeight * .2, Math.max(2, apparentWidth * .14), 3)
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
  const horizon = height * (isRear ? .26 : .31)
  const cameraSide = view === 'left' ? .72 : view === 'right' ? -.72 : 0
  const lookAngle = view === 'left' ? .16 : view === 'right' ? -.16 : 0
  const focalLength = width * (isRear ? 1.05 : 1.22)
  const project = ({ side, rear }: LocalPoint): ScreenPoint | null => {
    if (rear < .08 || rear > 15) return null
    const relativeSide = side - cameraSide - rear * Math.tan(lookAngle)
    if (Math.abs(relativeSide / rear) > (isRear ? 1.15 : .82)) return null
    const depth = rear + 1.05
    return {
      x: width / 2 + relativeSide / depth * focalLength,
      y: horizon + (height - horizon) / (1 + rear * .38),
      depth: rear,
    }
  }

  const gradient = context.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, '#61736d')
  gradient.addColorStop(horizon / height, '#26332f')
  gradient.addColorStop(1, '#777d78')
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)

  context.save()
  context.beginPath()
  context.rect(0, 0, width, height)
  context.clip()
  context.fillStyle = 'rgba(225,230,225,.18)'
  context.fillRect(0, horizon, width, 1)
  drawParkingBay(context, vehicle, project)

  if (isRear) {
    context.lineWidth = 2.2
    for (const direction of [-1, 1]) {
      const near = project({ side: direction * .72, rear: .25 })
      const far = project({ side: direction * 1.45, rear: 4.5 })
      if (!near || !far) continue
      context.strokeStyle = '#f4d24e'
      context.beginPath()
      context.moveTo(near.x, near.y)
      context.lineTo(far.x, far.y)
      context.stroke()
    }
    for (const distance of [1, 2, 3]) {
      const left = project({ side: -.72 - distance * .13, rear: distance })
      const right = project({ side: .72 + distance * .13, rear: distance })
      if (!left || !right) continue
      context.strokeStyle = distance === 1 ? '#ff756b' : distance === 2 ? '#ffd862' : '#77e0b9'
      context.beginPath()
      context.moveTo(left.x, left.y)
      context.lineTo(right.x, right.y)
      context.stroke()
    }
  }

  const obstacles = [
    ...PARKED_VEHICLES.map((item, index) => ({ ...item, width: 1.8, length: 4.6, color: index ? '#b7c6ca' : '#d8d9d5' })),
    ...PILLARS.map((item) => ({ ...item, x: item.x + item.width / 2, y: item.y + item.height / 2, length: item.height, color: '#c69b58', heading: 0 })),
  ].sort((first, second) => toLocal(vehicle, second.x, second.y).rear - toLocal(vehicle, first.x, first.y).rear)
  for (const obstacle of obstacles) {
    const local = toLocal(vehicle, obstacle.x, obstacle.y)
    const correctSide = isRear || (view === 'left' ? local.side > -.8 : local.side < .8)
    if (!correctSide || local.rear < .08 || local.rear > 15) continue
    drawVehicle(context, vehicle, obstacle, project)
  }
  context.restore()

  if (!isRear) {
    context.strokeStyle = 'rgba(225,239,234,.82)'
    context.lineWidth = 5
    context.beginPath()
    context.roundRect(2.5, 2.5, width - 5, height - 5, Math.max(8, height * .16))
    context.stroke()
    if (height > 70) {
      context.fillStyle = 'rgba(255,255,255,.86)'
      context.font = `700 ${Math.max(8, Math.min(10, width / 20))}px sans-serif`
      context.fillText('사물이 보이는 것보다 가까이 있음', 8, height - 8)
    }
  }
}
