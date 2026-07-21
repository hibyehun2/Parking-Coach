import assert from 'node:assert/strict'
import test from 'node:test'
import { lessonDuration, lessons } from '../src/data/lessons.ts'

test('모든 주차 상황에 3단계 미니 레슨이 있다', () => {
  assert.deepEqual(Object.keys(lessons).sort(), [
    'both-sides',
    'left-side',
    'pillar-side',
    'right-side',
  ])

  for (const lesson of Object.values(lessons)) {
    assert.equal(lesson.steps.length, 3)
    assert.ok(lesson.steps.every((step) => step.title && step.description && step.cue))
  }
})

test('각 미니 레슨은 30초 이상 60초 이하 분량이다', () => {
  for (const lesson of Object.values(lessons)) {
    const duration = lessonDuration(lesson)
    assert.ok(duration >= 30, `${lesson.scenarioId}: ${duration}초는 너무 짧습니다.`)
    assert.ok(duration <= 60, `${lesson.scenarioId}: ${duration}초는 너무 깁니다.`)
  }
})
