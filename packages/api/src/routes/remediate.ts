import { Router, Request, Response } from 'express'
import { getConfidentialClient } from '../auth/oboClient'

export const remediateRouter = Router()

interface RemediateBody {
    siteUrl: string
    libraryName: string
    itemId: number
    fields: { internalName: string; value: string; typeAsString: string }[]
}

function buildFieldPatch(
    patchBody: Record<string, any>,
    f: { internalName: string; value: string; typeAsString: string }
) {
    const v = f.value

    switch (f.typeAsString) {
        case 'DateTime':
            patchBody[f.internalName] = v ? new Date(v).toISOString() : null
            break
        case 'Number':
        case 'Currency':
            patchBody[f.internalName] = v !== '' ? Number(v) : null
            break
        case 'Boolean':
            patchBody[f.internalName] = v === '1' || v === 'true' ? 1 : 0
            break
        case 'MultiChoice':
            patchBody[f.internalName] = v
                ? ';#' + v.split(';').map((s: string) => s.trim()).filter(Boolean).join(';#') + ';#'
                : ''
            break
        case 'URL':
            try {
                const parsed = JSON.parse(v)
                patchBody[f.internalName] = {
                    __metadata: { type: 'SP.FieldUrlValue' },
                    Url: parsed.url,
                    Description: parsed.description ?? parsed.url,
                }
            } catch {
                patchBody[f.internalName] = {
                    __metadata: { type: 'SP.FieldUrlValue' },
                    Url: v,
                    Description: v,
                }
            }
            break
        case 'User':
            patchBody[f.internalName + 'Id'] = Number(JSON.parse(v)[0]?.id)
            break
        case 'UserMulti':
            patchBody[f.internalName + 'Id'] = {
                __metadata: { type: 'Collection(Edm.Int32)' },
                results: JSON.parse(v).map((u: any) => u.id),
            }
            break
        case 'Lookup':
            patchBody[f.internalName + 'Id'] = Number(v)
            break
        case 'LookupMulti':
            patchBody[f.internalName + 'Id'] = {
                __metadata: { type: 'Collection(Edm.Int32)' },
                results: v.split(',').map((id: string) => Number(id.trim())).filter(Boolean),
            }
            break
        default:
            patchBody[f.internalName] = v
            break
    }
}

