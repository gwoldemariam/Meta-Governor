import { NavLink } from 'react-router-dom'

const navItems = [
    { label: 'Health Overview', path: '/' },
    { label: 'Library Explorer', path: '/libraries' },
    { label: 'Remediation Queue', path: '/queue' },
    { label: 'Settings', path: '/settings' },
]

export default function Sidebar() {
    return (
        <aside style={{
            width: '248px',
            minHeight: '100vh',
            borderRight: '1px solid var(--border)',
            background: 'var(--card)',
            padding: '24px 14px',
            flexShrink: 0
        }}>
            <div style={{ marginBottom: '24px' }}>
                <span style={{
                    fontFamily: 'Plus Jakarta Sans',
                    fontWeight: 800,
                    fontSize: '14px',
                    color: 'var(--text)'
                }}>
                    META<span style={{ color: 'var(--cyan-text)' }}>-GOV</span>
                </span>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {navItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/'}
                        style={({ isActive }) => ({
                            display: 'block',
                            padding: '9px 12px',
                            borderRadius: '10px',
                            textDecoration: 'none',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: isActive ? 'var(--cyan-text)' : 'var(--text2)',
                            background: isActive
                                ? 'rgba(0,191,168,0.08)'
                                : 'transparent',
                            border: isActive
                                ? '1px solid rgba(0,191,168,0.25)'
                                : '1px solid transparent',
                            transition: 'all 0.2s'
                        })}
                    >
                        {item.label}
                    </NavLink>
                ))}
            </nav>
        </aside>
    )
}