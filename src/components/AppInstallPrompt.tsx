import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'parking-coach:install-prompt-dismissed'

export function AppInstallPrompt() {
  const { pathname } = useLocation()
  const userAgent = navigator.userAgent
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  const isIos = /iPhone|iPad|iPod/.test(userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isAndroid = /Android/i.test(userAgent)
  const isSamsungBrowser = /SamsungBrowser/i.test(userAgent)
  const isChrome = isAndroid
    && /Chrome/i.test(userAgent)
    && !/SamsungBrowser|EdgA|OPR|Opera|Firefox|FxiOS/i.test(userAgent)
  const hasAndroidInstallGuide = isSamsungBrowser || isChrome
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || navigatorWithStandalone.standalone === true
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(() => (
    (isIos || hasAndroidInstallGuide)
    && !isStandalone
    && sessionStorage.getItem(DISMISSED_KEY) !== 'true'
  ))
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    const capturePrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
      if (sessionStorage.getItem(DISMISSED_KEY) !== 'true') setVisible(true)
    }
    const markInstalled = () => {
      setVisible(false)
      setInstallPrompt(null)
    }
    const dismissForPractice = () => setVisible(false)
    window.addEventListener('beforeinstallprompt', capturePrompt)
    window.addEventListener('appinstalled', markInstalled)
    window.addEventListener('parking-coach:dismiss-install-prompt', dismissForPractice)
    return () => {
      window.removeEventListener('beforeinstallprompt', capturePrompt)
      window.removeEventListener('appinstalled', markInstalled)
      window.removeEventListener('parking-coach:dismiss-install-prompt', dismissForPractice)
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
  const guideTitle = isIos
    ? '홈 화면에 추가하기'
    : isSamsungBrowser
      ? '삼성 인터넷에서 설치하기'
      : 'Chrome에서 설치하기'
  const guideSteps = isIos
    ? [
        <>브라우저의 공유 버튼 <b>□↑</b>을 여세요.</>,
        <><b>홈 화면에 추가</b>를 선택하세요.</>,
        <>홈 화면의 Parking Coach 아이콘으로 실행하세요.</>,
      ]
    : isSamsungBrowser
      ? [
          <>주소창의 <b>설치 아이콘</b>을 누르세요.</>,
          <>아이콘이 없다면 브라우저 메뉴에서 <b>홈 화면에 추가</b>를 선택하세요.</>,
          <>설치를 확인한 뒤 앱스 화면의 Parking Coach 아이콘으로 실행하세요.</>,
        ]
      : [
          <>오른쪽 위 <b>⋮</b> 메뉴를 여세요.</>,
          <><b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 선택하세요.</>,
          <>설치를 확인한 뒤 Parking Coach 아이콘으로 실행하세요.</>,
        ]

  return (
    <>
      <aside className="app-install-banner" aria-label="홈 화면 앱 설치 안내">
        <div><strong>Parking Coach를 앱처럼 사용하세요</strong><span>홈 화면에 추가하면 바로 연습할 수 있어요.</span></div>
        <button type="button" onClick={() => void install()}>{installPrompt ? '앱 설치' : '설치 방법'}</button>
        <button type="button" className="install-dismiss" aria-label="설치 안내 닫기" onClick={dismiss}>×</button>
      </aside>
      {showGuide && (
        <div className="install-guide-backdrop" role="presentation">
          <section className="install-guide" role="dialog" aria-modal="true" aria-labelledby="install-guide-title">
            <strong id="install-guide-title">{guideTitle}</strong>
            <ol>
              {guideSteps.map((step, index) => <li key={index}>{step}</li>)}
            </ol>
            <button type="button" onClick={() => setShowGuide(false)}>확인</button>
          </section>
        </div>
      )}
    </>
  )
}
