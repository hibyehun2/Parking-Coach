import assert from 'node:assert/strict'
import test from 'node:test'
import { LESSON_TRAJECTORY_GEOMETRY, lessonDuration, lessons } from '../src/data/lessons.ts'
import { DEFAULT_VEHICLE_CONFIG } from '../src/engine/vehiclePhysics.ts'

test('기본 상황은 5단계, 좁은 통로는 7단계 미니 레슨이 있다', () => {
  assert.deepEqual(Object.keys(lessons).sort(), [
    'both-sides',
    'narrow-aisle',
    'one-side',
    'tight-entry',
    'wall-side',
  ])

  for (const lesson of Object.values(lessons)) {
    assert.equal(lesson.steps.length, lesson.scenarioId === 'narrow-aisle' ? 7 : 5)
    assert.ok(lesson.steps.every((step) => step.title && step.description && step.cue))
    if (lesson.scenarioId === 'tight-entry') {
      assert.deepEqual(lesson.steps.map((step) => step.gear), ['R', 'R', 'D', 'R', 'R'])
      assert.match(lesson.steps.map((step) => step.description).join(' '), /정지.*중앙.*전진.*재진입/)
    } else if (lesson.scenarioId === 'narrow-aisle') {
      assert.deepEqual(lesson.steps.map((step) => step.gear), ['D', 'D', 'D', 'R', 'R', 'D', 'R'])
      assert.match(lesson.steps.map((step) => step.description).join(' '), /벽.*정지.*전진.*재진입/)
    } else {
      assert.deepEqual(lesson.steps.map((step) => step.gear), ['D', 'D', 'R', 'R', 'R'])
      assert.deepEqual(lesson.steps.map((step) => step.steering), ['중앙', '좌측 끝까지', '우측 끝까지', '우측 끝까지', '중앙'])
    }
    assert.ok(lesson.steps.every((step) => step.check), `${lesson.scenarioId}: 확인 지점이 필요합니다.`)
  }
})

test('기본 레슨은 60초, 좁은 통로 레슨은 75초 이내다', () => {
  for (const lesson of Object.values(lessons)) {
    const duration = lessonDuration(lesson)
    assert.ok(duration >= 30, `${lesson.scenarioId}: ${duration}초는 너무 짧습니다.`)
    assert.ok(duration <= (lesson.scenarioId === 'narrow-aisle' ? 75 : 60), `${lesson.scenarioId}: ${duration}초는 너무 깁니다.`)
  }
})

test('기본 안내의 전진·후진 원호는 실제 차량 회전반경과 연속 자세를 사용한다', () => {
  const geometry = LESSON_TRAJECTORY_GEOMETRY
  const radiusMeters = geometry.turnRadiusPixels / geometry.pixelsPerMeter
  const minimumVehicleRadius = DEFAULT_VEHICLE_CONFIG.wheelbase
    / Math.tan(DEFAULT_VEHICLE_CONFIG.maxSteeringAngle)
  assert.ok(radiusMeters >= minimumVehicleRadius)

  const fortyFiveDegrees = Math.PI / 4
  const forwardDelta = geometry.turnRadiusPixels * Math.sin(fortyFiveDegrees)
  const lateralDelta = geometry.turnRadiusPixels * (1 - Math.cos(fortyFiveDegrees))
  assert.ok(Math.abs(geometry.angleStop.x - (geometry.entryStop.x + forwardDelta)) < .02)
  assert.ok(Math.abs(geometry.angleStop.y - (geometry.entryStop.y - lateralDelta)) < .02)
  assert.ok(Math.abs(geometry.alignedStop.x - (geometry.angleStop.x - lateralDelta)) < .02)
  assert.ok(Math.abs(geometry.alignedStop.y - (geometry.angleStop.y + forwardDelta)) < .02)
  assert.equal(geometry.angleStop.headingDegrees, -45)
  assert.equal(geometry.alignedStop.headingDegrees, -90)
})
