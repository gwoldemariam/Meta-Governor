// ─── Audit Progress Modal ─────────────────────────────────────────────────────
// Professional, catchy UI for full audit progress tracking

import { useEffect, useState } from 'react'

interface AuditProgressModalProps {
    isOpen: boolean
    jobId: string | null
    onComplete: (manifest: any) => void
    onClose: () => void
}

interface JobStatus {
    id: string
    status: 'queued' | 'running' | 'complete' | 'failed'
    progress: number
    message: string
    librariesTotal: number
    librariesScanned: number
    currentLibrary: string | null
    error: string | null
}

export default function AuditProgressModal({
    isOpen,
    jobId,
    onComplete,
    onClose,
}: AuditProgressModalProps) {
    const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
    const [isPolling, setIsPolling] = useState(false)

    useEffect(() => {
        if (!isOpen || !jobId) {
            setJobStatus(null)
            setIsPolling(false)
            return
        }

        setIsPolling(true)
        let pollInterval: NodeJS.Timeout

        const pollJob = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/audit/job/${jobId}`)
                if (!res.ok) throw new Error('Failed to fetch job status')

                const status: JobStatus = await res.json()
                setJobStatus(status)

                // If complete, fetch result and close
                if (status.status === 'complete') {
                    clearInterval(pollInterval)
                    setIsPolling(false)

                    // Fetch manifest
                    const resultRes = await fetch(`${import.meta.env.VITE_API_URL}/api/audit/job/${jobId}/result`)
                    if (resultRes.ok) {
                        const { manifest } = await resultRes.json()

                        // Small delay for celebration animation
                        setTimeout(() => {
                            onComplete(manifest)
                        }, 1500)
                    }
                }

                // If failed, stop polling
                if (status.status === 'failed') {
                    clearInterval(pollInterval)
                    setIsPolling(false)
                }
            } catch (err) {
                console.error('[AuditProgress] Poll error:', err)
            }
        }

        // Initial poll
        pollJob()

        // Poll every 2 seconds
        pollInterval = setInterval(pollJob, 2000)

        return () => clearInterval(pollInterval)
    }, [isOpen, jobId, onComplete])

    if (!isOpen || !jobStatus) return null

    const { status, progress, message, librariesTotal, librariesScanned, currentLibrary, error } = jobStatus

    return (
        <>
            {/* Backdrop */}
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 1000,
                    animation: 'fadeIn 0.3s ease-out',
                }}
                onClick={() => status === 'failed' && onClose()}
            />

            {/* Modal */}
            <div
                style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1001,
                    width: '90%',
                    maxWidth: '480px',
                    animation: 'modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
            >
                <div
                    style={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '20px',
                        padding: '32px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                    }}
                >
                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <div
                            style={{
                                fontFamily: 'Plus Jakarta Sans, sans-serif',
                                fontSize: '20px',
                                fontWeight: 800,
                                color: 'var(--text)',
                                marginBottom: '8px',
                            }}
                        >
                            {status === 'complete' ? '🎉 Audit Complete!' :
                                status === 'failed' ? '⚠️ Audit Failed' :
                                    '🔍 Scanning SharePoint'}
                        </div>
                        <div
                            style={{
                                fontFamily: 'DM Mono, monospace',
                                fontSize: '11px',
                                color: 'var(--text3)',
                            }}
                        >
                            {status === 'complete' ? 'Loading fresh data...' :
                                status === 'failed' ? error || 'Something went wrong' :
                                    message}
                        </div>
                    </div>

                    {/* Progress Ring */}
                    {status !== 'failed' && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                            <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
                                {/* Background circle */}
                                <circle
                                    cx="80"
                                    cy="80"
                                    r="70"
                                    fill="none"
                                    stroke="var(--bg-secondary)"
                                    strokeWidth="8"
                                />
                                {/* Progress circle */}
                                <circle
                                    cx="80"
                                    cy="80"
                                    r="70"
                                    fill="none"
                                    stroke={status === 'complete' ? 'var(--green)' : 'var(--cyan)'}
                                    strokeWidth="8"
                                    strokeDasharray={`${2 * Math.PI * 70}`}
                                    strokeDashoffset={`${2 * Math.PI * 70 * (1 - progress / 100)}`}
                                    strokeLinecap="round"
                                    style={{
                                        transition: 'stroke-dashoffset 0.5s ease-out, stroke 0.3s ease',
                                    }}
                                />
                                {/* Center text */}
                                <text
                                    x="80"
                                    y="80"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    style={{
                                        fontFamily: 'Plus Jakarta Sans, sans-serif',
                                        fontSize: '32px',
                                        fontWeight: 800,
                                        fill: 'var(--text)',
                                        transform: 'rotate(90deg)',
                                        transformOrigin: '80px 80px',
                                    }}
                                >
                                    {Math.round(progress)}%
                                </text>
                            </svg>
                        </div>
                    )}

                    {/* Library Progress */}
                    {status === 'running' && librariesTotal > 0 && (
                        <div
                            style={{
                                background: 'var(--bg-secondary)',
                                borderRadius: '12px',
                                padding: '16px',
                                marginBottom: '16px',
                            }}
                        >
                            <div
                                style={{
                                    fontFamily: 'DM Mono, monospace',
                                    fontSize: '10px',
                                    color: 'var(--text3)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    marginBottom: '12px',
                                }}
                            >
                                Libraries Scanned
                            </div>
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
                                    gap: '8px',
                                }}
                            >
                                {Array.from({ length: librariesTotal }).map((_, idx) => {
                                    const isScanned = idx < librariesScanned
                                    const isCurrent = idx === librariesScanned && currentLibrary

                                    return (
                                        <div
                                            key={idx}
                                            style={{
                                                height: '40px',
                                                borderRadius: '8px',
                                                background: isScanned ? 'var(--cyan)' :
                                                    isCurrent ? 'rgba(0,229,255,0.3)' :
                                                        'rgba(140,140,140,0.1)',
                                                border: isCurrent ? '2px solid var(--cyan)' : 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontFamily: 'DM Mono, monospace',
                                                fontSize: '10px',
                                                fontWeight: 600,
                                                color: isScanned ? 'var(--text-inverse)' : 'var(--text3)',
                                                transition: 'all 0.3s ease',
                                                animation: isCurrent ? 'pulse 1.5s infinite' : 'none',
                                            }}
                                        >
                                            {isScanned ? '✓' : idx + 1}
                                        </div>
                                    )
                                })}
                            </div>
                            {currentLibrary && (
                                <div
                                    style={{
                                        marginTop: '12px',
                                        fontFamily: 'DM Mono, monospace',
                                        fontSize: '11px',
                                        color: 'var(--cyan-text)',
                                        textAlign: 'center',
                                    }}
                                >
                                    📚 {currentLibrary}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Complete state */}
                    {status === 'complete' && (
                        <div style={{ textAlign: 'center', marginTop: '16px' }}>
                            <div
                                style={{
                                    display: 'inline-block',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    background: 'rgba(0,166,122,0.1)',
                                    border: '1px solid rgba(0,166,122,0.3)',
                                    fontFamily: 'DM Mono, monospace',
                                    fontSize: '11px',
                                    color: 'var(--green)',
                                    animation: 'fadeIn 0.5s ease-out',
                                }}
                            >
                                ✓ Manifest ready
                            </div>
                        </div>
                    )}

                    {/* Failed state */}
                    {status === 'failed' && (
                        <div style={{ textAlign: 'center' }}>
                            <button
                                onClick={onClose}
                                style={{
                                    background: 'var(--pink)',
                                    color: 'var(--text-inverse)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '10px 20px',
                                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Close
                            </button>
                        </div>
                    )}

                    {/* Footer info */}
                    {status === 'running' && (
                        <div
                            style={{
                                marginTop: '20px',
                                padding: '12px',
                                background: 'rgba(0,229,255,0.05)',
                                border: '1px solid rgba(0,229,255,0.1)',
                                borderRadius: '8px',
                                textAlign: 'center',
                            }}
                        >
                            <div
                                style={{
                                    fontFamily: 'DM Mono, monospace',
                                    fontSize: '10px',
                                    color: 'var(--text3)',
                                }}
                            >
                                💡 You can close this window - audit continues in background
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Animations */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes modalSlideIn {
                    from {
                        opacity: 0;
                        transform: translate(-50%, -45%);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, -50%);
                    }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.05); opacity: 0.8; }
                }
            `}</style>
        </>
    )
}