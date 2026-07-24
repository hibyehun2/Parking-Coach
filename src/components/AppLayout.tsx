import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AppInstallPrompt } from './AppInstallPrompt'
import { PwaUpdatePrompt } from './PwaUpdatePrompt'

const navigation = [
  { to: '/', label: '홈', icon: 'home', end: true },
  { to: '/practice', label: '연습', icon: 'practice', end: false },
  { to: '/result', label: '결과', icon: 'result', end: false },
  { to: '/settings', label: '설정', icon: 'settings', end: false },
]

function TabIcon({ name }: { name: string }) {
  if (name === 'home') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 10.5 8.5-7 8.5 7v9a1 1 0 0 1-1 1h-5v-6h-4v6h-5a1 1 0 0 1-1-1z" /></svg>
  }
  if (name === 'practice') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 8.5 7 5h10l1.5 3.5M4 11h16v7.5H4zM7 18.5v2M17 18.5v2" /><circle cx="7.5" cy="14.5" r="1" /><circle cx="16.5" cy="14.5" r="1" /></svg>
  }
  if (name === 'result') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h14v16H5zM8.5 9.5l2 2 4-4M8.5 15.5h7" /></svg>
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19 13.5v-3l-2-.7a7 7 0 0 0-.8-1.8l.9-1.9L15 4l-1.9.9a7 7 0 0 0-2.2 0L9 4 6.9 6.1 7.8 8a7 7 0 0 0-.8 1.8l-2 .7v3l2 .7a7 7 0 0 0 .8 1.8l-.9 1.9L9 20l1.9-.9a7 7 0 0 0 2.2 0l1.9.9 2.1-2.1-.9-1.9a7 7 0 0 0 .8-1.8z" /></svg>
}

export function AppLayout() {
  const { pathname } = useLocation()
  const showInstallPromptFromHome = () => {
    window.dispatchEvent(new Event('parking-coach:show-install-prompt'))
  }

  return (
    <div className="app-shell">
      <AppInstallPrompt />
      <PwaUpdatePrompt />
      <header className="site-header">
        <NavLink className="brand" to="/" aria-label="Parking Coach 홈" onClick={showInstallPromptFromHome}>
          <span className="brand-mark" aria-hidden="true">P</span>
          <span>Parking Coach</span>
        </NavLink>
        <nav className="primary-nav" aria-label="주요 메뉴">
          {navigation.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={to === '/' ? showInstallPromptFromHome : undefined}
              className={({ isActive }) => isActive ? 'active' : undefined}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
      <footer className="site-footer">
        <small>안전한 후진주차를 위한 단계별 연습</small>
      </footer>
      <nav className="mobile-tab-bar" aria-label="하단 메뉴">
        {navigation.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={to === '/' ? showInstallPromptFromHome : undefined}
            className={({ isActive }) => isActive || (to === '/practice' && pathname === '/simulator') ? 'active' : undefined}
          >
            <TabIcon name={icon} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
