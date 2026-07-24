import assert from 'node:assert/strict'
import test from 'node:test'
import { LEARNING_CASES } from '../src/data/learningCases.ts'

test('같은 공개 작성자의 학습 사례는 하나의 고정 닉네임을 사용한다', () => {
  const aliasesByAuthor = new Map<string, Set<string>>()
  for (const learningCase of LEARNING_CASES) {
    const aliases = aliasesByAuthor.get(learningCase.authorId) ?? new Set<string>()
    aliases.add(learningCase.nickname)
    aliasesByAuthor.set(learningCase.authorId, aliases)
  }

  assert.ok([...aliasesByAuthor.values()].every((aliases) => aliases.size === 1))
  assert.ok([...aliasesByAuthor.keys()].some((authorId) => LEARNING_CASES.filter((learningCase) => learningCase.authorId === authorId).length > 1))
})

test('학습 사례는 닉네임별 공개 목록에 필요한 정보를 포함한다', () => {
  assert.ok(LEARNING_CASES.length > 0)
  for (const learningCase of LEARNING_CASES) {
    assert.ok(learningCase.authorId)
    assert.ok(learningCase.nickname)
    assert.ok(learningCase.title)
    assert.ok(learningCase.takeaway)
  }
})
