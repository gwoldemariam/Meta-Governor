import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
import HealthDashboard from './pages/HealthDashboard'
import LibraryExplorer from './pages/LibraryExplorer'
import RemediationQueue from './pages/RemediationQueue'
import Settings from './pages/Settings'

export default function App() {
    return (
        <BrowserRouter>
            {/* Ambient background — inherits theme via CSS vars */}
            <div style={{
                position: 'fixed',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 0,
                background: `
                    radial-gradient(ellipse 55% 40% at 80% 5%,  rgba(0,229,208,0.08) 0%, transparent 65%),
                    radial-gradient(ellipse 45% 35% at 5%  85%,  rgba(77,159,255,0.07) 0%, transparent 65%),
                    radial-gradient(ellipse 35% 30% at 95% 90%,  rgba(255,77,141,0.05) 0%, transparent 60%)
                `
            }} />

            {/* Faint grid overlay */}
            <div style={{
                position: 'fixed',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 0,
                backgroundImage: `
                    linear-gradient(rgba(100,140,255,0.04) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(100,140,255,0.04) 1px, transparent 1px)
                `,
                backgroundSize: '48px 48px'
            }} />

            {/* App shell */}
            <div style={{
                display: 'flex',
                minHeight: '100vh',
                background: 'var(--bg)',
                position: 'relative',
                zIndex: 1,
                transition: 'background 0.35s ease'
            }}>
                <Sidebar />

                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0,
                    overflow: 'hidden'
                }}>
                    <Topbar />

                    <main style={{
                        flex: 1,
                        padding: '24px 28px',
                        overflow: 'auto'
                    }}>
                        <Routes>
                            <Route path="/"          element={<HealthDashboard />} />
                            <Route path="/libraries" element={<LibraryExplorer />} />
                            <Route path="/queue"     element={<RemediationQueue />} />
                            <Route path="/settings"  element={<Settings />} />
                        </Routes>
                    </main>
                </div>
            </div>
        </BrowserRouter>
    )
}