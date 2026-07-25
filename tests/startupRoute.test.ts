import assert from 'node:assert/strict'
import test from 'node:test'
import { resetStartupRouteToHome } from '../src/engine/startupRoute.ts'

function startupWindow(hash: string, search = '') {
  const replacedUrls: string[] = []
  return {
    target: {
      location: {
        pathname: '/Parking-Coach/',
        search,
        hash,
      },
      history: {
        replaceState: (_data: unknown, _unused: string, url?: string | URL | null) => {
          replacedUrls.push(String(url))
        },
      },
    },
    replacedUrls,
  }
}

test('앱을 이전 화면에서 새로 시작하면 홈 경로로 초기화한다', () => {
  const { target, replacedUrls } = startupWindow('#/result?tab=current')

  assert.equal(resetStartupRouteToHome(target), true)
  assert.deepEqual(replacedUrls, ['/Parking-Coach/#/'])
})

test('로그인 콜백 쿼리를 보존하면서 홈 경로로 초기화한다', () => {
  const { target, replacedUrls } = startupWindow('#/settings', '?code=oauth-code')

  assert.equal(resetStartupRouteToHome(target), true)
  assert.deepEqual(replacedUrls, ['/Parking-Coach/?code=oauth-code#/'])
})

test('이미 홈이거나 시작 경로에 해시가 없으면 주소를 바꾸지 않는다', () => {
  for (const hash of ['', '#', '#/']) {
    const { target, replacedUrls } = startupWindow(hash)
    assert.equal(resetStartupRouteToHome(target), false)
    assert.deepEqual(replacedUrls, [])
  }
})
