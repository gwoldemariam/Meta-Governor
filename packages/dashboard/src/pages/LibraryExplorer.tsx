import { useState } from 'react'
import { useGovernanceStore } from '../store/useGovernanceStore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(status: string) {
    switch (status) {
        case 'governed': return { color: 'var(--green)', bg: 'rgba(0,166,122,0.08)', border: 'rgba(0,166,122,0.25)' }
        case 'violations': return { color: 'var(--pink)', bg: 'rgba(232,0,90,0.08)', border: 'rgba(232,0,90,0.22)' }
        case 'no-schema': return { color: 'var(--amber)', bg: 'rgba(196,138,0,0.08)', border: 'rgba(196,138,0,0.22)' }
        case 'empty': return { color: 'var(--text3)', bg: 'var(--card2)', border: 'var(--border)' }
        default: return { color: 'var(--text3)', bg: 'var(--card2)', border: 'var(--border)' }
    }
}

function statusLabel(status: string) {
    switch (status) {
        case 'governed': return 'Governed'
        case 'violations': return 'Violations'
        case 'no-schema': return 'Unmanaged'
        case 'empty': return 'Empty'
        default: return status
    }
}

function fieldTypeColor(type: string) {
    switch (type) {
        case 'TaxonomyFieldType':
        case 'TaxonomyFieldTypeMulti': return { color: 'var(--blue)', bg: 'rgba(37,99,235,0.07)', border: 'rgba(37,99,235,0.22)' }
        case 'Choice':
        case 'MultiChoice': return { color: 'var(--cyan-text)', bg: 'rgba(0,191,168,0.07)', border: 'rgba(0,191,168,0.22)' }
        case 'User':
        case 'UserMulti': return { color: 'var(--amber)', bg: 'rgba(196,138,0,0.07)', border: 'rgba(196,138,0,0.22)' }
        case 'DateTime': return { color: 'var(--green)', bg: 'rgba(0,166,122,0.07)', border: 'rgba(0,166,122,0.22)' }
        default: return { color: 'var(--text2)', bg: 'var(--card2)', border: 'var(--border)' }
    }
}

function NoManifest() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            padding: '80px 20px',
            textAlign: 'center',
        }}>
            <div style={{ fontSize: '36px', opacity: 0.4 }}>◈</div>
            <div style={{
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--text2)',
            }}>
                No manifest loaded
            </div>
            <div style={{
                fontFamily: 'DM Mono, monospace',
                fontSize: '11px',
                color: 'var(--text3)',
                maxWidth: '280px',
                lineHeight: 1.6,
            }}>
                Use the Load Manifest button in the top bar to get started.
            </div>
        </div>
    )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const c = statusColor(status)
    return (
        <span style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: '9px',
            fontWeight: 600,
            letterSpacing: '0.5px',
            padding: '3px 8px',
            borderRadius: '5px',
            whiteSpace: 'nowrap',
            background: c.bg,
            border: `1px solid ${c.border}`,
            color: c.color,
        }}>
            {statusLabel(status)}
        </span>
    )
}

