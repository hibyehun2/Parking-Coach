import { ANONYMOUS_ALIAS_COMBINATIONS, createAnonymousAlias } from './anonymousAlias.ts'

export const ANONYMOUS_NICKNAME_KEY = 'parking-coach:anonymous-nickname'

function defaultStorage() {
  return typeof localStorage === 'undefined' ? null : localStorage
}

export function createRandomAnonymousNickname(
  current = '',
  random: () => number = Math.random,
) {
  const rawIndex = Math.floor(random() * ANONYMOUS_ALIAS_COMBINATIONS)
  const safeIndex = Math.min(ANONYMOUS_ALIAS_COMBINATIONS - 1, Math.max(0, rawIndex))
  let nickname = createAnonymousAlias(safeIndex)
  if (nickname === current) nickname = createAnonymousAlias((safeIndex + 1) % ANONYMOUS_ALIAS_COMBINATIONS)
  return nickname
}

export function loadAnonymousNickname(
  storage: Storage | null = defaultStorage(),
  random: () => number = Math.random,
) {
  const stored = storage?.getItem(ANONYMOUS_NICKNAME_KEY)?.trim()
  if (stored) return stored
  const nickname = createRandomAnonymousNickname('', random)
  storage?.setItem(ANONYMOUS_NICKNAME_KEY, nickname)
  return nickname
}

export function refreshAnonymousNickname(
  storage: Storage | null = defaultStorage(),
  random: () => number = Math.random,
) {
  const current = storage?.getItem(ANONYMOUS_NICKNAME_KEY)?.trim() ?? ''
  const nickname = createRandomAnonymousNickname(current, random)
  storage?.setItem(ANONYMOUS_NICKNAME_KEY, nickname)
  return nickname
}
