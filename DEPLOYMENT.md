# 🚢 Meta-Governor Deployment Guide

This guide covers deploying Meta-Governor to various platforms. Choose the option that best fits your needs.

---

## 📋 Table of Contents

- [Render (Recommended)](#render-recommended)
- [Vercel](#vercel)
- [Azure App Service](#azure-app-service)
- [AWS](#aws)
- [Self-Hosted (Docker)](#self-hosted-docker)
- [Environment Variables Reference](#environment-variables-reference)

---

## Render (Recommended)

**Why Render:**
- ✅ Free tier available
- ✅ Simple setup (5 minutes)
- ✅ Automatic deploys from Git
- ✅ Built-in SSL certificates
- ✅ Easy environment variable management

### Step 1: Prepare Your Repository

1. Push your Meta-Governor code to GitHub (public or private)
2. Ensure `.env` files are in `.gitignore` (they should be)

### Step 2: Deploy API Server

1. Go to [render.com](https://render.com) → Sign up/Login
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name:** `meta-governor-api`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build --workspace=packages/api`
   - **Start Command:** `cd packages/api && npm run dev`
   - **Instance Type:** Free

5. **Environment Variables** (click "Advanced"):
   ```
   TENANT_ID=your-tenant-id
   CLIENT_ID=your-client-id
   CERT_THUMBPRINT=your-cert-thumbprint
   CERT_PATH=../engine/certs/private.key
   PORT=3002
   ALLOWED_ORIGIN=https://your-dashboard-url.onrender.com
   ```

6. **Add Certificate File:**
   - Go to Render Dashboard → your service → "Shell"
   - Run: `mkdir -p packages/engine/certs`
   - Use Render's file upload or paste certificate content
   - Or: Encode as base64 and decode at runtime

7. Click **"Create Web Service"**
8. Note your API URL: `https://meta-governor-api.onrender.com`

### Step 3: Deploy Dashboard

1. **New Web Service** in Render
2. Select same repository
3. Configure:
   - **Name:** `meta-governor-dashboard`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build --workspace=packages/dashboard`
   - **Start Command:** `cd packages/dashboard/dist && npx serve -s -l 5173`
   - **Instance Type:** Free

4. **Environment Variables:**
   ```
   VITE_API_URL=https://meta-governor-api.onrender.com
   ```

5. **Build Settings:**
   - Root Directory: Leave empty
   - Auto-Deploy: Yes

6. Click **"Create Web Service"**

### Step 4: Update CORS

1. Go back to API service → Environment
2. Update `ALLOWED_ORIGIN` to your dashboard URL:
   ```
   ALLOWED_ORIGIN=https://meta-governor-dashboard.onrender.com
   ```

3. Trigger redeploy

### Step 5: Test

Visit `https://meta-governor-dashboard.onrender.com` → Run audit!

**Notes:**
- Free tier spins down after 15 min of inactivity (30-60s cold start)
- Upgrade to paid tier ($7/month per service) for always-on

---

## Vercel

**Why Vercel:**
- ✅ Free tier with generous limits
- ✅ Excellent for frontend
- ⚠️ Requires serverless API adaptation

### Dashboard Deployment

1. Install Vercel CLI: `npm i -g vercel`
2. Navigate to dashboard: `cd packages/dashboard`
3. Run: `vercel`
4. Follow prompts
5. Set environment variable:
   ```bash
   vercel env add VITE_API_URL
   # Enter your API URL
   ```

### API Deployment (Serverless Functions)

Vercel doesn't support long-running Node servers. Options:

**Option A: Deploy API to Render (recommended)**
- Use Render for API (as above)
- Use Vercel for Dashboard
- Point `VITE_API_URL` to Render API

**Option B: Convert to Serverless Functions**
- Refactor Express routes to `/api` directory
- Use Vercel serverless functions
- **Challenge:** Certificate auth in serverless environment

---

## Azure App Service

**Why Azure:**
- ✅ Native Microsoft stack integration
- ✅ Enterprise-grade security
- ✅ Easy certificate management
- ⚠️ No free tier

### Prerequisites

1. Azure subscription
2. Azure CLI installed

### Deploy

```bash
# Login
az login

# Create resource group
az group create --name meta-governor-rg --location eastus

# Create App Service Plan
az appservice plan create \
  --name meta-governor-plan \
  --resource-group meta-governor-rg \
  --sku B1 \
  --is-linux

# Create API Web App
az webapp create \
  --name meta-governor-api \
  --resource-group meta-governor-rg \
  --plan meta-governor-plan \
  --runtime "NODE|20-lts"

# Create Dashboard Web App
az webapp create \
  --name meta-governor-dashboard \
  --resource-group meta-governor-rg \
  --plan meta-governor-plan \
  --runtime "NODE|20-lts"

# Configure API environment variables
az webapp config appsettings set \
  --name meta-governor-api \
  --resource-group meta-governor-rg \
  --settings \
    TENANT_ID="your-tenant-id" \
    CLIENT_ID="your-client-id" \
    CERT_THUMBPRINT="your-thumbprint" \
    PORT=3002 \
    ALLOWED_ORIGIN="https://meta-governor-dashboard.azurewebsites.net"

# Upload certificate to App Service
az webapp config ssl upload \
  --name meta-governor-api \
  --resource-group meta-governor-rg \
  --certificate-file private.key

# Deploy code
cd packages/api
zip -r api.zip .
az webapp deployment source config-zip \
  --name meta-governor-api \
  --resource-group meta-governor-rg \
  --src api.zip
```

---

## AWS

**Why AWS:**
- ✅ Mature ecosystem
- ✅ Many deployment options
- ⚠️ More complex setup

### Option A: Elastic Beanstalk

```bash
# Install EB CLI
pip install awsebcli

# Initialize
cd packages/api
eb init -p node.js-20 meta-governor-api

# Create environment
eb create meta-governor-api-prod

# Set environment variables
eb setenv \
  TENANT_ID="your-tenant-id" \
  CLIENT_ID="your-client-id" \
  CERT_THUMBPRINT="your-thumbprint" \
  ALLOWED_ORIGIN="https://your-dashboard.com"

# Deploy
eb deploy
```

### Option B: EC2 (Manual)

1. Launch EC2 instance (Ubuntu 22.04)
2. SSH into instance
3. Install Node.js 20:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. Clone repo:
   ```bash
   git clone https://github.com/yourusername/meta-governor.git
   cd meta-governor
   npm install
   ```

5. Set up environment variables:
   ```bash
   cp packages/api/.env.example packages/api/.env
   nano packages/api/.env  # Edit with your values
   ```

6. Install PM2:
   ```bash
   sudo npm install -g pm2
   ```

7. Start services:
   ```bash
   # API
   cd packages/api
   pm2 start src/index.ts --name meta-governor-api --interpreter ts-node
   
   # Dashboard (build first)
   cd ../dashboard
   npm run build
   pm2 serve dist 5173 --name meta-governor-dashboard
   
   # Save PM2 config
   pm2 save
   pm2 startup
   ```

8. Configure nginx reverse proxy (optional):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location /api {
           proxy_pass http://localhost:3002;
       }
       
       location / {
           proxy_pass http://localhost:5173;
       }
   }
   ```

---

## Self-Hosted (Docker)

**Why Docker:**
- ✅ Consistent environments
- ✅ Easy to replicate
- ✅ Good for on-premises deployments

### Docker Compose Setup

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: packages/api/Dockerfile
    ports:
      - "3002:3002"
    environment:
      - TENANT_ID=${TENANT_ID}
      - CLIENT_ID=${CLIENT_ID}
      - CERT_THUMBPRINT=${CERT_THUMBPRINT}
      - CERT_PATH=/app/certs/private.key
      - ALLOWED_ORIGIN=http://localhost:5173
      - PORT=3002
    volumes:
      - ./packages/engine/certs:/app/certs:ro
    restart: unless-stopped

  dashboard:
    build:
      context: .
      dockerfile: packages/dashboard/Dockerfile
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:3002
    depends_on:
      - api
    restart: unless-stopped
```

### Dockerfiles

**packages/api/Dockerfile:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/api/package*.json ./packages/api/
COPY packages/shared/ ./packages/shared/
COPY packages/engine/ ./packages/engine/

# Install dependencies
RUN npm install

# Copy source
COPY packages/api/src ./packages/api/src
COPY packages/api/tsconfig.json ./packages/api/

# Build
RUN npm run build --workspace=packages/api

EXPOSE 3002

CMD ["npm", "run", "dev", "--workspace=packages/api"]
```

**packages/dashboard/Dockerfile:**
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy and install
COPY package*.json ./
COPY packages/dashboard/package*.json ./packages/dashboard/
RUN npm install

# Copy source and build
COPY packages/dashboard/ ./packages/dashboard/
RUN npm run build --workspace=packages/dashboard

# Production
FROM nginx:alpine
COPY --from=builder /app/packages/dashboard/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Run

```bash
# Create .env file
cp .env.example .env
# Edit .env with your values

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## Environment Variables Reference

### API (.env)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `TENANT_ID` | ✅ Yes | Azure AD Tenant ID | `abc123...` |
| `CLIENT_ID` | ✅ Yes | App Registration Client ID | `def456...` |
| `CERT_THUMBPRINT` | ✅ Yes | Certificate thumbprint | `4DC483...` |
| `CERT_PATH` | ✅ Yes | Path to private key | `../engine/certs/private.key` |
| `PORT` | ⚠️ Optional | API server port | `3002` (default) |
| `ALLOWED_ORIGIN` | ✅ Yes | Dashboard URL for CORS | `http://localhost:5173` |

### Dashboard (.env)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_URL` | ✅ Yes | API server URL | `http://localhost:3002` |

---

## Certificate Management in Production

### Option 1: Environment Variable (Base64)

Encode certificate:
```bash
cat private.key | base64 > private.key.b64
```

Add to environment variables:
```env
CERT_BASE64=<base64-encoded-certificate>
```

Decode at runtime (add to index.ts):
```typescript
import fs from 'fs'
import path from 'path'

if (process.env.CERT_BASE64) {
    const certPath = path.join(__dirname, '../certs/private.key')
    const certContent = Buffer.from(process.env.CERT_BASE64, 'base64').toString()
    fs.mkdirSync(path.dirname(certPath), { recursive: true })
    fs.writeFileSync(certPath, certContent)
}
```

### Option 2: Azure Key Vault

For Azure deployments, store certificate in Key Vault:

```typescript
import { DefaultAzureCredential } from '@azure/identity'
import { SecretClient } from '@azure/keyvault-secrets'

const credential = new DefaultAzureCredential()
const client = new SecretClient('https://your-vault.vault.azure.net', credential)

const secret = await client.getSecret('meta-governor-cert')
const privateKey = secret.value
```

### Option 3: AWS Secrets Manager

For AWS deployments:

```bash
aws secretsmanager create-secret \
    --name meta-governor-cert \
    --secret-string file://private.key
```

Then retrieve in code:
```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'

const client = new SecretsManagerClient({ region: 'us-east-1' })
const response = await client.send(
    new GetSecretValueCommand({ SecretId: 'meta-governor-cert' })
)
const privateKey = response.SecretString
```

---

## SSL/HTTPS Configuration

### Render
- Automatic SSL certificates via Let's Encrypt
- No configuration needed

### Custom Domain

1. Add custom domain in platform settings
2. Point DNS A record to platform IP
3. Enable SSL (automatic on most platforms)

**Example DNS:**
```
Type    Name    Value
A       @       your-platform-ip
CNAME   www     your-app.platform.com
```

---

## Health Checks & Monitoring

Add health check endpoint to API:

```typescript
// packages/api/src/index.ts

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    })
})
```

Configure platform health checks:
- **Render:** Auto-detects HTTP 200 responses
- **Azure:** Configure in App Service Health Check
- **AWS:** Configure in Load Balancer

---

## Troubleshooting Deployment

### "Module not found" errors

**Cause:** Missing workspace packages

**Fix:**
```bash
# Ensure all workspaces are installed
npm install
npm install --workspace=packages/api
npm install --workspace=packages/dashboard
```

### Certificate not found in production

**Cause:** CERT_PATH incorrect for production structure

**Fix:**
```env
# Development
CERT_PATH=../engine/certs/private.key

# Production (adjust based on build output)
CERT_PATH=/app/packages/engine/certs/private.key
```

### CORS errors in production

**Cause:** ALLOWED_ORIGIN doesn't match dashboard URL

**Fix:**
```env
# Must match exactly (including https://)
ALLOWED_ORIGIN=https://your-actual-dashboard-url.com
```

### API times out on first request

**Cause:** Cold start (free tier platforms)

**Solution:**
- Upgrade to paid tier for always-on instances
- Or accept 30-60s cold start time
- Or implement keep-alive pings

---

## Cost Estimates

### Render
- Free tier: $0/month (good for testing)
- Starter (always-on): $7/month per service = $14/month total
- Pro: $25/month per service = $50/month total

### Vercel
- Hobby (personal): $0/month
- Pro (team): $20/month

### Azure
- App Service B1: ~$13/month per app = $26/month total
- App Service P1V2: ~$96/month (production-grade)

### AWS
- EC2 t3.small: ~$15/month
- Elastic Beanstalk: ~$20-40/month

### Self-Hosted
- VPS (DigitalOcean, Linode): $6-12/month
- + Domain: $10-15/year
- Total: ~$10-15/month

---

**Recommended for Quick Start:** Render (free tier)

**Recommended for Production:** Azure App Service or AWS (enterprise), Render Pro (startups)

**Questions?** Open an issue on GitHub!
