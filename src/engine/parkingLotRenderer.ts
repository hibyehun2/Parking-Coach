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
  VEHICLE_DIMENSIONS,
  WALLS,
  type Collision,
} from './collisionDetection.ts'
import { TARGET_PARKING_BAY } from './parkingEvaluation.ts'

type VehicleStyle = {
  body: string
  roof: string
  outline: string
  variant: 'hatchback' | 'sedan' | 'suv'
  label?: string
  highlight?: boolean
  reverseLights?: boolean
  braking?: boolean
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
  if (style.highlight) {
    context.shadowColor = 'rgba(255, 224, 120, .95)'
    context.shadowBlur = 0.22
  }

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

  const roofStart = style.variant === 'hatchback' ? -length * .32 : style.variant === 'sedan' ? -length * .16 : -length * .29
  const roofLength = style.variant === 'sedan' ? length * .43 : style.variant === 'suv' ? length * .58 : length * .52
  const roofWidth = style.variant === 'suv' ? width * .76 : width * .72
  context.fillStyle = style.roof
  roundedRect(context, roofStart, -roofWidth / 2, roofLength, roofWidth, style.variant === 'suv' ? 0.13 : 0.2)
  context.fill()

  context.fillStyle = style.variant === 'sedan' ? 'rgba(157, 183, 191, .72)' : 'rgba(190, 220, 215, .78)'
  context.beginPath()
  context.moveTo(roofStart + 0.04, -roofWidth * .43)
  context.lineTo(roofStart + roofLength * .3, -roofWidth * .43)
  context.lineTo(roofStart + roofLength * .3, roofWidth * .43)
  context.lineTo(roofStart + 0.04, roofWidth * .43)
  context.closePath()
  context.fill()

  context.beginPath()
  context.moveTo(roofStart + roofLength * .7, -roofWidth * .43)
  context.lineTo(roofStart + roofLength - 0.04, -roofWidth * .36)
  context.lineTo(roofStart + roofLength - 0.04, roofWidth * .36)
  context.lineTo(roofStart + roofLength * .7, roofWidth * .43)
  context.closePath()
  context.fill()

  context.strokeStyle = 'rgba(236, 247, 243, .32)'
  context.lineWidth = 0.045
  if (style.variant === 'sedan') {
    context.beginPath()
    context.moveTo(-length * .48, -width * .34)
    context.lineTo(-length * .48, width * .34)
    context.stroke()
  }
  if (style.variant === 'suv') {
    context.strokeStyle = '#687570'
    context.lineWidth = 0.09
    for (const side of [-1, 1]) {
      context.beginPath()
      context.moveTo(-length * .25, side * width * .35)
      context.lineTo(length * .24, side * width * .35)
      context.stroke()
    }
  }

  context.fillStyle = style.body
  for (const side of [-1, 1]) {
    const mirrorY = side < 0 ? -width / 2 - .06 : width / 2 - .07
    roundedRect(context, -0.2, mirrorY, 0.38, 0.13, 0.05)
    context.fill()
  }

  context.fillStyle = '#f1d47a'
  context.fillRect(length / 2 - 0.12, -width * 0.31, 0.08, width * 0.2)
  context.fillRect(length / 2 - 0.12, width * 0.11, 0.08, width * 0.2)
  context.fillStyle = style.braking ? '#ff3b30' : '#df6c66'
  context.shadowColor = style.braking ? 'rgba(255,59,48,.9)' : 'transparent'
  context.shadowBlur = style.braking ? .16 : 0
  if (style.variant === 'suv') {
    context.fillRect(-length / 2 + .04, -width * .38, .34, .1)
    context.fillRect(-length / 2 + .04, width * .28, .34, .1)
  } else if (style.variant === 'sedan') {
    context.fillRect(-length / 2 + .04, -width * .34, .09, width * .25)
    context.fillRect(-length / 2 + .04, width * .09, .09, width * .25)
  } else {
    context.fillRect(-length / 2 + .04, -width * .36, .16, width * .23)
    context.fillRect(-length / 2 + .04, width * .13, .16, width * .23)
  }
  context.shadowBlur = 0
  if (style.reverseLights) {
    context.fillStyle = '#f7fff9'
    context.shadowColor = 'rgba(235,255,246,.95)'
    context.shadowBlur = .18
    context.fillRect(-length / 2 + .04, -width * .09, .13, .12)
    context.fillRect(-length / 2 + .04, width * .02, .13, .12)
    context.shadowBlur = 0
  }

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
  context.strokeStyle = 'rgba(255, 255, 255, .94)'
  context.lineWidth = 0.1
  context.shadowColor = 'rgba(44, 35, 26, .3)'
  context.shadowBlur = 0.08

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

  context.save()
  context.strokeStyle = 'rgba(255, 255, 255, .38)'
  context.lineWidth = 0.08
  const evLeft = 19.05
  const evRight = 21.75
  context.beginPath()
  context.moveTo(evLeft, bayTop)
  context.lineTo(evLeft, bayBottom)
  context.moveTo(evRight, bayTop)
  context.lineTo(evRight, bayBottom)
  context.moveTo(evLeft, bayBottom)
  context.lineTo(evRight, bayBottom)
  context.stroke()

  context.translate(20.4, 10.3)
  context.strokeStyle = 'rgba(132, 205, 181, .34)'
  context.lineWidth = 0.1
  context.beginPath()
  context.arc(0, 0, 0.58, 0, Math.PI * 2)
  context.stroke()
  context.font = '800 0.56px sans-serif'
  context.fillStyle = 'rgba(164, 222, 202, .38)'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText('EV', 0, 0.03)
  context.restore()

  context.fillStyle = 'rgba(95, 235, 194, 0.08)'
  context.fillRect(
    PARKING_LINE_X.targetLeft,
    bayTop,
    PARKING_LINE_X.targetRight - PARKING_LINE_X.targetLeft,
    bayBottom - bayTop,
  )
  context.fillStyle = '#a5f2d8'
  context.font = '700 0.34px sans-serif'
  context.textAlign = 'center'
  context.fillText('연습 주차칸', TARGET_PARKING_BAY.center.x, bayBottom - 0.28)

  context.save()
  context.translate(TARGET_PARKING_BAY.center.x, bayBottom - 1.25)
  context.strokeStyle = 'rgba(88, 232, 191, .7)'
  context.lineWidth = 0.18
  for (const offset of [0, -0.48]) {
    context.beginPath()
    context.moveTo(-0.62, offset - 0.2)
    context.lineTo(0, offset + 0.16)
    context.lineTo(0.62, offset - 0.2)
    context.stroke()
  }
  context.restore()
}

