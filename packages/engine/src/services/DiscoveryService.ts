import { SPFactory } from "../factory/SPFactory";
import { AuthProvider } from "../auth/AuthProvider";

export interface LibraryInfo {
    Title: string;
    Id: string;
    ItemCount: number;
    ServerRelativeUrl: string;
}

export interface DiscoveredField {
    Title: string;
    InternalName: string;
    TypeAsString: string;
    SchemaXml: string;
    allowedValues?: string[];   // Populated for Choice fields → Fix Panel dropdown
}

export class DiscoveryService {

    public static async getTargetLibraries(auth: AuthProvider): Promise<LibraryInfo[]> {
        const endpoint = "/_api/web/lists" +
            "?$filter=BaseTemplate eq 101" +
            " and IsSystemList eq false" +
            " and Hidden eq false" +
            " and substringof('/_catalogs/', RootFolder/ServerRelativeUrl) eq false" +
            "&$expand=RootFolder";

        const data = await SPFactory.request(auth, endpoint);

        return data.value.map((lib: any) => ({
            Title:               lib.Title,
            Id:                  lib.Id,
            ItemCount:           lib.ItemCount,
            ServerRelativeUrl:   lib.RootFolder.ServerRelativeUrl
        }));
    }

    public static async getCustomFields(
        auth: AuthProvider,
        listId: string
    ): Promise<DiscoveredField[]> {

        const endpoint =
            `/_api/web/lists(guid'${listId}')/Fields` +
            `?$filter=Hidden eq false and ReadOnlyField eq false` +
            `&$select=Title,InternalName,TypeAsString,SchemaXml,Choices`;

        const data = await SPFactory.request(auth, endpoint);

        return data.value
            .filter((f: any) => {
                // Exclude all standard Microsoft system fields
                const isSystem = f.SchemaXml.includes(
                    'SourceID="http://schemas.microsoft.com/sharepoint/v3"'
                );
                // Exclude Calculated and Computed — they are never writable
                const isComputed = f.TypeAsString === 'Calculated' ||
                                   f.TypeAsString === 'Computed';
                return !isSystem && !isComputed;
            })
            .map((f: any) => {
                const field: DiscoveredField = {
                    Title:        f.Title,
                    InternalName: f.InternalName,
                    TypeAsString: f.TypeAsString,
                    SchemaXml:    f.SchemaXml
                };

                // Attach allowed values for Choice fields
                if (
                    (f.TypeAsString === 'Choice' || f.TypeAsString === 'MultiChoice') &&
                    f.Choices?.results
                ) {
                    field.allowedValues = f.Choices.results;
                }

                return field;
            });
    }
}