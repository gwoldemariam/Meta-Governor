import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import * as net from 'net'
import { remediateRouter } from './routes/remediate'
import { fieldsRouter } from './routes/fields'
import { reauditRouter } from './routes/reaudit'

const app = express()

app.use(cors({
    origin: process.env.ALLOWED_ORIGIN ?? 'http://localhost:5173',
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'OPTIONS'],
}))

app.use(express.json({ limit: '10mb' }))   // manifests can be large

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'meta-governor-api', ts: new Date().toISOString() })
})

app.use('/api', remediateRouter)
app.use('/api', fieldsRouter)
app.use('/api/reaudit', reauditRouter)

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