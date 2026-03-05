import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";

// Load environment variables from the .env file
dotenv.config();

export const Settings = {
    tenantId: process.env.TENANT_ID || "",
    clientId: process.env.CLIENT_ID || "",
    thumbprint: process.env.CERT_THUMBPRINT || "",
    siteUrl: process.env.SITE_URL || "",

    /**
     * Reads the private key file from the path specified in .env
     * @returns The string content of the .key file
     */
    getPrivateKey(): string {
        try {
            const certPath = join(process.cwd(), process.env.CERT_PATH || "");
            return readFileSync(certPath, "utf8");
        } catch (err) {
            throw new Error(`Critical Error: Could not read private key file. Check CERT_PATH in your .env file. Error: ${err}`);
        }
    },

    /**
     * Validates that all required configuration variables are present
     */
    validate(): void {
        const missing = [];
        if (!this.tenantId) missing.push("TENANT_ID");
        if (!this.clientId) missing.push("CLIENT_ID");
        if (!this.thumbprint) missing.push("CERT_THUMBPRINT");
        if (!this.siteUrl) missing.push("SITE_URL");

        if (missing.length > 0) {
            throw new Error(`Configuration Error: Missing required variables: ${missing.join(", ")}`);
        }
    }
};