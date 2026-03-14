import * as fs from 'fs';
import * as path from 'path';
import { AuditedItem } from './AuditorService';

export interface GovernanceField {
    displayName: string;
    internalName: string;
    typeAsString: string;
}

export type LibrarySchemaStatus = 'governed' | 'violations' | 'no-schema' | 'empty';

export interface LibraryReport {
    libraryName: string;
    serverRelativeUrl: string;
    listId?: string;
    siteUrl: string;
    schemaStatus: LibrarySchemaStatus;
    fieldCount: number;
    fields: GovernanceField[];
    itemCount: number;
    passCount: number;
    failCount: number;
    items: AuditedItem[];
}

export interface TenantManifest {
    generatedAt: string;
    schemaVersion: '2.0';
    siteUrl: string;
    summary: {
        totalLibraries: number;
        governedLibraries: number;
        totalItems: number;
        passCount: number;
        failCount: number;
        complianceRate: number;
    };
    libraries: LibraryReport[];
}

export class ReportService {

    public static saveReport(libraries: LibraryReport[], siteUrl: string): string {

        // Compute tenant-wide summary
        const totalItems  = libraries.reduce((n, l) => n + l.itemCount, 0);
        const passCount   = libraries.reduce((n, l) => n + l.passCount, 0);
        const failCount   = libraries.reduce((n, l) => n + l.failCount, 0);
        const governed    = libraries.filter(l =>
            l.schemaStatus === 'governed' || l.schemaStatus === 'violations'
        ).length;

        const complianceRate = totalItems > 0
            ? Math.round((passCount / totalItems) * 1000) / 10
            : 0;

        const manifest: TenantManifest = {
            generatedAt:   new Date().toISOString(),
            schemaVersion: '2.0',
            siteUrl,
            summary: {
                totalLibraries:    libraries.length,
                governedLibraries: governed,
                totalItems,
                passCount,
                failCount,
                complianceRate
            },
            libraries
        };

        const reportsDir = path.join(__dirname, '../../reports');

        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        const fileName = `audit-manifest-${Date.now()}.json`;
        const filePath = path.join(reportsDir, fileName);

        fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2));

        return filePath;
    }
}