function drawStructure(context: CanvasRenderingContext2D) {
  for (const wall of WALLS) {
    const concrete = context.createLinearGradient(wall.x, wall.y, wall.x, wall.y + wall.height)
    concrete.addColorStop(0, '#d8d1c6')
    concrete.addColorStop(1, '#918b82')
    context.fillStyle = concrete
    context.fillRect(wall.x, wall.y, wall.width, wall.height)
    context.strokeStyle = 'rgba(255,255,255,.42)'
    context.lineWidth = 0.05
    context.strokeRect(wall.x, wall.y, wall.width, wall.height)
  }

  context.save()
  context.globalAlpha = 0.42
  context.fillStyle = '#dce5e1'
  context.strokeStyle = '#81948d'
  context.lineWidth = 0.05
  roundedRect(context, 21.86, 12.45, 0.42, 0.7, 0.06)
  context.fill()
  context.stroke()
  context.fillStyle = '#64b99a'
  context.beginPath()
  context.arc(22.07, 12.66, 0.075, 0, Math.PI * 2)
  context.fill()
  context.strokeStyle = '#8aa69c'
  context.beginPath()
  context.moveTo(22.03, 13.04)
  context.bezierCurveTo(21.85, 12.98, 21.68, 12.84, 21.58, 12.63)
  context.stroke()
  context.restore()
}

export const WHEEL_STOP = {
  segments: [
    { left: 14.02, right: 14.62 },
    { left: 15.38, right: 15.98 },
  ],
  y: 8.05,
} as const

export function isRearWheelAtStop(vehicle: ReverseGuideVehicle) {
  const rearAxleX = vehicle.x - Math.cos(vehicle.heading) * DEFAULT_VEHICLE_CONFIG.wheelbase / 2
  const rearAxleY = vehicle.y - Math.sin(vehicle.heading) * DEFAULT_VEHICLE_CONFIG.wheelbase / 2
  return rearAxleX >= WHEEL_STOP.segments[0].left - 0.2
    && rearAxleX <= WHEEL_STOP.segments[1].right + 0.2
    && Math.abs(rearAxleY - WHEEL_STOP.y) <= 0.16
}

