import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { HomePage } from './pages/HomePage'
import { ResultPage } from './pages/ResultPage'
import { SimulatorPage } from './pages/SimulatorPage'
import { PracticeSetupPage } from './pages/PracticeSetupPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="practice" element={<PracticeSetupPage />} />
        <Route path="practice/scenario" element={<Navigate to="/practice" replace />} />
        <Route path="practice/mode" element={<Navigate to="/practice" replace />} />
        <Route path="simulator" element={<SimulatorPage />} />
        <Route path="result" element={<ResultPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
