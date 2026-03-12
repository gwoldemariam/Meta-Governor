import { useState } from 'react'
import { useGovernanceStore } from '../store/useGovernanceStore'
import type { LibraryReport } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusColor(status: LibraryReport['schemaStatus']) {
    switch (status) {
        case 'governed': return 'var(--green)'
        case 'violations': return 'var(--pink)'
        case 'no-schema': return 'var(--amber)'
        case 'empty': return 'var(--text3)'
    }
}

function statusLabel(status: LibraryReport['schemaStatus']) {
    switch (status) {
        case 'governed': return 'Governed'
        case 'violations': return 'Violations'
        case 'no-schema': return 'Unmanaged'
        case 'empty': return 'Empty'
    }
}

function complianceAccent(rate: number): 'cyan' | 'pink' | 'green' | 'amber' {
    if (rate >= 80) return 'green'
    if (rate >= 50) return 'amber'
    return 'pink'
}

// ── Metric Card (from mockup .mc pattern) ────────────────────────────────────

function MetricCard({ label, value, sub, accent, icon, trend }: {
    label: string
    value: string | number
    sub?: string
    accent: 'cyan' | 'pink' | 'green' | 'amber'
    icon: string
    trend?: string
}) {
    const A = {
        cyan: { color: 'var(--cyan-text)', bar: 'var(--cyan-l)', glow: 'var(--cyan-l)', iconBg: 'rgba(0,191,168,0.10)', iconBd: 'rgba(0,191,168,0.22)', trendBg: 'rgba(0,191,168,0.10)' },
        pink: { color: 'var(--pink)', bar: 'var(--pink-l)', glow: 'var(--pink-l)', iconBg: 'rgba(232,0,90,0.07)', iconBd: 'rgba(232,0,90,0.18)', trendBg: 'rgba(232,0,90,0.08)' },
        green: { color: 'var(--green)', bar: 'var(--green-l)', glow: 'var(--green-l)', iconBg: 'rgba(0,166,122,0.09)', iconBd: 'rgba(0,166,122,0.20)', trendBg: 'rgba(0,166,122,0.08)' },
        amber: { color: 'var(--amber)', bar: 'var(--amber-l)', glow: 'var(--amber-l)', iconBg: 'rgba(196,138,0,0.08)', iconBd: 'rgba(196,138,0,0.20)', trendBg: 'rgba(196,138,0,0.08)' },
    }[accent]

    return (
        <div
            style={{
                flex: '1 1 160px', minWidth: 0,
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '14px', padding: '18px 20px',
                position: 'relative', overflow: 'hidden',
                boxShadow: '0 4px 24px rgba(80,120,220,0.08)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'default'
            }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'
                    ; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 40px rgba(80,120,220,0.16)'
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
                    ; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 24px rgba(80,120,220,0.08)'
            }}
        >
            {/* Top color bar */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                borderRadius: '14px 14px 0 0',
                background: `linear-gradient(90deg, transparent, ${A.bar}, transparent)`
            }} />
            {/* Glow orb */}
            <div style={{
                position: 'absolute', top: '-24px', right: '-24px',
                width: '90px', height: '90px', borderRadius: '50%',
                background: A.glow, opacity: 0.09, pointerEvents: 'none'
            }} />
            {/* Icon + trend */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '11px' }}>
                <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px',
                    background: A.iconBg, border: `1px solid ${A.iconBd}`
                }}>{icon}</div>
                {trend && (
                    <div style={{
                        fontFamily: 'DM Mono, monospace', fontSize: '10px',
                        padding: '3px 8px', borderRadius: '6px', fontWeight: 500,
                        color: A.color, background: A.trendBg
                    }}>{trend}</div>
                )}
            </div>
            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '32px', fontWeight: 800, lineHeight: 1, letterSpacing: '-1.5px', color: 'var(--text)' }}>
                {value}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '5px' }}>{label}</div>
            {sub && <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text3)', marginTop: '4px' }}>{sub}</div>}
        </div>
    )
}

// ── SVG Donut (matches mockup exactly) ───────────────────────────────────────

