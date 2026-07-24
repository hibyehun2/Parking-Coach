import assert from 'node:assert/strict'
import test from 'node:test'
import { ANONYMOUS_ALIAS_ADJECTIVES, ANONYMOUS_ALIAS_ANIMALS, ANONYMOUS_ALIAS_COMBINATIONS, createAnonymousAlias, getAliasAnimal, getAliasAnimalIndex } from '../src/engine/anonymousAlias.ts'

test('익명 별명은 같은 사례에 항상 같은 이름을 만든다', () => {
  assert.equal(createAnonymousAlias('shared-case-42'), createAnonymousAlias('shared-case-42'))
  assert.notEqual(createAnonymousAlias('shared-case-42'), createAnonymousAlias('shared-case-43'))
})

test('형용사와 동물 조합으로 충분히 많은 익명 별명을 제공한다', () => {
  assert.ok(ANONYMOUS_ALIAS_ADJECTIVES.length >= 40)
  assert.ok(ANONYMOUS_ALIAS_ANIMALS.length >= 40)
  assert.equal(ANONYMOUS_ALIAS_COMBINATIONS, ANONYMOUS_ALIAS_ADJECTIVES.length * ANONYMOUS_ALIAS_ANIMALS.length)
  assert.ok(ANONYMOUS_ALIAS_COMBINATIONS >= 1600)
})

test('닉네임의 동물은 캐릭터 아틀라스 순서와 정확히 연결된다', () => {
  assert.equal(getAliasAnimal('차분한 수달'), '수달')
  assert.equal(getAliasAnimal('빛나는 레서판다'), '레서판다')
  assert.equal(getAliasAnimalIndex('빛나는 레서판다'), ANONYMOUS_ALIAS_ANIMALS.indexOf('레서판다'))
  assert.equal(getAliasAnimalIndex('알 수 없는 닉네임'), 0)
})
