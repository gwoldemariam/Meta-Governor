import { useState, useEffect, useRef } from 'react'
import { useGovernanceStore } from '../store/useGovernanceStore'
import {
    remediateItem,
    fetchTerms,
    fetchLookupItems,
    resolveUser,
    type TermOption,
    type LookupOption,
} from '../lib/apiClient'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FieldValue {
    internalName: string
    displayName: string
    typeAsString: string
    value: string
    allowedValues?: string[]
}

interface RemediationLogEntry {
    id: string
    fileName: string
    libraryName: string
    itemUrl: string
    fieldsFixed: string
    fixedBy: string
    fixedAt: string
    manifestDate: string
}

// ─── Log helpers ──────────────────────────────────────────────────────────────

function buildLogEntry(
    fileName: string,
    libraryName: string,
    itemUrl: string,
    fields: FieldValue[],
    manifestDate: string
): RemediationLogEntry {
    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        fileName,
        libraryName,
        itemUrl,
        fieldsFixed: fields.map(f => f.displayName).join('; '),
        fixedBy: 'Dashboard User',
        fixedAt: new Date().toISOString(),
        manifestDate,
    }
}

function readLocalLog(): RemediationLogEntry[] {
    try {
        const raw = localStorage.getItem('mg-remediation-log')
        return raw ? JSON.parse(raw) : []
    } catch { return [] }
}

function appendLocalLog(entry: RemediationLogEntry) {
    try {
        const log = readLocalLog()
        log.push(entry)
        localStorage.setItem('mg-remediation-log', JSON.stringify(log))
    } catch { }
}

function exportLog(format: 'json' | 'csv') {
    const log = readLocalLog()
    if (log.length === 0) return
    let content: string
    let mime: string
    let ext: string
    if (format === 'json') {
        content = JSON.stringify(log, null, 2)
        mime = 'application/json'
        ext = 'json'
    } else {
        const headers = ['id', 'fileName', 'libraryName', 'itemUrl', 'fieldsFixed', 'fixedBy', 'fixedAt', 'manifestDate']
        const rows = log.map(e => headers.map(h => `"${(e as any)[h] ?? ''}"`).join(','))
        content = [headers.join(','), ...rows].join('\n')
        mime = 'text/csv'
        ext = 'csv'
    }
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mg-remediation-log-${new Date().toISOString().slice(0, 10)}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
}

// ─── Shared input styles ──────────────────────────────────────────────────────

const inputBase: React.CSSProperties = {
    width: '100%',
    background: 'var(--card)',
    border: '1px solid var(--border2)',
    borderRadius: '8px',
    padding: '9px 12px',
    fontFamily: 'Plus Jakarta Sans, sans-serif',
    fontSize: '13px',
    color: 'var(--text)',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
}

function onFocus(e: React.FocusEvent<any>) {
    e.currentTarget.style.borderColor = 'rgba(0,191,168,0.5)'
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,191,168,0.1)'
}
function onBlur(e: React.FocusEvent<any>) {
    e.currentTarget.style.borderColor = ''
    e.currentTarget.style.boxShadow = ''
}

// ─── TagInput (Taxonomy free-text fallback) ───────────────────────────────────

