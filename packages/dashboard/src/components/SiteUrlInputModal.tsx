import { useState } from 'react'

interface SiteUrlInputModalProps {
    onSubmit: (siteUrl: string) => void
    onCancel: () => void
}

export default function SiteUrlInputModal({ onSubmit, onCancel }: SiteUrlInputModalProps) {
    const [siteUrl, setSiteUrl] = useState('')
    const [error, setError] = useState<string | null>(null)

    const validateAndSubmit = () => {
        // Basic validation
        if (!siteUrl.trim()) {
            setError('Site URL is required')
            return
        }

        // Check if it's a valid SharePoint URL
        try {
            const url = new URL(siteUrl.trim())
            if (!url.hostname.includes('sharepoint.com')) {
                setError('Must be a valid SharePoint URL (e.g., https://contoso.sharepoint.com/sites/yoursite)')
                return
            }
        } catch {
            setError('Invalid URL format')
            return
        }

        // Submit
        onSubmit(siteUrl.trim())
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            validateAndSubmit()
        } else if (e.key === 'Escape') {
            onCancel()
        }
    }

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onCancel()
                }
            }}
        >
            <div
                style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
                    width: '90%',
                    maxWidth: '520px',
                    animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '24px 24px 20px',
                        borderBottom: '1px solid var(--border)',
                        background: 'linear-gradient(135deg, rgba(0,220,200,0.1) 0%, rgba(100,200,255,0.05) 100%)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--cyan-text), var(--green))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '18px',
                            }}
                        >
                            🔍
                        </div>
                        <div>
                            <div
                                style={{
                                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                                    fontSize: '16px',
                                    fontWeight: 700,
                                    color: 'var(--text)',
                                }}
                            >
                                Enter SharePoint Site URL
                            </div>
                            <div
                                style={{
                                    fontFamily: 'DM Mono, monospace',
                                    fontSize: '11px',
                                    color: 'var(--text3)',
                                    marginTop: '2px',
                                }}
                            >
                                Full site audit will discover all libraries and fields
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div style={{ padding: '24px' }}>
                    <div style={{ marginBottom: '16px' }}>
                        <label
                            style={{
                                display: 'block',
                                fontFamily: 'Plus Jakarta Sans, sans-serif',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: 'var(--text2)',
                                marginBottom: '8px',
                            }}
                        >
                            SharePoint Site URL
                        </label>
                        <input
                            type="text"
                            value={siteUrl}
                            onChange={(e) => {
                                setSiteUrl(e.target.value)
                                setError(null)
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="https://contoso.sharepoint.com/sites/yoursite"
                            autoFocus
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                border: error ? '1px solid var(--pink)' : '1px solid var(--border)',
                                background: 'var(--bg)',
                                color: 'var(--text)',
                                fontFamily: 'DM Mono, monospace',
                                fontSize: '13px',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                            }}
                            onFocus={(e) => {
                                if (!error) {
                                    e.target.style.borderColor = 'var(--cyan-text)'
                                }
                            }}
                            onBlur={(e) => {
                                if (!error) {
                                    e.target.style.borderColor = 'var(--border)'
                                }
                            }}
                        />
                        {error && (
                            <div
                                style={{
                                    marginTop: '8px',
                                    fontFamily: 'DM Mono, monospace',
                                    fontSize: '11px',
                                    color: 'var(--pink)',
                                }}
                            >
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Help Text */}
                    <div
                        style={{
                            padding: '12px',
                            background: 'rgba(0,220,200,0.05)',
                            border: '1px solid rgba(0,220,200,0.15)',
                            borderRadius: '8px',
                            fontFamily: 'DM Mono, monospace',
                            fontSize: '11px',
                            color: 'var(--text3)',
                            lineHeight: 1.6,
                        }}
                    >
                        <div style={{ fontWeight: 600, color: 'var(--text2)', marginBottom: '4px' }}>
                            💡 Example URLs:
                        </div>
                        <div>• https://contoso.sharepoint.com/sites/marketing</div>
                        <div>• https://contoso.sharepoint.com/sites/hr</div>
                        <div>• https://contoso-my.sharepoint.com/personal/user</div>
                    </div>
                </div>

                {/* Footer */}
                <div
                    style={{
                        padding: '16px 24px',
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '12px',
                    }}
                >
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            background: 'transparent',
                            color: 'var(--text2)',
                            fontFamily: 'Plus Jakarta Sans, sans-serif',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--border)'
                            e.currentTarget.style.color = 'var(--text)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.color = 'var(--text2)'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={validateAndSubmit}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'linear-gradient(135deg, var(--cyan-text), var(--green))',
                            color: 'white',
                            fontFamily: 'Plus Jakarta Sans, sans-serif',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(0,220,200,0.3)',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)'
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,220,200,0.4)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,220,200,0.3)'
                        }}
                    >
                        Start Audit
                    </button>
                </div>
            </div>

            <style>
                {`
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes slideUp {
                        from {
                            opacity: 0;
                            transform: translateY(20px) scale(0.95);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0) scale(1);
                        }
                    }
                `}
            </style>
        </div>
    )
}