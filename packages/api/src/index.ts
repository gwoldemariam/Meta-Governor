import 'dotenv/config'
import fs from 'fs'
import path from 'path'

// ── Certificate Setup (MUST BE FIRST - before any route imports) ──────────────

// Decode certificate from environment variable if present
if (process.env.CERT_BASE64) {
    console.log('[meta-gov api] Setting up certificate from CERT_BASE64...')

    // Determine path based on build vs source
    const isDist = __dirname.includes('/dist')

    // Navigate to engine/certs from current location
    let certDir: string
    if (isDist) {
        // Production: packages/api/dist/index.js -> ../../../engine/certs
        certDir = path.join(__dirname, '../../../engine/certs')
    } else {
        // Development: packages/api/src/index.ts -> ../../engine/certs
        certDir = path.join(__dirname, '../../engine/certs')
    }

    const certPath = path.join(certDir, 'private.key')

    console.log('[meta-gov api] __dirname:', __dirname)
    console.log('[meta-gov api] isDist:', isDist)
    console.log('[meta-gov api] certDir:', certDir)
    console.log('[meta-gov api] certPath:', certPath)

    try {
        // Create directory
        if (!fs.existsSync(certDir)) {
            fs.mkdirSync(certDir, { recursive: true })
            console.log('[meta-gov api] ✓ Created directory:', certDir)
        }

        // Decode and write certificate
        const certContent = Buffer.from(process.env.CERT_BASE64, 'base64').toString('utf-8')
        fs.writeFileSync(certPath, certContent, { mode: 0o600 })
        console.log('[meta-gov api] ✓ Certificate written')

        // Set CERT_PATH to absolute path
        process.env.CERT_PATH = certPath
        console.log('[meta-gov api] ✓ CERT_PATH set to:', certPath)

        // Verify file exists
        if (fs.existsSync(certPath)) {
            const stats = fs.statSync(certPath)
            console.log('[meta-gov api] ✓ Certificate verified, size:', stats.size, 'bytes')
        }

    } catch (err: any) {
        console.error('[meta-gov api] ✗ Certificate setup failed:', err.message)
        console.error('[meta-gov api]   Stack:', err.stack)
        process.exit(1) // Exit if certificate setup fails
    }
} else {
    console.log('[meta-gov api] No CERT_BASE64 found, expecting certificate at CERT_PATH')
}

// ── NOW Import Routes (after certificate is ready) ────────────────────────────

import express from 'express'
import cors from 'cors'
import * as net from 'net'
import { remediateRouter } from './routes/remediate'
import { fieldsRouter } from './routes/fields'
import { reauditRouter } from './routes/reaudit'
import { auditRouter } from './routes/audit'
import { loggingRouter } from './routes/logging'

// ── Express App Setup ──────────────────────────────────────────────────────────

const app = express()

app.use(cors({
    origin: process.env.ALLOWED_ORIGIN ?? 'http://localhost:5173',
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'OPTIONS', 'DELETE'],
}))

app.use(express.json({ limit: '10mb' }))

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'meta-governor-api', ts: new Date().toISOString() })
})

app.use('/api', remediateRouter)
app.use('/api', fieldsRouter)
app.use('/api/reaudit', reauditRouter)
app.use('/api/audit', auditRouter)
app.use('/api/logging', loggingRouter)

app.post('/api/reaudit-test', (_req, res) => res.json({ ok: true }))

// ── Dynamic port detection ────────────────────────────────────────────────────

function isPortFree(port: number): Promise<boolean> {
    return new Promise(resolve => {
        const server = net.createServer()
        server.once('error', () => resolve(false))
        server.once('listening', () => {
            server.close()
            resolve(true)
        })
        server.listen(port)
    })
}

async function findFreePort(preferred: number, fallbacks: number[]): Promise<number> {
    for (const port of [preferred, ...fallbacks]) {
        if (await isPortFree(port)) return port
    }
    throw new Error(
        `None of the configured ports (${[preferred, ...fallbacks].join(', ')}) are available.\n` +
        `Set a free port via PORT= in packages/api/.env and update VITE_API_URL in packages/dashboard/.env accordingly.`
    )
}

async function start() {
    const preferred = parseInt(process.env.PORT ?? '3001')
    const fallbacks = [3002, 3003, 3004]

    const port = await findFreePort(preferred, fallbacks)

    if (port !== preferred) {
        console.warn(`[meta-gov api] ⚠  Port ${preferred} was taken — using ${port} instead.`)
        console.warn(`[meta-gov api] ⚠  Update VITE_API_URL in packages/dashboard/.env to http://localhost:${port}`)
    }

    app.listen(port, () => {
        console.log(`[meta-gov api] ✓ listening on http://localhost:${port}`)
        console.log(`[meta-gov api] ✓ health → http://localhost:${port}/api/health`)
    })
}

start().catch(err => {
    console.error('[meta-gov api] Fatal startup error:', err.message)
    process.exit(1)
})