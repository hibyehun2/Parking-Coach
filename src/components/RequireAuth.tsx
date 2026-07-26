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
              <p>‘연습 시작하기’를 누르면<br />로그인할 수 있습니다.</p>
              <button 
                type="button" 
                className="primary-button" 
                onClick={() => navigate('/', { replace: true })}
                style={{ marginTop: '16px' }}
              >
                확인
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
