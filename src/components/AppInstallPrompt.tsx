import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'parking-coach:install-prompt-dismissed'

export function AppInstallPrompt() {
  const { pathname } = useLocation()
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isAndroid = /Android/.test(navigator.userAgent)
  const isMobile = isIos || isAndroid
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || navigatorWithStandalone.standalone === true
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(() => (
    isMobile && !isStandalone && sessionStorage.getItem(DISMISSED_KEY) !== 'true'
  ))
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    const capturePrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const markInstalled = () => {
      setVisible(false)
      setInstallPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', capturePrompt)
    window.addEventListener('appinstalled', markInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', capturePrompt)
      window.removeEventListener('appinstalled', markInstalled)
    }
  }, [])

  if (!visible || pathname !== '/') return null

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, 'true')
    setVisible(false)
  }
  const install = async () => {
    if (!installPrompt) {
      setShowGuide(true)
      return
    }
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setVisible(false)
    setInstallPrompt(null)
  }

  return (
    <>
      <aside className="app-install-banner" aria-label="홈 화면 앱 설치 안내">
        <div><strong>Parking Coach를 앱처럼 사용하세요</strong><span>홈 화면에 추가하면 바로 연습할 수 있어요.</span></div>
        <button type="button" onClick={() => void install()}>{isIos ? '추가 방법' : '앱 설치'}</button>
        <button type="button" className="install-dismiss" aria-label="설치 안내 닫기" onClick={dismiss}>×</button>
      </aside>
      {showGuide && (
        <div className="install-guide-backdrop" role="presentation">
          <section className="install-guide" role="dialog" aria-modal="true" aria-labelledby="install-guide-title">
            <strong id="install-guide-title">홈 화면에 추가하기</strong>
            <ol>
              <li>{isIos ? '브라우저의 공유 버튼 □↑을 여세요.' : '브라우저 메뉴 ⋮를 여세요.'}</li>
              <li><b>홈 화면에 추가</b> 또는 <b>앱 설치</b>를 선택하세요.</li>
              <li>홈 화면의 Parking Coach 아이콘으로 실행하세요.</li>
            </ol>
            <button type="button" onClick={() => setShowGuide(false)}>확인</button>
          </section>
        </div>
      )}
    </>
  )
}
