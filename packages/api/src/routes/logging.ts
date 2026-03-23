// ─── Logging Routes ───────────────────────────────────────────────────────────
// Handles SharePoint list creation and remediation logging

import { Router } from 'express'
import { getConfidentialClient } from '../auth/oboClient'

export const loggingRouter = Router()

// ─── GET /api/logging/check ───────────────────────────────────────────────────
// Check if the remediation log list exists

loggingRouter.get('/check', async (req, res) => {
    try {
        const { siteUrl, listName } = req.query

        if (!siteUrl || !listName) {
            return res.status(400).json({ error: 'siteUrl and listName are required' })
        }

        const token = await getToken(siteUrl as string)

        // Check if list exists
        const checkRes = await fetch(
            `${siteUrl}/_api/web/lists/getbytitle('${listName}')`,
            { headers: spHeaders(token) }
        )

        if (checkRes.ok) {
            return res.json({ exists: true })
        } else {
            return res.status(404).json({ exists: false, error: 'List does not exist' })
        }

    } catch (err: any) {
        console.error('[logging] Check failed:', err)
        res.status(500).json({ error: err.message })
    }
})

// ─── Helper Functions ─────────────────────────────────────────────────────────

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
        'Content-Type': 'application/json;odata=nometadata',
    }
}

// ─── POST /api/logging/setup ──────────────────────────────────────────────────
// Create the remediation log list in SharePoint

loggingRouter.post('/setup', async (req, res) => {
    try {
        const { siteUrl, listName } = req.body

        if (!siteUrl || !listName) {
            return res.status(400).json({ error: 'siteUrl and listName are required' })
        }

        const token = await getToken(siteUrl)

        // Check if list already exists
        const checkRes = await fetch(
            `${siteUrl}/_api/web/lists/getbytitle('${listName}')`,
            { headers: spHeaders(token) }
        )

        if (checkRes.ok) {
            return res.json({
                success: true,
                message: 'List already exists',
                listName
            })
        }

        // Create the list
        const createListRes = await fetch(`${siteUrl}/_api/web/lists`, {
            method: 'POST',
            headers: spHeaders(token),
            body: JSON.stringify({
                'BaseTemplate': 100, // Generic list
                'Title': listName,
                'Description': 'Governance remediation activity log - tracks all field fixes made through Meta-Governor'
            })
        })

        if (!createListRes.ok) {
            const error = await createListRes.text()
            throw new Error(`Failed to create list: ${error}`)
        }

        const listData: any = await createListRes.json()
        const listId = listData.Id

        // Add custom fields using XML schema (more reliable than JSON)
        const fieldSchemas = [
            { name: 'DocumentItemId', xml: '<Field Type="Number" DisplayName="Document Item ID" Name="DocumentItemId" />' },
            { name: 'FileName', xml: '<Field Type="Text" DisplayName="File Name" Name="FileName" />' },
            { name: 'LibraryName', xml: '<Field Type="Text" DisplayName="Library Name" Name="LibraryName" />' },
            { name: 'FieldsFixed', xml: '<Field Type="Note" DisplayName="Fields Fixed" Name="FieldsFixed" NumLines="6" />' },
            { name: 'FixedBy', xml: '<Field Type="Text" DisplayName="Fixed By" Name="FixedBy" />' },
            { name: 'FixedAt', xml: '<Field Type="DateTime" DisplayName="Fixed At" Name="FixedAt" Format="DateTime" />' },
            { name: 'Status', xml: '<Field Type="Choice" DisplayName="Status" Name="Status"><CHOICES><CHOICE>Success</CHOICE><CHOICE>Failed</CHOICE></CHOICES></Field>' },
        ]

        const createdFields: string[] = []
        const failedFields: string[] = []

        for (const schema of fieldSchemas) {
            const fieldRes = await fetch(
                `${siteUrl}/_api/web/lists(guid'${listId}')/fields/createfieldasxml`,
                {
                    method: 'POST',
                    headers: spHeaders(token),
                    body: JSON.stringify({
                        parameters: {
                            SchemaXml: schema.xml
                        }
                    })
                }
            )

            if (!fieldRes.ok) {
                const errorText = await fieldRes.text()
                console.error(`[logging] ✗ Failed to create field ${schema.name}:`, errorText)
                failedFields.push(schema.name)
            } else {
                createdFields.push(schema.name)
            }
        }

        res.json({
            success: true,
            message: 'List created successfully',
            listName,
            listId
        })

    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

// ─── POST /api/logging/log ────────────────────────────────────────────────────
// Write a remediation log entry to SharePoint

loggingRouter.post('/log', async (req, res) => {
    try {
        const { siteUrl, listName, entry } = req.body

        if (!siteUrl || !listName || !entry) {
            return res.status(400).json({ error: 'siteUrl, listName, and entry are required' })
        }

        const token = await getToken(siteUrl)

        // Create the list item
        const itemBody = {
            'Title': `${entry.fileName} - ${entry.fieldName}`,
            'DocumentItemId': entry.itemId,
            'FileName': entry.fileName,
            'LibraryName': entry.libraryName,
            'FieldName': entry.fieldName,
            'OldValue': entry.oldValue || '(empty)',
            'NewValue': entry.newValue,
            'FixedBy': entry.fixedBy || 'System',
            'FixedAt': entry.fixedAt || new Date().toISOString(),
            'Status': entry.status || 'Success'
        }

        const createRes = await fetch(
            `${siteUrl}/_api/web/lists/getbytitle('${listName}')/items`,
            {
                method: 'POST',
                headers: spHeaders(token),
                body: JSON.stringify(itemBody)
            }
        )

        if (!createRes.ok) {
            const error = await createRes.text()
            throw new Error(`Failed to create log entry: ${error}`)
        }

        const logEntry: any = await createRes.json()

        res.json({
            success: true,
            logId: logEntry.Id
        })

    } catch (err: any) {
        console.error('[logging] Log write failed:', err)
        res.status(500).json({ error: err.message })
    }
})