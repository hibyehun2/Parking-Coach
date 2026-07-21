import { Link, useSearchParams } from 'react-router-dom'
import { OrientationNotice } from '../components/OrientationNotice'
import { VehicleSimulator } from '../components/simulator/VehicleSimulator'
import { getScenario } from '../data/scenarios'

export function SimulatorPage() {
  const [searchParams] = useSearchParams()
  const scenario = getScenario(searchParams.get('scenario'))
  const isPracticeMode = searchParams.get('mode') === 'practice'

  return (
    <>
      <OrientationNotice />
      <section className="page simulator-shell" aria-labelledby="simulator-title">
        <div className="simulator-heading">
          <div>
            <p className="eyebrow">{isPracticeMode ? '실전 모드' : '학습 모드'}</p>
            <h1 id="simulator-title">{scenario.title} 후진주차</h1>
          </div>
          <Link className="secondary-button" to="/">상황 다시 선택</Link>
        </div>
        <p className="page-description">
          브레이크를 해제하면 선택한 기어 방향으로 천천히 움직입니다. 충돌 판정은 아직 적용되지 않습니다.
        </p>
        <VehicleSimulator />
      </section>
    </>
  )
}