function drawWheelStop(context: CanvasRenderingContext2D, active: boolean) {
  context.save()
  context.shadowColor = active ? 'rgba(255, 220, 139, .9)' : 'rgba(0, 0, 0, .28)'
  context.shadowBlur = active ? 0.24 : 0.08
  const gradient = context.createLinearGradient(0, WHEEL_STOP.y - 0.12, 0, WHEEL_STOP.y + 0.12)
  gradient.addColorStop(0, active ? '#74664b' : '#545955')
  gradient.addColorStop(1, '#252a28')
  context.fillStyle = gradient
  for (const segment of WHEEL_STOP.segments) {
    roundedRect(context, segment.left, WHEEL_STOP.y - 0.12, segment.right - segment.left, 0.24, 0.08)
    context.fill()
    context.fillStyle = 'rgba(235, 238, 226, .72)'
    context.fillRect((segment.left + segment.right) / 2 - 0.06, WHEEL_STOP.y - 0.12, 0.12, 0.24)
    context.fillStyle = gradient
  }
  context.restore()
}

function drawRooftopAsphalt(context: CanvasRenderingContext2D) {
  const asphalt = context.createLinearGradient(0, 0, PARKING_WORLD.width, PARKING_WORLD.height)
  asphalt.addColorStop(0, '#77766f')
  asphalt.addColorStop(0.42, '#565c59')
  asphalt.addColorStop(1, '#343b3a')
  context.fillStyle = asphalt
  context.fillRect(0, 0, PARKING_WORLD.width, PARKING_WORLD.height)

  const sunlight = context.createRadialGradient(3, 0, 0, 3, 0, 21)
  sunlight.addColorStop(0, 'rgba(255, 224, 173, .34)')
  sunlight.addColorStop(0.55, 'rgba(244, 190, 125, .08)')
  sunlight.addColorStop(1, 'rgba(24, 37, 36, .16)')
  context.fillStyle = sunlight
  context.fillRect(0, 0, PARKING_WORLD.width, PARKING_WORLD.height)

  context.fillStyle = 'rgba(255,255,255,.035)'
  for (let x = 0.35; x < PARKING_WORLD.width; x += 0.83) {
    for (let y = 0.42; y < PARKING_WORLD.height; y += 0.71) {
      const offset = ((Math.round(x * 100) + Math.round(y * 100)) % 5) * 0.025
      context.beginPath()
      context.arc(x + offset, y, 0.025, 0, Math.PI * 2)
      context.fill()
    }
  }

  context.strokeStyle = 'rgba(28, 31, 30, .12)'
  context.lineWidth = 0.035
  for (const y of [3.2, 8.3, 11.7]) {
    context.beginPath()
    context.moveTo(0, y)
    context.bezierCurveTo(8, y - 0.18, 20, y + 0.25, PARKING_WORLD.width, y - 0.06)
    context.stroke()
  }
}

function drawViewportScenery(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const backdrop = context.createLinearGradient(0, 0, width, height)
  backdrop.addColorStop(0, '#d6c5a8')
  backdrop.addColorStop(0.45, '#8fa096')
  backdrop.addColorStop(1, '#56645f')
  context.fillStyle = backdrop
  context.fillRect(0, 0, width, height)

  context.save()
  context.globalAlpha = 0.46
  for (const side of [-1, 1]) {
    const edge = side < 0 ? 0 : width
    for (let index = 0; index < 3; index += 1) {
      const blockWidth = Math.max(28, width * (0.055 + index * 0.008))
      const blockHeight = height * (0.18 + (index % 2) * 0.08)
      const inward = index * width * 0.052
      const x = side < 0 ? inward : edge - inward - blockWidth
      const y = height * (0.09 + index * 0.055)
      context.fillStyle = index % 2 ? '#697875' : '#77827d'
      context.fillRect(x, y, blockWidth, blockHeight)
      context.strokeStyle = 'rgba(231, 224, 205, .38)'
      context.lineWidth = 2
      context.strokeRect(x + 3, y + 3, blockWidth - 6, blockHeight - 6)
      context.fillStyle = 'rgba(56, 68, 65, .55)'
      context.fillRect(x + blockWidth * .24, y + blockHeight * .2, blockWidth * .24, blockHeight * .18)
      context.fillRect(x + blockWidth * .58, y + blockHeight * .5, blockWidth * .17, blockHeight * .14)
      context.strokeStyle = 'rgba(232, 218, 187, .3)'
      context.lineWidth = 1
      for (let windowIndex = 0; windowIndex < 3; windowIndex += 1) {
        const windowX = x + blockWidth * (.18 + windowIndex * .25)
        context.beginPath()
        context.moveTo(windowX, y + blockHeight - 8)
        context.lineTo(windowX + blockWidth * .1, y + blockHeight - 8)
        context.stroke()
      }
    }

    for (let index = 0; index < 4; index += 1) {
      const radius = Math.max(14, Math.min(width, height) * (0.045 + (index % 2) * 0.008))
      const centerX = side < 0
        ? index * radius * 1.35 + radius * .35
        : width - index * radius * 1.35 - radius * .35
      const centerY = height * (0.58 + (index % 2) * 0.13)
      context.fillStyle = 'rgba(91, 72, 49, .42)'
      context.fillRect(centerX - radius * .9, centerY + radius * .45, radius * 1.8, radius * .65)
      for (const [offsetX, offsetY, scale, color] of [
        [-.42, .06, .72, '#365c48'],
        [.35, .12, .8, '#426d50'],
        [0, -.3, .92, '#5b825d'],
        [-.12, -.5, .48, '#76946b'],
      ] as const) {
        context.fillStyle = color
        context.beginPath()
        context.arc(centerX + radius * offsetX, centerY + radius * offsetY, radius * scale, 0, Math.PI * 2)
        context.fill()
      }
    }
  }
  context.restore()
}

