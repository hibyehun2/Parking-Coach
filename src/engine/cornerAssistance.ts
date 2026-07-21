import type { VehicleState } from './vehiclePhysics.ts'

export type CornerName = 'left-front' | 'right-front' | 'left-rear' | 'right-rear'

export function activeCorners(vehicle: VehicleState): [CornerName, CornerName] {
  const turningRight = vehicle.steeringAngle >= 0.08
  const turningLeft = vehicle.steeringAngle <= -0.08
  return vehicle.gear === 'R'
    ? turningRight ? ['left-front', 'right-rear'] : turningLeft ? ['right-front', 'left-rear'] : ['left-rear', 'right-rear']
    : turningRight ? ['left-front', 'right-front'] : turningLeft ? ['right-front', 'left-front'] : ['left-front', 'right-front']
}
