// ─────────────────────────────────────────────────────────────────────────────
// Meta-Governor — Shared Type Contract
// Both the engine (packages/engine) and dashboard (packages/dashboard)
// import from here. Never duplicate these types elsewhere.
// ─────────────────────────────────────────────────────────────────────────────

// ── Field-level gap on a single audited item ──────────────────────────────────
export interface ItemGap {
    displayName: string;      // Human-readable name        → UI display
    internalName: string;     // SharePoint internal name   → PATCH target
    typeAsString: string;     // SP field type              → Fix Panel widget
    suggestedValue: null;     // AI seam — always null in v1, populated in v2
}

// ── Single audited document ───────────────────────────────────────────────────
export interface AuditedItem {
    itemId: number;           // SP list item ID  → required for PATCH
    fileName: string;
    itemUrl: string;          // Full URL to file in SharePoint
    status: 'Pass' | 'Fail' | 'AccessDenied';
    riskScore: number;        // gaps.length → drives HIGH / MED / LOW badge
    gaps: ItemGap[];
    aiSuggestions: null;      // AI seam — always null in v1, populated in v2
}

// ── Metadata field definition from a library's governance schema ──────────────
export interface GovernanceField {
    displayName: string;
    internalName: string;
    typeAsString: string;
    allowedValues?: string[]; // Populated for Choice fields — drives Fix Panel dropdown
}

// ── Status of a library's governance configuration ───────────────────────────
export type LibrarySchemaStatus =
    | 'governed'     // Has schema, all items pass
    | 'violations'   // Has schema, one or more items fail
    | 'no-schema'    // No custom governance fields defined
    | 'empty';       // Has schema but zero items to audit

// ── Full report for one library ───────────────────────────────────────────────
export interface LibraryReport {
    libraryName: string;
    serverRelativeUrl: string;
    siteUrl: string;
    schemaStatus: LibrarySchemaStatus;
    fieldCount: number;
    fields: GovernanceField[];
    itemCount: number;
    passCount: number;
    failCount: number;
    items: AuditedItem[];
}

// ── Tenant-wide summary ───────────────────────────────────────────────────────
export interface AuditSummary {
    totalLibraries: number;
    governedLibraries: number;   // Libraries with schemaStatus !== 'no-schema'
    totalItems: number;
    passCount: number;
    failCount: number;
    complianceRate: number;      // 0–100, one decimal place
}

// ── Root manifest — output of one full audit run ──────────────────────────────
export interface TenantManifest {
    generatedAt: string;         // ISO timestamp
    schemaVersion: '2.0';
    siteUrl: string;
    summary: AuditSummary;
    libraries: LibraryReport[];
}

// ── AI Provider interface — implemented as NoOp in v1, real LLM in v2 ─────────
// Engine uses this internally. Defined here so dashboard can render
// suggestion data without knowing which provider generated it.
export interface AISuggestion {
    fieldInternalName: string;
    suggestedValue: string;
    confidence: number;          // 0–1
    reasoning: string;
}