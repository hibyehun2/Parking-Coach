export const PARKING_WORLD = {
  width: 30,
  height: 14,
} as const

export const PARKING_LINE_X = {
  targetLeft: 13.65,
  targetRight: 16.35,
} as const

import type { VehicleState } from './vehiclePhysics.ts'
import { DEFAULT_VEHICLE_CONFIG } from './vehiclePhysics.ts'
import {
  PARKED_VEHICLES,
  PILLARS,
  VEHICLE_DIMENSIONS,
  WALLS,
  type Collision,
} from './collisionDetection.ts'
import { TARGET_PARKING_BAY } from './parkingEvaluation.ts'

type VehicleStyle = {
  body: string
  roof: string
  outline: string
  label?: string
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
}

function drawVehicle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  heading: number,
  style: VehicleStyle,
) {
  const { length, width } = VEHICLE_DIMENSIONS
  context.save()
  context.translate(x, y)
  context.rotate(heading)

  context.fillStyle = 'rgba(0, 0, 0, 0.3)'
  roundedRect(context, -length / 2 + 0.1, -width / 2 + 0.12, length, width, 0.28)
  context.fill()

  context.fillStyle = '#202925'
  const wheelLength = 0.72
  const wheelWidth = 0.16
  for (const wheelX of [-length * 0.29, length * 0.29]) {
    for (const wheelY of [-width / 2 - 0.06, width / 2 - wheelWidth + 0.06]) {
      roundedRect(context, wheelX - wheelLength / 2, wheelY, wheelLength, wheelWidth, 0.06)
      context.fill()
    }
  }

  context.fillStyle = style.body
  context.strokeStyle = style.outline
  context.lineWidth = 0.07
  roundedRect(context, -length / 2, -width / 2, length, width, 0.3)
  context.fill()
  context.stroke()

  context.fillStyle = style.roof
  roundedRect(context, -length * 0.22, -width * 0.39, length * 0.47, width * 0.78, 0.2)
  context.fill()

  context.fillStyle = 'rgba(201, 230, 225, 0.78)'
  context.beginPath()
  context.moveTo(-length * 0.23, -width * 0.34)
  context.lineTo(-length * 0.06, -width * 0.34)
  context.lineTo(-length * 0.06, width * 0.34)
  context.lineTo(-length * 0.23, width * 0.34)
  context.closePath()
  context.fill()

  context.beginPath()
  context.moveTo(length * 0.08, -width * 0.34)
  context.lineTo(length * 0.22, -width * 0.3)
  context.lineTo(length * 0.22, width * 0.3)
  context.lineTo(length * 0.08, width * 0.34)
  context.closePath()
  context.fill()

  context.fillStyle = '#f1d47a'
  context.fillRect(length / 2 - 0.12, -width * 0.31, 0.08, width * 0.2)
  context.fillRect(length / 2 - 0.12, width * 0.11, 0.08, width * 0.2)
  context.fillStyle = '#df6c66'
  context.fillRect(-length / 2 + 0.04, -width * 0.31, 0.08, width * 0.2)
  context.fillRect(-length / 2 + 0.04, width * 0.11, 0.08, width * 0.2)

  if (style.label) {
    context.fillStyle = '#ffffff'
    context.font = '800 0.48px sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(style.label, 0, 0)
  }
  context.restore()
}

function drawParkingLines(context: CanvasRenderingContext2D) {
  context.save()
  context.strokeStyle = '#f7f2cf'
  context.lineWidth = 0.09
  context.shadowColor = 'rgba(0, 0, 0, 0.28)'
  context.shadowBlur = 0.05

  const bayTop = 6.5
  const bayBottom = 13.45
  for (const x of [10.95, PARKING_LINE_X.targetLeft, PARKING_LINE_X.targetRight, 19.05]) {
    context.beginPath()
    context.moveTo(x, bayTop)
    context.lineTo(x, bayBottom)
    context.stroke()
  }
  context.beginPath()
  context.moveTo(10.95, bayBottom)
  context.lineTo(19.05, bayBottom)
  context.stroke()

  context.restore()

  context.fillStyle = 'rgba(113, 219, 182, 0.14)'
  context.fillRect(
    PARKING_LINE_X.targetLeft,
    bayTop,
    PARKING_LINE_X.targetRight - PARKING_LINE_X.targetLeft,
    bayBottom - bayTop,
  )
  context.fillStyle = '#8be2c4'
  context.font = '700 0.34px sans-serif'
  context.textAlign = 'center'
  context.fillText('연습 주차칸', TARGET_PARKING_BAY.center.x, bayBottom - 0.28)
}