function SvgDonut({ rate, passCount, failCount, totalItems }: {
    rate: number
    passCount: number
    failCount: number
    totalItems: number
}) {
    const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; value: number } | null>(null)

    const R = 56
    const C = 2 * Math.PI * R  // 351.86

    // Arc lengths based on compliance rate
    const passArc = (rate / 100) * C
    const failArc = C - passArc

    // SVG arcs start at 3 o'clock. We want to start at 12 o'clock.
    // Rotate the whole SVG -90deg via transform on the circles.
    // strokeDashoffset = 0 means arc starts exactly at the rotated start point.

    const accentColor =
        rate >= 80 ? 'var(--green)' :
            rate >= 50 ? 'var(--amber)' : 'var(--pink)'

    // Hit area calculations for hover (approximate quadrant)
    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left - 74  // relative to center
        const y = e.clientY - rect.top - 74
        const dist = Math.sqrt(x * x + y * y)

        // Only trigger in the donut ring (between inner r=47 and outer r=65)
        if (dist < 47 || dist > 65) {
            setTooltip(null)
            return
        }

        // Angle from top (12 o'clock), clockwise
        let angle = Math.atan2(x, -y) * (180 / Math.PI)
        if (angle < 0) angle += 360

        const isPass = angle <= (rate / 100) * 360
        setTooltip({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            label: isPass ? 'Fully Tagged' : 'Missing Tags',
            value: isPass ? passCount : failCount
        })
    }

    return (
        <div style={{ position: 'relative', width: '148px', height: '148px', flexShrink: 0 }}>
            <svg
                width="148" height="148"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setTooltip(null)}
                style={{ cursor: 'default' }}
            >
                <defs>
                    <linearGradient id="passGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#00bfa8" />
                        <stop offset="100%" stopColor="#00e5d0" />
                    </linearGradient>
                </defs>

                {/* Track (full circle, dim) */}
                <circle
                    cx="74" cy="74" r={R}
                    fill="none"
                    stroke="rgba(100,140,255,0.1)"
                    strokeWidth="16"
                />

                {/* Fail arc — drawn first (underneath), full circle in red, will be covered by pass arc */}
                {failArc > 0 && (
                    <circle
                        cx="74" cy="74" r={R}
                        fill="none"
                        stroke="#e8005a"
                        strokeWidth="16"
                        strokeDasharray={`${failArc} ${C}`}
                        strokeDashoffset={passArc === 0 ? 0 : -passArc}
                        strokeLinecap="round"
                        style={{
                            transformOrigin: 'center',
                            transform: 'rotate(-90deg)',
                            opacity: 0.85
                        }}
                    />
                )}

                {/* Pass arc — drawn on top, starts at 12 o'clock */}
                {passArc > 0 && (
                    <circle
                        cx="74" cy="74" r={R}
                        fill="none"
                        stroke="url(#passGrad)"
                        strokeWidth="16"
                        strokeDasharray={`${passArc} ${C}`}
                        strokeDashoffset={0}
                        strokeLinecap="round"
                        style={{
                            transformOrigin: 'center',
                            transform: 'rotate(-90deg)',
                            filter: 'drop-shadow(0 0 4px rgba(0,191,168,0.6))'
                        }}
                    />
                )}
            </svg>

            {/* Center label as HTML — CSS vars work here */}
            <div style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none'
            }}>
                <div style={{
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontSize: '22px', fontWeight: 800,
                    lineHeight: 1,
                    color:
                        rate >= 80 ? 'var(--green)' :
                            rate >= 50 ? 'var(--amber)' : 'var(--pink)'
                }}>
                    {rate}%
                </div>
                <div style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: '9px', color: 'var(--text3)',
                    letterSpacing: '2px', marginTop: '3px'
                }}>
                    GOVERNED
                </div>
            </div>
            {/* Hover tooltip */}
            {tooltip && (
                <div style={{
                    position: 'absolute',
                    left: tooltip.x + 10,
                    top: tooltip.y - 32,
                    background: 'var(--card)',
                    border: '1px solid var(--border2)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontFamily: 'DM Mono, monospace',
                    fontSize: '11px',
                    color: 'var(--text)',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    zIndex: 10
                }}>
                    {tooltip.label}: <strong>{tooltip.value}</strong>
                    <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '2px' }}>
                        of {totalItems} total items
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Library bar row (matches mockup .lib-row) ─────────────────────────────────

