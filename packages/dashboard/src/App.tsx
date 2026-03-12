import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
import ManifestLoader from './components/ManifestLoader'
import HealthDashboard from './pages/HealthDashboard'
import LibraryExplorer from './pages/LibraryExplorer'
import RemediationQueue from './pages/RemediationQueue'
import Settings from './pages/Settings'
import { useGovernanceStore } from './store/useGovernanceStore'
import FixPanel from './components/FixPanel'

export default function App() {
  const loadStatus = useGovernanceStore(s => s.loadStatus)
  const showLoader = loadStatus === 'idle' || loadStatus === 'loading' || loadStatus === 'error'

  return (
    <BrowserRouter>
      {/* Ambient background — always visible */}
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

      {/* Grid overlay — always visible */}
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

      {/* Loader — full screen, no shell */}
      {showLoader ? (
        <div style={{
          minHeight: '100vh',
          background: 'var(--bg)',
          position: 'relative',
          zIndex: 1,
          transition: 'background 0.35s ease',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Minimal topbar — theme toggle only */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '12px 24px',
            borderBottom: '1px solid var(--border)'
          }}>
            <ThemeToggle />
          </div>
          <ManifestLoader />
        </div>
      ) : (
        /* Full app shell — only after manifest loaded */
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
                <Route path="/" element={<HealthDashboard />} />
                <Route path="/libraries" element={<LibraryExplorer />} />
                <Route path="/queue" element={<RemediationQueue />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </main>
          </div>
          <FixPanel />
        </div>
      )}
    </BrowserRouter>
  )
}

// Extracted so it can be used in the minimal topbar above
function ThemeToggle() {
  const { theme, toggleTheme } = useGovernanceStore()
  return (
    <div
      onClick={toggleTheme}
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--card2)',
        border: '1.5px solid var(--border2)',
        borderRadius: '10px',
        padding: '3px',
        cursor: 'pointer',
        transition: 'all 0.3s'
      }}
    >
      {(['light', 'dark'] as const).map(t => (
        <div
          key={t}
          style={{
            padding: '5px 10px',
            borderRadius: '7px',
            fontFamily: 'DM Mono, monospace',
            fontSize: '10px',
            fontWeight: 500,
            letterSpacing: '0.5px',
            color: theme === t ? 'var(--cyan-text)' : 'var(--text3)',
            background: theme === t ? 'var(--card)' : 'transparent',
            boxShadow: theme === t ? '0 1px 6px rgba(0,0,0,0.12)' : 'none',
            border: theme === t ? '1px solid rgba(0,191,168,0.3)' : '1px solid transparent',
            transition: 'all 0.25s',
            userSelect: 'none'
          }}
        >
          {t === 'light' ? '☀ Light' : '◑ Dark'}
        </div>
      ))}
    </div>
  )
}