import { useGovernanceStore } from '../store/useGovernanceStore'

export default function Settings() {
    const { settings, updateSettings } = useGovernanceStore()

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '640px' }}>

            {/* Page title */}
            <div>
                <div style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: '10px',
                    color: 'var(--text3)',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    marginBottom: '4px'
                }}>
                    // Configuration
                </div>
                <div style={{
                    fontSize: '22px',
                    fontWeight: 800,
                    color: 'var(--text)',
                    letterSpacing: '-0.4px'
                }}>
                    Settings
                </div>
                <div style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: '11px',
                    color: 'var(--text3)',
                    marginTop: '4px'
                }}>
                    Preferences are saved to your browser automatically.
                </div>
            </div>

            {/* Remediation Logging card */}
            <div style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '24px',
            }}>
                <div style={{
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontSize: '12px',
                    fontWeight: 800,
                    letterSpacing: '0.2px',
                    color: 'var(--cyan-text)',
                    textTransform: 'uppercase',
                    marginBottom: '4px'
                }}>
                    Remediation Logging
                </div>
                <div style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: '10px',
                    color: 'var(--text3)',
                    marginBottom: '20px'
                }}>
                    // Where to record field fixes made in the Fix Panel
                </div>

                {/* Option: Local */}
                <div
                    onClick={() => updateSettings({ loggingMode: 'local' })}
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '14px',
                        padding: '16px',
                        borderRadius: '10px',
                        border: `1.5px solid ${settings.loggingMode === 'local'
                            ? 'rgba(0,191,168,0.45)'
                            : 'var(--border)'}`,
                        background: settings.loggingMode === 'local'
                            ? 'rgba(0,191,168,0.05)'
                            : 'var(--card2)',
                        cursor: 'pointer',
                        marginBottom: '10px',
                        transition: 'all 0.2s'
                    }}
                >
                    {/* Radio dot */}
                    <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: `2px solid ${settings.loggingMode === 'local'
                            ? 'var(--cyan-text)'
                            : 'var(--border2)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '1px',
                        transition: 'border-color 0.2s'
                    }}>
                        {settings.loggingMode === 'local' && (
                            <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: 'var(--cyan-text)'
                            }} />
                        )}
                    </div>

                    <div>
                        <div style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: 'var(--text)',
                            marginBottom: '4px'
                        }}>
                            Browser Storage + Export
                        </div>
                        <div style={{
                            fontSize: '12px',
                            color: 'var(--text2)',
                            lineHeight: 1.6
                        }}>
                            Remediation log is saved in your browser. Use the Export button
                            in the Fix Panel to download as JSON or CSV at any time.
                        </div>
                    </div>
                </div>

                {/* Option: SharePoint */}
                <div
                    onClick={() => updateSettings({ loggingMode: 'sharepoint' })}
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '14px',
                        padding: '16px',
                        borderRadius: '10px',
                        border: `1.5px solid ${settings.loggingMode === 'sharepoint'
                            ? 'rgba(0,191,168,0.45)'
                            : 'var(--border)'}`,
                        background: settings.loggingMode === 'sharepoint'
                            ? 'rgba(0,191,168,0.05)'
                            : 'var(--card2)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    {/* Radio dot */}
                    <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: `2px solid ${settings.loggingMode === 'sharepoint'
                            ? 'var(--cyan-text)'
                            : 'var(--border2)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '1px',
                        transition: 'border-color 0.2s'
                    }}>
                        {settings.loggingMode === 'sharepoint' && (
                            <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: 'var(--cyan-text)'
                            }} />
                        )}
                    </div>

                    <div style={{ flex: 1 }}>
                        <div style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: 'var(--text)',
                            marginBottom: '4px'
                        }}>
                            SharePoint List
                        </div>
                        <div style={{
                            fontSize: '12px',
                            color: 'var(--text2)',
                            lineHeight: 1.6,
                            marginBottom: settings.loggingMode === 'sharepoint' ? '14px' : '0'
                        }}>
                            Each fix is posted to a SharePoint list in your tenant.
                            The list will be created automatically if it doesn't exist.
                        </div>

                        {/* List name input — only shown when SP selected */}
                        {settings.loggingMode === 'sharepoint' && (
                            <div onClick={e => e.stopPropagation()}>
                                <div style={{
                                    fontFamily: 'DM Mono, monospace',
                                    fontSize: '10px',
                                    color: 'var(--text3)',
                                    letterSpacing: '1px',
                                    marginBottom: '6px'
                                }}>
                                    LIST NAME
                                </div>
                                <input
                                    value={settings.spLogListName}
                                    onChange={e => updateSettings({ spLogListName: e.target.value })}
                                    placeholder="GovernanceRemediationLog"
                                    style={{
                                        width: '100%',
                                        background: 'var(--card)',
                                        border: '1px solid var(--border2)',
                                        borderRadius: '8px',
                                        padding: '9px 12px',
                                        fontFamily: 'DM Mono, monospace',
                                        fontSize: '12px',
                                        color: 'var(--text)',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                        transition: 'border-color 0.2s, box-shadow 0.2s'
                                    }}
                                    onFocus={e => {
                                        e.currentTarget.style.borderColor = 'rgba(0,191,168,0.5)'
                                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,191,168,0.1)'
                                    }}
                                    onBlur={e => {
                                        e.currentTarget.style.borderColor = ''
                                        e.currentTarget.style.boxShadow = ''
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Manifest info card — read only */}
            <div style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '24px',
            }}>
                <div style={{
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontSize: '12px',
                    fontWeight: 800,
                    letterSpacing: '0.2px',
                    color: 'var(--cyan-text)',
                    textTransform: 'uppercase',
                    marginBottom: '4px'
                }}>
                    About
                </div>
                <div style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: '10px',
                    color: 'var(--text3)',
                    marginBottom: '16px'
                }}>
                    // Meta-Governor v1.0 · self-hosted
                </div>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}>
                    {[
                        ['Engine', 'Node.js + MSAL certificate auth'],
                        ['Dashboard', 'Vite + React + Zustand'],
                        ['Schema', 'v2.0'],
                        ['Logging key', 'mg-settings (localStorage)'],
                        ['Theme key', 'mg-theme (localStorage)'],
                    ].map(([k, v]) => (
                        <div key={k} style={{
                            display: 'flex',
                            gap: '12px',
                            fontSize: '12px',
                            fontFamily: 'DM Mono, monospace'
                        }}>
                            <span style={{ color: 'var(--text3)', minWidth: '110px' }}>{k}</span>
                            <span style={{ color: 'var(--text2)' }}>{v}</span>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    )
}