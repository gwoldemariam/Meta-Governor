# 🏛️ Meta-Governor

**AI-Ready SharePoint Metadata Governance & Remediation Platform**

Meta-Governor is an open-source tool that audits, tracks, and fixes missing or incorrect metadata across your SharePoint Online tenant. Built for IT administrators and governance teams managing tens of thousands to millions of documents.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)

---

## 🎯 What It Does

**The Problem:**
- SharePoint documents missing required metadata
- Search returns incomplete results
- Governance policies violated across thousands of items
- Manual remediation takes weeks

**The Solution:**
Meta-Governor provides:
- 🔍 **Automated Audits** - Scan entire sites in minutes
- 📊 **Visual Dashboard** - See violations by library and field
- ✅ **One-Click Fixes** - Update metadata with validation
- 📝 **Audit Logging** - Track every change (local or SharePoint list)
- 🔄 **Re-Audit** - Monitor compliance over time

---

## ✨ Features

### Current Release (v1.0)

- **Health Dashboard**: Real-time metrics on governance compliance
- **Library Explorer**: Drill down into specific libraries and items
- **Remediation Queue**: Filter and fix failing items by library, field, or date
- **Fix Panel**: Field-by-field remediation with old/new value tracking
- **Dual Logging**: Browser storage (default) or SharePoint list (enterprise)
- **Re-Audit**: Track improvements over time
- **Multi-Site Support**: Switch between sites seamlessly

### Coming in v2.0 (Planned)

- 🤖 **AI-Powered Suggestions**: Auto-suggest metadata based on content
- 📦 **Bulk Remediation**: Fix thousands of items with progress tracking
- 🔔 **Scheduled Audits**: Automated compliance monitoring
- 💼 **SaaS Option**: Cloud-hosted, no infrastructure needed

---

## 🚀 Quick Start

### Prerequisites

