import { Router, Request, Response } from 'express'
import { getConfidentialClient } from '../auth/oboClient'

export const remediateRouter = Router()

interface RemediateBody {
    siteUrl: string
    libraryName: string
    itemId: number
    fileName: string
    fields: { internalName: string; displayName: string; value: string; typeAsString: string }[]
    loggingSettings?: {
        loggingMode: 'local' | 'sharepoint'
        spLogListName: string
    }
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
        const metaJson: any = await metaRes.json()
        const entityType = metaJson?.d?.ListItemEntityTypeFullName
        if (!entityType) {
            return res.status(500).json({ error: 'Could not resolve ListItemEntityTypeFullName' })
        }

        // 3. Fetch current item to capture old values for logging
        const itemRes = await fetch(
            `${siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(libraryName)}')/items(${itemId})`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json;odata=nometadata',
                }
            }
        )

        const oldItemData: any = itemRes.ok ? await itemRes.json() : {}

        // 4. Separate taxonomy from regular fields
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

        // 5. PATCH regular fields all at once
        if (regularFields.length > 0) {
            const regularBody: Record<string, any> = { __metadata: { type: entityType } }
            for (const f of regularFields) buildFieldPatch(regularBody, f)

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
        }

        // 6. PATCH taxonomy fields via ValidateUpdateListItem
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

            const validateJson: any = await validateRes.json()
            const results = validateJson?.d?.ValidateUpdateListItem?.results ?? validateJson

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
        }

        // Write to SharePoint log if enabled
        const { loggingSettings, fileName } = req.body as RemediateBody
        if (loggingSettings?.loggingMode === 'sharepoint') {
            try {
                // Consolidate all field fixes into a single log entry
                await writeLogToSharePoint(
                    siteUrl,
                    loggingSettings.spLogListName,
                    token,
                    {
                        itemId,
                        fileName: fileName || `Item ${itemId}`,
                        libraryName,
                        fields: fields.map(f => ({
                            fieldName: f.displayName || f.internalName,
                            oldValue: formatOldValue(oldItemData[f.internalName]),
                            newValue: f.value
                        })),
                        fixedBy: 'System',
                        fixedAt: new Date().toISOString(),
                        status: 'Success'
                    }
                )
            } catch (logErr: any) {
                console.error('[remediate] Failed to write to SharePoint log:', logErr.message)
                // Don't fail the remediation if logging fails
            }
        }

        return res.json({ success: true, itemId, fieldsPatched: fields.length })

    } catch (err: any) {
        console.error('[remediate] error:', err)
        return res.status(500).json({ error: err.message ?? 'Internal server error' })
    }
})

// ─── Helper: Format Old Value ─────────────────────────────────────────────────

function formatOldValue(value: any): string | null {
    if (value === null || value === undefined || value === '') {
        return null
    }

    // Handle objects (like lookup fields)
    if (typeof value === 'object' && !Array.isArray(value)) {
        if (value.Title) return value.Title
        if (value.Label) return value.Label
        return JSON.stringify(value)
    }

    // Handle arrays (multi-value fields)
    if (Array.isArray(value)) {
        return value.map(v => v.Title || v.Label || v).join('; ')
    }

    return String(value)
}

// ─── Helper: Write Log to SharePoint ─────────────────────────────────────────

async function writeLogToSharePoint(
    siteUrl: string,
    listName: string,
    token: string,
    entry: {
        itemId: number
        fileName: string
        libraryName: string
        fields: Array<{ fieldName: string; oldValue: string | null; newValue: string }>
        fixedBy: string
        fixedAt: string
        status: string
    }
) {
    // First, get the actual field internal names from the list
    const fieldsRes = await fetch(
        `${siteUrl}/_api/web/lists/getbytitle('${listName}')/fields?$filter=Hidden eq false&$select=InternalName,Title`,
        {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json;odata=nometadata',
            }
        }
    )

    if (!fieldsRes.ok) {
        console.error('[remediate] Failed to fetch list fields')
    }

    const fieldsData: any = await fieldsRes.json()
    const fields = fieldsData.value || []

    // Create a mapping of our field names to actual internal names
    const fieldMap: any = {}
    for (const field of fields) {
        const internalName = field.InternalName
        if (internalName.includes('DocumentItemId') || field.Title === 'Document Item ID') {
            fieldMap.DocumentItemId = internalName
        } else if (internalName.includes('FileName') || field.Title === 'File Name') {
            fieldMap.FileName = internalName
        } else if (internalName.includes('LibraryName') || field.Title === 'Library Name') {
            fieldMap.LibraryName = internalName
        } else if (internalName.includes('FieldsFixed') || field.Title === 'Fields Fixed') {
            fieldMap.FieldsFixed = internalName
        } else if (internalName.includes('FixedBy') || field.Title === 'Fixed By') {
            fieldMap.FixedBy = internalName
        } else if (internalName.includes('FixedAt') || field.Title === 'Fixed At') {
            fieldMap.FixedAt = internalName
        } else if (internalName.includes('Status') && field.Title === 'Status') {
            fieldMap.Status = internalName
        }
    }

    // Build formatted list of fixed fields
    const fieldsFixedText = entry.fields.map(f =>
        `${f.fieldName}: ${f.oldValue || '(empty)'} → ${f.newValue}`
    ).join('\n')

    const fieldCount = entry.fields.length
    const fieldNames = entry.fields.map(f => f.fieldName).join(', ')

    // Format timestamp as readable date-time
    const fixedDate = new Date(entry.fixedAt)
    const timestamp = fixedDate.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).replace(',', '')

    // Build the item body using the actual internal names
    const itemBody: any = {
        'Title': `${timestamp} | ${entry.fileName} | ${fieldCount} field${fieldCount > 1 ? 's' : ''} fixed`
    }

    if (fieldMap.DocumentItemId) itemBody[fieldMap.DocumentItemId] = entry.itemId
    if (fieldMap.FileName) itemBody[fieldMap.FileName] = entry.fileName
    if (fieldMap.LibraryName) itemBody[fieldMap.LibraryName] = entry.libraryName
    if (fieldMap.FieldsFixed) itemBody[fieldMap.FieldsFixed] = fieldsFixedText
    if (fieldMap.FixedBy) itemBody[fieldMap.FixedBy] = entry.fixedBy
    if (fieldMap.FixedAt) itemBody[fieldMap.FixedAt] = entry.fixedAt
    if (fieldMap.Status) itemBody[fieldMap.Status] = entry.status

    const res = await fetch(
        `${siteUrl}/_api/web/lists/getbytitle('${listName}')/items`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json;odata=nometadata',
                'Accept': 'application/json;odata=nometadata',
            },
            body: JSON.stringify(itemBody)
        }
    )

    if (!res.ok) {
        const error = await res.text()
        throw new Error(`Failed to write log: ${error}`)
    }
}