import * as fs from 'fs';
import path from 'path';
import { ConfidentialClientApplication, Configuration } from "@azure/msal-node";
import { Settings } from "../../config/settings";

export class AuthProvider {
    private msalClient: ConfidentialClientApplication;

    constructor() {
        // Resolve cert keys
        const absolutePath = path.resolve(Settings.privateKeyPath);
        const privateKey = fs.readFileSync(absolutePath, "utf-8");

        const msalConfig: Configuration = {
            auth: {
                clientId: Settings.clientId,
                authority: `https://login.microsoftonline.com/${Settings.tenantId}/v2.0`,
                clientCertificate: {
                    thumbprint: Settings.thumbprint,
                    privateKey: Settings.getPrivateKey()
                },
            },
        };

        this.msalClient = new ConfidentialClientApplication(msalConfig);
    }

    /**
     * Obtains an Access Token for SharePoint
     */
    public async getAccessToken(): Promise<string> {
        try {
            // SharePoint expects the root of the tenant for the scope
            const siteOrigin = new URL(Settings.siteUrl).origin;
            const scope = `${siteOrigin}/.default`;

            const result = await this.msalClient.acquireTokenByClientCredential({
                scopes: [scope],
                skipCache: true
            });

            if (!result || !result.accessToken) {
                throw new Error("Failed to acquire access token.");
            }

            return result!.accessToken;
        } catch (error) {
            console.error("🔑 Auth: FAILED during MSAL call.");
            throw new Error(`AuthProvider Error: ${error}`);
        }
    }
}