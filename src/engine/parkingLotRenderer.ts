export const PARKING_WORLD = {
  width: 18,
  height: 12,
} as const

import type { VehicleState } from './vehiclePhysics'
import {
  PARKED_VEHICLES,
  PILLARS,
  VEHICLE_DIMENSIONS,
  WALLS,
  type Collision,
} from './collisionDetection'
import { TARGET_PARKING_BAY } from './parkingEvaluation'

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

  context.fillStyle = 'rgba(10, 20, 17, 0.25)'
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

  const bayTop = 5.5
  const bayBottom = 11.45
  for (const x of [4.95, 7.65, 10.35, 13.05]) {
    context.beginPath()
    context.moveTo(x, bayTop)
    context.lineTo(x, bayBottom)
    context.stroke()
  }
  context.beginPath()
  context.moveTo(4.95, bayBottom)
  context.lineTo(13.05, bayBottom)
  context.stroke()

  context.setLineDash([0.18, 0.16])
  context.strokeStyle = '#71dbb6'
  context.lineWidth = 0.1
  context.strokeRect(
    TARGET_PARKING_BAY.left,
    TARGET_PARKING_BAY.top,
    TARGET_PARKING_BAY.right - TARGET_PARKING_BAY.left,
    TARGET_PARKING_BAY.bottom - TARGET_PARKING_BAY.top,
  )
  context.restore()

  context.fillStyle = 'rgba(113, 219, 182, 0.14)'
  context.fillRect(
    TARGET_PARKING_BAY.left,
    TARGET_PARKING_BAY.top,
    TARGET_PARKING_BAY.right - TARGET_PARKING_BAY.left,
    TARGET_PARKING_BAY.bottom - TARGET_PARKING_BAY.top,
  )
  context.fillStyle = '#8be2c4'
  context.font = '700 0.34px sans-serif'
  context.textAlign = 'center'
  context.fillText('연습 주차칸', TARGET_PARKING_BAY.center.x, TARGET_PARKING_BAY.bottom - 0.28)
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
  context.fillText('기둥', 15.025, 6.47)
}

export function renderParkingLot(
  context: CanvasRenderingContext2D,
  viewportWidth: number,
  viewportHeight: number,
  vehicle: VehicleState,
  options: {
    danger?: Collision | null
    collisions?: Collision[]
  } = {},
) {
  context.clearRect(0, 0, viewportWidth, viewportHeight)

  const padding = Math.max(12, Math.min(viewportWidth, viewportHeight) * 0.035)
  const scale = Math.min(
    (viewportWidth - padding * 2) / PARKING_WORLD.width,
    (viewportHeight - padding * 2) / PARKING_WORLD.height,
  )
  const offsetX = (viewportWidth - PARKING_WORLD.width * scale) / 2
  const offsetY = (viewportHeight - PARKING_WORLD.height * scale) / 2

  context.save()
  context.translate(offsetX, offsetY)
  context.scale(scale, scale)

  context.fillStyle = '#59625e'
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
    body: options.danger ? '#a86b24' : '#13805f',
    roof: options.danger ? '#744516' : '#0b5c44',
    outline: options.danger ? '#ffd275' : '#8ee0c3',
    label: '내 차',
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
