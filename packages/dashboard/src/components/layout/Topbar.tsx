import { useRef } from 'react'
import { useGovernanceStore, LibraryProgress } from '../../store/useGovernanceStore'

export default function Topbar() {
    const { theme, toggleTheme, manifest, loadManifest, clearManifest } = useGovernanceStore()
    const reauditStatus = useGovernanceStore(s => s.reauditStatus)
    const reauditError = useGovernanceStore(s => s.reauditError)
    const reauditedAt = useGovernanceStore(s => s.reauditedAt)
    const libraryProgress = useGovernanceStore(s => s.libraryProgress)
    const triggerReaudit = useGovernanceStore(s => s.triggerReaudit)
    const inputRef = useRef<HTMLInputElement>(null)

    const isRunning = reauditStatus === 'running'
    const isDone = reauditStatus === 'done'
    const isError = reauditStatus === 'error'

    const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) loadManifest(file)
        e.target.value = ''
    }

    // Determine what to show below the site URL
    const showProgress = isRunning && libraryProgress.length > 0
    const subtitle = !manifest ? null
        : isError ? `Re-audit failed — ${reauditError}`
            : isDone ? `Verified ${new Date(reauditedAt!).toLocaleString()}`
                : `Audited ${new Date(manifest.generatedAt).toLocaleString()}`

    const subtitleColor = isError ? 'var(--pink)' : isRunning ? 'var(--cyan-text)' : 'var(--text3)'

    return (
        <>
            {/* Progress bar — lives ABOVE the header, full bleed */}
            <div style={{
                height: '3px',
                background: 'var(--border3)',
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0,
            }}>
                {isRunning && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(90deg, transparent 0%, var(--cyan) 40%, var(--cyan-l) 50%, var(--cyan) 60%, transparent 100%)',
                        animation: 'scanLine 1.6s cubic-bezier(0.4,0,0.6,1) infinite',
                    }} />
                )}
                {isDone && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(90deg, var(--green), var(--cyan))',
                        animation: 'progressFill 0.5s ease forwards',
                    }} />
                )}
                {isError && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'var(--pink)',
                        opacity: 0.6,
                    }} />
                )}
            </div>

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
                transition: 'background 0.35s, border-color 0.35s',
            }}>

                {/* Left — tenant info */}
                <div>
                    <div style={{
                        fontFamily: 'DM Mono, monospace',
                        fontSize: '9px',
                        color: 'var(--text3)',
                        letterSpacing: '2px',
                        textTransform: 'uppercase',
                        marginBottom: '2px',
                    }}>
                        // Governance Suite
                    </div>
                    <div style={{
                        fontFamily: 'Plus Jakarta Sans, sans-serif',
                        fontSize: '15px',
                        fontWeight: 800,
                        color: 'var(--text)',
                        letterSpacing: '-0.3px',
                    }}>
                        {manifest
                            ? manifest.siteUrl.replace('https://', '')
                            : 'No manifest loaded'
                        }
                    </div>
                    {showProgress ? (
                        <div style={{
                            marginTop: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            maxWidth: '400px',
                        }}>
                            <div style={{
                                fontFamily: 'DM Mono, monospace',
                                fontSize: '10px',
                                color: 'var(--cyan-text)',
                                marginBottom: '2px',
                            }}>
                                Scanning libraries...
                            </div>
                            {libraryProgress.map((lib, idx) => (
                                <div
                                    key={lib.libraryName}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontFamily: 'DM Mono, monospace',
                                        fontSize: '9px',
                                        color: lib.status === 'complete' ? 'var(--text3)'
                                            : lib.status === 'scanning' ? 'var(--cyan-text)'
                                                : 'var(--text3)',
                                        opacity: lib.status === 'complete' ? 0.6
                                            : lib.status === 'scanning' ? 1
                                                : 0.4,
                                        transition: 'all 0.3s',
                                    }}
                                >
                                    {lib.status === 'complete' ? (
                                        <span style={{
                                            fontSize: '10px',
                                            color: 'var(--green)',
                                            animation: 'popIn 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                                        }}>✓</span>
                                    ) : lib.status === 'scanning' ? (
                                        <span style={{
                                            display: 'inline-block',
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            border: '1px solid var(--cyan)',
                                            borderTopColor: 'transparent',
                                            animation: 'spin 0.6s linear infinite',
                                        }} />
                                    ) : (
                                        <span style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            background: 'var(--border2)',
                                            display: 'inline-block',
                                        }} />
                                    )}
                                    <span style={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {lib.libraryName}
                                    </span>
                                    {lib.newItemsFound && lib.newItemsFound > 0 && (
                                        <span style={{
                                            padding: '1px 5px',
                                            borderRadius: '4px',
                                            background: 'rgba(232,0,90,0.1)',
                                            border: '1px solid rgba(232,0,90,0.25)',
                                            color: 'var(--pink)',
                                            fontSize: '8px',
                                            fontWeight: 600,
                                        }}>
                                            +{lib.newItemsFound}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : subtitle ? (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontFamily: 'DM Mono, monospace',
                            fontSize: '10px',
                            color: subtitleColor,
                            marginTop: '2px',
                            transition: 'color 0.3s',
                        }}>
                            {isDone && (
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '13px',
                                    height: '13px',
                                    borderRadius: '50%',
                                    background: 'rgba(0,166,122,0.15)',
                                    border: '1px solid rgba(0,166,122,0.4)',
                                    fontSize: '8px',
                                    color: 'var(--green)',
                                    flexShrink: 0,
                                    animation: 'popIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                                }}>✓</span>
                            )}
                            {isError && <span style={{ flexShrink: 0 }}>⚠</span>}
                            {subtitle}
                        </div>
                    ) : null}
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
                            color: 'var(--green)',
                        }}>
                            <span style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: 'var(--green-l)',
                                boxShadow: '0 0 6px var(--green-l)',
                                animation: 'blink 2s infinite',
                                display: 'inline-block',
                            }} />
                            LOADED
                        </div>
                    )}

                    {/* Refresh from SharePoint */}
                    {manifest && (
                        <button
                            onClick={() => triggerReaudit()}
                            disabled={isRunning}
                            title="Re-check all items against current SharePoint data"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '7px 14px',
                                borderRadius: '8px',
                                background: isRunning
                                    ? 'var(--card2)'
                                    : isDone
                                        ? 'rgba(0,166,122,0.08)'
                                        : isError
                                            ? 'rgba(232,0,90,0.06)'
                                            : 'rgba(0,191,168,0.07)',
                                border: isRunning
                                    ? '1px solid var(--border)'
                                    : isDone
                                        ? '1px solid rgba(0,166,122,0.3)'
                                        : isError
                                            ? '1px solid rgba(232,0,90,0.3)'
                                            : '1px solid rgba(0,191,168,0.3)',
                                color: isRunning
                                    ? 'var(--text3)'
                                    : isDone
                                        ? 'var(--green)'
                                        : isError
                                            ? 'var(--pink)'
                                            : 'var(--cyan-text)',
                                fontFamily: 'DM Mono, monospace',
                                fontSize: '10px',
                                fontWeight: 600,
                                cursor: isRunning ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {/* Icon */}
                            {isRunning ? (
                                <span style={{
                                    display: 'inline-block',
                                    width: '9px',
                                    height: '9px',
                                    borderRadius: '50%',
                                    border: '1.5px solid var(--text3)',
                                    borderTopColor: 'transparent',
                                    animation: 'spin 0.75s linear infinite',
                                }} />
                            ) : isDone ? (
                                <span style={{ fontSize: '11px' }}>✓</span>
                            ) : isError ? (
                                <span style={{ fontSize: '11px' }}>↻</span>
                            ) : (
                                <span style={{ fontSize: '12px' }}>↻</span>
                            )}
                            {isRunning ? 'Verifying…' : isError ? 'Retry' : 'Refresh'}
                        </button>
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
                            transition: 'all 0.3s',
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
                                    userSelect: 'none',
                                }}
                            >
                                {t === 'light' ? '☀ Light' : '◑ Dark'}
                            </div>
                        ))}
                    </div>

                    {/* Load / Eject */}
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

            {/* Re-audit Summary Toast */}
            <ReauditToast />
        </>
    )
}