1. **Node.js 20+** - [Download here](https://nodejs.org/)
2. **SharePoint App Registration** with certificate authentication
3. **SharePoint Permissions**: Sites.FullControl.All (or Sites.ReadWrite.All minimum)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/meta-governor.git
cd meta-governor

# Install dependencies
npm install

# Configure certificates (see Setup Guide below)
# Place your private.key in packages/engine/certs/

# Set up environment variables
cp packages/api/.env.example packages/api/.env
cp packages/dashboard/.env.example packages/dashboard/.env

# Edit .env files with your tenant details

# Start the API server (Terminal 1)
npm run api

# Start the dashboard (Terminal 2 - separate terminal)
cd packages/dashboard
npm run dev
```

Open http://localhost:5173 in your browser! 🎉

---

## 📖 Setup Guide

### Step 1: Create SharePoint App Registration

1. Go to Azure Portal → App Registrations → New Registration
   - Name: `Meta-Governor`
   - Supported account types: Single tenant
   - Redirect URI: Not needed

2. Note your **Tenant ID** and **Application (Client) ID**

3. API Permissions → Add permission → SharePoint
   - Application permissions: `Sites.FullControl.All` (or `Sites.ReadWrite.All`)
   - Grant admin consent

4. Certificates & Secrets → Upload certificate
   - Generate a certificate (see below)
   - Upload the `.cer` file
   - Note the **Thumbprint**

### Step 2: Generate Certificate

**On Windows (PowerShell):**
```powershell
$cert = New-SelfSignedCertificate -Subject "CN=MetaGovernor" -CertStoreLocation "Cert:\CurrentUser\My" -KeyExportPolicy Exportable -KeySpec Signature -NotAfter (Get-Date).AddYears(2)

# Export certificate
Export-Certificate -Cert $cert -FilePath ".\meta-governor.cer"

# Export private key
$pwd = ConvertTo-SecureString -String "YourPassword" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath ".\meta-governor.pfx" -Password $pwd

# Convert to PEM format (use OpenSSL)
openssl pkcs12 -in meta-governor.pfx -out private.key -nodes -nocerts
```

**On Mac/Linux:**
```bash
# Generate certificate
openssl req -x509 -newkey rsa:2048 -keyout private.key -out certificate.cer -days 730 -nodes -subj "/CN=MetaGovernor"

# Upload certificate.cer to Azure
# Place private.key in packages/engine/certs/
```

### Step 3: Configure Environment Variables

**packages/api/.env:**
```env
TENANT_ID="your-tenant-id-here"
CLIENT_ID="your-client-id-here"
CERT_THUMBPRINT="your-cert-thumbprint-here"
CERT_PATH="../engine/certs/private.key"
ALLOWED_ORIGIN=http://localhost:5173
PORT=3002
```

**packages/dashboard/.env:**
```env
VITE_API_URL=http://localhost:3002
```

### Step 4: Run Your First Audit

1. Start the API: `npm run api`
2. Start the dashboard: `cd packages/dashboard && npm run dev`
3. Open http://localhost:5173
4. Click **"Run Full Audit"**
5. Enter your SharePoint site URL (e.g., `https://contoso.sharepoint.com/sites/ProjectSite`)
6. Wait for audit to complete (~1-5 minutes depending on site size)
7. Explore violations in the dashboard!

---

## 💡 Usage Guide

### Running Audits

**First Time:**
1. Click **"Run Full Audit"** in the top navigation
2. Enter SharePoint site URL
3. Audit scans all document libraries for governance violations

**Re-Audit (After Fixes):**
1. Click **"↻ Re-audit"** to scan again
2. Compare improvements over time

### Fixing Violations

**Single Item Fix:**
1. Go to **Remediation Queue**
2. Click on any failing item row
3. Fix Panel opens on the right
4. Fill in missing fields (dropdowns for taxonomy, text inputs, etc.)
5. Click **"Fix All Fields"**
6. Changes logged automatically with before/after values

**Filter & Focus:**
- Filter by library: See violations in specific libraries
- Filter by status: Show only failing items
- Search: Find specific files

### Logging

**Default (Browser Storage):**
- All fixes logged in localStorage
- Persists in your browser
- View logs in Settings page

**Enterprise (SharePoint List):**
1. Go to **Settings**
2. Select "SharePoint List" logging
3. Enter list name (e.g., `GovernanceRemediationLog`)
4. Click **"💾 Save Changes"**
5. List created automatically with custom fields
6. All fixes logged with before/after tracking

---

## 📁 Project Structure

```
meta-governor/
├── packages/
│   ├── api/              # Express API server
│   │   ├── src/
│   │   │   ├── routes/   # API endpoints (audit, remediate, logging)
│   │   │   └── index.ts  # Server entry point
│   │   └── .env          # API configuration
│   │
│   ├── dashboard/        # React frontend
│   │   ├── src/
│   │   │   ├── pages/    # Main UI pages
│   │   │   ├── components/ # Reusable components
│   │   │   └── store/    # Zustand state management
│   │   └── .env          # Dashboard configuration
│   │
│   ├── engine/           # Core audit logic
│   │   ├── certs/        # Certificate storage
│   │   ├── config/       # Governance schemas
│   │   └── src/          # TypeScript audit engine
│   │
│   └── shared/           # Shared TypeScript types
│
└── package.json          # Monorepo root
```

---

## 🔧 Configuration

### Governance Schemas

Define your governance rules in `packages/engine/config/schemas/`:

**Example schema (v2.0.json):**
```json
{
  "version": "v2.0",
  "name": "Enterprise Governance Policy",
  "schemaRules": [
    {
      "rule": "documentLibraries",
      "requiredFields": [
        {
          "internalName": "Department",
          "displayName": "Department",
          "typeAsString": "TaxonomyFieldType",
          "termSetId": "xxx-xxx-xxx",
          "allowFillIn": false
        },
        {
          "internalName": "DocumentStatus",
          "displayName": "Status",
          "typeAsString": "Choice"
        }
      ]
    }
  ]
}
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/audit/start` | POST | Start full site audit |
| `/api/audit/:jobId/progress` | GET | SSE progress stream |
| `/api/reaudit` | POST | Re-audit existing site |
| `/api/remediate/remediate` | POST | Fix single item |
| `/api/logging/setup` | POST | Create SharePoint log list |
| `/api/logging/check` | GET | Verify log list exists |
| `/api/fields/taxonomy/:termSetId` | GET | Get taxonomy terms |

---

## 🛠️ Development

### Running in Development

```bash
# Terminal 1: API Server
npm run api

# Terminal 2: Dashboard
cd packages/dashboard
npm run dev

# Access at http://localhost:5173
```

### Building for Production

```bash
# Build all packages
npm run build

# Build specific packages
npm run build --workspace=packages/dashboard
npm run build --workspace=packages/api
```

---

## 🚢 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed platform-specific guides.

**Quick Deploy Options:**
- **Render** - Recommended for simplicity (see DEPLOYMENT.md)
- **Vercel** - Best for frontend (API requires workaround)
- **Azure** - For enterprise customers on Microsoft stack
- **AWS** - EC2 or Elastic Beanstalk
- **Self-Hosted** - Docker + PM2

---

## 🐛 Troubleshooting

### "Failed to acquire SharePoint token"

**Cause:** Certificate authentication issue

**Fix:**
1. Verify certificate thumbprint matches Azure portal
2. Check `CERT_PATH` points to correct private.key
3. Ensure certificate hasn't expired
4. Verify API permissions granted in Azure

### "CORS Error" in Browser Console

**Cause:** API not allowing dashboard origin

**Fix:**
```env
# In packages/api/.env
ALLOWED_ORIGIN=http://localhost:5173
```

For production:
```env
ALLOWED_ORIGIN=https://your-deployed-dashboard.com
```

### "List doesn't exist" when fixing items

**Cause:** SharePoint logging enabled but list not created

**Fix:**
1. Go to Settings
2. Click "💾 Save Changes" to create list
3. Or switch to "Local" logging mode

### Items show as "Fail" but should be compliant

**Cause:** Schema mismatch or field not recognized

**Fix:**
1. Check schema in `packages/engine/config/schemas/`
2. Verify field internal names match SharePoint
3. Re-run audit after schema update

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Ways to contribute:**
- 🐛 Report bugs via GitHub Issues
- ✨ Suggest features
- 📖 Improve documentation
- 🔧 Submit pull requests
- 💬 Answer questions in Discussions

---

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🙏 Acknowledgments

- Built with [PnPjs](https://pnp.github.io/pnpjs/) for SharePoint interactions
- [MSAL](https://github.com/AzureAD/microsoft-authentication-library-for-js) for Azure AD authentication
- [Recharts](https://recharts.org/) for beautiful visualizations
- [TanStack Table](https://tanstack.com/table) for powerful data grids
- [Zustand](https://zustand-demo.pmnd.rs/) for state management

---

## 📧 Support

- 📖 [Documentation](https://github.com/yourusername/meta-governor/wiki)
- 💬 [Discussions](https://github.com/yourusername/meta-governor/discussions)
- 🐛 [Issue Tracker](https://github.com/yourusername/meta-governor/issues)

---

## 🗺️ Roadmap

- [x] Certificate-based authentication
- [x] Site-wide audits
- [x] Visual dashboard
- [x] Single-item remediation
- [x] Dual logging (browser + SharePoint)
- [x] Re-audit functionality
- [ ] **v2.0:** AI metadata suggestions
- [ ] **v2.0:** Bulk remediation (1M+ items)
- [ ] **v2.0:** Scheduled audits
- [ ] **v3.0:** Multi-tenant SaaS
- [ ] **v3.0:** Power Automate integration

---

**Made with ❤️ for SharePoint Administrators everywhere**
