import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { AnimalAvatar } from '../components/AnimalAvatar'
import { configuredPracticeSharingGateway } from '../engine/practiceSharing'
import { loadAnonymousNickname, refreshAnonymousNickname } from '../engine/userPreferences'
import {
  completeSupabaseProfile,
  isSupabaseConfigured,
  loadSupabaseSession,
  signInWithGoogle,
  signOutSupabase,
  subscribeSupabaseAuth,
  supabaseProfileNickname,
} from '../engine/supabaseClient'

export function SettingsPage() {
  const [nickname, setNickname] = useState(loadAnonymousNickname)
  const [changed, setChanged] = useState(false)
  const [sharingMessage, setSharingMessage] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured())
  const [authBusy, setAuthBusy] = useState(false)

  useEffect(() => {
    let active = true
    void loadSupabaseSession().then((session) => {
      if (!active) return
      setUser(session?.user ?? null)
      setNickname(supabaseProfileNickname(session?.user ?? null) ?? loadAnonymousNickname())
      setAuthReady(true)
    }).catch(() => {
      if (active) setAuthReady(true)
    })
    const unsubscribe = subscribeSupabaseAuth((nextUser) => {
      if (!active) return
      setUser(nextUser)
      setNickname(supabaseProfileNickname(nextUser) ?? loadAnonymousNickname())
      setAuthReady(true)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const refreshNickname = () => {
    if (!window.confirm('공개 닉네임을 바꾸면 이미 공개한 모든 학습 사례에도 새 닉네임이 표시됩니다. 바꿀까요?')) return
    const nextNickname = refreshAnonymousNickname()
    setNickname(nextNickname)
    setChanged(true)
    if (user) void completeSupabaseProfile(nextNickname)
      .catch(() => setSharingMessage('닉네임은 이 기기에 저장했지만 계정에는 반영하지 못했습니다.'))
    if (user && configuredPracticeSharingGateway) {
      void configuredPracticeSharingGateway.updateNickname(nextNickname)
        .then(() => setSharingMessage('공개 사례의 닉네임도 변경했습니다.'))
        .catch(() => setSharingMessage('닉네임은 저장했으며 서버 연결 후 공개 사례에 다시 반영해야 합니다.'))
    }
  }
  const login = async () => {
    if (user || authBusy) return
    setAuthBusy(true)
    setSharingMessage('')
    try {
      const session = await loadSupabaseSession()
      if (session?.user) {
        setUser(session.user)
        return
      }
      await signInWithGoogle()
    } catch {
      setSharingMessage('Google 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setAuthBusy(false)
    }
  }
  const logout = async () => {
    if (authBusy) return
    if (!window.confirm('이 기기에서 로그아웃할까요? 보관한 공개 사례는 삭제되지 않습니다.')) return
    setAuthBusy(true)
    try {
      await signOutSupabase()
      setUser(null)
      setSharingMessage('이 기기에서 로그아웃했습니다.')
    } catch {
      setSharingMessage('로그아웃하지 못했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setAuthBusy(false)
    }
  }
  return (
    <section className="page settings-page" aria-labelledby="settings-title">
      <header className="settings-header">
        <p className="eyebrow">앱 설정</p>
        <h1 id="settings-title">설정</h1>
        <p>공개 닉네임과 계정 상태를 관리합니다.</p>
      </header>

      <section className="settings-group" aria-labelledby="profile-settings-title">
        <header><span>프로필</span><h2 id="profile-settings-title">공개 닉네임</h2></header>
        {!user ? (
          <div className="settings-profile-row" style={{ color: 'var(--muted)', fontSize: '0.85rem', padding: '8px 0' }}>
            로그인 후 닉네임을 설정하고 학습 사례를 공유할 수 있습니다.
          </div>
        ) : (
          <div className="settings-profile-row">
            <AnimalAvatar nickname={nickname} className="settings-avatar" />
            <div>
              <strong>{nickname}</strong>
            </div>
            <button type="button" aria-label="공개 닉네임 무작위 변경" title="공개 닉네임을 무작위로 변경합니다" onClick={refreshNickname}>변경</button>
          </div>
        )}
        <p className="settings-note" aria-live="polite">
          {!user ? '학습 사례는 로그인한 사용자만 보관하고 공유할 수 있습니다.' : changed ? '새 닉네임을 저장했으며 공개한 모든 사례에도 같은 이름이 사용됩니다.' : '공유에 동의한 모든 학습 사례에는 이 닉네임이 동일하게 표시됩니다.'}
        </p>
      </section>

      <section className="settings-group" aria-labelledby="account-settings-title">
        <header><span>계정</span><h2 id="account-settings-title">로그인 및 보안</h2></header>
        <div className="settings-account-row">
          <div>
            <strong>{!authReady ? '로그인 상태 확인 중' : user ? 'Google 로그인됨' : 'Google 계정 연결'}</strong>
            <small>{user?.email ?? '연습 기록을 계정에 연결할 수 있습니다.'}</small>
          </div>
          {user
            ? <button type="button" disabled={authBusy} onClick={() => { void logout() }}>{authBusy ? '처리 중…' : '로그아웃'}</button>
            : <button type="button" disabled={!authReady || authBusy || !isSupabaseConfigured()} onClick={() => { void login() }}>{authBusy ? '확인 중…' : 'Google 로그인'}</button>}
        </div>
        <p className="settings-note">{user ? '로그아웃해도 서버에 공유한 학습 사례는 유지되며, 다시 로그인하면 같은 계정으로 연결됩니다.' : 'Google 계정의 이름과 사진은 학습 사례에 공개하지 않습니다.'}</p>
        {sharingMessage && <p className="settings-note" aria-live="polite">{sharingMessage}</p>}
      </section>
      <p className="settings-credit">Parking Coach v1.0.0 · 훈이</p>
    </section>
  )
}
