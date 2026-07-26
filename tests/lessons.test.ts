import assert from 'node:assert/strict'
import test from 'node:test'
import { LESSON_TRAJECTORY_GEOMETRY, lessonDuration, lessons } from '../src/data/lessons.ts'
import { DEFAULT_VEHICLE_CONFIG } from '../src/engine/vehiclePhysics.ts'

test('기본 상황은 5단계, 양옆 차량의 두 칸 기준과 좁은 통로는 각각 6·7단계 안내가 있다', () => {
  assert.deepEqual(Object.keys(lessons).sort(), [
    'both-sides',
    'narrow-aisle',
    'one-side',
    'tight-entry',
    'wall-side',
  ])

  for (const lesson of Object.values(lessons)) {
    assert.equal(lesson.steps.length, lesson.scenarioId === 'narrow-aisle' ? 7 : lesson.scenarioId === 'both-sides' ? 6 : 5)
    assert.ok(lesson.steps.every((step) => step.title && step.description && step.cue))
    if (lesson.scenarioId === 'tight-entry') {
      assert.deepEqual(lesson.steps.map((step) => step.gear), ['R', 'R', 'D', 'R', 'R'])
      assert.match(lesson.steps.map((step) => step.description).join(' '), /정지.*중앙.*전진.*재진입/)
    } else if (lesson.scenarioId === 'narrow-aisle') {
      assert.deepEqual(lesson.steps.map((step) => step.gear), ['D', 'D', 'D', 'R', 'R', 'D', 'R'])
      assert.match(lesson.steps.map((step) => step.description).join(' '), /벽.*정지.*전진.*재진입/)
    } else if (lesson.scenarioId === 'both-sides') {
      assert.deepEqual(lesson.steps.map((step) => step.gear), ['D', 'D', 'R', 'R', 'R', 'R'])
      assert.deepEqual(lesson.steps.map((step) => step.steering), ['중앙', '중앙', '주차 방향 조향', '주차 방향 조향', '중앙', '중앙'])
      const copy = lesson.steps.map((step) => `${step.title} ${step.description} ${step.cue}`).join(' ')
      assert.match(copy, /두 번째 차량.*운전자 어깨.*회전반경.*평행/)
      assert.match(copy, /뒤 모서리.*앞 모서리.*후방 화면/)
    } else {
      assert.deepEqual(lesson.steps.map((step) => step.gear), ['D', 'R', 'R', 'R', 'R'])
      assert.deepEqual(lesson.steps.map((step) => step.steering), ['중앙', '중앙', '우측 끝까지', '우측 끝까지', '중앙'])
      const copy = lesson.steps.map((step) => `${step.title} ${step.description} ${step.cue}`).join(' ')
      assert.match(copy, /후진 진입 위치.*끝까지.*평행/)
      assert.match(copy, /후방 가이드.*간격뷰/)
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

test('기본 안내는 직선 진입 위치 조정 뒤에 실제 최소 회전반경으로 90도 후진한다', () => {
  const geometry = LESSON_TRAJECTORY_GEOMETRY
  const radiusMeters = geometry.turnRadiusPixels / geometry.pixelsPerMeter
  const minimumVehicleRadius = DEFAULT_VEHICLE_CONFIG.wheelbase
    / Math.tan(DEFAULT_VEHICLE_CONFIG.maxSteeringAngle)
  assert.ok(radiusMeters >= minimumVehicleRadius)

  assert.ok(geometry.entryStop.x > geometry.angleStop.x)
  assert.equal(geometry.entryStop.y, geometry.angleStop.y)
  assert.equal(geometry.angleStop.headingDegrees, 0)
  assert.ok(Math.abs(geometry.alignedStop.x - (geometry.angleStop.x - geometry.turnRadiusPixels)) < .02)
  assert.ok(Math.abs(geometry.alignedStop.y - (geometry.angleStop.y + geometry.turnRadiusPixels)) < .02)
  assert.equal(geometry.alignedStop.headingDegrees, -90)
})
