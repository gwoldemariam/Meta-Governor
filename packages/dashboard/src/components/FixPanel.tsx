import { useState, useEffect, useRef } from 'react'
import { useGovernanceStore } from '../store/useGovernanceStore'

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
        const rows = log.map(e =>
            headers.map(h => `"${(e as any)[h] ?? ''}"`).join(',')
        )
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

async function postToSharePoint(
    siteUrl: string,
    listName: string,
    entry: RemediationLogEntry
): Promise<{ ok: boolean; error?: string }> {
    try {
        const endpoint = `${siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(listName)}')/items`
        const body = {
            __metadata: { type: 'SP.Data.ListItem' },
            Title: entry.fileName,
            FileName: entry.fileName,
            LibraryName: entry.libraryName,
            ItemUrl: entry.itemUrl,
            FieldsFixed: entry.fieldsFixed,
            FixedBy: entry.fixedBy,
            FixedAt: entry.fixedAt,
            ManifestDate: entry.manifestDate,
        }
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Accept': 'application/json;odata=verbose',
                'Content-Type': 'application/json;odata=verbose',
            },
            body: JSON.stringify(body),
            credentials: 'include',
        })
        if (!res.ok) {
            const text = await res.text()
            return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 120)}` }
        }
        return { ok: true }
    } catch (err: any) {
        return { ok: false, error: err?.message ?? 'Unknown error' }
    }
}

// ─── Tag input for Taxonomy fields ───────────────────────────────────────────

function TagInput({
    value,
    onChange,
    multi,
}: {
    value: string
    onChange: (v: string) => void
    multi: boolean
}) {
    const tags = value ? value.split(';').map(t => t.trim()).filter(Boolean) : []
    const [input, setInput] = useState('')

    const addTag = () => {
        const trimmed = input.trim()
        if (!trimmed) return
        if (!multi) {
            onChange(trimmed)
            setInput('')
            return
        }
        if (!tags.includes(trimmed)) {
            onChange([...tags, trimmed].join('; '))
        }
        setInput('')
    }

    const removeTag = (tag: string) => {
        onChange(tags.filter(t => t !== tag).join('; '))
    }

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            addTag()
        }
        if (e.key === 'Backspace' && input === '' && tags.length > 0) {
            removeTag(tags[tags.length - 1])
        }
    }

    return (
        <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border2)',
            borderRadius: '8px',
            padding: '6px 10px',
            minHeight: '42px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '5px',
            alignItems: 'center',
            cursor: 'text',
            transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
            onClick={e => (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus()}
        >
            {/* Existing tags */}
            {tags.map(tag => (
                <span key={tag} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 8px',
                    borderRadius: '5px',
                    background: 'rgba(37,99,235,0.09)',
                    border: '1px solid rgba(37,99,235,0.25)',
                    color: 'var(--blue)',
                    fontFamily: 'DM Mono, monospace',
                    fontSize: '11px',
                }}>
                    {tag}
                    <span
                        onClick={e => { e.stopPropagation(); removeTag(tag) }}
                        style={{ cursor: 'pointer', opacity: 0.6, fontSize: '12px', lineHeight: 1 }}
                    >
                        ×
                    </span>
                </span>
            ))}

            {/* Input — hidden for single-value once filled */}
            {(!multi && tags.length === 0) || multi ? (
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    onBlur={addTag}
                    placeholder={tags.length === 0
                        ? multi ? 'Type a term, press Enter to add…' : 'Type a term and press Enter…'
                        : 'Add another term…'
                    }
                    style={{
                        flex: 1,
                        minWidth: '120px',
                        background: 'none',
                        border: 'none',
                        outline: 'none',
                        fontFamily: 'Plus Jakarta Sans, sans-serif',
                        fontSize: '13px',
                        color: 'var(--text)',
                        padding: '2px 2px',
                    }}
                />
            ) : (
                // Single value filled — show edit affordance
                <span
                    onClick={() => { removeTag(tags[0]); }}
                    style={{
                        fontFamily: 'DM Mono, monospace',
                        fontSize: '9px',
                        color: 'var(--text3)',
                        cursor: 'pointer',
                        marginLeft: '4px',
                    }}
                >
                    ✕ clear
                </span>
            )}
        </div>
    )
}

// ─── Field input ──────────────────────────────────────────────────────────────

function FieldInput({
    field,
    value,
    onChange,
}: {
    field: FieldValue
    value: string
    onChange: (v: string) => void
}) {
    const inputStyle: React.CSSProperties = {
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

    const focusStyle = (e: React.FocusEvent<any>) => {
        e.currentTarget.style.borderColor = 'rgba(0,191,168,0.5)'
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,191,168,0.1)'
    }
    const blurStyle = (e: React.FocusEvent<any>) => {
        e.currentTarget.style.borderColor = ''
        e.currentTarget.style.boxShadow = ''
    }

    // Taxonomy → tag input
    if (
        field.typeAsString === 'TaxonomyFieldType' ||
        field.typeAsString === 'TaxonomyFieldTypeMulti'
    ) {
        return (
            <div>
                <TagInput
                    value={value}
                    onChange={onChange}
                    multi={field.typeAsString === 'TaxonomyFieldTypeMulti'}
                />
                <div style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: '10px',
                    color: 'var(--text3)',
                    marginTop: '5px',
                }}>
                    Type the term label exactly as it appears in the term store
                </div>
            </div>
        )
    }

    // Choice field with known options → dropdown
    if (
        (field.typeAsString === 'Choice' || field.typeAsString === 'MultiChoice') &&
        field.allowedValues && field.allowedValues.length > 0
    ) {
        return (
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
                onFocus={focusStyle}
                onBlur={blurStyle}
            >
                <option value="">— Select —</option>
                {field.allowedValues.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        )
    }

    // Date field
    if (field.typeAsString === 'DateTime') {
        return (
            <input
                type="datetime-local"
                value={value}
                onChange={e => onChange(e.target.value)}
                style={inputStyle}
                onFocus={focusStyle}
                onBlur={blurStyle}
            />
        )
    }

    // Note / multi-line
    if (field.typeAsString === 'Note') {
        return (
            <textarea
                value={value}
                onChange={e => onChange(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                onFocus={focusStyle}
                onBlur={blurStyle}
            />
        )
    }

    // Default: text
    return (
        <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={`Enter ${field.displayName}…`}
            style={inputStyle}
            onFocus={focusStyle}
            onBlur={blurStyle}
        />
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

    // queueItem is the single source of truth — built fresh from live store
    const queueItem = selectedItemId != null
        ? getWorkQueue().find(i => i.compositeId === selectedItemId)
        : null

    // Snapshot queueItem into a ref so effects always see the latest value
    const queueItemRef = useRef(queueItem)
    useEffect(() => { queueItemRef.current = queueItem }, [queueItem])

    const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)
    const [logCount, setLogCount] = useState(0)

    // Initialize form fields whenever the selected item changes
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

    useEffect(() => {
        setLogCount(readLocalLog().length)
    }, [selectedItemId])

    const close = () => setSelectedItem(null)

    const onOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === overlayRef.current) close()
    }

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [])

    const allFilled = queueItem
        ? queueItem.gaps.every(g => (fieldValues[g.internalName] ?? '').trim() !== '')
        : false

    const handleSave = async () => {
        if (!queueItem || !manifest) return
        setSaving(true)
        setSaveError(null)

        const filledFields: FieldValue[] = queueItem.gaps.map(g => ({
            internalName: g.internalName,
            displayName: g.displayName,
            typeAsString: g.typeAsString,
            value: fieldValues[g.internalName] ?? '',
            allowedValues: undefined,
        }))

        const entry = buildLogEntry(
            queueItem.fileName,
            queueItem.libraryName,
            queueItem.itemUrl,
            filledFields,
            manifest.generatedAt
        )

        if (settings.loggingMode === 'sharepoint') {
            const result = await postToSharePoint(manifest.siteUrl, settings.spLogListName, entry)
            if (!result.ok) {
                setSaveError(`SharePoint log failed: ${result.error}. Entry saved locally as fallback.`)
                appendLocalLog(entry)
            }
        } else {
            appendLocalLog(entry)
        }

        setSaving(false)
        setSaved(true)
        setLogCount(readLocalLog().length)

        setTimeout(() => {
            removeFromQueue(queueItem.compositeId)
            setSelectedItem(null)
        }, 900)
    }

    // Don't render if nothing selected or item not found in queue
    if (!selectedItemId || !queueItem) return null

    return (
        <div
            ref={overlayRef}
            onClick={onOverlayClick}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 200,
                background: 'rgba(0,0,0,0.35)',
                backdropFilter: 'blur(2px)',
                display: 'flex',
                justifyContent: 'flex-end',
            }}
        >
            <div style={{
                width: '440px',
                maxWidth: '100vw',
                height: '100%',
                background: 'var(--card)',
                borderLeft: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '-8px 0 40px rgba(0,0,0,0.18)',
                animation: 'slideInRight 0.22s ease',
            }}>

                {/* Header */}
                <div style={{
                    padding: '20px 24px 16px',
                    borderBottom: '1px solid var(--border)',
                    flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{
                                fontFamily: 'DM Mono, monospace',
                                fontSize: '10px',
                                color: 'var(--text3)',
                                letterSpacing: '2px',
                                textTransform: 'uppercase',
                                marginBottom: '4px'
                            }}>
                                // Fix Panel
                            </div>
                            <div style={{
                                fontSize: '15px',
                                fontWeight: 700,
                                color: 'var(--text)',
                                wordBreak: 'break-word',
                                lineHeight: 1.3,
                            }}>
                                {queueItem.fileName}
                            </div>
                        </div>
                        <button
                            onClick={close}
                            style={{
                                background: 'none',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                width: '32px',
                                height: '32px',
                                cursor: 'pointer',
                                color: 'var(--text2)',
                                fontSize: '16px',
                                flexShrink: 0,
                                marginLeft: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Library + link */}
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{
                            fontFamily: 'DM Mono, monospace',
                            fontSize: '10px',
                            color: 'var(--text3)',
                        }}>
                            {queueItem.libraryName}
                        </div>
                        <a
                            href={queueItem.itemUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                fontFamily: 'DM Mono, monospace',
                                fontSize: '10px',
                                color: 'var(--cyan-text)',
                                wordBreak: 'break-all',
                                lineHeight: 1.5,
                            }}
                        >
                            Open in SharePoint ↗
                        </a>
                    </div>
                </div>

                {/* Body */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '20px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '18px',
                }}>
                    <div style={{
                        fontFamily: 'DM Mono, monospace',
                        fontSize: '10px',
                        color: 'var(--text3)',
                        letterSpacing: '1px',
                    }}>
                        {queueItem.gaps.length} field{queueItem.gaps.length !== 1 ? 's' : ''} require values
                    </div>

                    {queueItem.gaps.map(gap => {
                        const libFields = manifest?.libraries
                            .find(l => l.libraryName === queueItem.libraryName)
                            ?.fields ?? []
                        const schemaField = libFields.find(f => f.internalName === gap.internalName)

                        return (
                            <div key={gap.internalName}>
                                <div style={{
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    color: 'var(--text)',
                                    marginBottom: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                }}>
                                    {gap.displayName}
                                    <span style={{
                                        fontFamily: 'DM Mono, monospace',
                                        fontSize: '9px',
                                        color: 'var(--text3)',
                                        background: 'var(--card2)',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        border: '1px solid var(--border)',
                                    }}>
                                        {gap.typeAsString}
                                    </span>
                                </div>
                                <FieldInput
                                    field={{
                                        internalName: gap.internalName,
                                        displayName: gap.displayName,
                                        typeAsString: gap.typeAsString,
                                        value: fieldValues[gap.internalName] ?? '',
                                        allowedValues: schemaField?.allowedValues,
                                    }}
                                    value={fieldValues[gap.internalName] ?? ''}
                                    onChange={v => setFieldValues(prev => ({
                                        ...prev,
                                        [gap.internalName]: v
                                    }))}
                                />
                            </div>
                        )
                    })}

                    {saveError && (
                        <div style={{
                            padding: '12px 14px',
                            borderRadius: '8px',
                            background: 'rgba(232,0,90,0.07)',
                            border: '1px solid rgba(232,0,90,0.25)',
                            fontSize: '12px',
                            color: 'var(--pink)',
                            lineHeight: 1.5,
                        }}>
                            {saveError}
                        </div>
                    )}

                    {saved && (
                        <div style={{
                            padding: '12px 14px',
                            borderRadius: '8px',
                            background: 'rgba(0,166,122,0.07)',
                            border: '1px solid rgba(0,166,122,0.25)',
                            fontSize: '12px',
                            color: 'var(--green)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}>
                            <span>✓</span> Remediation logged. Removing from queue…
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid var(--border)',
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                }}>
                    <div style={{
                        fontFamily: 'DM Mono, monospace',
                        fontSize: '10px',
                        color: 'var(--text3)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <span>
                            Logging → {settings.loggingMode === 'sharepoint'
                                ? `SharePoint: ${settings.spLogListName}`
                                : 'Browser storage'}
                        </span>
                        {settings.loggingMode === 'local' && logCount > 0 && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                    onClick={() => exportLog('csv')}
                                    style={{
                                        background: 'none',
                                        border: '1px solid var(--border)',
                                        borderRadius: '5px',
                                        padding: '2px 8px',
                                        fontSize: '9px',
                                        color: 'var(--text3)',
                                        cursor: 'pointer',
                                        fontFamily: 'DM Mono, monospace',
                                    }}
                                >
                                    CSV ↓
                                </button>
                                <button
                                    onClick={() => exportLog('json')}
                                    style={{
                                        background: 'none',
                                        border: '1px solid var(--border)',
                                        borderRadius: '5px',
                                        padding: '2px 8px',
                                        fontSize: '9px',
                                        color: 'var(--text3)',
                                        cursor: 'pointer',
                                        fontFamily: 'DM Mono, monospace',
                                    }}
                                >
                                    JSON ↓
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={!allFilled || saving || saved}
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '10px',
                            background: allFilled && !saving && !saved
                                ? 'linear-gradient(135deg, rgba(0,191,168,0.18), rgba(37,99,235,0.14))'
                                : 'var(--card2)',
                            border: allFilled && !saving && !saved
                                ? '1.5px solid rgba(0,191,168,0.5)'
                                : '1.5px solid var(--border)',
                            color: allFilled && !saving && !saved
                                ? 'var(--cyan-text)'
                                : 'var(--text3)',
                            fontFamily: 'Plus Jakarta Sans, sans-serif',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: allFilled && !saving && !saved ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s',
                        }}
                    >
                        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Log Remediation'}
                    </button>
                </div>
            </div>
        </div >
    )
}