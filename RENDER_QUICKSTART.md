# 🚀 Quick Deploy to Render (5 Minutes)

This guide gets Meta-Governor running in production on Render's free tier in under 5 minutes.

---

## Prerequisites

- GitHub account
- Render account (sign up free at render.com)
- Your SharePoint credentials ready:
  - Tenant ID
  - Client ID  
  - Certificate Thumbprint
  - Private key file

---

## Step 1: Push to GitHub (2 minutes)

```bash
# Initialize git if you haven't
cd meta-governor
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR-USERNAME/meta-governor.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy API to Render (2 minutes)

1. Go to **render.com** → Dashboard
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Fill in:

**Settings:**
- **Name:** `meta-governor-api`
- **Region:** Choose closest to you
- **Branch:** `main`
- **Root Directory:** Leave empty
- **Environment:** `Node`
- **Build Command:** 
  ```
  npm install && npm run build --workspace=packages/api
  ```
- **Start Command:**
  ```
  node packages/api/dist/index.js
  ```
- **Plan:** Free

5. Click **"Advanced"** → Add Environment Variables:

```
TENANT_ID=your-tenant-id-here
CLIENT_ID=your-client-id-here
CERT_THUMBPRINT=your-thumbprint-here
CERT_PATH=../engine/certs/private.key
PORT=3002
ALLOWED_ORIGIN=https://meta-governor-dashboard.onrender.com
```

6. Click **"Create Web Service"**

7. **Add Certificate:**
   - Wait for initial deploy to complete
   - Go to **Shell** tab
   - Run:
     ```bash
     mkdir -p packages/engine/certs
     ```
   - Click **Upload File** → select your `private.key`
   - Upload to path: `packages/engine/certs/private.key`

8. **Trigger Redeploy:**
   - Go to **Manual Deploy** → **Deploy latest commit**

9. **Note your API URL:** `https://meta-governor-api.onrender.com`

---

## Step 3: Deploy Dashboard to Render (1 minute)

1. **New Web Service** → Same repository
2. Fill in:

**Settings:**
- **Name:** `meta-governor-dashboard`
- **Region:** Same as API
- **Branch:** `main`
- **Root Directory:** Leave empty
- **Environment:** `Node`
- **Build Command:**
  ```
  npm install && npm run build --workspace=packages/dashboard
  ```
- **Start Command:**
  ```
  cd packages/dashboard/dist && npx serve -s -l $PORT
  ```
- **Plan:** Free

3. **Environment Variables:**
```
VITE_API_URL=https://meta-governor-api.onrender.com
```

4. Click **"Create Web Service"**

5. **Update API CORS:**
   - Go back to API service
   - Environment → Edit `ALLOWED_ORIGIN`
   - Change to: `https://meta-governor-dashboard.onrender.com`
   - Save → Triggers automatic redeploy

---

## Step 4: Access Your App! 🎉

1. Visit `https://meta-governor-dashboard.onrender.com`
2. Click **"Run Full Audit"**
3. Enter your SharePoint site URL
4. Watch the magic happen! ✨

---

## ⚠️ Important Notes

### Free Tier Limitations

- **Cold Start:** Services spin down after 15 min of inactivity
  - First request after inactivity: 30-60 second delay
  - Subsequent requests: Normal speed

- **Hours Limit:** 750 hours/month per service (plenty for testing)

- **Not for Production:** For real use, upgrade to Starter ($7/month each = $14/month total)

### Certificate Security

**Your private key is stored on Render's server.** For enterprise deployments:
- Use environment variable with base64 encoding (see DEPLOYMENT.md)
- Or use Azure Key Vault / AWS Secrets Manager
- Or upgrade to paid tier with better security

### Custom Domain (Optional)

1. Go to service → Settings → Custom Domain
2. Add your domain (e.g., `meta-governor.yourdomain.com`)
3. Update DNS records as shown
4. SSL certificate auto-generated

---

## 🔧 Troubleshooting

### "Application failed to respond"

**Cause:** Start command incorrect or port mismatch

**Fix:**
- API: Use `node packages/api/dist/index.js`
- Dashboard: Use `cd packages/dashboard/dist && npx serve -s -l $PORT`

### "CORS error" in browser console

**Cause:** API's ALLOWED_ORIGIN doesn't match dashboard URL

**Fix:**
1. Check exact dashboard URL (with https://)
2. Update API environment variable
3. Redeploy API

### "Failed to acquire token"

**Cause:** Certificate not uploaded correctly

**Fix:**
1. Verify certificate uploaded to `packages/engine/certs/private.key`
2. Check CERT_PATH in environment variables
3. Verify CERT_THUMBPRINT matches Azure portal

### First request very slow

**Cause:** Free tier cold start (expected behavior)

**Fix:**
- Upgrade to Starter plan for always-on
- Or accept 30-60s delay on first request

---

## 💰 Upgrade to Production

When ready for real use:

1. Go to each service → Settings → Plan
2. Upgrade to **Starter** ($7/month)
3. Benefits:
   - ✅ Always on (no cold starts)
   - ✅ More resources
   - ✅ Better reliability
   - ✅ Priority support

**Total cost:** $14/month for API + Dashboard

---

## 🎯 Next Steps

1. ✅ Deploy to Render (you just did this!)
2. Run your first audit
3. Fix some items
4. Set up SharePoint logging (Settings page)
5. Share with your team!

---

## 📚 More Resources

- [Full Deployment Guide](DEPLOYMENT.md) - Other platforms
- [README](README.md) - Complete documentation
- [ARCHITECTURE](ARCHITECTURE.md) - How it works

---

**Questions?** Open an issue on GitHub!

**Success?** ⭐ Star the repository!
