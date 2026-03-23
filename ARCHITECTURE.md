# 🏗️ Meta-Governor Architecture

This document explains the technical architecture, design decisions, and how the system works internally.

---

## 🎯 System Overview

Meta-Governor is a **monorepo TypeScript application** consisting of four main packages:

```
┌─────────────────────────────────────────────────────────┐
│                     User Browser                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │  React Dashboard (Vite)                            │ │
│  │  • Zustand State Management                        │ │
│  │  • TanStack Table                                  │ │
│  │  • Recharts Visualizations                         │ │
│  └────────────────────────────────────────────────────┘ │
└───────────────────┬─────────────────────────────────────┘
                    │ HTTP/SSE
┌───────────────────▼─────────────────────────────────────┐
│              Express API Server                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Routes: /api/audit, /remediate, /logging         │ │
│  │  MSAL Certificate Authentication                    │ │
│  │  CORS Protection                                    │ │
│  └────────────────────────────────────────────────────┘ │
└───────────────────┬─────────────────────────────────────┘
                    │ SharePoint REST API
┌───────────────────▼─────────────────────────────────────┐
│            SharePoint Online                             │
│  • Document Libraries                                    │
│  • Custom Site Columns                                   │
│  • Taxonomy Term Store                                   │
│  • Logging Lists (optional)                              │
└──────────────────────────────────────────────────────────┘
```

---

## 📦 Package Structure

### 1. **packages/engine** - Core Audit Logic

**Purpose:** Standalone TypeScript engine for scanning SharePoint sites

**Key Components:**
```typescript
// Main audit orchestrator
class SiteAuditor {
    async scanSite(siteUrl: string): Promise<AuditManifest>
    async inventorySchemas(): Promise<SchemaDefinition[]>
    async scanLibrary(library: LibraryInfo): Promise<LibraryReport>
}

// Schema management
class SchemaLoader {
    loadSchema(version: string): GovernanceSchema
    validateSchema(schema: GovernanceSchema): boolean
}

// Item validator
class ItemValidator {
    validateItem(item: SPItem, requiredFields: FieldRule[]): ValidationResult
    checkFieldCompliance(fieldValue: any, fieldRule: FieldRule): boolean
}
```

**Authentication:**
- Uses `@azure/msal-node` with certificate-based authentication
- Acquires app-only access tokens via OAuth 2.0
- Scopes: `https://tenant.sharepoint.com/.default`

**Data Flow:**
```
1. Load governance schema from config/schemas/
2. Discover all document libraries in site
3. For each library:
   a. Fetch custom fields
   b. Query all items (paginated)
   c. Validate each item against schema
   d. Categorize as: pass / fail / empty
4. Generate AuditManifest JSON
5. Save to reports/ directory
```

### 2. **packages/api** - REST API Server

**Purpose:** HTTP interface for dashboard to interact with SharePoint

**Technology Stack:**
- Express.js 4.x
- TypeScript
- MSAL for authentication
- Server-Sent Events (SSE) for progress updates

**Routes:**

#### `/api/audit/*` - Audit Operations
```typescript
POST /api/audit/start
  Body: { siteUrl: string }
  Response: { jobId: string }
  
  Starts background audit job
  Returns immediately with job ID
  Uses SiteAuditor from engine package

GET /api/audit/:jobId/progress
  Content-Type: text/event-stream
  
  Server-Sent Events stream
  Emits progress updates every 500ms
  Format: event: progress\ndata: {"library":"Docs","current":5,"total":10}\n\n
```

#### `/api/reaudit` - Re-Audit Existing Site
```typescript
POST /api/reaudit
  Body: { siteUrl: string }
  
  Re-runs audit on previously scanned site
  Uses cached schema from engine
  Updates existing manifest
```

