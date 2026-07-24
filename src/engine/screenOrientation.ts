export type OrientationController = {
  lock?: (orientation: 'landscape') => Promise<void>
  unlock?: () => void
}

function deviceOrientation(): OrientationController | null {
  if (typeof screen === 'undefined') return null
  return screen.orientation as OrientationController
}

export async function requestDirectPracticeLandscape(
  orientation: OrientationController | null = deviceOrientation(),
) {
  if (!orientation?.lock) return false
  try {
    await orientation.lock('landscape')
    return true
  } catch {
    // iOS와 일반 브라우저처럼 잠금을 허용하지 않는 환경에서는 회전 안내를 사용합니다.
    return false
  }
}

export function releaseDirectPracticeOrientation(
  orientation: OrientationController | null = deviceOrientation(),
) {
  try {
    orientation?.unlock?.()
  } catch {
    // 잠금이 적용되지 않은 환경의 해제 실패는 무시합니다.
  }
}
