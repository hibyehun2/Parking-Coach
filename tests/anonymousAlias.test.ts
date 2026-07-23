import assert from 'node:assert/strict'
import test from 'node:test'
import { ANONYMOUS_ALIAS_ADJECTIVES, ANONYMOUS_ALIAS_ANIMALS, ANONYMOUS_ALIAS_COMBINATIONS, createAnonymousAlias } from '../src/engine/anonymousAlias.ts'

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
