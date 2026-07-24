import assert from 'node:assert/strict'
import test from 'node:test'
import {
  releaseDirectPracticeOrientation,
  requestDirectPracticeLandscape,
  type OrientationController,
} from '../src/engine/screenOrientation.ts'

test('직접 연습 진입 시 지원 환경에 가로 방향 잠금을 요청한다', async () => {
  let requested: string | null = null
  const orientation: OrientationController = {
    lock: async (value) => { requested = value },
  }

  assert.equal(await requestDirectPracticeLandscape(orientation), true)
  assert.equal(requested, 'landscape')
})

test('방향 잠금을 지원하지 않거나 거부해도 직접 연습 진입을 막지 않는다', async () => {
  assert.equal(await requestDirectPracticeLandscape(null), false)
  assert.equal(await requestDirectPracticeLandscape({
    lock: async () => { throw new Error('not allowed') },
  }), false)
})

test('직접 연습을 나가면 방향 잠금을 해제한다', () => {
  let unlocked = false
  releaseDirectPracticeOrientation({ unlock: () => { unlocked = true } })
  assert.equal(unlocked, true)
})
