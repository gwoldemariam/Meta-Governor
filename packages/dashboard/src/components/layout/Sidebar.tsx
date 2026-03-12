import { NavLink } from 'react-router-dom'
import { useGovernanceStore } from '../../store/useGovernanceStore'

const navSections = [
    {
        label: 'Core',
        items: [
            { label: 'Health Overview', path: '/', icon: '◈' },
            { label: 'Library Explorer', path: '/libraries', icon: '◉' },
        ]
    },
    {
        label: 'Remediation',
        items: [
            { label: 'Remediation Queue', path: '/queue', icon: '⚠' },
        ]
    },
    {
        label: 'System',
        items: [
            { label: 'Settings', path: '/settings', icon: '⚙' },
        ]
    }
]

export default function Sidebar() {
    const manifest = useGovernanceStore(s => s.manifest)

    return (
        <aside style={{
            width: '248px',
            minHeight: '100vh',
            background: 'var(--card)',
            borderRight: '1px solid var(--border)',
            padding: '24px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflowY: 'auto',
            boxShadow: '3px 0 20px rgba(0,10,40,0.06)',
            transition: 'background 0.35s, border-color 0.35s',
            zIndex: 100
        }}>

            {/* Animated right edge glow */}
            <div style={{
                position: 'absolute', right: '-1px', top: 0, bottom: 0, width: '2px',
                background: 'linear-gradient(180deg, transparent 0%, var(--cyan-l) 35%, var(--blue-l) 70%, transparent 100%)',
                animation: 'sidebarGlow 4s ease-in-out infinite',
                pointerEvents: 'none'
            }} />

            {/* Logo */}
            <div style={{ padding: '4px 10px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '12px',
                        background: 'linear-gradient(135deg, rgba(0,191,168,0.15), rgba(37,99,235,0.15))',
                        border: '1.5px solid rgba(0,191,168,0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '18px', color: 'var(--cyan-text)',
                        boxShadow: '0 0 16px rgba(0,191,168,0.18)',
                        flexShrink: 0
                    }}>
                        ⬡
                    </div>
                    <div>
                        <div style={{
                            fontFamily: 'Plus Jakarta Sans, sans-serif',
                            fontSize: '14px', fontWeight: 800,
                            color: 'var(--text)', letterSpacing: '-0.3px'
                        }}>
                            META<span style={{ color: 'var(--cyan-text)' }}>-GOV</span>
                        </div>
                        <div style={{
                            fontFamily: 'DM Mono, monospace',
                            fontSize: '10px', color: 'var(--text3)',
                            letterSpacing: '1.5px', marginTop: '2px'
                        }}>
                            // v1.0 · self-hosted
                        </div>
                    </div>
                </div>
            </div>

            {/* Nav sections */}
            {navSections.map(section => (
                <div key={section.label} style={{ padding: '0 4px', marginBottom: '4px' }}>
                    <div style={{
                        fontFamily: 'DM Mono, monospace',
                        fontSize: '9px', fontWeight: 500,
                        letterSpacing: '2.5px', color: 'var(--text3)',
                        textTransform: 'uppercase',
                        padding: '8px 10px 4px'
                    }}>
                        {section.label}
                    </div>
                    {section.items.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            style={({ isActive }) => ({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '9px 10px',
                                borderRadius: '10px',
                                textDecoration: 'none',
                                fontSize: '13px',
                                fontWeight: 500,
                                marginBottom: '2px',
                                color: isActive ? 'var(--cyan-text)' : 'var(--text2)',
                                background: isActive
                                    ? 'linear-gradient(135deg, rgba(0,191,168,0.10), rgba(37,99,235,0.06))'
                                    : 'transparent',
                                border: isActive
                                    ? '1px solid rgba(0,191,168,0.30)'
                                    : '1px solid transparent',
                                position: 'relative',
                                overflow: 'hidden',
                                transition: 'all 0.2s'
                            })}
                        >
                            {({ isActive }) => (
                                <>
                                    {/* Active left bar */}
                                    {isActive && (
                                        <div style={{
                                            position: 'absolute', left: 0,
                                            top: '50%', transform: 'translateY(-50%)',
                                            width: '3px', height: '55%',
                                            background: 'var(--cyan-l)',
                                            borderRadius: '0 2px 2px 0',
                                            boxShadow: '0 0 8px rgba(0,229,208,0.5)'
                                        }} />
                                    )}
                                    {/* Nav icon box */}
                                    <div style={{
                                        width: '28px', height: '28px',
                                        borderRadius: '8px',
                                        display: 'flex', alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '14px',
                                        flexShrink: 0,
                                        background: isActive
                                            ? 'rgba(0,191,168,0.12)'
                                            : 'var(--card2)',
                                        border: isActive
                                            ? '1px solid rgba(0,191,168,0.25)'
                                            : '1px solid var(--border3)',
                                        transition: 'background 0.3s, border-color 0.3s'
                                    }}>
                                        {item.icon}
                                    </div>
                                    <span style={{
                                        overflow: 'hidden', textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap', flex: 1, minWidth: 0
                                    }}>
                                        {item.label}
                                    </span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            ))}

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Tenant card */}
            {manifest && (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(0,191,168,0.07), rgba(37,99,235,0.05))',
                    border: '1.5px solid rgba(0,191,168,0.22)',
                    borderRadius: '12px',
                    padding: '14px',
                    margin: '4px',
                    transition: 'background 0.3s, border-color 0.3s'
                }}>
                    <div style={{
                        fontFamily: 'DM Mono, monospace', fontSize: '9px',
                        color: 'var(--text3)', letterSpacing: '2px',
                        textTransform: 'uppercase', marginBottom: '5px'
                    }}>
                        Connected Tenant
                    </div>
                    <div style={{
                        fontSize: '11px', fontWeight: 600,
                        color: 'var(--cyan-text)', fontFamily: 'DM Mono, monospace',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                        {manifest.siteUrl.replace('https://', '')}
                    </div>
                    <div style={{ display: 'flex', gap: '14px', marginTop: '10px' }}>
                        {[
                            { val: manifest.summary.totalLibraries, lbl: 'Libraries' },
                            { val: manifest.summary.totalItems, lbl: 'Files' },
                            { val: `${manifest.summary.complianceRate}%`, lbl: 'Health' },
                        ].map(s => (
                            <div key={s.lbl} style={{ textAlign: 'center', flex: 1 }}>
                                <div style={{
                                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                                    fontSize: '15px', fontWeight: 800,
                                    color: 'var(--text)', letterSpacing: '-0.3px'
                                }}>
                                    {s.val}
                                </div>
                                <div style={{
                                    fontFamily: 'DM Mono, monospace',
                                    fontSize: '9px', color: 'var(--text3)',
                                    marginTop: '2px', letterSpacing: '1px'
                                }}>
                                    {s.lbl}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        marginTop: '10px', fontFamily: 'DM Mono, monospace',
                        fontSize: '10px', color: 'var(--green)'
                    }}>
                        <div style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: 'var(--green-l)',
                            boxShadow: '0 0 6px var(--green-l)',
                            animation: 'blink 2s infinite'
                        }} />
                        Manifest loaded
                    </div>
                </div>
            )}
        </aside>
    )
}