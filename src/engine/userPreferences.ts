import { ANONYMOUS_ALIAS_COMBINATIONS, createAnonymousAlias } from './anonymousAlias.ts'

export const ANONYMOUS_NICKNAME_KEY = 'parking-coach:anonymous-nickname'
export const PRACTICE_AUTO_SHARE_CONSENT_KEY = 'parking-coach:practice-auto-share-consent:v1'
export const PRACTICE_AUTO_SHARE_CONSENT_VERSION = 1

export type PracticeAutoShareConsent = {
  version: typeof PRACTICE_AUTO_SHARE_CONSENT_VERSION
  acceptedAt: string
}

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

export function loadPracticeAutoShareConsent(storage: Storage | null = defaultStorage()): PracticeAutoShareConsent | null {
  if (!storage) return null
  try {
    const value = JSON.parse(storage.getItem(PRACTICE_AUTO_SHARE_CONSENT_KEY) ?? 'null') as { version?: unknown; acceptedAt?: unknown } | null
    return value?.version === PRACTICE_AUTO_SHARE_CONSENT_VERSION
      && typeof value.acceptedAt === 'string'
      && !Number.isNaN(Date.parse(value.acceptedAt))
      ? { version: PRACTICE_AUTO_SHARE_CONSENT_VERSION, acceptedAt: value.acceptedAt }
      : null
  } catch {
    return null
  }
}

export function hasPracticeAutoShareConsent(storage: Storage | null = defaultStorage()) {
  return loadPracticeAutoShareConsent(storage) !== null
}

export function acceptPracticeAutoShareConsent(
  storage: Storage | null = defaultStorage(),
  acceptedAt = new Date(),
) {
  storage?.setItem(PRACTICE_AUTO_SHARE_CONSENT_KEY, JSON.stringify({ version: PRACTICE_AUTO_SHARE_CONSENT_VERSION, acceptedAt: acceptedAt.toISOString() }))
  return true
}

export function revokePracticeAutoShareConsent(storage: Storage | null = defaultStorage()) {
  storage?.removeItem(PRACTICE_AUTO_SHARE_CONSENT_KEY)
}
