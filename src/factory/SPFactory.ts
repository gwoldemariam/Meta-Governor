import { AuthProvider } from "../auth/AuthProvider";
import { Settings } from "../../config/settings";

export class SPFactory {

    /**
     * Helper to specifically get Web (Site) information
     */
    public static async getWeb(authProvider: AuthProvider): Promise<any> {
        return this.request(authProvider, "/_api/web");
    }
    
    /**
     * Standardized request method for any SharePoint API call.
     */
    public static async request(authProvider: AuthProvider, apiPath: string): Promise<any> {
        const token = await authProvider.getAccessToken();
        
        // Clean the URL to prevent double slashes //
        const baseUrl = Settings.siteUrl.replace(/\/$/, "");
        const targetUrl = `${baseUrl}${apiPath}`;

        const response = await fetch(targetUrl, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json;odata=nometadata",
                "User-Agent": `NONISV|${Settings.appName}|1.0`,
                "X-FORMS_BASED_AUTH_ACCEPTED": "f"
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`[SP Error ${response.status}]: ${errorText}`);
        }

        return await response.json();
    }
}