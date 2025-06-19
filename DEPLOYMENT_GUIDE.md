# 🚀 Sol Analytics Dashboard - Deployment Guide

## Quick Deployment Steps

### 1. Deploy Backend to Railway

1. **Push to GitHub** (if not already done):
   ```bash
   git push origin main
   ```

2. **Deploy on Railway**:
   - Go to [railway.app](https://railway.app)
   - Sign in with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your `sol-analytics` repository
   - Choose "Deploy from the repo root"

3. **Configure Environment Variables in Railway**:
   - Go to your project → Variables tab
   - Add these environment variables:
     ```
     DUNE_API_KEY=C5OGjFaT3m3DFiExbTfMdkj1wtfKgvkH
     REACT_APP_SUPABASE_URL=https://kctohdlzcnnmcubgxiaa.supabase.co
     REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdG9oZGx6Y25ubWN1Ymd4aWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MTY4NjYsImV4cCI6MjA2MDI5Mjg2Nn0.DHkqRgq4Ke8QCa5uQzOAZBAvnN1mIZ19xPGS9urqLYw
     NODE_ENV=production
     PORT=3001
     ```

4. **Set Build and Start Commands**:
   - Root Directory: `/server`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

5. **Deploy**: Railway will automatically deploy. Note your Railway URL (e.g., `https://your-app-name.railway.app`)

### 2. Deploy Frontend to Netlify

1. **Update Frontend Environment**:
   - Go to [netlify.com](https://netlify.com)
   - Sign in with GitHub
   - Click "New site from Git"
   - Choose GitHub and select your `sol-analytics` repository

2. **Configure Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Base directory: (leave empty for root)

3. **Set Environment Variables in Netlify**:
   - Go to Site settings → Environment variables
   - Add:
     ```
     VITE_API_URL=https://your-railway-app.railway.app/api
     ```
   - Replace `your-railway-app` with your actual Railway domain

4. **Deploy**: Netlify will build and deploy automatically

## 🔗 Quick Deploy Links

### Option A: One-Click Deploy (Recommended)

**Railway (Backend):**
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/new)

**Netlify (Frontend):**
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/your-username/sol-analytics)

### Option B: Manual Deploy Steps

1. **Backend (Railway)**:
   - Repository: Connect your GitHub repo
   - Root Directory: `/server`
   - Environment Variables: Copy from above
   - Auto-deploy: Enable

2. **Frontend (Netlify)**:
   - Repository: Connect your GitHub repo
   - Build Command: `npm run build`
   - Publish Directory: `dist`
   - Environment Variables: `REACT_APP_API_URL`

## 🎯 Expected Results

After successful deployment:

### Backend API
- **URL**: `https://your-app.railway.app`
- **Health Check**: `https://your-app.railway.app/health`
- **API Endpoints**: `https://your-app.railway.app/api/protocols/stats`

### Frontend Dashboard
- **URL**: `https://your-app.netlify.app`
- **Features**: All 17 protocols with full analytics
- **Admin Panel**: `https://your-app.netlify.app/admin/protocols`

## 🛠 Troubleshooting

### Common Issues:

1. **Backend won't start**:
   - Check Railway logs for errors
   - Verify environment variables are set
   - Ensure `/server` directory is set as root

2. **Frontend can't connect to API**:
   - Check `VITE_API_URL` environment variable
   - Verify Railway backend is running
   - Check CORS settings in backend

3. **Build failures**:
   - Ensure Node.js version compatibility
   - Check for missing dependencies
   - Review build logs for specific errors

### Quick Fixes:

```bash
# Re-deploy backend
git push origin main  # Triggers Railway auto-deploy

# Re-deploy frontend
git push origin main  # Triggers Netlify auto-deploy
```

## 📊 Test Your Deployment

1. **Backend Health**: Visit `https://your-backend.railway.app/health`
2. **API Test**: Visit `https://your-backend.railway.app/api/protocols/stats`
3. **Frontend**: Visit `https://your-frontend.netlify.app`
4. **Individual Protocols**: Test `https://your-frontend.netlify.app/?protocol=bullx`
5. **Admin Panel**: Test `https://your-frontend.netlify.app/admin/protocols`

## 🔐 Security Notes

- Environment variables are securely stored in Railway/Netlify
- API keys are not exposed in the frontend code
- CORS is properly configured for production domains

## 📈 Monitoring

- **Railway**: Monitor backend performance and logs
- **Netlify**: Monitor frontend builds and deployments
- **Supabase**: Monitor database usage and performance

Your Sol Analytics Dashboard will be live and accessible to your peers! 🚀