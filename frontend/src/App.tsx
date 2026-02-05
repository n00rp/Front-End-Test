import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { MainLayout } from './components/layout/MainLayout'
import LiveDashboard from './pages/LiveDashboard'
import SessionExplorer from './pages/SessionExplorer'
import LogAnalysis from './pages/LogAnalysis'
import Settings from './pages/Settings'

function App() {
    return (
        <Router>
            <MainLayout>
                <Routes>
                    <Route path="/" element={<LiveDashboard />} />
                    <Route path="/sessions" element={<SessionExplorer />} />
                    <Route path="/logs" element={<LogAnalysis />} />
                    <Route path="/settings" element={<Settings />} />
                </Routes>
            </MainLayout>
        </Router>
    )
}

export default App
