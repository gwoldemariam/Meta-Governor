import { SPFactory } from "../factory/SPFactory";
import { AuthProvider } from "../auth/AuthProvider";

export interface LibraryInfo {
    Title: string;
    Id: string;
    ItemCount: number;
    ServerRelativeUrl: string;
}

export class DiscoveryService {
    /**
     * Retrieves all user-facing Document Libraries.
     * Filters for BaseTemplate 101 and ensures the library isn't hidden.
     */
    public static async getTargetLibraries(auth: AuthProvider): Promise<LibraryInfo[]> {
        // OData Multiple Filters: 101 = Document Library, Hidden = false (ignores system lists), IsSystemList = false, URL containing _catalogs = false to remove catalog lists
        const endpoint = "/_api/web/lists?$filter=BaseTemplate eq 101 and IsSystemList eq false and Hidden eq false and substringof('/_catalogs/', RootFolder/ServerRelativeUrl) eq false&$expand=RootFolder";

        const data = await SPFactory.request(auth, endpoint);

        return data.value
            .map((lib: any) => ({
                Title: lib.Title,
                Id: lib.Id,
                ItemCount: lib.ItemCount,
                ServerRelativeUrl: lib.RootFolder.ServerRelativeUrl
            }));
    }

    /**
     * Dynamically fetches custom metadata columns for a specific library.
     * Filters out standard SharePoint system fields.
     */
    public static async getCustomFields(auth: AuthProvider, listId: string) {
        const endpoint = `/_api/web/lists(guid'${listId}')/Fields?$filter=Hidden eq false and ReadOnlyField eq false&$select=Title,InternalName,TypeAsString,SchemaXml`;

        const data = await SPFactory.request(auth, endpoint);

        return data.value.filter((f: any) => {
            const xml = f.SchemaXml;
            // System fields always point to the global MS schema
            const isSystem = xml.includes('SourceID="http://schemas.microsoft.com/sharepoint/v3"');

            // We only want fields that are not system fields
            return !isSystem;
        });
    }
}