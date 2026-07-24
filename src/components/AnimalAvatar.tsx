import { getAliasAnimal, getAliasAnimalIndex } from '../engine/anonymousAlias'

const ATLAS_COLUMNS = 6
const ATLAS_ROWS = 8
const AVATAR_ATLAS_URL = `${import.meta.env.BASE_URL}images/animal-avatar-atlas-v2.jpg`
const SAFE_INSET = 0.05
const SAFE_CELL_SIZE = 1 - SAFE_INSET * 2

export function AnimalAvatar({
  nickname,
  className = '',
}: {
  nickname: string
  className?: string
}) {
  const index = getAliasAnimalIndex(nickname)
  const column = index % ATLAS_COLUMNS
  const row = Math.floor(index / ATLAS_COLUMNS)
  const animal = getAliasAnimal(nickname) ?? '동물'
  const cellScale = 1 / SAFE_CELL_SIZE

  return <span
    className={`animal-avatar ${className}`.trim()}
    role="img"
    aria-label={`${animal} 캐릭터`}
  >
    <img
      src={AVATAR_ATLAS_URL}
      alt=""
      aria-hidden="true"
      decoding="async"
      draggable="false"
      style={{
        width: `${ATLAS_COLUMNS * cellScale * 100}%`,
        height: `${ATLAS_ROWS * cellScale * 100}%`,
        left: `${-(column + SAFE_INSET) * cellScale * 100}%`,
        top: `${-(row + SAFE_INSET) * cellScale * 100}%`,
      }}
      onError={(event) => { event.currentTarget.hidden = true }}
    />
  </span>
}