function ItemStatusDot({ status }: { status: string }) {
    const color = status === 'Pass' ? 'var(--green)' : status === 'Fail' ? 'var(--pink)' : 'var(--text3)'
    return (
        <span style={{
            display: 'inline-block',
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
            marginTop: '1px',
        }} />
    )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LibraryExplorer() {
    const { manifest, setSelectedItem } = useGovernanceStore()
    const [selectedLib, setSelectedLib] = useState<string | null>(null)

    if (!manifest) return <NoManifest />

    const libraries = manifest.libraries
    const activeLib = libraries.find(l => l.libraryName === selectedLib) ?? libraries[0] ?? null

    // Auto-select first library if none selected
    const displayLib = activeLib

    const complianceRate = displayLib && displayLib.itemCount > 0
        ? Math.round(((displayLib.passCount) / displayLib.itemCount) * 100)
        : null

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Page heading */}
            <div>
                <div style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: '10px',
                    color: 'var(--text3)',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                }}>
                    // Explorer
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.4px' }}>
                    Library Explorer
                </div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>
                    {libraries.length} libraries · select one to inspect schema and items
                </div>
            </div>

            {/* Main layout */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>

                {/* Left: library list */}
                <div style={{
                    width: '240px',
                    flexShrink: 0,
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid var(--border)',
                    }}>
                        <div style={{
                            fontFamily: 'Plus Jakarta Sans, sans-serif',
                            fontSize: '11px',
                            fontWeight: 800,
                            color: 'var(--cyan-text)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.2px',
                        }}>
                            Libraries
                        </div>
                    </div>

                    {libraries.map(lib => {
                        const isActive = (selectedLib ?? libraries[0]?.libraryName) === lib.libraryName
                        const c = statusColor(lib.schemaStatus)
                        return (
                            <div
                                key={lib.libraryName}
                                onClick={() => setSelectedLib(lib.libraryName)}
                                style={{
                                    padding: '12px 16px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid var(--border3)',
                                    background: isActive ? 'rgba(0,191,168,0.05)' : 'transparent',
                                    borderLeft: isActive ? '3px solid var(--cyan-text)' : '3px solid transparent',
                                    transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => {
                                    if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,191,168,0.03)'
                                }}
                                onMouseLeave={e => {
                                    if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                                }}
                            >
                                <div style={{
                                    fontSize: '12px',
                                    fontWeight: isActive ? 700 : 500,
                                    color: isActive ? 'var(--text)' : 'var(--text2)',
                                    marginBottom: '5px',
                                    wordBreak: 'break-word',
                                    lineHeight: 1.3,
                                }}>
                                    {lib.libraryName}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <StatusBadge status={lib.schemaStatus} />
                                    {lib.itemCount > 0 && (
                                        <span style={{
                                            fontFamily: 'DM Mono, monospace',
                                            fontSize: '9px',
                                            color: 'var(--text3)',
                                        }}>
                                            {lib.itemCount} items
                                        </span>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Right: library detail */}
                {displayLib ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>

                        {/* Library header card */}
                        <div style={{
                            background: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderRadius: '14px',
                            padding: '20px 22px',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>
                                        {displayLib.libraryName}
                                    </div>
                                    <div style={{
                                        fontFamily: 'DM Mono, monospace',
                                        fontSize: '10px',
                                        color: 'var(--text3)',
                                        wordBreak: 'break-all',
                                    }}>
                                        {displayLib.serverRelativeUrl}
                                    </div>
                                </div>
                                <StatusBadge status={displayLib.schemaStatus} />
                            </div>

                            {/* Stats row */}
                            <div style={{
                                display: 'flex',
                                gap: '24px',
                                marginTop: '16px',
                                paddingTop: '14px',
                                borderTop: '1px solid var(--border3)',
                                flexWrap: 'wrap',
                            }}>
                                {[
                                    { label: 'Total Items', value: displayLib.itemCount },
                                    { label: 'Pass', value: displayLib.passCount, color: 'var(--green)' },
                                    { label: 'Fail', value: displayLib.failCount, color: displayLib.failCount > 0 ? 'var(--pink)' : undefined },
                                    { label: 'Schema Fields', value: displayLib.fieldCount },
                                    ...(complianceRate !== null ? [{ label: 'Compliance', value: `${complianceRate}%`, color: complianceRate >= 80 ? 'var(--green)' : complianceRate >= 50 ? 'var(--amber)' : 'var(--pink)' }] : []),
                                ].map(stat => (
                                    <div key={stat.label}>
                                        <div style={{
                                            fontFamily: 'DM Mono, monospace',
                                            fontSize: '9px',
                                            color: 'var(--text3)',
                                            letterSpacing: '1px',
                                            textTransform: 'uppercase',
                                            marginBottom: '4px',
                                        }}>
                                            {stat.label}
                                        </div>
                                        <div style={{
                                            fontSize: '20px',
                                            fontWeight: 800,
                                            color: (stat as any).color ?? 'var(--text)',
                                            lineHeight: 1,
                                        }}>
                                            {stat.value}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Schema fields */}
                        {displayLib.fields.length > 0 && (
                            <div style={{
                                background: 'var(--card)',
                                border: '1px solid var(--border)',
                                borderRadius: '14px',
                                padding: '18px 22px',
                            }}>
                                <div style={{
                                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    color: 'var(--cyan-text)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.2px',
                                    marginBottom: '4px',
                                }}>
                                    Schema Fields
                                </div>
                                <div style={{
                                    fontFamily: 'DM Mono, monospace',
                                    fontSize: '10px',
                                    color: 'var(--text3)',
                                    marginBottom: '14px',
                                }}>
                                    // {displayLib.fields.length} governed field{displayLib.fields.length !== 1 ? 's' : ''}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {displayLib.fields.map(field => {
                                        const tc = fieldTypeColor(field.typeAsString)
                                        return (
                                            <div key={field.internalName} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                padding: '10px 14px',
                                                borderRadius: '8px',
                                                background: 'var(--card2)',
                                                border: '1px solid var(--border3)',
                                                flexWrap: 'wrap',
                                            }}>
                                                <div style={{ flex: 1, minWidth: '120px' }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                                                        {field.displayName}
                                                    </div>
                                                    <div style={{
                                                        fontFamily: 'DM Mono, monospace',
                                                        fontSize: '10px',
                                                        color: 'var(--text3)',
                                                        marginTop: '2px',
                                                    }}>
                                                        {field.internalName}
                                                    </div>
                                                </div>
                                                <span style={{
                                                    fontFamily: 'DM Mono, monospace',
                                                    fontSize: '10px',
                                                    fontWeight: 500,
                                                    padding: '3px 8px',
                                                    borderRadius: '5px',
                                                    background: tc.bg,
                                                    border: `1px solid ${tc.border}`,
                                                    color: tc.color,
                                                    whiteSpace: 'nowrap',
                                                }}>
                                                    {field.typeAsString}
                                                </span>
                                                {field.allowedValues && field.allowedValues.length > 0 && (
                                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                        {field.allowedValues.slice(0, 4).map(v => (
                                                            <span key={v} style={{
                                                                fontFamily: 'DM Mono, monospace',
                                                                fontSize: '9px',
                                                                padding: '2px 6px',
                                                                borderRadius: '4px',
                                                                background: 'var(--card)',
                                                                border: '1px solid var(--border)',
                                                                color: 'var(--text3)',
                                                            }}>
                                                                {v}
                                                            </span>
                                                        ))}
                                                        {field.allowedValues.length > 4 && (
                                                            <span style={{
                                                                fontFamily: 'DM Mono, monospace',
                                                                fontSize: '9px',
                                                                color: 'var(--text3)',
                                                                padding: '2px 4px',
                                                            }}>
                                                                +{field.allowedValues.length - 4} more
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Items list */}
                        {displayLib.items.length > 0 ? (
                            <div style={{
                                background: 'var(--card)',
                                border: '1px solid var(--border)',
                                borderRadius: '14px',
                                padding: '18px 22px',
                            }}>
                                <div style={{
                                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    color: 'var(--cyan-text)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.2px',
                                    marginBottom: '4px',
                                }}>
                                    Items
                                </div>
                                <div style={{
                                    fontFamily: 'DM Mono, monospace',
                                    fontSize: '10px',
                                    color: 'var(--text3)',
                                    marginBottom: '14px',
                                }}>
                                    // {displayLib.items.length} audited item{displayLib.items.length !== 1 ? 's' : ''}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {displayLib.items.map(item => {
                                        const isFail = item.status === 'Fail'
                                        const compositeId = `${displayLib.serverRelativeUrl}::${item.itemId}`
                                        return (
                                            <div
                                                key={item.itemId}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '10px 14px',
                                                    borderRadius: '8px',
                                                    background: 'var(--card2)',
                                                    border: `1px solid ${isFail ? 'rgba(232,0,90,0.15)' : 'var(--border3)'}`,
                                                    transition: 'all 0.15s',
                                                    cursor: isFail ? 'pointer' : 'default',
                                                }}
                                                onClick={() => isFail && setSelectedItem(compositeId)}
                                                onMouseEnter={e => {
                                                    if (isFail) (e.currentTarget as HTMLDivElement).style.background = 'rgba(232,0,90,0.04)'
                                                }}
                                                onMouseLeave={e => {
                                                    if (isFail) (e.currentTarget as HTMLDivElement).style.background = 'var(--card2)'
                                                }}
                                            >
                                                <ItemStatusDot status={item.status} />

                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{
                                                        fontSize: '13px',
                                                        fontWeight: 600,
                                                        color: 'var(--text)',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}>
                                                        {item.fileName}
                                                    </div>
                                                    {isFail && item.gaps.length > 0 && (
                                                        <div style={{
                                                            fontFamily: 'DM Mono, monospace',
                                                            fontSize: '10px',
                                                            color: 'var(--pink)',
                                                            marginTop: '2px',
                                                        }}>
                                                            {item.gaps.map(g => g.displayName).join(', ')}
                                                        </div>
                                                    )}
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                                    <span style={{
                                                        fontFamily: 'DM Mono, monospace',
                                                        fontSize: '9px',
                                                        fontWeight: 600,
                                                        padding: '3px 7px',
                                                        borderRadius: '5px',
                                                        background: item.status === 'Pass' ? 'rgba(0,166,122,0.08)' : 'rgba(232,0,90,0.08)',
                                                        border: `1px solid ${item.status === 'Pass' ? 'rgba(0,166,122,0.25)' : 'rgba(232,0,90,0.22)'}`,
                                                        color: item.status === 'Pass' ? 'var(--green)' : 'var(--pink)',
                                                    }}>
                                                        {item.status}
                                                    </span>

                                                    {isFail && (
                                                        <button
                                                            onClick={e => { e.stopPropagation(); setSelectedItem(compositeId) }}
                                                            style={{
                                                                padding: '5px 12px',
                                                                borderRadius: '7px',
                                                                background: 'rgba(0,191,168,0.09)',
                                                                border: '1px solid rgba(0,191,168,0.35)',
                                                                color: 'var(--cyan-text)',
                                                                fontFamily: 'DM Mono, monospace',
                                                                fontSize: '10px',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            Fix →
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                background: 'var(--card)',
                                border: '1px solid var(--border)',
                                borderRadius: '14px',
                                padding: '40px 22px',
                                textAlign: 'center',
                                color: 'var(--text3)',
                                fontFamily: 'DM Mono, monospace',
                                fontSize: '11px',
                            }}>
                                // No items audited in this library
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    )
}