export const REVERSE_GUIDE_LEVELS = [
  { distance: 0.5, halfWidth: 1.3, color: '#ff453a' },
  { distance: 1, halfWidth: 1.3, color: '#ffd60a' },
  { distance: 2.3, halfWidth: 1.3, color: '#ffd60a' },
] as const

export const REVERSE_PATH_COLOR = '#ffd60a'
export const REVERSE_NEUTRAL_PATH_COLOR = '#32a8ff'
export const RED_GUIDE_ALIGNMENT_THRESHOLD = 0.12

type ReverseGuideVehicle = Pick<VehicleState, 'x' | 'y' | 'heading' | 'steeringAngle'>
type AssistanceSide = 'left' | 'right'

function reverseGuidePose(vehicle: ReverseGuideVehicle, distanceBehindBumper: number) {
  const targetDistance = distanceBehindBumper
  const stepSize = 0.05
  let travelled = 0
  let x = vehicle.x - Math.cos(vehicle.heading) * VEHICLE_DIMENSIONS.length / 2
  let y = vehicle.y - Math.sin(vehicle.heading) * VEHICLE_DIMENSIONS.length / 2
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

export function predictedReverseGuidePoint(
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

export function reverseTrapezoidGeometry(vehicle: ReverseGuideVehicle) {
  return REVERSE_GUIDE_LEVELS.map((level) => ({
    ...level,
    left: predictedReverseGuidePoint(vehicle, level.distance, -level.halfWidth),
    right: predictedReverseGuidePoint(vehicle, level.distance, level.halfWidth),
  }))
}

export function reverseNeutralGuideGeometry(vehicle: ReverseGuideVehicle) {
  return reverseTrapezoidGeometry({ ...vehicle, steeringAngle: 0 })
}

function pointToSegmentDistance(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  const segmentX = end.x - start.x
  const segmentY = end.y - start.y
  const lengthSquared = segmentX * segmentX + segmentY * segmentY
  const projection = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
    ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / lengthSquared,
  ))
  return Math.hypot(
    point.x - (start.x + segmentX * projection),
    point.y - (start.y + segmentY * projection),
  )
}

export function redGuideParkingLineDistance(vehicle: ReverseGuideVehicle) {
  const redGuide = reverseTrapezoidGeometry(vehicle)[0]
  const lineSegments = [PARKING_LINE_X.targetLeft, PARKING_LINE_X.targetRight].map((x) => [
    { x, y: 6.5 },
    { x, y: 13.45 },
  ] as const)
  return Math.min(...[redGuide.left, redGuide.right].flatMap((corner) => (
    lineSegments.map(([start, end]) => pointToSegmentDistance(corner, start, end))
  )))
}

export function isRedGuideAlignedWithParkingLine(vehicle: ReverseGuideVehicle) {
  return redGuideParkingLineDistance(vehicle) <= RED_GUIDE_ALIGNMENT_THRESHOLD
}

