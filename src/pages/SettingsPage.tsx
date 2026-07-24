import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { AnimalAvatar } from '../components/AnimalAvatar'
import { configuredPracticeSharingGateway } from '../engine/practiceSharing'
import { hasPracticeAutoShareConsent, loadAnonymousNickname, refreshAnonymousNickname } from '../engine/userPreferences'
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
  const autoShareEnabled = hasPracticeAutoShareConsent()
  const [sharingMessage, setSharingMessage] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured())

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
    setSharingMessage('')
    try {
      await signInWithGoogle()
    } catch {
      setSharingMessage('Google 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.')
    }
  }
  const logout = async () => {
    if (!window.confirm('이 기기에서 로그아웃할까요? 보관한 공개 사례는 삭제되지 않습니다.')) return
    try {
      await signOutSupabase()
      setUser(null)
      setSharingMessage('이 기기에서 로그아웃했습니다.')
    } catch {
      setSharingMessage('로그아웃하지 못했습니다. 잠시 후 다시 시도해주세요.')
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
        <div className="settings-profile-row">
          <AnimalAvatar nickname={nickname} className="settings-avatar" />
          <div>
            <strong>{nickname}</strong>
          </div>
          <button type="button" aria-label="공개 닉네임 무작위 변경" title="공개 닉네임을 무작위로 변경합니다" onClick={refreshNickname}>변경</button>
        </div>
        <p className="settings-note" aria-live="polite">
          {changed ? '새 닉네임을 저장했으며 공개한 모든 사례에도 같은 이름이 사용됩니다.' : '공유에 동의한 모든 학습 사례에는 이 닉네임이 동일하게 표시됩니다.'}
        </p>
      </section>

      <section className="settings-group" aria-labelledby="sharing-settings-title">
        <header><span>학습 사례</span><h2 id="sharing-settings-title">보관 기록 공유 안내</h2></header>
        <div className="settings-account-row">
          <div>
            <strong>{autoShareEnabled ? '보관하면 학습 사례로 공유돼요' : '처음 보관할 때 공유 여부를 확인해요'}</strong>
            <small>{autoShareEnabled ? '책갈피로 추가한 기록은 공개 닉네임으로 공유되며, 책갈피를 해제하면 공개 중단을 요청합니다.' : '설정에서 별도로 켤 필요 없이, 기록을 처음 보관할 때 안내를 확인하고 동의할 수 있습니다.'}</small>
          </div>
          <span className={`share-status ${autoShareEnabled ? 'share-shared' : 'share-private'}`}>{autoShareEnabled ? '동의 완료' : '보관 시 확인'}</span>
        </div>
        <p className="settings-note">{autoShareEnabled
          ? configuredPracticeSharingGateway
            ? '보관한 기록은 연결된 학습 사례 서버와 동기화됩니다.'
            : '현재는 백엔드 연결 전 단계이므로 전송 대기 상태로 저장됩니다.'
          : '동의하기 전에는 어떤 보관 기록도 공개하지 않습니다.'}</p>
        {sharingMessage && <p className="settings-note" aria-live="polite">{sharingMessage}</p>}
      </section>

      <section className="settings-group" aria-labelledby="account-settings-title">
        <header><span>계정</span><h2 id="account-settings-title">로그인 및 보안</h2></header>
        <div className="settings-account-row">
          <div>
            <strong>{!authReady ? '로그인 상태 확인 중' : user ? 'Google 로그인됨' : '로그인하지 않음'}</strong>
            <small>{user?.email ?? (isSupabaseConfigured() ? 'Google 계정으로 연습 기록을 연결할 수 있습니다.' : 'Supabase 연결 정보가 필요합니다.')}</small>
          </div>
          {user
            ? <button type="button" onClick={() => { void logout() }}>로그아웃</button>
            : <button type="button" disabled={!authReady || !isSupabaseConfigured()} onClick={() => { void login() }}>Google 로그인</button>}
        </div>
        <p className="settings-note">{user ? '로그아웃해도 서버에 공유한 학습 사례는 유지되며, 다시 로그인하면 같은 계정으로 연결됩니다.' : 'Google 계정의 이름과 사진은 학습 사례에 공개하지 않습니다.'}</p>
      </section>

      <section className="settings-group settings-data-group" aria-labelledby="data-settings-title">
        <header><span>데이터</span><h2 id="data-settings-title">현재 저장 방식</h2></header>
        <div className="settings-info-row">
          <span aria-hidden="true">⌁</span>
          <div><strong>연습 기록은 이 기기에 저장</strong><small>동의해 보관한 학습 사례만 로그인한 계정으로 Supabase에 공유됩니다.</small></div>
        </div>
      </section>
    </section>
  )
}
