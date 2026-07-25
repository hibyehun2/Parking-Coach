interface StartupLocation {
  pathname: string
  search: string
  hash: string
}

interface StartupHistory {
  replaceState(data: unknown, unused: string, url?: string | URL | null): void
}

interface StartupWindow {
  location: StartupLocation
  history: StartupHistory
}

export function resetStartupRouteToHome(target: StartupWindow) {
  const { pathname, search, hash } = target.location
  if (!hash || hash === '#/' || hash === '#') return false

  target.history.replaceState(null, '', `${pathname}${search}#/`)
  return true
}
