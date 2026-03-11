import { AuthProvider } from "../auth/AuthProvider";
import { Settings } from "../../config/settings";

export class SPFactory {

    public static async getWeb(authProvider: AuthProvider): Promise<any> {
        return this.request(authProvider, "/_api/web");
    }

    public static async request(authProvider: AuthProvider, apiPath: string): Promise<any> {
        const token = await authProvider.getAccessToken();

        // If apiPath is already a full URL (e.g. odata.nextLink), use it directly
        // Otherwise prepend the configured siteUrl
        const isAbsolute = apiPath.startsWith("https://") || apiPath.startsWith("http://");
        const baseUrl = Settings.siteUrl.replace(/\/$/, "");
        const targetUrl = isAbsolute ? apiPath : `${baseUrl}${apiPath}`;

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