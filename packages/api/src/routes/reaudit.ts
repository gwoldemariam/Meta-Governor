import { Router, Request, Response } from 'express'
import { getConfidentialClient } from '../auth/oboClient'

export const reauditRouter = Router()
console.log('[reaudit] router loaded')

// ─── TypeScript Interfaces ────────────────────────────────────────────────────

interface SPListResponse {
    value: Array<{
        Title: string
        Id: string
        ItemCount: number
        RootFolder: {
            ServerRelativeUrl: string
        }
    }>
}

interface SPFieldResponse {
    value: Array<{
        Title: string
        InternalName: string
        TypeAsString: string
        SchemaXml: string
        Choices?: {
            results: string[]
        }
    }>
}

interface SPItemsResponse {
    value: any[]
    'odata.nextLink'?: string
}

interface DiscoveredLibrary {
    title: string
    id: string
    itemCount: number
    serverRelativeUrl: string
}

interface DiscoveredField {
    title: string
    internalName: string
    typeAsString: string
    allowedValues?: string[]
}

interface ItemGap {
    internalName: string
    displayName: string
    typeAsString: string
    suggestedValue: null
}

interface AuditedItem {
    itemId: number
    fileName: string
    itemUrl?: string
    filePath?: string
    status: 'Pass' | 'Fail'
    riskScore: number
    gaps: ItemGap[]
    aiSuggestions?: null
}

interface ManifestField {
    displayName: string
    internalName: string
    typeAsString: string
    allowedValues?: string[]
}

interface LibraryReport {
    libraryName: string
    serverRelativeUrl: string
    listId?: string
    siteUrl: string
    schemaStatus: 'governed' | 'violations' | 'no-schema' | 'empty'
    fieldCount: number
    fields: ManifestField[]
    itemCount: number
    passCount: number
    failCount: number
    items: AuditedItem[]
}

