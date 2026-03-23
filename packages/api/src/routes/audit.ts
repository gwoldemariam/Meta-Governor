// ─── Full Audit Routes ────────────────────────────────────────────────────────
// Handles long-running full audits with job queue and progress tracking
// Uses the same SharePoint API pattern as reaudit.ts

import { Router } from 'express'
import { JobQueue } from '../services/JobQueue'
import { getConfidentialClient } from '../auth/oboClient'

export const auditRouter = Router()

const jobQueue = new JobQueue()

// ─── Helpers ────────────────────────────────

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

async function discoverAllLibraries(token: string, siteUrl: string): Promise<any[]> {
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

    const data = await res.json() as any
    return data.value.map((lib: any) => ({
        title: lib.Title,
        id: lib.Id,
        itemCount: lib.ItemCount,
        serverRelativeUrl: lib.RootFolder.ServerRelativeUrl
    }))
}

async function discoverCustomFields(token: string, siteUrl: string, listId: string): Promise<any[]> {
    const endpoint = `${siteUrl}/_api/web/lists(guid'${listId}')/Fields` +
        `?$filter=Hidden eq false and ReadOnlyField eq false` +
        `&$select=Title,InternalName,TypeAsString,SchemaXml,Choices`

    const res = await fetch(endpoint, { headers: spHeaders(token) })
    if (!res.ok) {
        throw new Error(`Failed to discover fields: ${res.status}`)
    }

    const data = await res.json() as any

    // Exclude base fields and problematic system fields
    const excludedFields = [
        'FileRef', 'FileDirRef', 'FileLeafRef', 'FSObjType', 'ID',
        'Modified', 'Created', 'Author', 'Editor',
        '_ExtendedDescription',  // Causes 400 errors
        'ContentType',           // Usually read-only
        'Title'                  // Base field, not governance-related
    ]

    return data.value
        .filter((f: any) => !excludedFields.includes(f.InternalName))
        .map((f: any) => ({
            displayName: f.Title,
            internalName: f.InternalName,
            typeAsString: f.TypeAsString,
            allowedValues: f.Choices?.results
        }))
}

async function auditLibraryItems(token: string, siteUrl: string, listId: string, fields: any[]): Promise<any[]> {
    if (fields.length === 0) return []

    const lookupTypes = ['Lookup', 'LookupMulti']
    const regularFields = fields.filter(f => !lookupTypes.includes(f.typeAsString))
    const lookupFields = fields.filter(f => lookupTypes.includes(f.typeAsString))

    // Build select parts - lookup fields need their sub-properties listed separately
    const selectParts = [
        'Id',
        'FileLeafRef',
        'FileRef',
        ...regularFields.map(f => f.internalName),
        ...lookupFields.flatMap(f => [`${f.internalName}/Id`, `${f.internalName}/Title`]),
    ].join(',')

    const expandParts = lookupFields.map(f => f.internalName).join(',')

    const results: any[] = []
    let nextUrl: string | null = expandParts
        ? `/_api/web/lists(guid'${listId}')/items?$select=${selectParts}&$expand=${expandParts}&$top=500`
        : `/_api/web/lists(guid'${listId}')/items?$select=${selectParts}&$top=500`

    // Paginate through items
    while (nextUrl) {
        const fullUrl = nextUrl.startsWith('http') ? nextUrl : `${siteUrl}${nextUrl}`
        const res = await fetch(fullUrl, { headers: spHeaders(token) })

        if (!res.ok) {
            const errorText = await res.text()
            console.error(`Failed to fetch items page: ${res.status}`)
            console.error(`URL: ${fullUrl}`)
            console.error(`Error: ${errorText}`)
            break
        }

        const data = await res.json() as any

        for (const item of data.value) {
            const gaps: any[] = []

            for (const field of fields) {
                const value = item[field.internalName]
                const isEmpty = value === null || value === undefined || value === ''

                if (isEmpty) {
                    gaps.push({
                        internalName: field.internalName,
                        displayName: field.displayName,
                        typeAsString: field.typeAsString,
                        suggestedValue: null
                    })
                }
            }

            results.push({
                itemId: item.Id,
                fileName: item.FileLeafRef,
                itemUrl: `${siteUrl}${item.FileRef}`,
                status: gaps.length === 0 ? 'Pass' : 'Fail',
                riskScore: gaps.length,
                gaps
            })
        }

        nextUrl = data['odata.nextLink'] || null
    }

    return results
}

// ─── POST /api/audit/start ────────────────────────────────────────────────────
// Start a new full audit job

auditRouter.post('/start', async (req, res) => {
    try {
        const { siteUrl } = req.body

        if (!siteUrl) {
            return res.status(400).json({ error: 'siteUrl is required' })
        }

        // Create job
        const job = jobQueue.createJob()

        // Start background execution
        executeAudit(job.id, siteUrl).catch(err => {
            console.error(`[audit] Job ${job.id} failed:`, err)
            jobQueue.failJob(job.id, err.message)
        })

        res.json({ jobId: job.id })
    } catch (err: any) {
        console.error('[audit] Failed to start audit:', err)
        res.status(500).json({ error: err.message })
    }
})

