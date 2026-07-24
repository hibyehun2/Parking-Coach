import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PARKING_LINE_X,
  PARKING_GUIDE_CORNERS,
  REVERSE_GUIDE_LEVELS,
  REVERSE_NEUTRAL_PATH_COLOR,
  REVERSE_PATH_COLOR,
  WHEEL_STOP,
  isRearWheelAtStop,
  isRedGuideAlignedWithParkingLine,
  parkingCameraCueCenter,
  parkedVehicleFrontInnerCorner,
  redGuideParkingLineDistance,
  reverseNeutralGuideGeometry,
  reverseTrapezoidGeometry,
} from '../src/engine/parkingLotRenderer.ts'
import { DEFAULT_VEHICLE_CONFIG, INITIAL_VEHICLE_STATE, updateVehicle } from '../src/engine/vehiclePhysics.ts'
import { isVehicleInsideParkingBay, TARGET_PARKING_BAY } from '../src/engine/parkingEvaluation.ts'
import { createScenarioRuntime } from '../src/data/scenarios.ts'
import { detectCollision } from '../src/engine/collisionDetection.ts'

test('후방 거리 가이드는 50cm부터 빨강, 노랑, 노랑 순서다', () => {
  assert.deepEqual(
    REVERSE_GUIDE_LEVELS.map(({ distance, color }) => ({ distance, color })),
    [
      { distance: 0.5, color: '#ff453a' },
      { distance: 1, color: '#ffd60a' },
      { distance: 2.3, color: '#ffd60a' },
    ],
  )
  assert.equal(REVERSE_PATH_COLOR, '#ffd60a')
  assert.equal(REVERSE_NEUTRAL_PATH_COLOR, '#32a8ff')
})

test('평면 후방 가이드는 거리와 관계없이 차량 폭 기준을 유지한다', () => {
  const levels = reverseTrapezoidGeometry(INITIAL_VEHICLE_STATE)
  const widths = levels.map((level) => Math.hypot(
    level.right.x - level.left.x,
    level.right.y - level.left.y,
  ))

  assert.ok(Math.abs(widths[0] - widths[1]) < 0.01)
  assert.ok(Math.abs(widths[1] - widths[2]) < 0.01)
})

test('차량이 회전하면 후방 사다리꼴도 같은 방향으로 회전한다', () => {
  const levels = reverseTrapezoidGeometry({
    ...INITIAL_VEHICLE_STATE,
    heading: Math.PI / 2,
  })

  assert.ok(levels[0].left.y < INITIAL_VEHICLE_STATE.y)
  assert.ok(levels[2].left.y < levels[0].left.y)
})

test('주차칸 중앙에서 직선 후진하면 가까운 유도선이 주차선과 거의 겹친다', () => {
  const [redGuide] = reverseTrapezoidGeometry({
    ...INITIAL_VEHICLE_STATE,
    x: TARGET_PARKING_BAY.center.x,
    y: TARGET_PARKING_BAY.center.y,
    heading: TARGET_PARKING_BAY.heading,
    steeringAngle: 0,
  })
  const guideEdges = [redGuide.left.x, redGuide.right.x].sort((a, b) => a - b)

  assert.ok(Math.abs(guideEdges[0] - PARKING_LINE_X.targetLeft) <= 0.06)
  assert.ok(Math.abs(guideEdges[1] - PARKING_LINE_X.targetRight) <= 0.06)
})

test('조향하면 색상 거리선도 노란 예상 경로를 따라 움직인다', () => {
  const straight = reverseTrapezoidGeometry({ ...INITIAL_VEHICLE_STATE, steeringAngle: 0 })
  const turning = reverseTrapezoidGeometry({ ...INITIAL_VEHICLE_STATE, steeringAngle: 0.4 })

  const straightFarCenter = (straight[2].left.y + straight[2].right.y) / 2
  const turningFarCenter = (turning[2].left.y + turning[2].right.y) / 2
  assert.ok(Math.abs(turningFarCenter - straightFarCenter) > 0.35)
})

test('파란 중립 기준선은 조향각과 관계없이 직선 위치를 유지한다', () => {
  const straight = reverseNeutralGuideGeometry({ ...INITIAL_VEHICLE_STATE, steeringAngle: 0 })
  const turning = reverseNeutralGuideGeometry({ ...INITIAL_VEHICLE_STATE, steeringAngle: 0.4 })

  assert.deepEqual(turning, straight)
})

test('좌우 조향의 후방 가이드는 차량 중심축을 기준으로 대칭이다', () => {
  const left = reverseTrapezoidGeometry({ ...INITIAL_VEHICLE_STATE, steeringAngle: -0.4 })
  const right = reverseTrapezoidGeometry({ ...INITIAL_VEHICLE_STATE, steeringAngle: 0.4 })
  const centerY = (level: (typeof left)[number]) => (level.left.y + level.right.y) / 2

  assert.ok(Math.abs((centerY(left[2]) + centerY(right[2])) / 2 - INITIAL_VEHICLE_STATE.y) < 0.01)
  assert.ok(Math.abs(
    Math.hypot(left[2].right.x - left[2].left.x, left[2].right.y - left[2].left.y)
    - Math.hypot(right[2].right.x - right[2].left.x, right[2].right.y - right[2].left.y),
  ) < 0.01)
})

