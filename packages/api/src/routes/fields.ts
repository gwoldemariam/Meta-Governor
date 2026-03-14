import { Router, Request, Response } from 'express'
import { getConfidentialClient } from '../auth/oboClient'

export const fieldsRouter = Router()

// ── Token helpers ─────────────────────────────────────────────────────────────

async function getToken(siteUrl: string): Promise<string> {
    const spOrigin = new URL(siteUrl).origin
    const client = getConfidentialClient()
    const tokenResult = await client.acquireTokenByClientCredential({
        scopes: [`${spOrigin}/.default`],
    })
    if (!tokenResult?.accessToken) throw new Error('Failed to acquire SharePoint token')
    return tokenResult.accessToken
}

async function getGraphToken(): Promise<string> {
    const client = getConfidentialClient()
    const tokenResult = await client.acquireTokenByClientCredential({
        scopes: ['https://graph.microsoft.com/.default'],
    })
    if (!tokenResult?.accessToken) throw new Error('Failed to acquire Graph token')
    return tokenResult.accessToken
}

function spHeaders(token: string) {
    return {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json;odata=verbose',
        'Content-Type': 'application/json;odata=verbose',
    }
}

// ── GET /api/terms ────────────────────────────────────────────────────────────

fieldsRouter.get('/terms', async (req: Request, res: Response) => {
    try {
        const { siteUrl, fieldInternalName, listName } = req.query as Record<string, string>
        if (!siteUrl || !fieldInternalName || !listName) {
            return res.status(400).json({ error: 'siteUrl, fieldInternalName and listName are required' })
        }

        // 1. Get field schema to extract TermSetId
        const siteToken = await getToken(siteUrl)
        const fieldRes = await fetch(
            `${siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(listName)}')/fields?$filter=InternalName eq '${fieldInternalName}'`,
            { headers: spHeaders(siteToken) }
        )
        if (!fieldRes.ok) throw new Error('Failed to fetch field schema')
        const fieldJson = await fieldRes.json()
        const field = fieldJson?.d?.results?.[0]
        if (!field) return res.status(404).json({ error: 'Field not found' })

        const termSetId = field.TermSetId
        console.log('[fields/terms] termSetId:', termSetId)

        if (!termSetId) {
            return res.status(400).json({ error: 'Field is not a valid taxonomy field' })
        }

        // 2. Get SharePoint site ID via Graph
        const graphToken = await getGraphToken()
        const hostname = new URL(siteUrl).hostname
        const sitePath = new URL(siteUrl).pathname

        const siteRes = await fetch(
            `https://graph.microsoft.com/v1.0/sites/${hostname}:${sitePath}`,
            { headers: { 'Authorization': `Bearer ${graphToken}`, 'Accept': 'application/json' } }
        )
        if (!siteRes.ok) {
            const errText = await siteRes.text()
            throw new Error(`Failed to fetch site from Graph: ${errText.slice(0, 200)}`)
        }
        const siteJson = await siteRes.json()
        const siteId = siteJson?.id

        console.log('[fields/terms] siteId:', siteId)

        // 3. Fetch terms via Graph termStore
        const termsRes = await fetch(
            `https://graph.microsoft.com/v1.0/sites/${siteId}/termStore/sets/${termSetId}/terms`,
            { headers: { 'Authorization': `Bearer ${graphToken}`, 'Accept': 'application/json' } }
        )

        if (!termsRes.ok) {
            const errText = await termsRes.text()
            console.error('[fields/terms] Graph terms failed:', termsRes.status, errText.slice(0, 300))
            return res.status(502).json({
                error: 'Failed to fetch terms from term store',
                status: termsRes.status,
                detail: errText.slice(0, 300),
            })
        }

        const termsJson = await termsRes.json()
        const terms = (termsJson?.value ?? []).map((t: any) => ({
            label: t.labels?.[0]?.name ?? t.defaultLabel ?? t.id,
            guid: t.id,
        }))

        console.log(`[fields/terms] ✓ fetched ${terms.length} terms for ${fieldInternalName}`)
        return res.json({ terms })

    } catch (err: any) {
        console.error('[fields/terms] error:', err)
        return res.status(500).json({ error: err.message ?? 'Internal server error' })
    }
})

