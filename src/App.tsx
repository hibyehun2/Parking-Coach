import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { HomePage } from './pages/HomePage'
import { ResultPage } from './pages/ResultPage'
import { SimulatorPage } from './pages/SimulatorPage'
import { ScenarioSelectionPage } from './pages/ScenarioSelectionPage'
import { ModeSelectionPage } from './pages/ModeSelectionPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="practice/scenario" element={<ScenarioSelectionPage />} />
        <Route path="practice/mode" element={<ModeSelectionPage />} />
        <Route path="simulator" element={<SimulatorPage />} />
        <Route path="result" element={<ResultPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
