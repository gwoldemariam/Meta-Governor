import { useRef } from 'react'
import { useGovernanceStore } from '../../store/useGovernanceStore'

export default function Topbar() {
    const { theme, toggleTheme, manifest, loadManifest, clearManifest } = useGovernanceStore()
    const inputRef = useRef<HTMLInputElement>(null)

    const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) loadManifest(file)
        e.target.value = ''
    }

    return (
        <header style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '13px 28px',
            background: theme === 'dark'
                ? 'rgba(13,21,40,0.92)'
                : 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--border)',
            position: 'sticky',
            top: 0,
            zIndex: 50,
            transition: 'background 0.35s, border-color 0.35s'
        }}>

            {/* Left — tenant info */}
            <div>
                <div style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: '9px',
                    color: 'var(--text3)',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    marginBottom: '2px'
                }}>
                    // Governance Suite
                </div>
                <div style={{
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontSize: '15px',
                    fontWeight: 800,
                    color: 'var(--text)',
                    letterSpacing: '-0.3px'
                }}>
                    {manifest
                        ? manifest.siteUrl.replace('https://', '')
                        : 'No manifest loaded'
                    }
                </div>
                {manifest && (
                    <div style={{
                        fontFamily: 'DM Mono, monospace',
                        fontSize: '10px',
                        color: 'var(--text3)',
                        marginTop: '2px',
                    }}>
                        audited {new Date(manifest.generatedAt).toLocaleString()}
                    </div>
                )}
            </div>

            {/* Right — controls */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>

                {/* LOADED badge */}
                {manifest && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 11px',
                        borderRadius: '8px',
                        background: 'rgba(0,166,122,0.08)',
                        border: '1px solid rgba(0,166,122,0.25)',
                        fontFamily: 'DM Mono, monospace',
                        fontSize: '10px',
                        color: 'var(--green)'
                    }}>
                        <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: 'var(--green-l)',
                            boxShadow: '0 0 6px var(--green-l)',
                            animation: 'blink 2s infinite',
                            display: 'inline-block'
                        }} />
                        LOADED
                    </div>
                )}

                {/* Theme toggle */}
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

                {/* Load / Swap manifest button */}
                {manifest ? (
                    <button
                        onClick={() => clearManifest()}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '7px',
                            padding: '8px 18px',
                            borderRadius: '10px',
                            background: 'rgba(232,0,90,0.06)',
                            border: '1.5px solid rgba(232,0,90,0.3)',
                            color: 'var(--pink)',
                            fontFamily: 'Plus Jakarta Sans, sans-serif',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.5px',
                            cursor: 'pointer',
                        }}
                    >
                        ✕ Eject
                    </button>
                ) : (
                    <>
                        <button
                            onClick={() => inputRef.current?.click()}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '7px',
                                padding: '8px 18px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, rgba(0,191,168,0.13), rgba(37,99,235,0.12))',
                                border: '1.5px solid rgba(0,191,168,0.45)',
                                color: 'var(--cyan-text)',
                                fontFamily: 'Plus Jakarta Sans, sans-serif',
                                fontSize: '11px',
                                fontWeight: 700,
                                letterSpacing: '0.5px',
                                cursor: 'pointer',
                            }}
                        >
                            ↑ Load Manifest
                        </button>
                        <input
                            ref={inputRef}
                            type="file"
                            accept=".json,application/json"
                            onChange={onFileInput}
                            style={{ display: 'none' }}
                        />
                    </>
                )}
            </div>
        </header>
    )
}