#### `/api/remediate/remediate` - Fix Items
```typescript
POST /api/remediate/remediate
  Body: {
    siteUrl: string
    libraryName: string
    itemId: number
    fileName: string
    fields: Array<{
      internalName: string
      displayName: string
      typeAsString: string
      value: any
    }>
    loggingSettings: {
      loggingMode: 'local' | 'sharepoint'
      spLogListName?: string
    }
  }
  
  Updates SharePoint item fields
  Handles different field types:
    - Text/Choice: Direct PATCH
    - Taxonomy: ValidateUpdateListItem
    - User: Person picker format
    - Lookup: Related item ID
  
  Logs changes to browser or SharePoint list
```

#### `/api/logging/*` - Logging Management
```typescript
POST /api/logging/setup
  Body: { siteUrl: string, listName: string }
  
  Creates SharePoint list for logging
  Custom fields:
    - DocumentItemId (Number)
    - FileName (Text)
    - LibraryName (Text)
    - FieldsFixed (Note) - before/after details
    - FixedBy (Text)
    - FixedAt (DateTime)
    - Status (Choice: Success/Failed)

GET /api/logging/check
  Query: ?siteUrl=...&listName=...
  
  Validates if logging list exists
  Returns 200 if exists, 404 if not
```

#### `/api/fields/taxonomy/:termSetId` - Taxonomy Helper
```typescript
GET /api/fields/taxonomy/:termSetId
  Query: ?siteUrl=...
  
  Fetches all terms from taxonomy term set
  Returns hierarchical term structure
  Used to populate dropdowns in Fix Panel
```

**Authentication Pattern:**
```typescript
// Confidential client with certificate
const client = new ConfidentialClientApplication({
    auth: {
        clientId: process.env.CLIENT_ID!,
        authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
        clientCertificate: {
            thumbprint: process.env.CERT_THUMBPRINT!,
            privateKey: fs.readFileSync(process.env.CERT_PATH!, 'utf8')
        }
    }
})

// Acquire token for SharePoint
const token = await client.acquireTokenByClientCredential({
    scopes: [`${spOrigin}/.default`]
})

// Use in SharePoint API calls
fetch(spUrl, {
    headers: {
        'Authorization': `Bearer ${token.accessToken}`,
        'Accept': 'application/json;odata=nometadata'
    }
})
```

### 3. **packages/dashboard** - React Frontend

**Purpose:** Visual interface for governance management

**Technology Stack:**
- React 19.2
- TypeScript
- Vite (build tool)
- Zustand (state management)
- TanStack Table v8 (data grids)
- Recharts (visualizations)
- React Router v7

**State Management (Zustand):**
```typescript
interface GovernanceStore {
    // Manifest
    manifest: AuditManifest | null
    loadManifest: (file: File) => void
    clearManifest: () => void
    
    // Audit status
    reauditStatus: 'idle' | 'running' | 'done' | 'error'
    reauditError: string | null
    libraryProgress: LibraryProgress[]
    
    // UI state
    selectedItemId: string | null
    activeLibrary: string | null
    queueFilter: 'all' | 'fail'
    searchQuery: string
    
    // Settings
    settings: {
        loggingMode: 'local' | 'sharepoint'
        spLogListName: string
    }
    
    // Theme
    theme: 'light' | 'dark'
    toggleTheme: () => void
}
```

**Key Pages:**

#### HealthDashboard.tsx
```typescript
// Displays:
// - Governed Compliance: % of governed items with all fields filled
// - Failing Items: Count of items needing fixes
// - Total Libraries: Governed vs unmanaged
// - Library grid with compliance scores
// - Recharts bar chart visualizations

// Metrics calculation:
const governedLibraries = manifest.results.filter(
    lib => lib.schemaStatus !== 'no-schema'
)
const governedRate = Math.round(
    (governedPass / governedTotal) * 100
)
```

