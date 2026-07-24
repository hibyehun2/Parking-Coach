import { useState } from 'react'
import { ANONYMOUS_ALIAS_COMBINATIONS } from '../engine/anonymousAlias'
import { loadAnonymousNickname, refreshAnonymousNickname } from '../engine/userPreferences'

export function SettingsPage() {
  const [nickname, setNickname] = useState(loadAnonymousNickname)
  const [changed, setChanged] = useState(false)

  const refreshNickname = () => {
    if (!window.confirm('공개 닉네임을 바꾸면 이미 공개한 모든 학습 사례에도 새 닉네임이 표시됩니다. 바꿀까요?')) return
    setNickname(refreshAnonymousNickname())
    setChanged(true)
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
          <span className="settings-avatar" aria-hidden="true">{nickname.slice(-1)}</span>
          <div>
            <strong>{nickname}</strong>
            <small>{ANONYMOUS_ALIAS_COMBINATIONS.toLocaleString('ko-KR')}가지 조합에서 무작위로 정한 고정 닉네임이에요.</small>
          </div>
          <button type="button" onClick={refreshNickname}>무작위로 바꾸기</button>
        </div>
        <p className="settings-note" aria-live="polite">
          {changed ? '새 닉네임을 저장했으며 공개한 모든 사례에도 같은 이름이 사용됩니다.' : '공유에 동의한 모든 학습 사례에는 이 닉네임이 동일하게 표시됩니다.'}
        </p>
      </section>

      <section className="settings-group" aria-labelledby="account-settings-title">
        <header><span>계정</span><h2 id="account-settings-title">로그인 및 보안</h2></header>
        <div className="settings-account-row">
          <div><strong>로그인하지 않음</strong><small>로그인 기능을 준비하고 있습니다.</small></div>
          <button type="button" disabled title="로그인 기능이 연결되면 사용할 수 있습니다">로그아웃</button>
        </div>
        <p className="settings-note">로그인 기능이 추가되면 이곳에서 계정 상태를 확인하고 안전하게 로그아웃할 수 있습니다.</p>
      </section>

      <section className="settings-group settings-data-group" aria-labelledby="data-settings-title">
        <header><span>데이터</span><h2 id="data-settings-title">현재 저장 방식</h2></header>
        <div className="settings-info-row">
          <span aria-hidden="true">⌁</span>
          <div><strong>이 기기에 저장</strong><small>로그인 기능이 연결되기 전까지 연습 기록과 닉네임은 현재 기기에만 저장됩니다.</small></div>
        </div>
      </section>
    </section>
  )
}