remediateRouter.post('/remediate', async (req: Request, res: Response) => {
    try {
        const { siteUrl, libraryName, itemId, fields } = req.body as RemediateBody

        if (!siteUrl || !libraryName || !itemId || !fields?.length) {
            return res.status(400).json({ error: 'Missing required fields in request body' })
        }

        console.log('[remediate] fields received:', JSON.stringify(
            fields.map(f => ({ name: f.internalName, type: f.typeAsString }))
        ))

        // 1. Acquire token
        const spOrigin = new URL(siteUrl).origin
        const client = getConfidentialClient()
        const tokenResult = await client.acquireTokenByClientCredential({
            scopes: [`${spOrigin}/.default`],
        })
        if (!tokenResult?.accessToken) {
            return res.status(500).json({ error: 'Failed to acquire SharePoint token' })
        }
        const token = tokenResult.accessToken

        // 2. Fetch entity type
        const metaRes = await fetch(
            `${siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(libraryName)}')?$select=ListItemEntityTypeFullName`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json;odata=verbose',
                }
            }
        )
        if (!metaRes.ok) {
            return res.status(502).json({ error: 'Failed to fetch list metadata from SharePoint' })
        }
        const metaJson = await metaRes.json()
        const entityType = metaJson?.d?.ListItemEntityTypeFullName
        if (!entityType) {
            return res.status(500).json({ error: 'Could not resolve ListItemEntityTypeFullName' })
        }
        console.log(`[remediate] entity type: ${entityType}`)

        // 3. Separate taxonomy from regular fields
        const taxonomyFields = fields.filter(f =>
            f.typeAsString === 'TaxonomyFieldType' ||
            f.typeAsString === 'TaxonomyFieldTypeMulti'
        )
        const regularFields = fields.filter(f =>
            f.typeAsString !== 'TaxonomyFieldType' &&
            f.typeAsString !== 'TaxonomyFieldTypeMulti'
        )

        const endpoint = `${siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(libraryName)}')/items(${itemId})`
        const patchHeaders = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json;odata=verbose',
            'Accept': 'application/json;odata=verbose',
            'X-HTTP-Method': 'MERGE',
            'IF-MATCH': '*',
        }

        // 4. PATCH regular fields all at once
        if (regularFields.length > 0) {
            const regularBody: Record<string, any> = { __metadata: { type: entityType } }
            for (const f of regularFields) buildFieldPatch(regularBody, f)

            console.log('[remediate] regular PATCH body:', JSON.stringify(regularBody))

            const spRes = await fetch(endpoint, {
                method: 'POST',
                headers: patchHeaders,
                body: JSON.stringify(regularBody),
            })
            if (!spRes.ok) {
                const errText = await spRes.text()
                console.error('[remediate] regular PATCH failed:', errText)
                return res.status(502).json({ error: 'SharePoint PATCH failed', detail: errText })
            }
            console.log(`[remediate] ✓ patched ${regularFields.length} regular fields`)
        }

        // 5. PATCH taxonomy fields via ValidateUpdateListItem
        // FieldValue format: "Label|GUID" for single, "Label1|GUID1;Label2|GUID2" for multi
        if (taxonomyFields.length > 0) {

            const formValues = taxonomyFields.map(f => {
                if (f.typeAsString === 'TaxonomyFieldTypeMulti') {
                    const terms = JSON.parse(f.value)
                    return {
                        FieldName: f.internalName,
                        FieldValue: terms.map((t: any) => `${t.label}|${t.guid}`).join(';')
                    }
                } else {
                    const term = JSON.parse(f.value)
                    return {
                        FieldName: f.internalName,
                        FieldValue: `${term.label}|${term.guid}`
                    }
                }
            })

            const validateBody = {
                formValues,
                bNewDocumentUpdate: false,
            }

            console.log('[remediate] ValidateUpdateListItem body:', JSON.stringify(validateBody))

            const validateRes = await fetch(
                `${siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(libraryName)}')/items(${itemId})/ValidateUpdateListItem`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json;odata=verbose',
                        'Accept': 'application/json;odata=verbose',
                    },
                    body: JSON.stringify(validateBody),
                }
            )

            const validateJson = await validateRes.json()
            const results = validateJson?.d?.ValidateUpdateListItem?.results ?? validateJson
            console.log('[remediate] ValidateUpdateListItem response:', JSON.stringify(results))

            // Check for field-level errors
            const fieldErrors = (Array.isArray(results) ? results : [])
                .filter((r: any) => r.HasException)
            if (fieldErrors.length > 0) {
                console.error('[remediate] taxonomy field errors:', JSON.stringify(fieldErrors))
                return res.status(502).json({
                    error: 'Taxonomy field update failed',
                    detail: fieldErrors.map((e: any) => `${e.FieldName}: ${e.ErrorMessage}`).join(', ')
                })
            }

            if (!validateRes.ok) {
                const errText = await validateRes.text()
                console.error('[remediate] ValidateUpdateListItem failed:', errText)
                return res.status(502).json({ error: 'SharePoint taxonomy update failed', detail: errText })
            }

            console.log(`[remediate] ✓ taxonomy fields updated via ValidateUpdateListItem`)
        }

        console.log(`[remediate] ✓ all fields patched for item ${itemId}`)
        return res.json({ success: true, itemId, fieldsPatched: fields.length })

    } catch (err: any) {
        console.error('[remediate] error:', err)
        return res.status(500).json({ error: err.message ?? 'Internal server error' })
    }
})