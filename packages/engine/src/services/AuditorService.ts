import { SPFactory } from "../factory/SPFactory";
import { AuthProvider } from "../auth/AuthProvider";

export interface ItemGap {
    displayName: string;      // Human-readable name        → UI display
    internalName: string;     // SP internal name           → PATCH target
    typeAsString: string;     // SP field type              → Fix Panel widget
    suggestedValue: null;     // AI seam — always null in v1, populated in v2
}

export interface AuditedItem {
    itemId: number;           // SP list item ID  → required for PATCH
    fileName: string;
    itemUrl: string;          // Full URL to file in SharePoint
    status: 'Pass' | 'Fail' | 'AccessDenied';
    riskScore: number;        // gaps.length → drives HIGH / MED / LOW badge
    gaps: ItemGap[];
    aiSuggestions: null;      // AI seam — always null in v1, populated in v2
}

export class AuditorService {

    public static async auditLibrary(
        auth: AuthProvider,
        listId: string,
        customFields: any[],
        siteUrl: string
    ): Promise<AuditedItem[]> {

        if (customFields.length === 0) return [];

        // Separate lookup fields — they require $expand and subfield selection
        const lookupTypes = ['Lookup', 'LookupMulti']
        const regularFields = customFields.filter(f => !lookupTypes.includes(f.TypeAsString))
        const lookupFields = customFields.filter(f => lookupTypes.includes(f.TypeAsString))

        const selectParts = [
            'Id',
            'FileLeafRef',
            'FileRef',
            ...regularFields.map((f: any) => f.InternalName),
            ...lookupFields.map((f: any) => `${f.InternalName}/Id,${f.InternalName}/Title`),
        ].join(',')

        const expandParts = lookupFields.map((f: any) => f.InternalName).join(',')

        const results: AuditedItem[] = [];
        let nextUrl: string | null = expandParts
            ? `/_api/web/lists(guid'${listId}')/items?$select=${selectParts}&$expand=${expandParts}&$top=500`
            : `/_api/web/lists(guid'${listId}')/items?$select=${selectParts}&$top=500`;

        // Paginate through ALL items via $skiptoken
        while (nextUrl) {
            let page: any;

            try {
                page = await SPFactory.request(auth, nextUrl);
            } catch (err: any) {
                console.error(`   ⚠️  Page request failed: ${err.message}`);
                break;
            }

            for (const item of page.value) {
                try {
                    const gaps = AuditorService.evaluateGaps(item, customFields);
                    const baseUrl = new URL(siteUrl).origin;

                    results.push({
                        itemId: item.Id,
                        fileName: item.FileLeafRef,
                        itemUrl: `${baseUrl}${item.FileRef}`,
                        status: gaps.length === 0 ? 'Pass' : 'Fail',
                        riskScore: gaps.length,
                        gaps,
                        aiSuggestions: null
                    });

                } catch (itemErr: any) {
                    // Flag inaccessible items rather than crashing the whole scan
                    results.push({
                        itemId: item.Id ?? 0,
                        fileName: item.FileLeafRef ?? 'Unknown',
                        itemUrl: '',
                        status: 'AccessDenied',
                        riskScore: 0,
                        gaps: [],
                        aiSuggestions: null
                    });
                }
            }

            // Follow next page link if present
            nextUrl = page['odata.nextLink'] ?? null;
        }

        return results;
    }

    private static evaluateGaps(item: any, customFields: any[]): ItemGap[] {
        const gaps: ItemGap[] = [];

        for (const field of customFields) {
            const value = item[field.InternalName];
            let isEmpty = false;

            switch (field.TypeAsString) {
                case 'TaxonomyFieldType':
                    isEmpty = !value || !value.Label;
                    break;

                case 'TaxonomyFieldTypeMulti':
                    isEmpty = !value || (Array.isArray(value)
                        ? value.length === 0
                        : !value.Label);
                    break;

                case 'Lookup':
                    isEmpty = !value || !value.LookupValue;
                    break;

                case 'LookupMulti':
                    isEmpty = !value || (value.results !== undefined
                        ? value.results.length === 0
                        : !value.LookupValue);
                    break;

                case 'User':
                    isEmpty = !value || !value.Title;
                    break;

                case 'UserMulti':
                    isEmpty = !value || (value.results !== undefined
                        ? value.results.length === 0
                        : !value.Title);
                    break;

                default:
                    // Text, Note, Number, Choice, Boolean
                    isEmpty = value === null ||
                        value === undefined ||
                        String(value).trim() === '';
            }

            if (isEmpty) {
                gaps.push({
                    displayName: field.Title,
                    internalName: field.InternalName,
                    typeAsString: field.TypeAsString,
                    suggestedValue: null
                });
            }
        }

        return gaps;
    }
}