function drawStructure(context: CanvasRenderingContext2D) {
  context.fillStyle = '#2b3531'
  for (const wall of WALLS) context.fillRect(wall.x, wall.y, wall.width, wall.height)

  context.fillStyle = '#c6a157'
  context.strokeStyle = '#806331'
  context.lineWidth = 0.08
  const pillar = PILLARS[0]
  roundedRect(context, pillar.x, pillar.y, pillar.width, pillar.height, 0.08)
  context.fill()
  context.stroke()
  context.fillStyle = '#4b3c21'
  context.font = '800 0.28px sans-serif'
  context.textAlign = 'center'
  context.fillText('기둥', pillar.x + pillar.width / 2, pillar.y + pillar.height * 0.59)
}

export const REVERSE_GUIDE_LEVELS = [
  { distance: 0.5, halfWidth: 1.3, color: '#ff453a' },
  { distance: 1.5, halfWidth: 1.42, color: '#ffd60a' },
  { distance: 3, halfWidth: 1.58, color: '#30d158' },
] as const

type ReverseGuideVehicle = Pick<VehicleState, 'x' | 'y' | 'heading' | 'steeringAngle'>

function reverseGuidePose(vehicle: ReverseGuideVehicle, distanceBehindBumper: number) {
  const targetDistance = VEHICLE_DIMENSIONS.length / 2 + distanceBehindBumper
  const stepSize = 0.05
  let travelled = 0
  let x = vehicle.x
  let y = vehicle.y
  let heading = vehicle.heading

  while (travelled < targetDistance) {
    const step = Math.min(stepSize, targetDistance - travelled)
    const signedDistance = -step
    const headingDelta = signedDistance / DEFAULT_VEHICLE_CONFIG.wheelbase
      * Math.tan(vehicle.steeringAngle)
    const middleHeading = heading + headingDelta / 2
    x += Math.cos(middleHeading) * signedDistance
    y += Math.sin(middleHeading) * signedDistance
    heading += headingDelta
    travelled += step
  }

  return { x, y, heading }
}

export function reverseGuidePoint(
  vehicle: ReverseGuideVehicle,
  distanceBehindBumper: number,
  sideOffset: number,
) {
  const pose = reverseGuidePose(vehicle, distanceBehindBumper)
  return {
    x: pose.x - Math.sin(pose.heading) * sideOffset,
    y: pose.y + Math.cos(pose.heading) * sideOffset,
  }
}

function reverseGuideHalfWidth(distance: number) {
  const nearWidth = 1.24
  const farLevel = REVERSE_GUIDE_LEVELS.at(-1)!
  return nearWidth + (farLevel.halfWidth - nearWidth) * distance / farLevel.distance
}

export function reverseTrapezoidGeometry(vehicle: ReverseGuideVehicle) {
  return REVERSE_GUIDE_LEVELS.map((level) => ({
    ...level,
    left: reverseGuidePoint(vehicle, level.distance, -level.halfWidth),
    right: reverseGuidePoint(vehicle, level.distance, level.halfWidth),
  }))
}

function drawDistanceTrapezoid(context: CanvasRenderingContext2D, vehicle: VehicleState) {
  const levels = reverseTrapezoidGeometry(vehicle)
  const paths: { x: number; y: number }[][] = [[], []]
  for (let step = 0; step <= 30; step += 1) {
    const distance = step / 10
    const halfWidth = reverseGuideHalfWidth(distance)
    paths[0].push(reverseGuidePoint(vehicle, distance, -halfWidth))
    paths[1].push(reverseGuidePoint(vehicle, distance, halfWidth))
  }

  context.save()
  context.lineCap = 'round'
  context.lineJoin = 'round'

  context.strokeStyle = 'rgba(52, 152, 255, .98)'
  context.lineWidth = 0.1
  context.setLineDash([0.18, 0.09])
  for (const path of paths) {
    context.beginPath()
    path.forEach((point, index) => index
      ? context.lineTo(point.x, point.y)
      : context.moveTo(point.x, point.y))
    context.stroke()
  }
  context.setLineDash([])

  for (const level of levels) {
    context.strokeStyle = level.color
    context.lineWidth = level.distance === 0.5 ? 0.13 : 0.1
    context.beginPath()
    context.moveTo(level.left.x, level.left.y)
    context.lineTo(level.right.x, level.right.y)
    context.stroke()
  }

  const redLevel = levels[0]
  context.save()
  context.translate(
    (redLevel.left.x + redLevel.right.x) / 2,
    (redLevel.left.y + redLevel.right.y) / 2,
  )
  context.rotate(vehicle.heading)
  context.fillStyle = '#ffffff'
  context.font = '800 0.24px sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'bottom'
  context.fillText('50cm', 0, -0.08)
  context.restore()
  context.restore()
}

