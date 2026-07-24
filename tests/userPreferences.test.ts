import assert from 'node:assert/strict'
import test from 'node:test'
import { ANONYMOUS_ALIAS_COMBINATIONS } from '../src/engine/anonymousAlias.ts'
import {
  ANONYMOUS_NICKNAME_KEY,
  acceptPracticeAutoShareConsent,
  createRandomAnonymousNickname,
  hasPracticeAutoShareConsent,
  loadAnonymousNickname,
  refreshAnonymousNickname,
} from '../src/engine/userPreferences.ts'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

test('익명 닉네임을 처음 만들면 같은 기기에 저장한다', () => {
  const storage = new MemoryStorage()
  const created = loadAnonymousNickname(storage, () => 0)

  assert.equal(created, storage.getItem(ANONYMOUS_NICKNAME_KEY))
  assert.equal(loadAnonymousNickname(storage, () => .9), created)
})

test('무작위 변경 시 현재 닉네임과 같은 조합이 연속되지 않는다', () => {
  const storage = new MemoryStorage()
  const current = loadAnonymousNickname(storage, () => 0)
  const refreshed = refreshAnonymousNickname(storage, () => 0)

  assert.notEqual(refreshed, current)
  assert.equal(storage.getItem(ANONYMOUS_NICKNAME_KEY), refreshed)
})

test('무작위 값의 양 끝에서도 유효한 익명 닉네임을 만든다', () => {
  assert.ok(createRandomAnonymousNickname('', () => 0).length > 0)
  assert.ok(createRandomAnonymousNickname('', () => 1).length > 0)
  assert.ok(ANONYMOUS_ALIAS_COMBINATIONS > 1)
})

test('보관 기록 자동 공유는 명시적으로 동의한 뒤에만 활성화된다', () => {
  const storage = new MemoryStorage()
  assert.equal(hasPracticeAutoShareConsent(storage), false)
  acceptPracticeAutoShareConsent(storage, new Date('2026-07-24T10:00:00Z'))
  assert.equal(hasPracticeAutoShareConsent(storage), true)
})