function TagInput({ value, onChange, multi }: { value: string; onChange: (v: string) => void; multi: boolean }) {
    const tags = value ? value.split(';').map(t => t.trim()).filter(Boolean) : []
    const [input, setInput] = useState('')

    const addTag = () => {
        const trimmed = input.trim()
        if (!trimmed) return
        if (!multi) { onChange(trimmed); setInput(''); return }
        if (!tags.includes(trimmed)) onChange([...tags, trimmed].join('; '))
        setInput('')
    }

    const removeTag = (tag: string) => onChange(tags.filter(t => t !== tag).join('; '))

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() }
        if (e.key === 'Backspace' && input === '' && tags.length > 0) removeTag(tags[tags.length - 1])
    }

    return (
        <div
            onClick={e => (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus()}
            style={{
                background: 'var(--card)', border: '1px solid var(--border2)',
                borderRadius: '8px', padding: '6px 10px', minHeight: '42px',
                display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center', cursor: 'text',
            }}
        >
            {tags.map(tag => (
                <span key={tag} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '3px 8px', borderRadius: '5px',
                    background: 'rgba(37,99,235,0.09)', border: '1px solid rgba(37,99,235,0.25)',
                    color: 'var(--blue)', fontFamily: 'DM Mono, monospace', fontSize: '11px',
                }}>
                    {tag}
                    <span onClick={e => { e.stopPropagation(); removeTag(tag) }}
                        style={{ cursor: 'pointer', opacity: 0.6, fontSize: '12px' }}>×</span>
                </span>
            ))}
            {((!multi && tags.length === 0) || multi) ? (
                <input
                    value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={onKeyDown} onBlur={addTag}
                    placeholder={tags.length === 0
                        ? (multi ? 'Type a term, press Enter…' : 'Type a term and press Enter…')
                        : 'Add another…'}
                    style={{ flex: 1, minWidth: '120px', background: 'none', border: 'none', outline: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '13px', color: 'var(--text)' }}
                />
            ) : (
                <span onClick={() => removeTag(tags[0])}
                    style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text3)', cursor: 'pointer', marginLeft: '4px' }}>
                    ✕ clear
                </span>
            )}
        </div>
    )
}

// ─── CheckboxList ─────────────────────────────────────────────────────────────

function CheckboxList({ options, selected, onChange, labelKey, valueKey }: {
    options: any[]
    selected: string[]
    onChange: (selected: string[]) => void
    labelKey: string
    valueKey: string
}) {
    const toggle = (val: string) => {
        if (selected.includes(val)) onChange(selected.filter(v => v !== val))
        else onChange([...selected, val])
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
            {options.map(opt => {
                const val = String(opt[valueKey])
                const label = opt[labelKey]
                const checked = selected.includes(val)
                return (
                    <label key={val} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                        background: checked ? 'rgba(0,191,168,0.06)' : 'var(--card2)',
                        border: `1px solid ${checked ? 'rgba(0,191,168,0.28)' : 'var(--border3)'}`,
                        transition: 'all 0.15s',
                    }}>
                        <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(val)}
                            style={{ accentColor: 'var(--cyan-text)', width: '14px', height: '14px', flexShrink: 0 }}
                        />
                        <span style={{ fontSize: '13px', color: 'var(--text)', flex: 1 }}>{label}</span>
                    </label>
                )
            })}
        </div>
    )
}

// ─── SearchableDropdown ───────────────────────────────────────────────────────