// ─── GET /api/audit/job/:id ───────────────────────────────────────────────────
// Get job status and progress

auditRouter.get('/job/:id', async (req, res) => {
    try {
        const job = jobQueue.getJob(req.params.id)

        if (!job) {
            return res.status(404).json({ error: 'Job not found' })
        }

        res.json(job)
    } catch (err: any) {
        console.error('[audit] Failed to get job status:', err)
        res.status(500).json({ error: err.message })
    }
})

// ─── GET /api/audit/job/:id/result ────────────────────────────────────────────
// Get job result (manifest) when complete

auditRouter.get('/job/:id/result', async (req, res) => {
    try {
        const job = jobQueue.getJob(req.params.id)

        if (!job) {
            return res.status(404).json({ error: 'Job not found' })
        }

        if (job.status !== 'complete') {
            return res.status(400).json({ error: 'Job not complete yet' })
        }

        if (!job.result) {
            return res.status(404).json({ error: 'No result available' })
        }

        res.json({ manifest: job.result })
    } catch (err: any) {
        console.error('[audit] Failed to get job result:', err)
        res.status(500).json({ error: err.message })
    }
})

// ─── DELETE /api/audit/job/:id ────────────────────────────────────────────────
// Cancel a running job

auditRouter.delete('/job/:id', async (req, res) => {
    try {
        const job = jobQueue.getJob(req.params.id)

        if (!job) {
            return res.status(404).json({ error: 'Job not found' })
        }

        jobQueue.failJob(job.id, 'Cancelled by user')
        res.json({ ok: true })
    } catch (err: any) {
        console.error('[audit] Failed to cancel job:', err)
        res.status(500).json({ error: err.message })
    }
})

// ─── Background Audit Execution ───────────────────────────────────────────────

async function executeAudit(jobId: string, siteUrl: string) {

    try {
        // Get auth token
        const token = await getToken(siteUrl)

        // Discover libraries
        const libraries = await discoverAllLibraries(token, siteUrl)

        // Mark as running with library count
        jobQueue.startJob(jobId, libraries.length)

        // Audit each library
        const results = []
        for (let i = 0; i < libraries.length; i++) {
            const library = libraries[i]

            jobQueue.updateProgress(
                jobId,
                i,
                library.title,
                `Scanning library ${i + 1} of ${libraries.length}...`
            )

            try {
                // Discover fields
                const fields = await discoverCustomFields(token, siteUrl, library.id)

                let schemaStatus: 'governed' | 'violations' | 'no-schema' | 'empty' = 'no-schema'
                let items: any[] = []

                if (fields.length > 0) {
                    // Audit items
                    items = await auditLibraryItems(token, siteUrl, library.id, fields)
                }

                const passCount = items.filter(item => item.status === 'Pass').length
                const failCount = items.filter(item => item.status === 'Fail').length

                // Determine schema status
                if (fields.length === 0) {
                    schemaStatus = 'no-schema'
                } else if (items.length === 0) {
                    schemaStatus = 'empty'
                } else if (failCount > 0) {
                    schemaStatus = 'violations'
                } else {
                    schemaStatus = 'governed'
                }

                results.push({
                    libraryName: library.title,
                    serverRelativeUrl: library.serverRelativeUrl,
                    listId: library.id,
                    siteUrl,
                    schemaStatus,
                    fieldCount: fields.length,
                    fields,
                    itemCount: items.length,
                    passCount,
                    failCount,
                    items
                })

            } catch (err: any) {
                console.error(`[audit] Job ${jobId}: Failed to audit ${library.title}:`, err.message)
                // Continue with other libraries even if one fails
            }
        }

        // Build manifest
        const totalItems = results.reduce((sum, lib) => sum + lib.itemCount, 0)
        const passCount = results.reduce((sum, lib) => sum + lib.passCount, 0)
        const failCount = results.reduce((sum, lib) => sum + lib.failCount, 0)

        const manifest = {
            schemaVersion: '2.0' as const,
            siteUrl,
            generatedAt: new Date().toISOString(),
            libraries: results,
            summary: {
                totalLibraries: results.length,
                governedLibraries: results.filter(lib => lib.schemaStatus !== 'no-schema').length,
                totalItems,
                passCount,
                failCount,
                complianceRate: totalItems > 0 ? Math.round((passCount / totalItems) * 100) : 0
            },
        }

        // Mark complete
        jobQueue.completeJob(jobId, manifest)

    } catch (err: any) {
        console.error(`[audit] Job ${jobId} failed:`, err)
        jobQueue.failJob(jobId, err.message)
        throw err
    }
}