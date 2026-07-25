import assert from 'node:assert/strict'
import test from 'node:test'
import type { ParkingResult } from '../src/engine/parkingEvaluation.ts'
import { recordPracticeSession, togglePracticeBookmark } from '../src/engine/practiceHistory.ts'
import { buildPublicLearningCase, createHttpPracticeSharingGateway, createSupabasePracticeSharingGateway } from '../src/engine/practiceSharing.ts'
import type { SupabaseClient } from '@supabase/supabase-js'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

test('공개 사례 전송값은 학습 정보만 포함하고 원본 주행 상태는 제외한다', () => {
  const storage = new MemoryStorage()
  const result: ParkingResult = {
    success: true,
    fullyInside: true,
    stopped: true,
    centerError: .1,
    angleErrorDegrees: 1,
    collisionCount: 0,
    collisions: [],
  }
  const saved = recordPracticeSession(result, 'both-sides', 'learning', storage, new Date('2026-07-24T10:11:12Z'))
  togglePracticeBookmark(saved.sessions[0].id, storage, new Date(), { shareWhenAdded: true })
  const session = JSON.parse(storage.getItem('parking-coach:practice-history:v5')!).sessions[0]
  const payload = buildPublicLearningCase(session, '차분한수달', { version: 1, acceptedAt: '2026-07-24T09:00:00Z' })

  assert.equal(payload.clientShareId, session.shareClientId)
  assert.equal(payload.nickname, '차분한수달')
  assert.equal(payload.outcome, '안전 완료')
  assert.equal(payload.completedDate, '2026-07-24')
  assert.equal('completedAt' in payload, false)
  assert.equal(payload.consent.version, 1)
  assert.equal('runtime' in payload, false)
  assert.equal('moments' in payload, false)
  assert.equal('seed' in payload, false)
})

test('익명 공유 요청은 보안 세션 쿠키와 CSRF 토큰을 사용한다', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = []
  const request = (async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(input), init })
    return String(input).endsWith('/session')
      ? new Response(JSON.stringify({ csrfToken: 'secure-csrf-token-value' }), { status: 200 })
      : new Response(JSON.stringify({ id: 'public-case-1' }), { status: 200 })
  }) as typeof fetch
  const gateway = createHttpPracticeSharingGateway({ baseUrl: 'https://api.example.com', request })
  await gateway.publish({
    clientShareId: '2e2c6bd7-37ea-4ed2-a39e-c9abf831217e',
    nickname: '차분한수달',
    completedDate: '2026-07-24',
    consent: { version: 1, acceptedAt: '2026-07-24T09:00:00Z' },
    scenarioId: 'both-sides',
    scenarioTitle: '양옆 차량 사이',
    practiceType: '직접 연습',
    outcome: '안전 완료',
    collisionCount: 0,
    collisionZones: [],
    learningPoints: [],
  })

  assert.equal(requests.length, 2)
  assert.equal(requests[0].init?.credentials, 'include')
  assert.equal(requests[1].init?.credentials, 'include')
  assert.equal((requests[1].init?.headers as Record<string, string>)['X-CSRF-Token'], 'secure-csrf-token-value')
  assert.equal((requests[1].init?.headers as Record<string, string>)['Idempotency-Key'], '2e2c6bd7-37ea-4ed2-a39e-c9abf831217e')
})

test('운영 공유 API는 HTTPS 주소만 허용한다', () => {
  assert.throws(() => createHttpPracticeSharingGateway({ baseUrl: 'http://api.example.com' }), /https-required/)
})

test('Supabase 공유는 비공개 소유 열을 조회하지 않고 보안 함수를 사용한다', async () => {
  const calls: Array<{ name: string; args: unknown }> = []
  const client = {
    auth: {
      getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }),
    },
    rpc: async (name: string, args: unknown) => {
      calls.push({ name, args })
      return { data: '0c434f6a-72b8-45e9-895c-162dbb3ad8e4', error: null }
    },
  } as unknown as SupabaseClient
  const gateway = createSupabasePracticeSharingGateway(client)

  const result = await gateway.publish({
    clientShareId: '2e2c6bd7-37ea-4ed2-a39e-c9abf831217e',
    nickname: '차분한수달',
    completedDate: '2026-07-24',
    consent: { version: 1, acceptedAt: '2026-07-24T09:00:00Z' },
    scenarioId: 'both-sides',
    scenarioTitle: '양옆 차량 사이',
    practiceType: '직접 연습',
    outcome: '안전 완료',
    collisionCount: 0,
    collisionZones: [],
    learningPoints: [],
  })

  assert.equal(result.publicCaseId, '0c434f6a-72b8-45e9-895c-162dbb3ad8e4')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].name, 'publish_learning_case')
  assert.equal((calls[0].args as { payload: { client_share_id: string } }).payload.client_share_id, '2e2c6bd7-37ea-4ed2-a39e-c9abf831217e')
})

test('Supabase 함수 스키마가 갱신 전이면 보안 정책이 적용된 신규 등록으로 공유한다', async () => {
  const calls: string[] = []
  const client = {
    auth: {
      getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }),
    },
    rpc: async () => ({ data: null, error: { code: 'PGRST202' } }),
    from: () => ({
      insert: () => ({
        select: () => ({
          single: async () => {
            calls.push('insert')
            return { data: { id: '6b0ad740-d13a-4cb8-821f-db12c7b83e13' }, error: null }
          },
        }),
      }),
    }),
  } as unknown as SupabaseClient
  const gateway = createSupabasePracticeSharingGateway(client)

  const result = await gateway.publish({
    clientShareId: '2e2c6bd7-37ea-4ed2-a39e-c9abf831217e',
    nickname: '차분한수달',
    completedDate: '2026-07-24',
    consent: { version: 1, acceptedAt: '2026-07-24T09:00:00Z' },
    scenarioId: 'both-sides',
    scenarioTitle: '양옆 차량 사이',
    practiceType: '직접 연습',
    outcome: '안전 완료',
    collisionCount: 0,
    collisionZones: [],
    learningPoints: [],
  })

  assert.equal(result.publicCaseId, '6b0ad740-d13a-4cb8-821f-db12c7b83e13')
  assert.deepEqual(calls, ['insert'])
})
