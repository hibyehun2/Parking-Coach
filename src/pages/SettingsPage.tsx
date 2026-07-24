import { useState } from 'react'
import { AnimalAvatar } from '../components/AnimalAvatar'
import { loadPracticeHistory, markAllPracticeSharesPrivate, queueBookmarkedSessionsForSharing } from '../engine/practiceHistory'
import { configuredPracticeSharingGateway, syncPracticeSharing, unpublishAllPracticeCases } from '../engine/practiceSharing'
import { acceptPracticeAutoShareConsent, hasPracticeAutoShareConsent, loadAnonymousNickname, refreshAnonymousNickname, revokePracticeAutoShareConsent } from '../engine/userPreferences'

export function SettingsPage() {
  const [nickname, setNickname] = useState(loadAnonymousNickname)
  const [changed, setChanged] = useState(false)
  const [autoShareEnabled, setAutoShareEnabled] = useState(hasPracticeAutoShareConsent)
  const [privateBookmarkCount, setPrivateBookmarkCount] = useState(() => loadPracticeHistory().sessions.filter((session) => session.bookmarked && session.shareStatus === 'private').length)
  const [sharingMessage, setSharingMessage] = useState('')

  const refreshNickname = () => {
    if (!window.confirm('공개 닉네임을 바꾸면 이미 공개한 모든 학습 사례에도 새 닉네임이 표시됩니다. 바꿀까요?')) return
    const nextNickname = refreshAnonymousNickname()
    setNickname(nextNickname)
    setChanged(true)
    if (configuredPracticeSharingGateway) {
      void configuredPracticeSharingGateway.updateNickname(nextNickname)
        .then(() => setSharingMessage('공개 사례의 닉네임도 변경했습니다.'))
        .catch(() => setSharingMessage('닉네임은 저장했으며 서버 연결 후 공개 사례에 다시 반영해야 합니다.'))
    }
  }
  const enableAutoShare = async () => {
    const message = privateBookmarkCount
      ? `기존에 비공개로 보관한 기록 ${privateBookmarkCount}개도 공유 대기 상태로 전환하고, 앞으로 보관하는 기록을 자동 공유할까요?`
      : '앞으로 보관하는 기록을 공개 닉네임으로 자동 공유할까요?'
    if (!window.confirm(message)) return
    acceptPracticeAutoShareConsent()
    const queued = queueBookmarkedSessionsForSharing()
    setAutoShareEnabled(true)
    setPrivateBookmarkCount(0)
    if (configuredPracticeSharingGateway) {
      const synced = await syncPracticeSharing(queued, nickname, configuredPracticeSharingGateway)
      setSharingMessage(synced.sessions.some((session) => session.shareStatus === 'publish-failed' || session.shareStatus === 'unpublish-failed')
        ? '일부 사례를 전송하지 못했습니다. 보관 기록에서 상태를 확인해주세요.'
        : '보관한 기록을 학습 사례로 공유했습니다.')
    }
  }
  const disableAutoShare = async () => {
    if (!window.confirm('자동 공유를 끄고 공개한 모든 학습 사례를 삭제할까요? 보관 기록은 비공개로 유지됩니다.')) return
    const history = loadPracticeHistory()
    const needsServerDelete = history.sessions.some((session) => session.publicCaseId || session.shareStatus === 'shared' || session.shareStatus === 'unpublishing' || session.shareStatus === 'unpublish-failed')
    if (needsServerDelete) {
      if (!configuredPracticeSharingGateway) {
        setSharingMessage('공개 사례를 삭제할 수 없어 자동 공유를 유지했습니다. 서버 연결을 확인해주세요.')
        return
      }
      try {
        await unpublishAllPracticeCases(configuredPracticeSharingGateway)
      } catch {
        setSharingMessage('공개 사례 삭제를 확인하지 못해 자동 공유를 유지했습니다. 잠시 후 다시 시도해주세요.')
        return
      }
    }
    markAllPracticeSharesPrivate()
    revokePracticeAutoShareConsent()
    setAutoShareEnabled(false)
    setPrivateBookmarkCount(history.sessions.filter((session) => session.bookmarked).length)
    setSharingMessage('자동 공유를 끄고 보관 기록을 비공개로 전환했습니다.')
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
        <header><span>학습 사례</span><h2 id="sharing-settings-title">보관 기록 자동 공유</h2></header>
        <div className="settings-account-row">
          <div>
            <strong>{autoShareEnabled ? '자동 공유 사용 중' : '최초 동의 필요'}</strong>
            <small>{autoShareEnabled ? '새로 보관한 기록은 공개 닉네임으로 공유 대기열에 추가됩니다.' : '동의하기 전에는 기존 보관 기록과 새 기록을 공개하지 않습니다.'}</small>
          </div>
          {autoShareEnabled
            ? <button type="button" onClick={() => { void disableAutoShare() }}>자동 공유 끄기</button>
            : <button type="button" onClick={() => { void enableAutoShare() }}>자동 공유 켜기</button>}
        </div>
        {privateBookmarkCount > 0 && <p className="settings-note">기존 비공개 보관 기록 {privateBookmarkCount}개가 있습니다. 자동 공유를 켤 때 함께 전환할 수 있습니다.</p>}
        {autoShareEnabled && <p className="settings-note">{configuredPracticeSharingGateway ? '보관한 기록은 연결된 학습 사례 서버와 자동으로 동기화됩니다.' : '현재는 백엔드 연결 전 단계이므로 안전하게 전송 대기 상태로 저장됩니다. 연결 후 자동으로 동기화됩니다.'}</p>}
        {sharingMessage && <p className="settings-note" aria-live="polite">{sharingMessage}</p>}
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
