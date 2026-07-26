import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { loadSupabaseSession, subscribeSupabaseAuth } from '../engine/supabaseClient'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const [isAuth, setIsAuth] = useState<boolean | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    void loadSupabaseSession().then(session => {
      if (active) setIsAuth(!!session?.user)
    })
    const unsub = subscribeSupabaseAuth(user => {
      if (active) setIsAuth(!!user)
    })
    return () => {
      active = false
      unsub()
    }
  }, [])

  if (isAuth === null) return null // loading state

  if (!isAuth) {
    return (
      <>
        {createPortal(
          <div className="auth-sheet-backdrop">
            <section className="auth-sheet" role="dialog" aria-modal="true" aria-labelledby="login-required-title">
              <p className="auth-kicker">로그인 필요</p>
              <h2 id="login-required-title">로그인이 필요한 서비스입니다</h2>
              <p>홈으로 이동한 뒤 아래 버튼을 눌러주세요.</p>
              <div className="auth-practice-preview" aria-hidden="true">
                <span>연습 시작하기 <b>→</b></span>
              </div>
              <button 
                type="button" 
                className="primary-button auth-redirect-confirm"
                onClick={() => navigate('/', { replace: true })}
              >
                홈으로 이동
              </button>
            </section>
          </div>,
          document.body
        )}
      </>
    )
  }

  return <>{children}</>
}