#### LibraryExplorer.tsx
```typescript
// Left sidebar: Library selector
// Main area: Item grid with TanStack Table
// Columns:
//   - File Name (clickable to open Fix Panel)
//   - Status (pass/fail/empty badge)
//   - Missing Fields (expandable list)
//   - Fix button (for failing items)

// Search & filter:
const filtered = items.filter(item =>
    item.fileName.toLowerCase().includes(searchQuery) &&
    (filter === 'all' || item.status === 'fail')
)
```

#### RemediationQueue.tsx
```typescript
// Unified queue across all libraries
// Sortable/filterable TanStack Table
// Columns:
//   - File Name
//   - Library
//   - Failing Fields
//   - Last Modified
//   - Fix button

// Click row to open Fix Panel
```

#### FixPanel.tsx (Right Sidebar)
```typescript
// Slide-in panel when item selected
// Shows:
//   - Item metadata
//   - Missing fields with inputs
//   - Field type-specific controls:
//       * Text: input
//       * Choice: dropdown
//       * Taxonomy: searchable dropdown
//       * User: people picker
//       * Date: date picker
//   - "Fix All Fields" button
//   - Before/after preview

// Submit handler:
const handleSave = async () => {
    // Validate inputs
    if (!allFieldsFilled) return
    
    // Call API
    await apiClient.remediateItem({
        siteUrl,
        libraryName,
        itemId,
        fields: gaps.map(g => ({
            internalName: g.internalName,
            value: fieldValues[g.internalName]
        })),
        loggingSettings
    })
    
    // Update local state
    updateManifest(...)
    
    // Log locally
    addLocalLog(...)
}
```

#### Settings.tsx
```typescript
// Logging configuration:
//   - Radio: Local vs SharePoint
//   - SharePoint list name input
//   - Save button (creates list if needed)
//   - Success/error feedback

// About section:
//   - System info
//   - Current logging location
//   - Version details
```

**API Client Pattern:**
```typescript
// packages/dashboard/src/lib/apiClient.ts

export async function remediateItem(req: RemediateRequest) {
    const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/remediate/remediate`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req)
        }
    )
    
    if (!response.ok) {
        throw new Error(await response.text())
    }
    
    return response.json()
}
```

### 4. **packages/shared** - Common Types

**Purpose:** TypeScript definitions shared across packages

```typescript
// Audit manifest structure
export interface AuditManifest {
    siteUrl: string
    generatedAt: string
    schemaVersion: string
    results: LibraryReport[]
    summary: AuditSummary
}

export interface LibraryReport {
    libraryName: string
    libraryUrl: string
    schemaStatus: 'governed' | 'violations' | 'empty' | 'no-schema'
    totalItems: number
    passCount: number
    failCount: number
    emptyCount: number
    failingItems?: FailingItem[]
    customFields?: FieldInfo[]
}

export interface FailingItem {
    itemId: number
    fileName: string
    status: 'fail' | 'empty'
    gaps: FieldGap[]
    lastModified?: string
}

export interface FieldGap {
    internalName: string
    displayName: string
    typeAsString: string
    currentValue: any
    required: boolean
}

// Governance schema
export interface GovernanceSchema {
    version: string
    name: string
    schemaRules: SchemaRule[]
}

export interface SchemaRule {
    rule: 'documentLibraries' | 'customLists'
    requiredFields: FieldRule[]
}

export interface FieldRule {
    internalName: string
    displayName: string
    typeAsString: string
    termSetId?: string
    allowFillIn?: boolean
}
```

---

## 🔐 Security Architecture

### Authentication Flow

```
1. User initiates action in dashboard
2. Dashboard calls API endpoint
3. API uses MSAL to get app-only token
4. Token cached for 1 hour
5. API calls SharePoint REST with token
6. Response returned to dashboard
```

**No user credentials stored.** All SharePoint access via app-only token with delegated permissions.

### CORS Protection

API enforces strict CORS:
```typescript
app.use(cors({
    origin: process.env.ALLOWED_ORIGIN,
    credentials: true
}))
```

### Certificate Security

**Development:**
- Private key stored in `packages/engine/certs/`
- **NEVER commit to Git** (in `.gitignore`)

**Production:**
- Use environment variable (base64 encoded)
- Or cloud secret manager (Azure Key Vault, AWS Secrets Manager)

---

## 📊 Data Flow

### Audit Flow

```
User clicks "Run Audit"
    ↓