function drawDistanceTrapezoid(context: CanvasRenderingContext2D, vehicle: VehicleState) {
  const levels = reverseTrapezoidGeometry(vehicle)
  const emphasizeRedGuide = isRedGuideAlignedWithParkingLine(vehicle)
  const dynamicPaths: { x: number; y: number }[][] = [[], []]
  const neutralPaths: { x: number; y: number }[][] = [[], []]
  const maximumDistance = REVERSE_GUIDE_LEVELS.at(-1)!.distance
  for (let step = 0; step <= Math.round(maximumDistance * 10); step += 1) {
    const distance = step / 10
    const halfWidth = REVERSE_GUIDE_LEVELS[0].halfWidth
    dynamicPaths[0].push(predictedReverseGuidePoint(vehicle, distance, -halfWidth))
    dynamicPaths[1].push(predictedReverseGuidePoint(vehicle, distance, halfWidth))
    neutralPaths[0].push(predictedReverseGuidePoint(
      { ...vehicle, steeringAngle: 0 }, distance, -halfWidth,
    ))
    neutralPaths[1].push(predictedReverseGuidePoint(
      { ...vehicle, steeringAngle: 0 }, distance, halfWidth,
    ))
  }

  context.save()
  context.lineCap = 'round'
  context.lineJoin = 'round'

  context.strokeStyle = REVERSE_NEUTRAL_PATH_COLOR
  context.lineWidth = 0.11
  context.setLineDash([0.12, 0.1])
  for (const path of neutralPaths) {
    context.beginPath()
    path.forEach((point, index) => index
      ? context.lineTo(point.x, point.y)
      : context.moveTo(point.x, point.y))
    context.stroke()
  }

  const redSegmentEnd = Math.round(REVERSE_GUIDE_LEVELS[0].distance * 10)
  for (const [index, path] of dynamicPaths.entries()) {
    for (const segment of [
      { points: path.slice(0, redSegmentEnd + 1), color: REVERSE_GUIDE_LEVELS[0].color },
      { points: path.slice(redSegmentEnd), color: REVERSE_PATH_COLOR },
    ]) {
      context.strokeStyle = segment.color
      context.lineWidth = index < 2 && segment.color === REVERSE_GUIDE_LEVELS[0].color ? 0.13 : 0.1
      context.setLineDash([])
      context.beginPath()
      segment.points.forEach((point, pointIndex) => pointIndex
        ? context.lineTo(point.x, point.y)
        : context.moveTo(point.x, point.y))
      context.stroke()
    }
  }
  context.setLineDash([])

  for (const level of levels) {
    const isEmphasized = level.distance === 0.5 && emphasizeRedGuide
    context.strokeStyle = level.color
    context.lineWidth = isEmphasized ? 0.2 : level.distance === 0.5 ? 0.13 : 0.1
    context.shadowColor = isEmphasized ? 'rgba(255, 69, 58, .95)' : 'transparent'
    context.shadowBlur = isEmphasized ? 0.22 : 0
    context.beginPath()
    context.moveTo(level.left.x, level.left.y)
    context.lineTo(level.right.x, level.right.y)
    context.stroke()
  }

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
    highlightParkedSide?: 'left' | 'right'
    assistanceSide?: AssistanceSide
    wheelStopActive?: boolean
  } = {},
) {
  context.clearRect(0, 0, viewportWidth, viewportHeight)
  if (!options.focus) drawViewportScenery(context, viewportWidth, viewportHeight)
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

  drawRooftopAsphalt(context)

  drawStructure(context)
  drawParkingLines(context)
  drawWheelStop(context, Boolean(options.wheelStopActive))
  drawReverseGuide(context, vehicle)

  const [leftVehicle, rightVehicle] = PARKED_VEHICLES
  const showLeftVehicle = !options.assistanceSide || options.assistanceSide === 'right'
  const showRightVehicle = !options.assistanceSide || options.assistanceSide === 'left'
  if (showLeftVehicle) {
    drawVehicle(context, leftVehicle.x, leftVehicle.y, leftVehicle.heading, {
      body: '#171c20',
      roof: '#303940',
      outline: '#737c81',
      variant: 'sedan',
      highlight: options.assistanceSide === 'right' || options.highlightParkedSide === 'left',
    })
  }
  if (showRightVehicle) {
    drawVehicle(context, rightVehicle.x, rightVehicle.y, rightVehicle.heading, {
      body: '#e7e5df',
      roof: '#aeb8bb',
      outline: '#ffffff',
      variant: 'suv',
      highlight: options.assistanceSide === 'left' || options.highlightParkedSide === 'right',
    })
  }
  drawVehicle(context, vehicle.x, vehicle.y, vehicle.heading, {
    body: options.danger ? '#db8b24' : '#128356',
    roof: options.danger ? '#72440f' : '#0b4934',
    outline: options.danger ? '#ffd275' : '#b7ffe4',
    variant: 'hatchback',
    reverseLights: vehicle.gear === 'R',
    braking: vehicle.braking,
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
