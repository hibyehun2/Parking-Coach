import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { AnimalAvatar } from '../components/AnimalAvatar'
import heroImage from '../assets/parking-coach-hero-reverse-low-angle-v2.png'
import { loadPracticeHistory, todayPracticeMessage } from '../engine/practiceHistory'
import { configuredPracticeSharingGateway, syncPracticeSharing } from '../engine/practiceSharing'
import {
  completeSupabaseProfile,
  hasCompletedSupabaseProfile,
  isSupabaseConfigured,
  loadSupabaseSession,
  signInWithGoogle,
  subscribeSupabaseAuth,
  supabaseProfileNickname,
} from '../engine/supabaseClient'
import { loadAnonymousNickname, refreshAnonymousNickname } from '../engine/userPreferences'

const CONTINUE_TO_PRACTICE_KEY = 'parking-coach:continue-to-practice'

export function HomePage() {
  const navigate = useNavigate()
  const practiceMessage = todayPracticeMessage(loadPracticeHistory().sessions)
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured())
  const [showLogin, setShowLogin] = useState(false)
  const [showNickname, setShowNickname] = useState(false)
  const [nickname, setNickname] = useState(loadAnonymousNickname)
  const [authMessage, setAuthMessage] = useState('')

  useEffect(() => {
    let active = true
    const applyUser = (nextUser: User | null) => {
      if (!active) return
      setUser(nextUser)
      setAuthReady(true)
      if (!nextUser) return
      const savedNickname = supabaseProfileNickname(nextUser)
      if (savedNickname) setNickname(savedNickname)
      if (!hasCompletedSupabaseProfile(nextUser)) {
        setShowLogin(false)
        setShowNickname(true)
        return
      }
      if (sessionStorage.getItem(CONTINUE_TO_PRACTICE_KEY) === 'true') {
        sessionStorage.removeItem(CONTINUE_TO_PRACTICE_KEY)
        navigate('/practice')
      }
    }
    void loadSupabaseSession()
      .then((session) => applyUser(session?.user ?? null))
      .catch(() => {
        if (active) {
          setAuthReady(true)
          setAuthMessage('로그인 상태를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.')
        }
      })
    const unsubscribe = subscribeSupabaseAuth(applyUser)
    return () => {
      active = false
      unsubscribe()
    }
  }, [navigate])

  useEffect(() => {
    const profileNickname = supabaseProfileNickname(user)
    if (!user || !profileNickname || !configuredPracticeSharingGateway) return
    void syncPracticeSharing(loadPracticeHistory(), profileNickname, configuredPracticeSharingGateway)
  }, [user])

  const beginPractice = () => {
    window.dispatchEvent(new Event('parking-coach:dismiss-install-prompt'))
    if (!authReady) return
    if (!user) {
      setAuthMessage(isSupabaseConfigured()
        ? ''
        : '로그인 설정을 불러오지 못했습니다. 앱을 새로고침한 뒤 다시 시도해주세요.')
      setShowLogin(true)
      return
    }
    if (!hasCompletedSupabaseProfile(user)) {
      setShowNickname(true)
      return
    }
    navigate('/practice')
  }

  const startGoogleLogin = async () => {
    setAuthMessage('')
    if (!isSupabaseConfigured()) {
      setAuthMessage('로그인 설정을 불러오지 못했습니다. 앱을 새로고침한 뒤 다시 시도해주세요.')
      return
    }
    sessionStorage.setItem(CONTINUE_TO_PRACTICE_KEY, 'true')
    try {
      await signInWithGoogle()
    } catch {
      sessionStorage.removeItem(CONTINUE_TO_PRACTICE_KEY)
      setAuthMessage('Google 로그인을 시작하지 못했습니다. 네트워크 상태를 확인해주세요.')
    }
  }

  const confirmNickname = async () => {
    setAuthMessage('')
    try {
      const nextUser = await completeSupabaseProfile(nickname)
      setUser(nextUser)
      sessionStorage.removeItem(CONTINUE_TO_PRACTICE_KEY)
      setShowNickname(false)
      navigate('/practice')
    } catch {
      setAuthMessage('닉네임을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  return (
    <div className="home-page">
      <section className="home-hero compact-home-hero" aria-labelledby="home-title">
        <div className="hero-copy">
          <p className="eyebrow">PARKING COACH</p>
          <h1 id="home-title">
            <span>후진 주차,</span>{' '}
            <span>판단하고 연습해요.</span>
          </h1>
          <p className="page-description">
            <span>안전한 수정 방법을 익히고,</span>{' '}
            <span>단계별 안내에 따라 후진 주차를 연습해요.</span>
          </p>
          <button className="primary-button hero-start" type="button" onClick={beginPractice} disabled={!authReady}>
            연습 시작하기 <span aria-hidden="true">→</span>
          </button>
          <div className="home-hero-visual">
            <img src={heroImage} alt="후진등을 켠 초록색 차량이 두 차량 사이 주차칸으로 후진하는 모습" />
            <div className="preview-caption"><span>오늘의 연습</span><strong>{practiceMessage}</strong></div>
          </div>
        </div>
      </section>
      {showLogin && createPortal(
        <div className="auth-sheet-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowLogin(false)
        }}>
          <section className="auth-sheet" role="dialog" aria-modal="true" aria-labelledby="google-login-title">
            <button type="button" className="auth-sheet-close" aria-label="Google 로그인 안내 닫기" onClick={() => setShowLogin(false)}>×</button>
            <img
              className="auth-app-mark"
              src={`${import.meta.env.BASE_URL}icons/pwa-192x192.png`}
              alt=""
              aria-hidden="true"
            />
            <p className="auth-kicker">PARKING COACH</p>
            <h2 id="google-login-title">로그인하고 연습을 시작하세요</h2>
            <p>보관한 학습 사례를 내 계정에 안전하게 연결할 수 있어요.</p>
            <button type="button" className="google-login-button" onClick={() => { void startGoogleLogin() }}>
              <span aria-hidden="true">G</span>
              Google로 계속하기
            </button>
            <small>로그인 후 처음 한 번만 공개 닉네임을 만들어요.</small>
            {authMessage && <p className="auth-error" role="alert">{authMessage}</p>}
          </section>
        </div>,
        document.body,
      )}
      {showNickname && createPortal(
        <div className="auth-sheet-backdrop">
          <section className="auth-sheet nickname-sheet" role="dialog" aria-modal="true" aria-labelledby="nickname-create-title">
            <p className="auth-kicker">첫 로그인</p>
            <h2 id="nickname-create-title">공개 닉네임을 만들었어요</h2>
            <p>보관한 학습 사례에는 Google 이름 대신 아래 닉네임만 표시됩니다.</p>
            <div className="nickname-preview">
              <AnimalAvatar nickname={nickname} className="nickname-preview-avatar" />
              <strong>{nickname}</strong>
            </div>
            <button type="button" className="nickname-change-button" onClick={() => setNickname(refreshAnonymousNickname())}>다른 닉네임 보기</button>
            <button type="button" className="primary-button nickname-confirm-button" onClick={() => { void confirmNickname() }}>이 닉네임으로 시작</button>
            {authMessage && <p className="auth-error" role="alert">{authMessage}</p>}
          </section>
        </div>,
        document.body,
      )}
    </div>
  )
}
