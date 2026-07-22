import { Link } from 'react-router-dom'

export function OrientationNotice() {
  return (
    <aside className="orientation-notice" aria-labelledby="orientation-title">
      <div className="rotate-phone" aria-hidden="true">
        <span />
      </div>
      <p className="eyebrow">화면 방향 안내</p>
      <h1 id="orientation-title"><span>스마트폰을 가로로</span><span>돌려주세요.</span></h1>
      <p><span>더 넓은 화면에서</span><span>미러와 조작 장치를 정확하게 확인할 수 있어요.</span></p>
      <Link className="secondary-button" to="/">홈으로 돌아가기</Link>
    </aside>
  )
}