Dashboard: POST /api/audit/start
    ↓
API: Generate jobId
API: Start background audit (SiteAuditor)
API: Return jobId immediately
    ↓
Dashboard: Open SSE connection to /api/audit/:jobId/progress
    ↓
API: Emit progress events as audit runs
    library: "Documents", current: 5, total: 10
    ↓
Engine: For each library:
    1. Fetch custom fields
    2. Query items (paginated, 1000/request)
    3. Validate each item
    4. Emit progress
    ↓
Engine: Generate AuditManifest
Engine: Save to reports/
    ↓
API: Emit complete event
    ↓
Dashboard: Download manifest
Dashboard: Load into Zustand store
Dashboard: Navigate to Health Dashboard
```

### Remediation Flow

```
User fills Fix Panel
User clicks "Fix All Fields"
    ↓
Dashboard: Validate inputs
Dashboard: POST /api/remediate/remediate
    ↓
API: Acquire SharePoint token
API: Fetch current item (for old values)
API: Build PATCH request
    Regular fields: Direct property update
    Taxonomy fields: ValidateUpdateListItem
API: Execute PATCH
    ↓
SharePoint: Update item
    ↓
API: Write to log (if SharePoint logging enabled)
    ↓
SharePoint: Create list item in log
    Title: "2024-03-16 14:30 | doc.pdf | 3 fields fixed"
    FieldsFixed: "Dept: Finance → HR\nStatus: Draft → Active"
    ↓
API: Return success
    ↓
Dashboard: Update manifest (mark item as fixed)
Dashboard: Add to local log
Dashboard: Show success message
Dashboard: Remove from queue
```

---

## 🔄 State Management Patterns

### Manifest Loading

```typescript
// User uploads JSON file
const loadManifest = (file: File) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
        const manifest = JSON.parse(e.target?.result as string)
        
        set({
            manifest,
            loadStatus: 'loaded',
            loadError: null
        })
    }
    
    reader.readAsText(file)
}
```

### Re-Audit Updates

```typescript
// SSE connection
const eventSource = new EventSource(
    `${API_URL}/api/audit/${jobId}/progress`
)

eventSource.addEventListener('progress', (e) => {
    const data = JSON.parse(e.data)
    
    // Update library progress in real-time
    set((state) => ({
        libraryProgress: updateProgress(state.libraryProgress, data)
    }))
})

eventSource.addEventListener('complete', (e) => {
    const manifest = JSON.parse(e.data)
    
    set({
        manifest,
        reauditStatus: 'done'
    })
    
    eventSource.close()
})
```

### Local Storage Persistence

```typescript
// Auto-save settings to localStorage
useGovernanceStore.subscribe((state) => {
    localStorage.setItem('mg-settings', JSON.stringify({
        loggingMode: state.settings.loggingMode,
        spLogListName: state.settings.spLogListName
    }))
})

// Load on init
const stored = localStorage.getItem('mg-settings')
if (stored) {
    const settings = JSON.parse(stored)
    useGovernanceStore.setState({ settings })
}
```

---

## 🎨 UI/UX Design Patterns

### Monospace Typography

All data display uses `DM Mono`:
- File names
- Field names
- URLs
- Status codes
- Technical details

### Color System

```css
/* Light theme */
--text: #1a1a1a
--text2: #6b7280
--text3: #9ca3af
--background: #ffffff
--card: #f9fafb
--border: #e5e7eb
--cyan: #00bfa8
--pink: #e8005a
--amber: #f59e0b
--green: #10b981

