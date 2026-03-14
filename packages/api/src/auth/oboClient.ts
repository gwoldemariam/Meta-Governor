import { ConfidentialClientApplication } from '@azure/msal-node'
import * as fs from 'fs'
import * as path from 'path'

let _client: ConfidentialClientApplication | null = null

const _cacheVersion = Date.now()

export function getConfidentialClient(): ConfidentialClientApplication {
    console.log('[oboClient] cache version:', _cacheVersion)
    if (_client) return _client

    const certRelPath = process.env.CERT_PATH
    if (!certRelPath) {
        throw new Error('CERT_PATH is not set in packages/api/.env')
    }

    const keyPath = path.resolve(__dirname, '../../', certRelPath)
    console.log('[oboClient] loading cert from:', keyPath)

    const privateKey = fs.readFileSync(keyPath, 'utf8')

    _client = new ConfidentialClientApplication({
        auth: {
            clientId: process.env.CLIENT_ID!,
            authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
            clientCertificate: {
                thumbprint: process.env.CERT_THUMBPRINT!,
                privateKey,
            },
        },
    })

    return _client
}