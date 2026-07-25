import { useRegisterSW } from 'virtual:pwa-register/react'

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  const dismiss = () => {
    setNeedRefresh(false)
  }

  return (
    <aside className="pwa-update-banner" aria-live="polite">
      <div>
        <strong>새로운 버전이 준비됐어요</strong>
        <span>연습을 시작하기 전에 업데이트하세요.</span>
      </div>
      <button type="button" onClick={() => void updateServiceWorker(true)}>지금 업데이트</button>
      <button type="button" className="pwa-update-dismiss" aria-label="PWA 안내 닫기" onClick={dismiss}>×</button>
    </aside>
  )
}