function LibBarRow({ lib }: { lib: LibraryReport }) {
    const total = lib.itemCount
    const passRate = total > 0 ? (lib.passCount / total) * 100 : 0

    let barGrad = 'linear-gradient(90deg, var(--pink-l), #ff8080)'
    if (lib.schemaStatus === 'no-schema') barGrad = 'linear-gradient(90deg, var(--amber-l), #ffaa00)'
    else if (lib.schemaStatus === 'empty') barGrad = 'rgba(100,140,255,0.15)'
    else if (passRate >= 80) barGrad = 'linear-gradient(90deg, var(--cyan), var(--green-l))'
    else if (passRate >= 50) barGrad = 'linear-gradient(90deg, var(--amber-l), #ffaa00)'

    const pctColor =
        lib.schemaStatus === 'no-schema' ? 'var(--amber)' :
            lib.schemaStatus === 'empty' ? 'var(--text3)' :
                passRate >= 80 ? 'var(--green)' :
                    passRate >= 50 ? 'var(--amber)' : 'var(--pink)'

    const displayPct =
        lib.schemaStatus === 'no-schema' ? 'Unmanaged' :
            lib.schemaStatus === 'empty' ? 'Empty' :
                `${Math.round(passRate)}%`

    const barWidth =
        lib.schemaStatus === 'no-schema' ? '100%' :
            lib.schemaStatus === 'empty' ? '0%' :
                `${passRate}%`

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Name row — full width, no truncation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', minWidth: 0 }}>
                <div style={{
                    fontSize: '12px',
                    color: 'var(--text2)',
                    minWidth: 0,
                    flex: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }}>
                    {lib.libraryName}
                </div>
                <div style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: '10px',
                    fontWeight: 500,
                    color: pctColor,
                    flexShrink: 0,
                    whiteSpace: 'nowrap'
                }}>
                    {displayPct}
                </div>
            </div>
            {/* Bar — full width underneath name */}
            <div style={{
                width: '100%',
                height: '7px',
                background: 'rgba(100,140,255,0.08)',
                borderRadius: '4px',
                overflow: 'hidden'
            }}>
                <div style={{
                    height: '100%',
                    width: barWidth,
                    background: barGrad,
                    borderRadius: '4px',
                    transition: 'width 0.6s ease'
                }}></div>
            </div>
        </div>
    )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HealthDashboard() {
    const manifest = useGovernanceStore(s => s.manifest)
    if (!manifest) return null

    const { summary, libraries } = manifest
    const accent = complianceAccent(summary.complianceRate)

    const governed = libraries.filter(l => l.schemaStatus === 'governed').length
    const violations = libraries.filter(l => l.schemaStatus === 'violations').length
    const unmanaged = libraries.filter(l => l.schemaStatus === 'no-schema').length

    const accentColor =
        accent === 'green' ? 'var(--green)' :
            accent === 'amber' ? 'var(--amber)' : 'var(--pink)'

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Page heading */}
            <div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text3)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>
                    // Health Overview
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.4px' }}>
                    Tenant Governance Health
                </div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text3)', marginTop: '4px' }}>
                    Generated {new Date(manifest.generatedAt).toLocaleString()}
                </div>
            </div>

            {/* Metric cards */}
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                <MetricCard
                    label="Compliance Rate"
                    value={`${summary.complianceRate}%`}
                    sub={`${summary.passCount} of ${summary.totalItems} items tagged`}
                    accent={accent} icon="✓"
                    trend={`${summary.totalItems} total`}
                />
                <MetricCard
                    label="Failing Items"
                    value={summary.failCount}
                    sub="require remediation"
                    accent={summary.failCount > 0 ? 'pink' : 'green'} icon="⚠"
                    trend={summary.failCount > 0 ? '↑ action needed' : '✓ all clear'}
                />
                <MetricCard
                    label="Total Libraries"
                    value={summary.totalLibraries}
                    sub={`${summary.governedLibraries} with governance rules`}
                    accent="cyan" icon="◈"
                    trend={`${unmanaged} unmanaged`}
                />
                <MetricCard
                    label="Governed Files"
                    value={summary.passCount}
                    sub="fully tagged and compliant"
                    accent="green" icon="📁"
                />
            </div>

            {/* Middle row */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>

                {/* Compliance Score panel */}
                <div style={{
                    flex: '1.2 1 320px', minWidth: 0,
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: '14px', padding: '20px 22px',
                    boxShadow: '0 4px 24px rgba(80,120,220,0.08)'
                }}>
                    {/* Panel header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
                        <div>
                            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '12px', fontWeight: 800, letterSpacing: '0.2px', color: 'var(--cyan-text)', textTransform: 'uppercase' }}>
                                Compliance Score
                            </div>
                            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text3)', marginTop: '3px' }}>
                                // tenant-wide · all {summary.totalLibraries} libraries
                            </div>
                        </div>
                        <div style={{
                            fontFamily: 'DM Mono, monospace', fontSize: '9px',
                            letterSpacing: '1.5px', padding: '3px 10px', borderRadius: '6px',
                            textTransform: 'uppercase',
                            background: 'rgba(0,166,122,0.08)', border: '1px solid rgba(0,166,122,0.25)', color: 'var(--green)'
                        }}>
                            ↑ Improving
                        </div>
                    </div>

                    {/* Donut + legend side by side */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <SvgDonut
                            rate={summary.complianceRate}
                            passCount={summary.passCount}
                            failCount={summary.failCount}
                            totalItems={summary.totalItems}
                        />

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '9px', minWidth: 0 }}>
                            {/* Pass row */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '9px 12px', borderRadius: '8px',
                                background: 'rgba(0,191,168,0.06)', border: '1px solid rgba(0,191,168,0.18)'
                            }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--cyan)', flexShrink: 0 }} />
                                <div style={{ flex: 1, fontSize: '12px', color: 'var(--text2)' }}>Fully Tagged</div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '15px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>
                                        {summary.passCount}
                                    </div>
                                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text3)' }}>
                                        {summary.complianceRate}%
                                    </div>
                                </div>
                            </div>

                            {/* Fail row */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '9px 12px', borderRadius: '8px',
                                background: 'rgba(232,0,90,0.05)', border: '1px solid rgba(232,0,90,0.15)'
                            }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--pink-l)', flexShrink: 0 }} />
                                <div style={{ flex: 1, fontSize: '12px', color: 'var(--text2)' }}>Missing Tags</div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '15px', fontWeight: 800, color: 'var(--pink)', letterSpacing: '-0.5px' }}>
                                        {summary.failCount}
                                    </div>
                                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text3)' }}>
                                        {summary.totalItems > 0 ? (100 - summary.complianceRate).toFixed(1) : 0}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Library Health panel */}
                <div style={{
                    flex: '1 1 280px', minWidth: 0,
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: '14px', padding: '20px 22px',
                    boxShadow: '0 4px 24px rgba(80,120,220,0.08)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
                        <div>
                            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '12px', fontWeight: 800, letterSpacing: '0.2px', color: 'var(--cyan-text)', textTransform: 'uppercase' }}>
                                Library Health
                            </div>
                            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text3)', marginTop: '3px' }}>
                                // {libraries.length} libraries discovered
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                        {libraries.map(lib => (
                            <LibBarRow key={lib.libraryName} lib={lib} />
                        ))}
                    </div>

                    {/* Summary chips */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '14px' }}>
                        {[
                            { val: governed, label: 'Healthy', bg: 'rgba(0,166,122,0.07)', border: 'rgba(0,166,122,0.18)', color: 'var(--green)' },
                            { val: violations, label: 'Violating', bg: 'rgba(232,0,90,0.06)', border: 'rgba(232,0,90,0.16)', color: 'var(--pink)' },
                            { val: unmanaged, label: 'Unmanaged', bg: 'rgba(196,138,0,0.07)', border: 'rgba(196,138,0,0.18)', color: 'var(--amber)' },
                        ].map(chip => (
                            <div key={chip.label} style={{
                                textAlign: 'center', padding: '9px 6px', borderRadius: '8px',
                                background: chip.bg, border: `1px solid ${chip.border}`
                            }}>
                                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '17px', fontWeight: 800, letterSpacing: '-0.5px', color: chip.color }}>
                                    {chip.val}
                                </div>
                                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text3)', marginTop: '2px' }}>
                                    {chip.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}