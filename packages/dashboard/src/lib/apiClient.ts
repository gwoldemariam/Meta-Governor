const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3001'

export interface RemediateField {
    internalName: string
    value: string
    typeAsString: string
}

export interface RemediateRequest {
    siteUrl: string
    libraryName: string
    itemId: number
    fields: RemediateField[]
}

export interface RemediateResponse {
    success: boolean
    itemId: number
    fieldsPatched: number
}

export interface TermOption {
    label: string
    guid: string
}

export interface LookupOption {
    id: number
    label: string
}

export interface ResolvedUser {
    id: number
    displayName: string
    email: string
}

export async function remediateItem(payload: RemediateRequest): Promise<RemediateResponse> {
    const res = await fetch(`${API_BASE}/api/remediate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error ?? `API error ${res.status}`)
    }
    return res.json()
}

export async function fetchTerms(
    siteUrl: string,
    fieldInternalName: string,
    listName: string
): Promise<TermOption[]> {
    const params = new URLSearchParams({ siteUrl, fieldInternalName, listName })
    const res = await fetch(`${API_BASE}/api/terms?${params}`)
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error ?? `Failed to fetch terms`)
    }
    const data = await res.json()
    return data.terms ?? []
}

export async function fetchLookupItems(
    siteUrl: string,
    fieldInternalName: string,
    listName: string
): Promise<LookupOption[]> {
    const params = new URLSearchParams({ siteUrl, fieldInternalName, listName })
    const res = await fetch(`${API_BASE}/api/lookupitems?${params}`)
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error ?? `Failed to fetch lookup items`)
    }
    const data = await res.json()
    return data.items ?? []
}

export async function resolveUser(
    siteUrl: string,
    upn: string
): Promise<ResolvedUser> {
    const params = new URLSearchParams({ siteUrl, upn })
    const res = await fetch(`${API_BASE}/api/resolveuser?${params}`)
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error ?? `Could not resolve user: ${upn}`)
    }
    const data = await res.json()
    return data.user
}

export async function checkApiHealth(): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/api/health`)
        return res.ok
    } catch {
        return false
    }
}