/* Dark theme */
--text: #f9fafb
--text2: #9ca3af
--text3: #6b7280
--background: #0f0f0f
--card: #1a1a1a
--border: #2d2d2d
```

### Responsive Grid

```typescript
// TanStack Table with virtual scrolling
<Table
    data={items}
    columns={columns}
    enableVirtualization
    estimateSize={() => 56}  // Row height
/>
```

### Loading States

```typescript
{isLoading ? (
    <LoadingSpinner />
) : error ? (
    <ErrorMessage error={error} />
) : data ? (
    <DataDisplay data={data} />
) : (
    <EmptyState />
)}
```

---

## 🚀 Performance Optimizations

### Pagination

SharePoint queries paginated at 1000 items:
```typescript
let nextLink = libraryUrl + '/items?$top=1000'

while (nextLink) {
    const response = await fetch(nextLink, { headers })
    const data = await response.json()
    
    items.push(...data.value)
    nextLink = data['@odata.nextLink']
}
```

### Memoization

React components use `useMemo` for expensive calculations:
```typescript
const filtered = useMemo(() =>
    items.filter(item => 
        item.fileName.includes(searchQuery)
    ),
    [items, searchQuery]
)
```

### Virtual Scrolling

TanStack Table renders only visible rows:
```typescript
const table = useReactTable({
    data,
    columns,
    enableRowVirtualization: true
})
```

---

## 🐛 Error Handling

### API Layer

```typescript
try {
    const response = await fetch(url, options)
    
    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`SharePoint API error: ${errorText}`)
    }
    
    return await response.json()
} catch (error) {
    console.error('[API]', error)
    throw error
}
```

### UI Layer

```typescript
const [error, setError] = useState<string | null>(null)

try {
    await remediateItem(...)
    setError(null)
} catch (err: any) {
    setError(err.message)
}

// Display
{error && (
    <ErrorBox>
        <ErrorIcon />
        {error}
    </ErrorBox>
)}
```

---

## 📝 Logging Architecture

### Local Logging

```typescript
interface LocalLog {
    timestamp: string
    itemId: number
    fileName: string
    libraryName: string
    fields: Array<{
        name: string
        oldValue: any
        newValue: any
    }>
}

// Store in localStorage
const logs: LocalLog[] = JSON.parse(
    localStorage.getItem('mg-remediation-log') || '[]'
)

logs.push(newLog)

localStorage.setItem(
    'mg-remediation-log',
    JSON.stringify(logs)
)
```

### SharePoint Logging

```typescript
// Create list item with consolidated field changes
await fetch(
    `${siteUrl}/_api/web/lists/getbytitle('${listName}')/items`,
    {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json;odata=nometadata'
        },
        body: JSON.stringify({
            Title: `${timestamp} | ${fileName} | ${fieldCount} fields fixed`,
            DocumentItemId: itemId,
            FileName: fileName,
            LibraryName: libraryName,
            FieldsFixed: fields.map(f =>
                `${f.name}: ${f.oldValue || '(empty)'} → ${f.newValue}`
            ).join('\n'),
            FixedBy: 'System',
            FixedAt: new Date().toISOString(),
            Status: 'Success'
        })
    }
)
```

---

## 🔮 Future Architecture (v2.0)

### Bulk Remediation

```
React UI
    ↓ (bulk select, provide values)
Express API
    ↓ (create job)
BullMQ Queue (optional, requires Redis)
    ↓ (process batches)
Worker Process(es)
    ↓ (stream items, batch update)
SharePoint REST API ($batch endpoint)
    ↓ (100 items/batch)
Progress via SSE
    ↓
React Dashboard (progress bar, ETA)
```

### AI Suggestions

```
React UI (upload file)
    ↓
API → OpenAI GPT-4
    ↓ (analyze content, context)
Return suggested metadata
    ↓
User reviews/approves
    ↓
Apply to SharePoint
```

---

**For questions about architecture, open a GitHub Discussion!**