// ── GET /api/resolveuser ──────────────────────────────────────────────────────

fieldsRouter.get('/resolveuser', async (req: Request, res: Response) => {
    try {
        const { siteUrl, upn } = req.query as Record<string, string>
        if (!siteUrl || !upn) {
            return res.status(400).json({ error: 'siteUrl and upn are required' })
        }

        const token = await getToken(siteUrl)
        const encUpn = encodeURIComponent(`i:0#.f|membership|${upn}`)

        const userRes = await fetch(
            `${siteUrl}/_api/web/ensureuser(@v)?@v='${encUpn}'`,
            {
                method: 'POST',
                headers: {
                    ...spHeaders(token),
                    'Content-Length': '0',
                },
            }
        )

        if (!userRes.ok) {
            const errText = await userRes.text()
            return res.status(404).json({ error: `Could not resolve user: ${upn}`, detail: errText })
        }

        const userJson = await userRes.json()
        const user = {
            id: userJson?.d?.Id,
            displayName: userJson?.d?.Title,
            email: userJson?.d?.Email,
        }

        console.log(`[fields/resolveuser] ✓ resolved ${upn} → ID ${user.id}`)
        return res.json({ user })

    } catch (err: any) {
        console.error('[fields/resolveuser] error:', err)
        return res.status(500).json({ error: err.message ?? 'Internal server error' })
    }
})

// ── GET /api/lookupitems ──────────────────────────────────────────────────────

fieldsRouter.get('/lookupitems', async (req: Request, res: Response) => {
    try {
        const { siteUrl, fieldInternalName, listName } = req.query as Record<string, string>
        if (!siteUrl || !fieldInternalName || !listName) {
            return res.status(400).json({ error: 'siteUrl, fieldInternalName and listName are required' })
        }

        const token = await getToken(siteUrl)

        const fieldRes = await fetch(
            `${siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(listName)}')/fields?$filter=InternalName eq '${fieldInternalName}'`,
            { headers: spHeaders(token) }
        )
        if (!fieldRes.ok) throw new Error('Failed to fetch field schema')
        const fieldJson = await fieldRes.json()
        const field = fieldJson?.d?.results?.[0]
        if (!field) return res.status(404).json({ error: 'Field not found' })

        const lookupListId = field.LookupList?.replace('{', '').replace('}', '')
        const lookupFieldName = field.LookupField ?? 'Title'

        if (!lookupListId) {
            return res.status(400).json({ error: 'Field is not a valid lookup field' })
        }

        const itemsRes = await fetch(
            `${siteUrl}/_api/web/lists(guid'${lookupListId}')/items?$select=ID,${lookupFieldName}&$top=500&$orderby=${lookupFieldName}`,
            { headers: spHeaders(token) }
        )
        if (!itemsRes.ok) throw new Error('Failed to fetch lookup items')
        const itemsJson = await itemsRes.json()

        const items = (itemsJson?.d?.results ?? []).map((item: any) => ({
            id: item.ID,
            label: item[lookupFieldName] ?? item.Title ?? `Item ${item.ID}`,
        }))

        console.log(`[fields/lookupitems] ✓ fetched ${items.length} items for ${fieldInternalName}`)
        return res.json({ items })

    } catch (err: any) {
        console.error('[fields/lookupitems] error:', err)
        return res.status(500).json({ error: err.message ?? 'Internal server error' })
    }
})

fieldsRouter.get('/debugfields', async (req: Request, res: Response) => {
    const { siteUrl, listName } = req.query as Record<string, string>
    const token = await getToken(siteUrl)
    const r = await fetch(
        `${siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(listName)}')/fields?$filter=TypeAsString eq 'Note'&$select=InternalName,Title,Id,Hidden`,
        { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json;odata=verbose' } }
    )
    const j = await r.json()
    return res.json(j?.d?.results ?? j)
})