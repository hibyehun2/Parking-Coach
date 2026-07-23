export const ANONYMOUS_ALIAS_ADJECTIVES = [
  '차분한', '신중한', '꼼꼼한', '침착한', '씩씩한', '영리한', '다정한', '명랑한',
  '든든한', '포근한', '반짝이는', '호기심 많은', '집중하는', '살뜰한', '느긋한', '재빠른',
  '상냥한', '용감한', '야무진', '부지런한', '기운찬', '유쾌한', '사려 깊은', '재치 있는',
  '산뜻한', '온화한', '믿음직한', '활기찬', '새침한', '수줍은', '엉뚱한', '말랑한',
  '복슬복슬한', '동글동글한', '반듯한', '아늑한', '싱그러운', '초롱초롱한', '느낌 좋은', '행복한',
  '미소 짓는', '한결같은', '여유로운', '섬세한', '당당한', '쾌활한', '꿈꾸는', '빛나는',
] as const

export const ANONYMOUS_ALIAS_ANIMALS = [
  '수달', '펭귄', '토끼', '미어캣', '다람쥐', '고슴도치', '판다', '비버',
  '쿼카', '거북이', '알파카', '카피바라', '라쿤', '햄스터', '친칠라', '해달',
  '북극곰', '레서판다', '코알라', '웜뱃', '사막여우', '물개', '돌고래', '벨루가',
  '참새', '오리', '병아리', '부엉이', '앵무새', '홍학', '키위새', '벌새',
  '고양이', '강아지', '아기 염소', '양', '조랑말', '라마', '기린', '코끼리',
  '너구리', '여우', '두더지', '청설모', '나무늘보', '마멋', '오소리', '매너티',
] as const

function aliasSeed(value: number | string) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.abs(Math.trunc(value))
  const text = String(value)
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function createAnonymousAlias(seed: number | string) {
  const value = aliasSeed(seed)
  const adjective = ANONYMOUS_ALIAS_ADJECTIVES[value % ANONYMOUS_ALIAS_ADJECTIVES.length]
  const animal = ANONYMOUS_ALIAS_ANIMALS[Math.floor(value / ANONYMOUS_ALIAS_ADJECTIVES.length) % ANONYMOUS_ALIAS_ANIMALS.length]
  return `${adjective} ${animal}`
}

export const ANONYMOUS_ALIAS_COMBINATIONS = ANONYMOUS_ALIAS_ADJECTIVES.length * ANONYMOUS_ALIAS_ANIMALS.length
