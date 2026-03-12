import { useState, useMemo } from 'react'
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    flexRender,
    createColumnHelper,
    type SortingState,
} from '@tanstack/react-table'
import { useGovernanceStore } from '../store/useGovernanceStore'
import type { WorkQueueItem } from '../types'

// ── Risk helpers ──────────────────────────────────────────────────────────────

function riskLevel(score: number): 'HIGH' | 'MED' | 'LOW' {
    if (score >= 3) return 'HIGH'
    if (score === 2) return 'MED'
    return 'LOW'
}

function RiskBadge({ score }: { score: number }) {
    const level = riskLevel(score)
    const styles = {
        HIGH: { bg: 'var(--risk-h-bg, rgba(232,0,90,0.08))', border: 'var(--risk-h-border, rgba(232,0,90,0.22))', color: 'var(--risk-h-text, var(--pink))' },
        MED: { bg: 'var(--risk-m-bg, rgba(196,138,0,0.08))', border: 'var(--risk-m-border, rgba(196,138,0,0.22))', color: 'var(--risk-m-text, var(--amber))' },
        LOW: { bg: 'var(--risk-l-bg, rgba(0,166,122,0.08))', border: 'var(--risk-l-border, rgba(0,166,122,0.22))', color: 'var(--risk-l-text, var(--green))' },
    }[level]

    return (
        <span style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: '10px', fontWeight: 700,
            padding: '4px 10px', borderRadius: '6px',
            letterSpacing: '0.5px', whiteSpace: 'nowrap',
            background: styles.bg,
            border: `1px solid ${styles.border}`,
            color: styles.color
        }}>
            {level}
        </span>
    )
}

function GapTags({ gaps }: { gaps: WorkQueueItem['gaps'] }) {
    const visible = gaps.slice(0, 3)
    const extra = gaps.length - visible.length

    const tagColor = (type: string) => {
        switch (type) {
            case 'TaxonomyFieldType':
            case 'TaxonomyFieldTypeMulti': return {
                bg: 'rgba(37,99,235,0.07)', border: 'rgba(37,99,235,0.22)', color: 'var(--blue)'
            }
            case 'Choice':
            case 'MultiChoice': return {
                bg: 'rgba(0,191,168,0.08)', border: 'rgba(0,191,168,0.28)', color: 'var(--cyan-text)'
            }
            case 'User':
            case 'UserMulti': return {
                bg: 'rgba(196,138,0,0.08)', border: 'rgba(196,138,0,0.25)', color: 'var(--amber)'
            }
            default: return {
                bg: 'rgba(232,0,90,0.07)', border: 'rgba(232,0,90,0.25)', color: 'var(--pink)'
            }
        }
    }

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
            {visible.map((gap, i) => {
                const c = tagColor(gap.typeAsString)
                return (
                    <span key={i} style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '2px 7px', borderRadius: '5px',
                        fontFamily: 'DM Mono, monospace',
                        fontSize: '9px', fontWeight: 500,
                        letterSpacing: '0.3px',
                        background: c.bg, border: `1px solid ${c.border}`, color: c.color
                    }}>
                        {gap.displayName}
                    </span>
                )
            })}
            {extra > 0 && (
                <span style={{
                    padding: '2px 7px', borderRadius: '5px',
                    fontFamily: 'DM Mono, monospace', fontSize: '9px',
                    background: 'var(--card2)', border: '1px solid var(--border)',
                    color: 'var(--text3)'
                }}>
                    +{extra} more
                </span>
            )}
        </div>
    )
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

// ── Column helper ─────────────────────────────────────────────────────────────

