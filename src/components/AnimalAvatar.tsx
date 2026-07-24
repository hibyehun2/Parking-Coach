import { getAliasAnimal, getAliasAnimalIndex } from '../engine/anonymousAlias'

function avatarImageUrl(index: number) {
  return `${import.meta.env.BASE_URL}images/animal-avatars/avatar-${String(index + 1).padStart(2, '0')}.jpg`
}

export function AnimalAvatar({
  nickname,
  className = '',
}: {
  nickname: string
  className?: string
}) {
  const index = getAliasAnimalIndex(nickname)
  const animal = getAliasAnimal(nickname) ?? '동물'

  return <span
    className={`animal-avatar ${className}`.trim()}
    role="img"
    aria-label={`${animal} 캐릭터`}
    data-fallback={animal.slice(0, 1)}
  >
    <img
      src={avatarImageUrl(index)}
      alt=""
      aria-hidden="true"
      width="256"
      height="256"
      loading="lazy"
      decoding="async"
      draggable="false"
      onError={(event) => { event.currentTarget.hidden = true }}
    />
  </span>
}