test('빨간 모서리와 실제 주차선 사이의 거리를 계산한다', () => {
  const cue = parkingCameraCueCenter('left')
  const aligned = redGuideParkingLineDistance({
    ...INITIAL_VEHICLE_STATE,
    ...cue,
    heading: 0,
    steeringAngle: 0,
  })

  const redGuide = reverseTrapezoidGeometry({
    ...INITIAL_VEHICLE_STATE,
    ...cue,
    heading: 0,
    steeringAngle: 0,
  })[0]
  assert.ok(Math.hypot(
    redGuide.right.x - PARKING_GUIDE_CORNERS.right.x,
    redGuide.right.y - PARKING_GUIDE_CORNERS.right.y,
  ) <= 0.001)
  assert.ok(aligned <= 0.001)
})

test('빨간 모서리가 주차칸 입구 모서리에 가까워질 때만 정렬 강조 조건이 된다', () => {
  const cue = parkingCameraCueCenter('left')
  const alignedVehicle = {
    ...INITIAL_VEHICLE_STATE,
    ...cue,
    heading: 0,
    steeringAngle: 0,
  }

  assert.equal(isRedGuideAlignedWithParkingLine(alignedVehicle), true)
  assert.equal(isRedGuideAlignedWithParkingLine({ ...alignedVehicle, x: alignedVehicle.x + 0.5 }), false)
})

test('판단 연습 위험 표시는 양옆 차량의 주차칸 쪽 앞모서리를 가리킨다', () => {
  const runtime = createScenarioRuntime('both-sides', { seed: 2 })
  const left = runtime.parkedVehicles.find((vehicle) => vehicle.side === 'left')!
  const right = runtime.parkedVehicles.find((vehicle) => vehicle.side === 'right')!
  const leftCorner = parkedVehicleFrontInnerCorner(left)
  const rightCorner = parkedVehicleFrontInnerCorner(right)

  assert.ok(leftCorner.x > left.x, '왼쪽 차량은 오른쪽 안쪽 모서리를 표시해야 한다')
  assert.ok(rightCorner.x < right.x, '오른쪽 차량은 왼쪽 안쪽 모서리를 표시해야 한다')
  assert.ok(leftCorner.y < left.y, '왼쪽 차량은 통로 쪽 앞모서리를 표시해야 한다')
  assert.ok(rightCorner.y < right.y, '오른쪽 차량은 통로 쪽 앞모서리를 표시해야 한다')
})

test('카메라 모서리를 맞춘 뒤 최대 조향하면 좌우 진입 모두 충돌 없이 주차칸 안에서 평행해진다', () => {
  for (const [startSide, seed] of [['left', 2], ['right', 3]] as const) {
    const runtime = createScenarioRuntime('both-sides', { seed, firstSuccess: startSide === 'right' })
    const cue = parkingCameraCueCenter(startSide)
    const steeringAngle = startSide === 'right'
      ? -DEFAULT_VEHICLE_CONFIG.maxSteeringAngle
      : DEFAULT_VEHICLE_CONFIG.maxSteeringAngle
    const targetHeading = startSide === 'right' ? Math.PI * 1.5 : -Math.PI / 2
    let vehicle = {
      ...runtime.initialVehicle,
      ...cue,
      heading: startSide === 'right' ? Math.PI : 0,
      steeringAngle,
      speed: 0,
      gear: 'R' as const,
      braking: false,
    }
    let collision = detectCollision(vehicle, 0, runtime)

    for (let index = 0; index < 5000 && !collision; index += 1) {
      const aligned = startSide === 'right'
        ? vehicle.heading >= targetHeading
        : vehicle.heading <= targetHeading
      if (aligned) break
      vehicle = updateVehicle(vehicle, { steeringDirection: 0, braking: false }, 0.01)
      collision = detectCollision(vehicle, 0, runtime)
    }

    assert.equal(collision, null, startSide)
    assert.equal(isVehicleInsideParkingBay({ ...vehicle, speed: 0, braking: true }), true, startSide)
  }
})

test('방지턱은 뒷바퀴가 닿는 위치에서만 보조 반응을 만든다', () => {
  const aligned = {
    ...INITIAL_VEHICLE_STATE,
    x: TARGET_PARKING_BAY.center.x,
    y: WHEEL_STOP.y - 1.35,
    heading: TARGET_PARKING_BAY.heading,
  }

  assert.equal(isRearWheelAtStop(aligned), true)
  assert.equal(isRearWheelAtStop({ ...aligned, y: aligned.y + 0.5 }), false)
})
