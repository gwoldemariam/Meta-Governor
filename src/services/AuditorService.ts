import { SPFactory } from "../factory/SPFactory";
import { AuthProvider } from "../auth/AuthProvider";

export interface AuditResult {
    FileName: string;
    Status: 'Pass' | 'Fail';
    Gaps: string[];
}

export class AuditorService {
    /**
     * Scans all items without knowing column names or types in advance.
     */
    public static async auditLibrary(auth: AuthProvider, listId: string, customFields: any[]): Promise<AuditResult[]> {
        if (customFields.length === 0) return [];

        const fieldNames = customFields.map(f => f.InternalName).join(",");
        const endpoint = `/_api/web/lists(guid'${listId}')/items?$select=FileLeafRef,${fieldNames}`;

        const data = await SPFactory.request(auth, endpoint);

        return data.value.map((item: any) => {
            const gaps: string[] = [];

            customFields.forEach(field => {
                const value = item[field.InternalName];
                let isEmpty = false;

                // We determine "Emptiness" based on metadata type
                switch (field.TypeAsString) {
                    case 'TaxonomyFieldType':
                    case 'TaxonomyFieldTypeMulti':
                        // Managed Metadata is empty if the Label/Term is missing
                        isEmpty = !value || (Array.isArray(value) ? value.length === 0 : !value.Label);
                        break;
                    case 'Lookup':
                    case 'LookupMulti':
                        isEmpty = !value || (Array.isArray(value) ? value.length === 0 : !value.LookupValue);
                        break;
                    case 'User':
                    case 'UserMulti':
                        isEmpty = !value || (Array.isArray(value) ? value.length === 0 : !value.Title);
                        break;
                    default:
                        // Standard primitives (Text, Note, Number, Choice)
                        isEmpty = value === null || value === undefined || String(value).trim() === "";
                }

                if (isEmpty) {
                    // Store the human-readable name of the gap
                    gaps.push(field.Title);
                }
            });

            return {
                FileName: item.FileLeafRef,
                Status: gaps.length === 0 ? 'Pass' : 'Fail',
                Gaps: gaps
            };

        });
    }
}