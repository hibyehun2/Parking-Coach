import { GearSelector } from '../controls/GearSelector'
import { SteeringWheel } from '../controls/SteeringWheel'
import { useVehicleSimulation } from '../../hooks/useVehicleSimulation'
import { ParkingLotCanvas } from './ParkingLotCanvas'

export function VehicleSimulator() {
  const {
    vehicle,
    braking,
    canShift,
    setSteeringAngle,
    setBraking,
    setGear,
    centerSteering,
    reset,
  } = useVehicleSimulation()

  return (
    <div className="vehicle-simulator">
      <ParkingLotCanvas vehicle={vehicle} />
      <div className="driving-console" aria-label="차량 운전 조작부">
        <SteeringWheel
          steeringAngle={vehicle.steeringAngle}
          onChange={setSteeringAngle}
          onCenter={centerSteering}
        />

        <div className="instrument-panel" aria-live="polite">
          <span className="dashboard-label">차량 상태</span>
          <div className="gear-display">{vehicle.gear}</div>
          <strong>{Math.abs(vehicle.speed).toFixed(1)} <small>m/s</small></strong>
          <span>{braking ? '브레이크 작동' : `${vehicle.gear === 'R' ? '후진' : '전진'} 크리프`}</span>
          <button type="button" className="reset-control" onClick={reset}>처음 위치</button>
        </div>

        <GearSelector
          gear={vehicle.gear}
          braking={braking}
          canShift={canShift}
          onChange={setGear}
          onBrakeChange={setBraking}
        />
      </div>
      <p className="driving-help">
        핸들을 손가락으로 원을 그리듯 돌리세요. 기어 패널의 정지를 탭한 뒤 기어를 선택하고, 정지 해제를 누르면 천천히 움직입니다.
      </p>
      <p className="keyboard-help">키보드: ←/A · →/D 조향, Space/S 브레이크, F 전진, R 후진, C 중앙</p>
    </div>
  )
}
