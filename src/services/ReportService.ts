import * as fs from 'fs';
import * as path from 'path';

export class ReportService {
    /**
     * Saves the audit results to a JSON file.
     * This file serves as the "source of truth" for the UI and Remediation steps.
     */
    public static saveReport(results: any[]): string {
        const report = {
            generatedAt: new Date().toISOString(),
            schemaVersion: "1.0",
            libraries: results
        };

        const reportsDir = path.join(process.cwd(), 'reports');

        // Ensure the 'reports' directory exists
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir);
        }

        const fileName = `audit-manifest-${Date.now()}.json`;
        const filePath = path.join(reportsDir, fileName);

        fs.writeFileSync(filePath, JSON.stringify(report, null, 2));

        return filePath;
    }
}