function SearchableDropdown({ options, value, onChange, labelKey, valueKey, placeholder }: {
    options: any[]
    value: string
    onChange: (val: string) => void
    labelKey: string
    valueKey: string
    placeholder?: string
}) {
    const [search, setSearch] = useState('')
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const selected = options.find(o => String(o[valueKey]) === value)
    const filtered = options.filter(o =>
        o[labelKey].toLowerCase().includes(search.toLowerCase())
    )

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <div
                onClick={() => setOpen(o => !o)}
                style={{
                    ...inputBase,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer', userSelect: 'none',
                }}
            >
                <span style={{ color: selected ? 'var(--text)' : 'var(--text3)' }}>
                    {selected ? selected[labelKey] : (placeholder ?? '— Select —')}
                </span>
                <span style={{ color: 'var(--text3)', fontSize: '10px' }}>{open ? '▲' : '▼'}</span>
            </div>
            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                    background: 'var(--card)', border: '1px solid var(--border2)',
                    borderRadius: '10px', zIndex: 300,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.18)', overflow: 'hidden',
                }}>
                    <div style={{ padding: '8px' }}>
                        <input
                            autoFocus
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search…"
                            style={{
                                ...inputBase,
                                padding: '7px 10px', fontSize: '12px',
                                background: 'var(--card2)',
                            }}
                        />
                    </div>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '0 6px 6px' }}>
                        {filtered.length === 0 ? (
                            <div style={{ padding: '12px', textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text3)' }}>
                                No results
                            </div>
                        ) : filtered.map(opt => {
                            const val = String(opt[valueKey])
                            const isSelected = val === value
                            return (
                                <div
                                    key={val}
                                    onClick={() => { onChange(val); setOpen(false); setSearch('') }}
                                    style={{
                                        padding: '9px 10px', borderRadius: '7px', cursor: 'pointer',
                                        fontSize: '13px', color: isSelected ? 'var(--cyan-text)' : 'var(--text)',
                                        background: isSelected ? 'rgba(0,191,168,0.07)' : 'transparent',
                                        fontWeight: isSelected ? 600 : 400,
                                        transition: 'background 0.1s',
                                    }}
                                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--card2)' }}
                                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                                >
                                    {opt[labelKey]}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── UserInput ────────────────────────────────────────────────────────────────

function UserInput({ siteUrl, value, onChange, multi }: {
    siteUrl: string
    value: string
    onChange: (v: string) => void
    multi: boolean
}) {
    const [upn, setUpn] = useState('')
    const [resolving, setResolving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [resolved, setResolved] = useState<{ id: number; displayName: string; email: string }[]>(
        value ? JSON.parse(value) : []
    )

    const resolve = async () => {
        if (!upn.trim()) return
        setResolving(true)
        setError(null)
        try {
            const user = await resolveUser(siteUrl, upn.trim())
            const next = multi ? [...resolved.filter(u => u.id !== user.id), user] : [user]
            setResolved(next)
            onChange(JSON.stringify(next))
            setUpn('')
        } catch (err: any) {
            setError(err.message)
        } finally {
            setResolving(false)
        }
    }

    const remove = (id: number) => {
        const next = resolved.filter(u => u.id !== id)
        setResolved(next)
        onChange(next.length ? JSON.stringify(next) : '')
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {resolved.map(u => (
                <div key={u.id} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '7px 12px', borderRadius: '8px',
                    background: 'rgba(196,138,0,0.07)', border: '1px solid rgba(196,138,0,0.22)',
                }}>
                    <span style={{ fontSize: '13px', color: 'var(--text)', flex: 1 }}>{u.displayName}</span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text3)' }}>{u.email}</span>
                    <span onClick={() => remove(u.id)} style={{ cursor: 'pointer', color: 'var(--text3)', fontSize: '14px', opacity: 0.6 }}>×</span>
                </div>
            ))}
            {(multi || resolved.length === 0) && (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        value={upn}
                        onChange={e => setUpn(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && resolve()}
                        placeholder="user@company.com"
                        style={{ ...inputBase, flex: 1 }}
                        onFocus={onFocus} onBlur={onBlur}
                    />
                    <button
                        onClick={resolve}
                        disabled={resolving || !upn.trim()}
                        style={{
                            padding: '9px 14px', borderRadius: '8px',
                            background: 'rgba(0,191,168,0.09)', border: '1px solid rgba(0,191,168,0.35)',
                            color: 'var(--cyan-text)', fontFamily: 'DM Mono, monospace',
                            fontSize: '11px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                    >
                        {resolving ? '…' : 'Resolve'}
                    </button>
                </div>
            )}
            {error && (
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--pink)' }}>
                    ✕ {error}
                </div>
            )}
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text3)' }}>
                Enter a UPN (email) and click Resolve to look up the user
            </div>
        </div>
    )
}

// ─── UrlInput ─────────────────────────────────────────────────────────────────

function UrlInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    let parsed = { url: '', description: '' }
    try { parsed = JSON.parse(value) } catch { }

    const update = (patch: Partial<typeof parsed>) => {
        onChange(JSON.stringify({ ...parsed, ...patch }))
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
                type="url"
                value={parsed.url}
                onChange={e => update({ url: e.target.value })}
                placeholder="https://…"
                style={inputBase}
                onFocus={onFocus} onBlur={onBlur}
            />
            <input
                type="text"
                value={parsed.description}
                onChange={e => update({ description: e.target.value })}
                placeholder="Link description (optional)"
                style={inputBase}
                onFocus={onFocus} onBlur={onBlur}
            />
        </div>
    )
}

// ─── FieldWidget — renders the right input per SP field type ─────────────────

function FieldWidget({ field, value, onChange, siteUrl, listName }: {
    field: FieldValue
    value: string
    onChange: (v: string) => void
    siteUrl: string
    listName: string
}) {
    const [termOptions, setTermOptions] = useState<TermOption[]>([])
    const [lookupOptions, setLookupOptions] = useState<LookupOption[]>([])
    const [loading, setLoading] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)

    const isTaxonomy = field.typeAsString === 'TaxonomyFieldType' || field.typeAsString === 'TaxonomyFieldTypeMulti'
    const isLookup = field.typeAsString === 'Lookup' || field.typeAsString === 'LookupMulti'
    const isMulti = field.typeAsString === 'TaxonomyFieldTypeMulti' || field.typeAsString === 'LookupMulti'
        || field.typeAsString === 'MultiChoice' || field.typeAsString === 'UserMulti'

    // Load options for taxonomy and lookup fields on mount
    useEffect(() => {
        if (!isTaxonomy && !isLookup) return
        setLoading(true)
        setLoadError(null)

        const load = async () => {
            try {
                if (isTaxonomy) {
                    const terms = await fetchTerms(siteUrl, field.internalName, listName)
                    setTermOptions(terms)
                } else {
                    const items = await fetchLookupItems(siteUrl, field.internalName, listName)
                    setLookupOptions(items)
                }
            } catch (err: any) {
                setLoadError(err.message)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [field.internalName])

    // Loading state
    if (loading) {
        return (
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--text3)', padding: '10px 0' }}>
                // Loading options…
            </div>
        )
    }

    // Load error
    if (loadError) {
        return (
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: 'var(--pink)' }}>
                ✕ {loadError}
            </div>
        )
    }

    // ── Taxonomy ──────────────────────────────────────────────────────────────
    if (isTaxonomy) {
        if (termOptions.length === 0) return <TagInput value={value} onChange={onChange} multi={isMulti} />

        if (isMulti) {
            // Parse selected as array of JSON term objects
            let selected: string[] = []
            try { selected = (JSON.parse(value) as any[]).map(t => t.guid) } catch { }

            return (
                <CheckboxList
                    options={termOptions}
                    selected={selected}
                    labelKey="label"
                    valueKey="guid"
                    onChange={guids => {
                        const terms = guids.map(g => termOptions.find(t => t.guid === g)!).filter(Boolean)
                        onChange(JSON.stringify(terms))
                    }}
                />
            )
        }

        // Single taxonomy — searchable dropdown
        let selectedGuid = ''
        try { selectedGuid = JSON.parse(value)?.guid ?? '' } catch { }

        return (
            <SearchableDropdown
                options={termOptions}
                value={selectedGuid}
                labelKey="label"
                valueKey="guid"
                placeholder="— Select a term —"
                onChange={guid => {
                    const term = termOptions.find(t => t.guid === guid)
                    if (term) onChange(JSON.stringify(term))
                }}
            />
        )
    }

    // ── Lookup ────────────────────────────────────────────────────────────────
    if (isLookup) {
        if (isMulti) {
            const selected = value ? value.split(',').map(s => s.trim()).filter(Boolean) : []
            return (
                <CheckboxList
                    options={lookupOptions}
                    selected={selected}
                    labelKey="label"
                    valueKey="id"
                    onChange={ids => onChange(ids.join(','))}
                />
            )
        }
        return (
            <SearchableDropdown
                options={lookupOptions}
                value={value}
                labelKey="label"
                valueKey="id"
                placeholder="— Select an item —"
                onChange={onChange}
            />
        )
    }

    // ── Choice ────────────────────────────────────────────────────────────────
    if (field.typeAsString === 'Choice' && field.allowedValues?.length) {
        return (
            <select value={value} onChange={e => onChange(e.target.value)}
                style={{ ...inputBase, cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                <option value="">— Select —</option>
                {field.allowedValues.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        )
    }

    // ── MultiChoice ───────────────────────────────────────────────────────────
    if (field.typeAsString === 'MultiChoice' && field.allowedValues?.length) {
        const selected = value ? value.split(';').map(s => s.trim()).filter(Boolean) : []
        return (
            <CheckboxList
                options={field.allowedValues.map(v => ({ label: v, value: v }))}
                selected={selected}
                labelKey="label"
                valueKey="value"
                onChange={vals => onChange(vals.join(';'))}
            />
        )
    }

    // ── User / UserMulti ──────────────────────────────────────────────────────
    if (field.typeAsString === 'User' || field.typeAsString === 'UserMulti') {
        return (
            <UserInput
                siteUrl={siteUrl}
                value={value}
                onChange={onChange}
                multi={field.typeAsString === 'UserMulti'}
            />
        )
    }

    // ── URL ───────────────────────────────────────────────────────────────────
    if (field.typeAsString === 'URL') {
        return <UrlInput value={value} onChange={onChange} />
    }

    // ── Boolean ───────────────────────────────────────────────────────────────
    if (field.typeAsString === 'Boolean') {
        return (
            <div style={{ display: 'flex', gap: '8px' }}>
                {[{ label: 'Yes', val: '1' }, { label: 'No', val: '0' }].map(opt => (
                    <div
                        key={opt.val}
                        onClick={() => onChange(opt.val)}
                        style={{
                            flex: 1, padding: '10px', borderRadius: '8px', textAlign: 'center',
                            cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                            background: value === opt.val ? 'rgba(0,191,168,0.09)' : 'var(--card2)',
                            border: `1px solid ${value === opt.val ? 'rgba(0,191,168,0.35)' : 'var(--border3)'}`,
                            color: value === opt.val ? 'var(--cyan-text)' : 'var(--text2)',
                            transition: 'all 0.15s',
                        }}
                    >
                        {opt.label}
                    </div>
                ))}
            </div>
        )
    }

    // ── DateTime ──────────────────────────────────────────────────────────────
    if (field.typeAsString === 'DateTime') {
        return (
            <input type="datetime-local" value={value} onChange={e => onChange(e.target.value)}
                style={inputBase} onFocus={onFocus} onBlur={onBlur} />
        )
    }

    // ── Number / Currency ─────────────────────────────────────────────────────
    if (field.typeAsString === 'Number' || field.typeAsString === 'Currency') {
        return (
            <input type="number" value={value} onChange={e => onChange(e.target.value)}
                placeholder={`Enter ${field.displayName}…`}
                style={inputBase} onFocus={onFocus} onBlur={onBlur} />
        )
    }

    // ── Note ──────────────────────────────────────────────────────────────────
    if (field.typeAsString === 'Note') {
        return (
            <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
                style={{ ...inputBase, resize: 'vertical', lineHeight: 1.5 }}
                onFocus={onFocus} onBlur={onBlur} />
        )
    }

    // ── Default: Text ─────────────────────────────────────────────────────────
    return (
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
            placeholder={`Enter ${field.displayName}…`}
            style={inputBase} onFocus={onFocus} onBlur={onBlur} />
    )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function FixPanel() {
    const {
        manifest,
        selectedItemId,
        setSelectedItem,
        removeFromQueue,
        settings,
        getWorkQueue,
    } = useGovernanceStore()

    const overlayRef = useRef<HTMLDivElement>(null)

    const queueItem = selectedItemId != null
        ? getWorkQueue().find(i => i.compositeId === selectedItemId)
        : null

    const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)
    const [logCount, setLogCount] = useState(0)

    // Derive library name for this item
    const libraryName = queueItem
        ? manifest?.libraries.find(l => l.serverRelativeUrl === queueItem.libraryUrl)?.libraryName ?? queueItem.libraryName
        : ''

    useEffect(() => {
        if (!selectedItemId) return
        const qi = getWorkQueue().find(i => i.compositeId === selectedItemId)
        if (!qi) return
        const initial: Record<string, string> = {}
        qi.gaps.forEach(g => { initial[g.internalName] = '' })
        setFieldValues(initial)
        setSaveError(null)
        setSaved(false)
    }, [selectedItemId])

    useEffect(() => { setLogCount(readLocalLog().length) }, [selectedItemId])

    const close = () => setSelectedItem(null)

    const onOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === overlayRef.current) close()
    }

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [])

    // allFilled — special handling for types that store JSON or comma-separated values
    const allFilled = queueItem
        ? queueItem.gaps.every(g => {
            const v = (fieldValues[g.internalName] ?? '').trim()
            if (!v) return false
            // User fields store JSON array — check at least one resolved
            if (g.typeAsString === 'User' || g.typeAsString === 'UserMulti') {
                try { return JSON.parse(v).length > 0 } catch { return false }
            }
            return true
        })
        : false

    const handleSave = async () => {
        if (!queueItem || !manifest) return
        setSaving(true)
        setSaveError(null)

        try {
            const fields = queueItem.gaps.map(g => ({
                internalName: g.internalName,
                typeAsString: g.typeAsString,
                value: fieldValues[g.internalName] ?? '',
            }))

            await remediateItem({
                siteUrl: manifest.siteUrl,
                libraryName: queueItem.libraryName,
                itemId: queueItem.itemId,
                fields,
            })

            const logFields: FieldValue[] = queueItem.gaps.map(g => ({
                internalName: g.internalName,
                displayName: g.displayName,
                typeAsString: g.typeAsString,
                value: fieldValues[g.internalName] ?? '',
            }))

            appendLocalLog(buildLogEntry(
                queueItem.fileName,
                queueItem.libraryName,
                queueItem.itemUrl,
                logFields,
                manifest.generatedAt
            ))

            setLogCount(readLocalLog().length)
            setSaving(false)
            setSaved(true)

            setTimeout(() => {
                removeFromQueue(queueItem.compositeId)
                setSelectedItem(null)
            }, 900)

        } catch (err: any) {
            setSaveError(err.message ?? 'Remediation failed. Make sure the API is running.')
            setSaving(false)
        }
    }
    console.log('[FixPanel] libraryName:', libraryName, '| siteUrl:', manifest?.siteUrl, '| queueItem:', queueItem?.libraryName)
    if (!selectedItemId || !queueItem) return null

    return (
        <div
            ref={overlayRef}
            onClick={onOverlayClick}
            style={{
                position: 'fixed', inset: 0, zIndex: 200,
                background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)',
                display: 'flex', justifyContent: 'flex-end',
            }}
        >
            <div style={{
                width: '460px', maxWidth: '100vw', height: '100%',
                background: 'var(--card)', borderLeft: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column',
                boxShadow: '-8px 0 40px rgba(0,0,0,0.18)',
                animation: 'slideInRight 0.22s ease',
            }}>

                {/* Header */}
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text3)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>
                                // Fix Panel
                            </div>
                            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', wordBreak: 'break-word', lineHeight: 1.3 }}>
                                {queueItem.fileName}
                            </div>
                        </div>
                        <button onClick={close} style={{
                            background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
                            width: '32px', height: '32px', cursor: 'pointer', color: 'var(--text2)',
                            fontSize: '16px', flexShrink: 0, marginLeft: '12px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>✕</button>
                    </div>
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text3)' }}>
                            {queueItem.libraryName}
                        </div>
                        <a href={queueItem.itemUrl} target="_blank" rel="noopener noreferrer"
                            style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--cyan-text)', wordBreak: 'break-all', lineHeight: 1.5 }}>
                            Open in SharePoint ↗
                        </a>
                    </div>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text3)', letterSpacing: '1px' }}>
                        {queueItem.gaps.length} field{queueItem.gaps.length !== 1 ? 's' : ''} require values
                    </div>

                    {queueItem.gaps.map(gap => {
                        const libFields = manifest?.libraries
                            .find(l => l.libraryName === queueItem.libraryName)?.fields ?? []
                        const schemaField = libFields.find(f => f.internalName === gap.internalName)

                        return (
                            <div key={gap.internalName}>
                                <div style={{
                                    fontSize: '12px', fontWeight: 700, color: 'var(--text)',
                                    marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px',
                                }}>
                                    {gap.displayName}
                                    <span style={{
                                        fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--text3)',
                                        background: 'var(--card2)', padding: '2px 6px',
                                        borderRadius: '4px', border: '1px solid var(--border)',
                                    }}>
                                        {gap.typeAsString}
                                    </span>
                                </div>
                                <FieldWidget
                                    field={{
                                        internalName: gap.internalName,
                                        displayName: gap.displayName,
                                        typeAsString: gap.typeAsString,
                                        value: fieldValues[gap.internalName] ?? '',
                                        allowedValues: schemaField?.allowedValues,
                                    }}
                                    value={fieldValues[gap.internalName] ?? ''}
                                    onChange={v => setFieldValues(prev => ({ ...prev, [gap.internalName]: v }))}
                                    siteUrl={manifest?.siteUrl ?? ''}
                                    listName={libraryName}
                                />
                            </div>
                        )
                    })}

                    {saveError && (
                        <div style={{
                            padding: '12px 14px', borderRadius: '8px',
                            background: 'rgba(232,0,90,0.07)', border: '1px solid rgba(232,0,90,0.25)',
                            fontSize: '12px', color: 'var(--pink)', lineHeight: 1.5,
                        }}>
                            ✕ {saveError}
                        </div>
                    )}

                    {saved && (
                        <div style={{
                            padding: '12px 14px', borderRadius: '8px',
                            background: 'rgba(0,166,122,0.07)', border: '1px solid rgba(0,166,122,0.25)',
                            fontSize: '12px', color: 'var(--green)',
                            display: 'flex', alignItems: 'center', gap: '8px',
                        }}>
                            <span>✓</span> Remediation logged. Removing from queue…
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px', borderTop: '1px solid var(--border)',
                    flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '10px',
                }}>
                    <div style={{
                        fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--text3)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <span>
                            Logging → {settings.loggingMode === 'sharepoint'
                                ? `SharePoint: ${settings.spLogListName}`
                                : 'Browser storage'}
                        </span>
                        {settings.loggingMode === 'local' && logCount > 0 && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button onClick={() => exportLog('csv')} style={{
                                    background: 'none', border: '1px solid var(--border)',
                                    borderRadius: '5px', padding: '2px 8px', fontSize: '9px',
                                    color: 'var(--text3)', cursor: 'pointer', fontFamily: 'DM Mono, monospace',
                                }}>CSV ↓</button>
                                <button onClick={() => exportLog('json')} style={{
                                    background: 'none', border: '1px solid var(--border)',
                                    borderRadius: '5px', padding: '2px 8px', fontSize: '9px',
                                    color: 'var(--text3)', cursor: 'pointer', fontFamily: 'DM Mono, monospace',
                                }}>JSON ↓</button>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={!allFilled || saving || saved}
                        style={{
                            width: '100%', padding: '12px', borderRadius: '10px',
                            background: allFilled && !saving && !saved
                                ? 'linear-gradient(135deg, rgba(0,191,168,0.18), rgba(37,99,235,0.14))'
                                : 'var(--card2)',
                            border: allFilled && !saving && !saved
                                ? '1.5px solid rgba(0,191,168,0.5)'
                                : '1.5px solid var(--border)',
                            color: allFilled && !saving && !saved ? 'var(--cyan-text)' : 'var(--text3)',
                            fontFamily: 'Plus Jakarta Sans, sans-serif',
                            fontSize: '13px', fontWeight: 700,
                            cursor: allFilled && !saving && !saved ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s',
                        }}
                    >
                        {saving ? 'Patching SharePoint…' : saved ? '✓ Saved' : 'Log Remediation'}
                    </button>
                </div>
            </div>
        </div>
    )
}