const col = createColumnHelper<WorkQueueItem>()

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RemediationQueue() {
    // ── ALL hooks first — no early returns before these ──────────────────────
    const { manifest, getWorkQueue, setSelectedItem } = useGovernanceStore()
    const allItems = useMemo(() => getWorkQueue(), [manifest])
    const [sorting, setSorting] = useState<SortingState>([{ id: 'riskScore', desc: true }])
    const [search, setSearch] = useState('')
    const [riskFilter, setRiskFilter] = useState<'all' | 'HIGH' | 'MED' | 'LOW'>('all')

    const filtered = useMemo(() => {
        let data = allItems
        if (search.trim()) {
            const q = search.toLowerCase()
            data = data.filter(item =>
                item.fileName.toLowerCase().includes(q) ||
                item.libraryName.toLowerCase().includes(q)
            )
        }
        if (riskFilter !== 'all') {
            data = data.filter(item => riskLevel(item.riskScore) === riskFilter)
        }
        return data
    }, [allItems, search, riskFilter])

    const columns = useMemo(() => [
        col.accessor('fileName', {
            header: 'File',
            sortingFn: (a, b) =>
                a.original.fileName.toLowerCase().localeCompare(b.original.fileName.toLowerCase()),
            cell: info => (
                <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}>
                        {info.getValue()}
                    </div>
                    <div style={{
                        fontFamily: 'DM Mono, monospace', fontSize: '10px',
                        color: 'var(--text3)', marginTop: '2px'
                    }}>
                        {info.row.original.libraryName}
                    </div>
                </div>
            )
        }),
        col.accessor('gaps', {
            header: 'Missing Fields',
            enableSorting: false,
            cell: info => <GapTags gaps={info.getValue()} />
        }),
        col.accessor('riskScore', {
            header: 'Risk',
            sortingFn: (a, b) => a.original.riskScore - b.original.riskScore,
            cell: info => <RiskBadge score={info.getValue()} />
        }),
        col.display({
            id: 'action',
            header: '',
            cell: info => (
                <button
                    onClick={() => setSelectedItem(info.row.original.compositeId)}
                    style={{
                        padding: '6px 14px', borderRadius: '8px',
                        background: 'rgba(0,191,168,0.09)',
                        border: '1px solid rgba(0,191,168,0.35)',
                        color: 'var(--cyan-text)',
                        fontFamily: 'DM Mono, monospace',
                        fontSize: '10px', fontWeight: 600,
                        cursor: 'pointer', letterSpacing: '0.5px',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => {
                        const b = e.currentTarget as HTMLButtonElement
                        b.style.background = 'rgba(0,191,168,0.16)'
                        b.style.boxShadow = '0 3px 12px rgba(0,191,168,0.2)'
                        b.style.transform = 'translateY(-1px)'
                    }}
                    onMouseLeave={e => {
                        const b = e.currentTarget as HTMLButtonElement
                        b.style.background = 'rgba(0,191,168,0.09)'
                        b.style.boxShadow = 'none'
                        b.style.transform = 'translateY(0)'
                    }}
                >
                    Fix →
                </button>
            )
        })
    ], [setSelectedItem])

    const table = useReactTable({
        data: filtered,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    })

    // ── Early return AFTER all hooks ─────────────────────────────────────────
    if (!manifest) return <NoManifest />

    const highCount = allItems.filter(i => riskLevel(i.riskScore) === 'HIGH').length
    const medCount = allItems.filter(i => riskLevel(i.riskScore) === 'MED').length
    const lowCount = allItems.filter(i => riskLevel(i.riskScore) === 'LOW').length

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Page heading */}
            <div>
                <div style={{
                    fontFamily: 'DM Mono, monospace', fontSize: '10px',
                    color: 'var(--text3)', letterSpacing: '2px',
                    textTransform: 'uppercase', marginBottom: '4px'
                }}>
                    // Remediation
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.4px' }}>
                    Remediation Queue
                </div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text3)', marginTop: '4px' }}>
                    {allItems.length} files require attention · sorted by risk
                </div>
            </div>

            {/* Table panel */}
            <div style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: '14px', padding: '20px 22px',
                boxShadow: '0 4px 24px rgba(80,120,220,0.08)'
            }}>

                {/* Panel header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '12px', fontWeight: 800, letterSpacing: '0.2px', color: 'var(--cyan-text)', textTransform: 'uppercase' }}>
                            Issue Queue
                        </div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text3)', marginTop: '3px' }}>
                            // {filtered.length} of {allItems.length} items shown
                        </div>
                    </div>
                    {/* Risk summary chips */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {[
                            { label: 'HIGH', count: highCount, bg: 'rgba(232,0,90,0.08)', border: 'rgba(232,0,90,0.22)', color: 'var(--pink)' },
                            { label: 'MED', count: medCount, bg: 'rgba(196,138,0,0.08)', border: 'rgba(196,138,0,0.22)', color: 'var(--amber)' },
                            { label: 'LOW', count: lowCount, bg: 'rgba(0,166,122,0.08)', border: 'rgba(0,166,122,0.22)', color: 'var(--green)' },
                        ].map(chip => (
                            <div key={chip.label} style={{
                                padding: '4px 10px', borderRadius: '7px',
                                background: chip.bg, border: `1px solid ${chip.border}`,
                                fontFamily: 'DM Mono, monospace', fontSize: '10px',
                                color: chip.color, fontWeight: 600
                            }}>
                                {chip.count} {chip.label}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Search + filter row */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="// Search by file name or library…"
                        style={{
                            flex: 1, minWidth: '200px',
                            background: 'var(--card2)', border: '1px solid var(--border)',
                            borderRadius: '10px', padding: '9px 14px',
                            fontFamily: 'DM Mono, monospace', fontSize: '11px',
                            color: 'var(--text)', outline: 'none',
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
                    {(['all', 'HIGH', 'MED', 'LOW'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setRiskFilter(f)}
                            style={{
                                padding: '7px 14px', borderRadius: '8px',
                                fontFamily: 'DM Mono, monospace', fontSize: '11px',
                                fontWeight: 500, letterSpacing: '0.5px',
                                cursor: 'pointer', whiteSpace: 'nowrap',
                                transition: 'all 0.15s',
                                border: riskFilter === f
                                    ? '1px solid rgba(0,191,168,0.38)'
                                    : '1px solid var(--border)',
                                background: riskFilter === f
                                    ? 'rgba(0,191,168,0.09)'
                                    : 'var(--card2)',
                                color: riskFilter === f
                                    ? 'var(--cyan-text)'
                                    : 'var(--text3)',
                                boxShadow: riskFilter === f
                                    ? '0 0 8px rgba(0,191,168,0.1)'
                                    : 'none'
                            }}
                        >
                            {f === 'all' ? 'All' : f}
                        </button>
                    ))}
                </div>

                {/* Table */}
                {allItems.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: '60px 20px',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: '12px'
                    }}>
                        <div style={{ fontSize: '36px' }}>✓</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--green)' }}>
                            All items are compliant
                        </div>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text3)' }}>
                            No remediation required
                        </div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: '60px 20px',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: '12px'
                    }}>
                        <div style={{ fontSize: '28px' }}>◎</div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text2)' }}>
                            No results match your filters
                        </div>
                        <button
                            onClick={() => { setSearch(''); setRiskFilter('all') }}
                            style={{
                                background: 'none', border: 'none',
                                color: 'var(--cyan-text)', fontSize: '12px',
                                cursor: 'pointer', fontFamily: 'DM Mono, monospace',
                                textDecoration: 'underline'
                            }}
                        >
                            Clear filters
                        </button>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    {table.getFlatHeaders().map(header => (
                                        <th
                                            key={header.id}
                                            onClick={header.column.getToggleSortingHandler()}
                                            style={{
                                                padding: '9px 12px',
                                                textAlign: 'left',
                                                fontFamily: 'DM Mono, monospace',
                                                fontSize: '9px', fontWeight: 500,
                                                letterSpacing: '2px',
                                                color: 'var(--text3)',
                                                textTransform: 'uppercase',
                                                whiteSpace: 'nowrap',
                                                cursor: header.column.getCanSort() ? 'pointer' : 'default',
                                                userSelect: 'none',
                                                transition: 'color 0.15s'
                                            }}
                                            onMouseEnter={e => {
                                                if (header.column.getCanSort())
                                                    (e.currentTarget as HTMLTableCellElement).style.color = 'var(--text2)'
                                            }}
                                            onMouseLeave={e => {
                                                (e.currentTarget as HTMLTableCellElement).style.color = 'var(--text3)'
                                            }}
                                        >
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                            {header.column.getIsSorted() === 'asc' && ' ↑'}
                                            {header.column.getIsSorted() === 'desc' && ' ↓'}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {table.getRowModel().rows.map(row => (
                                    <tr
                                        key={row.id}
                                        style={{
                                            borderBottom: '1px solid rgba(100,140,255,0.06)',
                                            transition: 'background 0.15s',
                                            cursor: 'pointer'
                                        }}
                                        onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(0,191,168,0.03)'}
                                        onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                                    >
                                        {row.getVisibleCells().map(cell => (
                                            <td
                                                key={cell.id}
                                                style={{
                                                    padding: '11px 12px',
                                                    fontSize: '13px',
                                                    verticalAlign: 'middle'
                                                }}
                                            >
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Footer */}
                {filtered.length > 0 && (
                    <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', marginTop: '14px',
                        paddingTop: '12px', borderTop: '1px solid var(--border3)',
                        flexWrap: 'wrap', gap: '8px'
                    }}>
                        <div style={{
                            fontFamily: 'DM Mono, monospace', fontSize: '10px',
                            color: 'var(--text3)', letterSpacing: '0.5px'
                        }}>
                            // Showing {filtered.length} of {allItems.length} items
                        </div>
                        {(search || riskFilter !== 'all') && (
                            <button
                                onClick={() => { setSearch(''); setRiskFilter('all') }}
                                style={{
                                    background: 'none', border: 'none',
                                    color: 'var(--text3)', fontSize: '11px',
                                    cursor: 'pointer', fontFamily: 'DM Mono, monospace',
                                    textDecoration: 'underline'
                                }}
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}