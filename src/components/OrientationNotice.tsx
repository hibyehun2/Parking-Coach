import { Link } from 'react-router-dom'

export function OrientationNotice() {
  return (
    <aside className="orientation-notice" aria-labelledby="orientation-title">
      <div className="rotate-phone" aria-hidden="true">
        <span />
      </div>
      <p className="eyebrow">화면 방향 안내</p>
      <h1 id="orientation-title">스마트폰을 가로로 돌려주세요.</h1>
      <p>더 넓은 화면에서 미러와 조작 장치를 정확하게 확인할 수 있어요.</p>
      <Link className="secondary-button" to="/">홈으로 돌아가기</Link>
    </aside>
  )
}
