import { useCallback, useRef, useState } from 'react'
import { useGovernanceStore } from '../store/useGovernanceStore'

export default function ManifestLoader() {
    const { loadManifest, loadStatus, loadError, clearManifest } = useGovernanceStore()
    const inputRef = useRef<HTMLInputElement>(null)
    const [dragging, setDragging] = useState(false)

    const handleFile = useCallback((file: File) => {
        loadManifest(file)
    }, [loadManifest])

    const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
    }, [handleFile])

    const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setDragging(true)
    }, [])

    const onDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setDragging(true)
    }, [])

    const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setDragging(false)
    }, [])

    const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) handleFile(file)
        e.target.value = ''
    }, [handleFile])

    const isLoading = loadStatus === 'loading'
    const isError = loadStatus === 'error'

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            padding: '40px 24px',
        }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <div style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: '10px',
                    color: 'var(--text3)',
                    letterSpacing: '3px',
                    textTransform: 'uppercase',
                    marginBottom: '12px'
                }}>
                    // Meta-Governor
                </div>
                <div style={{
                    fontSize: '28px',
                    fontWeight: 800,
                    color: 'var(--text)',
                    letterSpacing: '-0.5px',
                    marginBottom: '8px'
                }}>
                    Load Audit Manifest
                </div>
                <div style={{
                    fontSize: '14px',
                    color: 'var(--text2)',
                    maxWidth: '400px',
                    lineHeight: 1.6
                }}>
                    Drop your{' '}
                    <code style={{
                        fontFamily: 'DM Mono, monospace',
                        fontSize: '12px',
                        background: 'var(--card2)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        color: 'var(--cyan-text)'
                    }}>
                        audit-manifest-*.json
                    </code>
                    {' '}file here to begin.
                </div>
            </div>

            {/* Drop zone */}
            <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragEnter={onDragEnter}
                onDragLeave={onDragLeave}
                onClick={() => !isLoading && inputRef.current?.click()}
                style={{
                    width: '100%',
                    maxWidth: '520px',
                    minHeight: '220px',
                    border: `2px dashed ${dragging ? 'var(--cyan-text)' :
                            isError ? 'var(--pink)' :
                                'var(--border2)'
                        }`,
                    borderRadius: '18px',
                    background: dragging
                        ? 'rgba(0,191,168,0.06)'
                        : isError
                            ? 'rgba(232,0,90,0.04)'
                            : 'var(--card)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '16px',
                    cursor: isLoading ? 'default' : 'pointer',
                    transition: 'all 0.25s ease',
                    padding: '40px 32px',
                    boxShadow: dragging
                        ? '0 0 0 4px rgba(0,191,168,0.12)'
                        : '0 4px 24px rgba(0,0,0,0.06)'
                }}
            >
                {isLoading ? (
                    <>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            border: '3px solid var(--border2)',
                            borderTop: '3px solid var(--cyan-text)',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite'
                        }} />
                        <div style={{
                            fontFamily: 'DM Mono, monospace',
                            fontSize: '12px',
                            color: 'var(--text2)',
                            letterSpacing: '1px'
                        }}>
                            Parsing manifest...
                        </div>
                    </>
                ) : (
                    <>
                        {/* Icon */}
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '14px',
                            background: dragging
                                ? 'rgba(0,191,168,0.15)'
                                : 'var(--card2)',
                            border: '1.5px solid var(--border2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            transition: 'all 0.25s'
                        }}>
                            {isError ? '⚠' : dragging ? '↓' : '⬡'}
                        </div>

                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                fontSize: '15px',
                                fontWeight: 600,
                                color: isError ? 'var(--pink)' : 'var(--text)',
                                marginBottom: '6px'
                            }}>
                                {isError
                                    ? 'Invalid manifest'
                                    : dragging
                                        ? 'Drop to load'
                                        : 'Drop JSON file here'
                                }
                            </div>
                            <div style={{
                                fontSize: '13px',
                                color: 'var(--text2)',
                                maxWidth: '320px'
                            }}>
                                {isError
                                    ? loadError
                                    : 'or click to browse your files'
                                }
                            </div>
                        </div>

                        {/* Browse button */}
                        <button
                            onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
                            style={{
                                padding: '9px 24px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, rgba(0,191,168,0.13), rgba(37,99,235,0.10))',
                                border: '1.5px solid rgba(0,191,168,0.4)',
                                color: 'var(--cyan-text)',
                                fontFamily: 'Plus Jakarta Sans, sans-serif',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                marginTop: '4px'
                            }}
                        >
                            Browse files
                        </button>

                        {/* Retry on error */}
                        {isError && (
                            <button
                                onClick={e => { e.stopPropagation(); clearManifest() }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text3)',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    fontFamily: 'Plus Jakarta Sans, sans-serif'
                                }}
                            >
                                Clear and try again
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* Command hint */}
            <div style={{
                marginTop: '28px',
                padding: '14px 20px',
                borderRadius: '10px',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                maxWidth: '520px',
                width: '100%'
            }}>
                <div style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: '10px',
                    color: 'var(--text3)',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    marginBottom: '8px'
                }}>
                    // Generate a manifest
                </div>
                <div style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: '12px',
                    color: 'var(--text2)',
                    lineHeight: 1.8
                }}>
                    npx ts-node --project packages/engine/tsconfig.json tests/run-audit.ts
                </div>
                <div style={{
                    fontSize: '12px',
                    color: 'var(--text3)',
                    marginTop: '8px'
                }}>
                    Output lands in{' '}
                    <code style={{
                        fontFamily: 'DM Mono, monospace',
                        background: 'var(--card2)',
                        padding: '1px 5px',
                        borderRadius: '3px'
                    }}>
                        packages/engine/reports/
                    </code>
                </div>
            </div>

            {/* Hidden file input */}
            <input
                ref={inputRef}
                type="file"
                accept=".json,application/json"
                onChange={onFileInput}
                style={{ display: 'none' }}
            />
        </div>
    )
}