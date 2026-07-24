import { getAliasAnimal, getAliasAnimalIndex } from '../engine/anonymousAlias'

const ATLAS_COLUMNS = 6
const ATLAS_ROWS = 8
const AVATAR_ATLAS_URL = `${import.meta.env.BASE_URL}images/animal-avatar-atlas-v3.png`

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

  return <span
    className={`animal-avatar ${className}`.trim()}
    role="img"
    aria-label={`${animal} 캐릭터`}
    style={{
      backgroundImage: `url(${AVATAR_ATLAS_URL})`,
      backgroundSize: `${ATLAS_COLUMNS * 100}% ${ATLAS_ROWS * 100}%`,
      backgroundPosition: `${column / (ATLAS_COLUMNS - 1) * 100}% ${row / (ATLAS_ROWS - 1) * 100}%`,
    }}
  />
}
