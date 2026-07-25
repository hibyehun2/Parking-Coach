import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { RequireAuth } from './components/RequireAuth'
import { HomePage } from './pages/HomePage'
import { ResultPage } from './pages/ResultPage'
import { SimulatorPage } from './pages/SimulatorPage'
import { PracticeSetupPage } from './pages/PracticeSetupPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="practice" element={<RequireAuth><PracticeSetupPage /></RequireAuth>} />
        <Route path="practice/scenario" element={<Navigate to="/practice" replace />} />
        <Route path="practice/mode" element={<Navigate to="/practice" replace />} />
        <Route path="simulator" element={<RequireAuth><SimulatorPage /></RequireAuth>} />
        <Route path="result" element={<RequireAuth><ResultPage /></RequireAuth>} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
