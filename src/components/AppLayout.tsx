import { NavLink, Outlet } from 'react-router-dom'
import { AppInstallPrompt } from './AppInstallPrompt'

const navigation = [
  { to: '/', label: '홈', end: true },
  { to: '/practice/scenario', label: '연습', end: false },
  { to: '/result', label: '결과', end: false },
]

export function AppLayout() {
  return (
    <div className="app-shell">
      <AppInstallPrompt />
      <header className="site-header">
        <NavLink className="brand" to="/" aria-label="Parking Coach 홈">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span>Parking Coach</span>
        </NavLink>
        <nav className="primary-nav" aria-label="주요 메뉴">
          {navigation.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
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
    </div>
  )
}