function drawReverseGuide(context: CanvasRenderingContext2D, vehicle: VehicleState) {
  if (vehicle.gear !== 'R') return
  drawDistanceTrapezoid(context, vehicle)
}

export function renderParkingLot(
  context: CanvasRenderingContext2D,
  viewportWidth: number,
  viewportHeight: number,
  vehicle: VehicleState,
  options: {
    danger?: Collision | null
    collisions?: Collision[]
    focus?: { x: number; y: number; span: number; heading?: number }
    topInsetRatio?: number
    bottomInsetRatio?: number
  } = {},
) {
  context.clearRect(0, 0, viewportWidth, viewportHeight)
  const padding = options.focus
    ? Math.max(8, Math.min(viewportWidth, viewportHeight) * 0.025)
    : 0
  const topInset = viewportHeight * (options.topInsetRatio ?? 0)
  const usableHeight = viewportHeight * (
    1 - (options.topInsetRatio ?? 0) - (options.bottomInsetRatio ?? 0)
  )
  const scale = options.focus
    ? Math.max(viewportWidth, viewportHeight) / options.focus.span
    : Math.min(
      (viewportWidth - padding * 2) / PARKING_WORLD.width,
      (usableHeight - padding * 2) / PARKING_WORLD.height,
    )
  const offsetX = (viewportWidth - PARKING_WORLD.width * scale) / 2
  const offsetY = topInset + (usableHeight - PARKING_WORLD.height * scale) / 2

  context.save()
  if (options.focus) {
    context.translate(viewportWidth / 2, viewportHeight / 2)
    context.rotate(-Math.PI / 2 - (options.focus.heading ?? 0))
    context.scale(scale, scale)
    context.translate(-options.focus.x, -options.focus.y)
  } else {
    context.translate(offsetX, offsetY)
    context.scale(scale, scale)
  }

  context.fillStyle = '#484f4c'
  context.fillRect(0, 0, PARKING_WORLD.width, PARKING_WORLD.height)

  context.strokeStyle = 'rgba(255, 255, 255, 0.035)'
  context.lineWidth = 0.03
  for (let y = 1.2; y < PARKING_WORLD.height; y += 1.2) {
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(PARKING_WORLD.width, y)
    context.stroke()
  }

  drawStructure(context)
  drawParkingLines(context)
  drawReverseGuide(context, vehicle)

  const [leftVehicle, rightVehicle] = PARKED_VEHICLES
  drawVehicle(context, leftVehicle.x, leftVehicle.y, leftVehicle.heading, {
    body: '#d7dedd',
    roof: '#8e9b98',
    outline: '#eef2f1',
  })
  drawVehicle(context, rightVehicle.x, rightVehicle.y, rightVehicle.heading, {
    body: '#313d49',
    roof: '#667887',
    outline: '#7e8e9a',
  })
  drawVehicle(context, vehicle.x, vehicle.y, vehicle.heading, {
    body: options.danger ? '#db8b24' : '#20a978',
    roof: options.danger ? '#72440f' : '#105440',
    outline: options.danger ? '#ffd275' : '#b7ffe4',
  })

  for (const collision of options.collisions ?? []) {
    context.save()
    context.translate(collision.position.x, collision.position.y)
    context.strokeStyle = '#ff5d52'
    context.lineWidth = 0.14
    context.beginPath()
    context.moveTo(-0.28, -0.28)
    context.lineTo(0.28, 0.28)
    context.moveTo(0.28, -0.28)
    context.lineTo(-0.28, 0.28)
    context.stroke()
    context.restore()
  }

  if (options.danger) {
    context.fillStyle = '#ffd275'
    context.font = '800 0.42px sans-serif'
    context.textAlign = 'center'
    context.fillText('충돌 위험', vehicle.x, vehicle.y - 1.25)
  }

  context.restore()
}
