import { useState } from 'react'
import { useGovernanceStore } from '../store/useGovernanceStore'

export default function Settings() {
    const { settings, updateSettings } = useGovernanceStore()

    // Local state for editing
    const [loggingMode, setLoggingMode] = useState(settings.loggingMode)
    const [spLogListName, setSpLogListName] = useState(settings.spLogListName)

    // Setup state
    const [isSettingUp, setIsSettingUp] = useState(false)
    const [setupSuccess, setSetupSuccess] = useState<string | null>(null)
    const [setupError, setSetupError] = useState<string | null>(null)
    const [listUrl, setListUrl] = useState<string | null>(null)

    // Check if settings have changed
    const hasChanges = loggingMode !== settings.loggingMode || spLogListName !== settings.spLogListName

    const handleSave = async () => {
        setSetupSuccess(null)
        setSetupError(null)
        setListUrl(null)

        // Save settings
        updateSettings({ loggingMode, spLogListName })

        // If SharePoint mode, setup the list
        if (loggingMode === 'sharepoint') {
            try {
                setIsSettingUp(true)

                const manifest = useGovernanceStore.getState().manifest
                if (!manifest?.siteUrl) {
                    setSetupError('No manifest loaded. Please run an audit first to set the SharePoint site URL.')
                    setIsSettingUp(false)
                    return
                }

                const res = await fetch(`${(import.meta.env as any).VITE_API_URL}/api/logging/setup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        siteUrl: manifest.siteUrl,
                        listName: spLogListName
                    })
                })

                if (!res.ok) {
                    const error = await res.json()
                    throw new Error(error.error || 'Failed to setup list')
                }

                const result = await res.json()
                const listUrl = `${manifest.siteUrl}/Lists/${result.listName}`
                setSetupSuccess(`${result.message} - You can now fix items and logs will be written to SharePoint!`)
                setIsSettingUp(false)

                // Store the list URL for the link
                setListUrl(listUrl)

            } catch (err: any) {
                console.error('[Settings] Failed to setup SharePoint list:', err)
                setSetupError(err.message)
                setIsSettingUp(false)
            }
        } else {
            // Local mode - just show success
            setSetupSuccess('Settings saved successfully!')
        }
    }

    const handleReset = () => {
        setLoggingMode(settings.loggingMode)
        setSpLogListName(settings.spLogListName)
    }

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
                    onClick={() => setLoggingMode('local')}
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '14px',
                        padding: '16px',
                        borderRadius: '10px',
                        border: `1.5px solid ${loggingMode === 'local'
                            ? 'rgba(0,191,168,0.45)'
                            : 'var(--border)'}`,
                        background: loggingMode === 'local'
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
                        border: `2px solid ${loggingMode === 'local'
                            ? 'var(--cyan-text)'
                            : 'var(--border2)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '1px',
                        transition: 'border-color 0.2s'
                    }}>
                        {loggingMode === 'local' && (
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
                    onClick={() => setLoggingMode('sharepoint')}
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '14px',
                        padding: '16px',
                        borderRadius: '10px',
                        border: `1.5px solid ${loggingMode === 'sharepoint'
                            ? 'rgba(0,191,168,0.45)'
                            : 'var(--border)'}`,
                        background: loggingMode === 'sharepoint'
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
                        border: `2px solid ${loggingMode === 'sharepoint'
                            ? 'var(--cyan-text)'
                            : 'var(--border2)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '1px',
                        transition: 'border-color 0.2s'
                    }}>
                        {loggingMode === 'sharepoint' && (
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
                            marginBottom: loggingMode === 'sharepoint' ? '14px' : '0'
                        }}>
                            Each fix is posted to a SharePoint list in your tenant.
                            The list will be created automatically if it doesn't exist.
                        </div>

                        {/* List name input — only shown when SP selected */}
                        {loggingMode === 'sharepoint' && (
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
                                    value={spLogListName}
                                    onChange={e => setSpLogListName(e.target.value)}
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

                {/* Success/Error Messages - Always visible */}
                {(setupSuccess || setupError || isSettingUp) && (
                    <div style={{ marginTop: '20px' }}>
                        {/* Loading Animation */}
                        {isSettingUp && (
                            <div style={{
                                padding: '12px 16px',
                                borderRadius: '8px',
                                background: 'rgba(0,191,168,0.08)',
                                border: '1px solid rgba(0,191,168,0.22)',
                                color: 'var(--cyan-text)',
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                {/* Spinning loader */}
                                <div style={{
                                    width: '16px',
                                    height: '16px',
                                    border: '2px solid rgba(0,191,168,0.2)',
                                    borderTop: '2px solid var(--cyan-text)',
                                    borderRadius: '50%',
                                    animation: 'spin 0.8s linear infinite',
                                    flexShrink: 0
                                }} />
                                <span>Creating SharePoint list and fields...</span>
                                <style>{`
                                    @keyframes spin {
                                        0% { transform: rotate(0deg); }
                                        100% { transform: rotate(360deg); }
                                    }
                                `}</style>
                            </div>
                        )}

                        {/* Success Message */}
                        {setupSuccess && !isSettingUp && (
                            <div style={{
                                padding: '12px 16px',
                                borderRadius: '8px',
                                background: 'rgba(0,166,122,0.08)',
                                border: '1px solid rgba(0,166,122,0.22)',
                                color: 'var(--green)',
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '8px'
                            }}>
                                <span style={{ marginTop: '2px' }}>✓</span>
                                <div style={{ flex: 1 }}>
                                    <div>{setupSuccess}</div>
                                    {listUrl && (
                                        <a
                                            href={listUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                color: 'var(--green)',
                                                textDecoration: 'underline',
                                                marginTop: '6px',
                                                display: 'inline-block',
                                                fontFamily: 'DM Mono, monospace',
                                                fontSize: '12px'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.textDecoration = 'none'}
                                            onMouseLeave={e => e.currentTarget.style.textDecoration = 'underline'}
                                        >
                                            → Open list in SharePoint
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Error Message */}
                        {setupError && !isSettingUp && (
                            <div style={{
                                padding: '12px 16px',
                                borderRadius: '8px',
                                background: 'rgba(232,0,90,0.08)',
                                border: '1px solid rgba(232,0,90,0.22)',
                                color: 'var(--pink)',
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <span>✕</span>
                                <span>{setupError}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Save/Reset Buttons */}
                {hasChanges && (
                    <div style={{
                        marginTop: '20px',
                        paddingTop: '20px',
                        borderTop: '1px solid var(--border)',
                    }}>
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            justifyContent: 'flex-end'
                        }}>
                            <button
                                onClick={handleReset}
                                disabled={isSettingUp}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    background: 'transparent',
                                    color: 'var(--text2)',
                                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: isSettingUp ? 'not-allowed' : 'pointer',
                                    opacity: isSettingUp ? 0.5 : 1,
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => {
                                    if (!isSettingUp) {
                                        e.currentTarget.style.background = 'var(--border)'
                                        e.currentTarget.style.color = 'var(--text)'
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!isSettingUp) {
                                        e.currentTarget.style.background = 'transparent'
                                        e.currentTarget.style.color = 'var(--text2)'
                                    }
                                }}
                            >
                                Reset
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSettingUp}
                                style={{
                                    padding: '10px 24px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: isSettingUp
                                        ? 'var(--border)'
                                        : 'linear-gradient(135deg, var(--cyan-text), var(--green))',
                                    color: 'white',
                                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: isSettingUp ? 'not-allowed' : 'pointer',
                                    boxShadow: isSettingUp ? 'none' : '0 4px 12px rgba(0,220,200,0.3)',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => {
                                    if (!isSettingUp) {
                                        e.currentTarget.style.transform = 'translateY(-1px)'
                                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,220,200,0.4)'
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!isSettingUp) {
                                        e.currentTarget.style.transform = 'translateY(0)'
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,220,200,0.3)'
                                    }
                                }}
                            >
                                {isSettingUp ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{
                                            width: '14px',
                                            height: '14px',
                                            border: '2px solid rgba(255,255,255,0.3)',
                                            borderTop: '2px solid white',
                                            borderRadius: '50%',
                                            animation: 'spin 0.8s linear infinite'
                                        }} />
                                        Setting up...
                                    </span>
                                ) : '💾 Save Changes'}
                            </button>
                        </div>
                    </div>
                )}
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
                        ['Logging', settings.loggingMode === 'sharepoint'
                            ? `SharePoint List (${settings.spLogListName})`
                            : 'Local (mg-remediation-log)'],
                        ['Settings key', 'mg-settings (localStorage)'],
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