import { useRegisterSW } from 'virtual:pwa-register/react'

export function PwaUpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!offlineReady && !needRefresh) return null

  const dismiss = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  return (
    <aside className="pwa-update-banner" aria-live="polite">
      <div>
        <strong>{needRefresh ? '새로운 버전이 준비됐어요' : '오프라인에서도 연습할 수 있어요'}</strong>
        <span>{needRefresh ? '연습을 시작하기 전에 업데이트하세요.' : '필요한 앱 파일을 이 기기에 저장했습니다.'}</span>
      </div>
      {needRefresh && <button type="button" onClick={() => void updateServiceWorker(true)}>지금 업데이트</button>}
      <button type="button" className="pwa-update-dismiss" aria-label="PWA 안내 닫기" onClick={dismiss}>×</button>
    </aside>
  )
}