interface TenantManifest {
    siteUrl: string
    libraries: LibraryReport[]
    summary?: {
        totalLibraries: number
        governedLibraries: number
        totalItems: number
        passCount: number
        failCount: number
        complianceRate: number
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getToken(siteUrl: string): Promise<string> {
    const spOrigin = new URL(siteUrl).origin
    const client = getConfidentialClient()
    const tokenResult = await client.acquireTokenByClientCredential({
        scopes: [`${spOrigin}/.default`],
    })
    if (!tokenResult?.accessToken) throw new Error('Failed to acquire SharePoint token')
    return tokenResult.accessToken
}

function spHeaders(token: string) {
    return {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json;odata=nometadata',
    }
}

async function discoverAllLibraries(token: string, siteUrl: string): Promise<DiscoveredLibrary[]> {
    const endpoint = `${siteUrl}/_api/web/lists` +
        `?$filter=BaseTemplate eq 101` +
        ` and IsSystemList eq false` +
        ` and Hidden eq false` +
        ` and substringof('/_catalogs/', RootFolder/ServerRelativeUrl) eq false` +
        `&$expand=RootFolder`

    const res = await fetch(endpoint, { headers: spHeaders(token) })
    if (!res.ok) {
        throw new Error(`Failed to discover libraries: ${res.status}`)
    }

    const data = await res.json() as SPListResponse
    return data.value.map((lib) => ({
        title: lib.Title,
        id: lib.Id,
        itemCount: lib.ItemCount,
        serverRelativeUrl: lib.RootFolder.ServerRelativeUrl
    }))
}

async function discoverCustomFields(token: string, siteUrl: string, listId: string): Promise<DiscoveredField[]> {
    const endpoint = `${siteUrl}/_api/web/lists(guid'${listId}')/Fields` +
        `?$filter=Hidden eq false and ReadOnlyField eq false` +
        `&$select=Title,InternalName,TypeAsString,SchemaXml,Choices`

    const res = await fetch(endpoint, { headers: spHeaders(token) })
    if (!res.ok) {
        throw new Error(`Failed to discover fields: ${res.status}`)
    }

    const data = await res.json() as SPFieldResponse

    return data.value
        .filter((f) => {
            // Exclude system fields
            const isSystem = f.SchemaXml.includes(
                'SourceID="http://schemas.microsoft.com/sharepoint/v3"'
            )
            const isComputed = f.TypeAsString === 'Calculated' || f.TypeAsString === 'Computed'
            return !isSystem && !isComputed
        })
        .map((f) => {
            const field: DiscoveredField = {
                title: f.Title,
                internalName: f.InternalName,
                typeAsString: f.TypeAsString,
            }

            // Add allowed values for Choice fields
            if (
                (f.TypeAsString === 'Choice' || f.TypeAsString === 'MultiChoice') &&
                f.Choices?.results
            ) {
                field.allowedValues = f.Choices.results
            }

            return field
        })
}

function isEmpty(value: any, typeAsString: string): boolean {
    switch (typeAsString) {
        case 'TaxonomyFieldType':
        case 'TaxonomyFieldTypeMulti':
            return !value || (Array.isArray(value) ? value.length === 0 : !value.Label)
        case 'Lookup':
        case 'LookupMulti':
            // SharePoint returns expanded lookups as { Id, Title } with odata=nometadata
            // Single lookup: { Id: 1, Title: "Value" }
            // Multi lookup: [{ Id: 1, Title: "Val1" }, { Id: 2, Title: "Val2" }]
            if (!value) return true
            if (Array.isArray(value)) return value.length === 0
            // Check for expanded format { Id, Title } - if Id exists, it's populated
            return !value.Id && !value.Title
        case 'User':
        case 'UserMulti':
            return !value || (Array.isArray(value) ? value.length === 0 : !value.Title)
        default:
            return value === null || value === undefined || String(value).trim() === ''
    }
}

async function fetchAllItems(
    token: string,
    siteUrl: string,
    listId: string,
    fields: any[]
): Promise<any[]> {
    const lookupTypes = new Set(['Lookup', 'LookupMulti'])
    const regularFields = fields.filter(f => !lookupTypes.has(f.typeAsString))
    const lookupFields = fields.filter(f => lookupTypes.has(f.typeAsString))

    const selectParts = [
        'Id', 'FileLeafRef', 'FileRef',
        ...regularFields.map((f: any) => f.internalName),
        ...lookupFields.flatMap((f: any) => [`${f.internalName}/Id`, `${f.internalName}/Title`]),
    ].join(',')

    const expandParts = lookupFields.map((f: any) => f.internalName).join(',')
    const qs = expandParts
        ? `$select=${selectParts}&$expand=${expandParts}&$top=5000`
        : `$select=${selectParts}&$top=5000`

    const allItems: any[] = []
    let nextUrl: string | null =
        `${siteUrl}/_api/web/lists(guid'${listId}')/items?${qs}`

    while (nextUrl) {
        const res = await fetch(nextUrl, { headers: spHeaders(token) })

        if (!res.ok) {
            const text = await res.text()
            throw new Error(`SP fetch failed ${res.status}: ${text.slice(0, 300)}`)
        }

        const data = await res.json() as SPItemsResponse
        allItems.push(...(data.value ?? []))
        nextUrl = data['odata.nextLink'] ?? null
    }

    return allItems
}

// ─── POST /api/reaudit ────────────────────────────────────────────────────────

reauditRouter.post('/', async (req: Request, res: Response) => {
    const { manifest } = req.body as { manifest: TenantManifest }

    if (!manifest?.siteUrl || !Array.isArray(manifest.libraries)) {
        return res.status(400).json({ error: 'Invalid manifest payload' })
    }

    try {
        const token = await getToken(manifest.siteUrl)

        console.log('[reaudit] Discovering all libraries from SharePoint...')

        // 1. Discover ALL current libraries in SharePoint
        const spLibraries = await discoverAllLibraries(token, manifest.siteUrl)

        // 2. Create a map of existing libraries from manifest
        const manifestLibMap = new Map<string, LibraryReport>(
            manifest.libraries.map((lib) => [lib.serverRelativeUrl, lib])
        )

        let totalPass = 0
        let totalFail = 0
        const allLibraries: LibraryReport[] = []

        // 3. Process each library found in SharePoint
        for (const spLib of spLibraries) {
            const existingLib = manifestLibMap.get(spLib.serverRelativeUrl)

            // Discover fields for this library
            let spFields: DiscoveredField[]
            try {
                spFields = await discoverCustomFields(token, manifest.siteUrl, spLib.id)
            } catch (err: any) {
                console.error(`[reaudit] Failed to discover fields for ${spLib.title}:`, err.message)
                spFields = []
            }

            // Determine schema status
            let schemaStatus: 'governed' | 'violations' | 'no-schema' | 'empty'
            if (spFields.length === 0) {
                schemaStatus = 'no-schema'
            } else {
                schemaStatus = 'governed' // Will be updated to 'violations' if items fail
            }

            // Skip libraries with no schema
            if (spFields.length === 0) {
                console.log(`[reaudit] ⊘ ${spLib.title}: no governance schema`)
                allLibraries.push({
                    libraryName: spLib.title,
                    serverRelativeUrl: spLib.serverRelativeUrl,
                    listId: spLib.id,
                    siteUrl: manifest.siteUrl,
                    schemaStatus: 'no-schema',
                    fieldCount: 0,
                    fields: [],
                    itemCount: 0,
                    passCount: 0,
                    failCount: 0,
                    items: []
                })
                continue
            }

            // Fetch all items for this library
            let spItems: any[]
            try {
                const formattedFields = spFields.map(f => ({
                    internalName: f.internalName,
                    typeAsString: f.typeAsString
                }))
                spItems = await fetchAllItems(token, manifest.siteUrl, spLib.id, formattedFields)
            } catch (err: any) {
                console.error(`[reaudit] Failed to fetch items for ${spLib.title}:`, err.message)
                spItems = []
            }

            // Build item map
            const spMap = new Map<number, any>(spItems.map(i => [i.Id, i]))

            // Get existing items if this library was in the manifest
            const existingItems = existingLib?.items || []
            const existingIds = new Set(existingItems.map((item) => item.itemId))

            // Process all items
            const allItems: AuditedItem[] = []

            // 1. Update existing items
            for (const existing of existingItems) {
                const spItem = spMap.get(existing.itemId)

                if (!spItem) {
                    // Item was deleted - mark as pass
                    allItems.push({
                        ...existing,
                        status: 'Pass' as const,
                        gaps: [],
                        riskScore: 0
                    })
                    continue
                }

                const gaps: ItemGap[] = spFields
                    .filter((field) => isEmpty(spItem[field.internalName], field.typeAsString))
                    .map((field) => ({
                        internalName: field.internalName,
                        displayName: field.title,
                        typeAsString: field.typeAsString,
                        suggestedValue: null,
                    }))

                allItems.push({
                    ...existing,
                    status: gaps.length === 0 ? 'Pass' as const : 'Fail' as const,
                    gaps,
                    riskScore: gaps.length,
                })
            }

            // 2. Add new items
            for (const spItem of spItems) {
                if (existingIds.has(spItem.Id)) continue

                const gaps: ItemGap[] = spFields
                    .filter((field) => isEmpty(spItem[field.internalName], field.typeAsString))
                    .map((field) => ({
                        internalName: field.internalName,
                        displayName: field.title,
                        typeAsString: field.typeAsString,
                        suggestedValue: null,
                    }))

                const baseUrl = new URL(manifest.siteUrl).origin

                allItems.push({
                    itemId: spItem.Id,
                    fileName: spItem.FileLeafRef || 'Unknown',
                    itemUrl: `${baseUrl}${spItem.FileRef}`,
                    status: gaps.length === 0 ? 'Pass' as const : 'Fail' as const,
                    gaps,
                    riskScore: gaps.length,
                    aiSuggestions: null
                })
            }

            // Calculate counts
            const passCount = allItems.filter(i => i.status === 'Pass').length
            const failCount = allItems.filter(i => i.status === 'Fail').length
            totalPass += passCount
            totalFail += failCount

            // Update schema status based on results
            if (schemaStatus !== 'no-schema') {
                schemaStatus = failCount > 0 ? 'violations' : 'governed'
            }

            // Format fields for output
            const formattedFields: ManifestField[] = spFields.map(f => ({
                displayName: f.title,
                internalName: f.internalName,
                typeAsString: f.typeAsString,
                ...(f.allowedValues && { allowedValues: f.allowedValues })
            }))

            const newItemsCount = spItems.length - existingItems.length
            if (newItemsCount > 0) {
                console.log(`[reaudit] ✓ ${spLib.title}: ${passCount} pass, ${failCount} fail (+${newItemsCount} new)`)
            } else {
                console.log(`[reaudit] ✓ ${spLib.title}: ${passCount} pass, ${failCount} fail`)
            }

            allLibraries.push({
                libraryName: spLib.title,
                serverRelativeUrl: spLib.serverRelativeUrl,
                listId: spLib.id,
                siteUrl: manifest.siteUrl,
                schemaStatus,
                fieldCount: spFields.length,
                fields: formattedFields,
                itemCount: allItems.length,
                passCount,
                failCount,
                items: allItems
            })
        }

        // Calculate summary
        const totalItems = allLibraries.reduce((s, l) => s + l.itemCount, 0)
        const complianceRate = totalItems > 0
            ? Math.round((totalPass / totalItems) * 1000) / 10
            : 0

        const governedLibraries = allLibraries.filter(l =>
            l.schemaStatus === 'governed' || l.schemaStatus === 'violations'
        ).length

        return res.json({
            libraries: allLibraries,
            summary: {
                totalLibraries: allLibraries.length,
                governedLibraries,
                totalItems,
                passCount: totalPass,
                failCount: totalFail,
                complianceRate,
            },
            reauditedAt: new Date().toISOString(),
        })

    } catch (err: any) {
        console.error('[reaudit] error:', err.message)
        return res.status(500).json({ error: err.message ?? 'Re-audit failed' })
    }
})