// ─── Toast Component ──────────────────────────────────────────────────────────

function ReauditToast() {
    const showToast = useGovernanceStore(s => s.showReauditToast)
    const summary = useGovernanceStore(s => s.reauditSummary)
    const dismiss = useGovernanceStore(s => s.dismissReauditToast)

    if (!showToast || !summary) return null

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                zIndex: 100,
                animation: 'slideInRight 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            }}
        >
            <div
                style={{
                    background: 'var(--card)',
                    border: '1px solid rgba(0,166,122,0.3)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                    backdropFilter: 'blur(20px)',
                    minWidth: '280px',
                    maxWidth: '400px',
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}>
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: 'rgba(0,166,122,0.15)',
                            border: '1px solid rgba(0,166,122,0.4)',
                            fontSize: '11px',
                            color: 'var(--green)',
                        }}>✓</span>
                        <div style={{
                            fontFamily: 'Plus Jakarta Sans, sans-serif',
                            fontSize: '13px',
                            fontWeight: 700,
                            color: 'var(--text)',
                        }}>
                            Re-audit Complete
                        </div>
                    </div>
                    <button
                        onClick={dismiss}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text3)',
                            cursor: 'pointer',
                            fontSize: '16px',
                            padding: '0',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Summary */}
                <div style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: '11px',
                    color: 'var(--text2)',
                    lineHeight: 1.6,
                }}>
                    {summary.totalNewItems > 0 || summary.totalNewLibraries > 0 ? (
                        <>
                            {summary.totalNewItems > 0 && (
                                <>
                                    Found <span style={{
                                        color: 'var(--pink)',
                                        fontWeight: 600
                                    }}>{summary.totalNewItems} new item{summary.totalNewItems > 1 ? 's' : ''}</span>
                                    <br />
                                </>
                            )}
                            {summary.totalNewLibraries > 0 && (
                                <>
                                    Found <span style={{
                                        color: 'var(--cyan-text)',
                                        fontWeight: 600
                                    }}>{summary.totalNewLibraries} new librar{summary.totalNewLibraries > 1 ? 'ies' : 'y'}</span>
                                    <br />
                                </>
                            )}
                            Scanned {summary.librariesScanned} librar{summary.librariesScanned > 1 ? 'ies' : 'y'}
                        </>
                    ) : (
                        <>
                            All items up to date
                            <br />
                            Scanned {summary.librariesScanned} librar{summary.librariesScanned > 1 ? 'ies' : 'y'}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}