# Zero-Cost Deployment Guide

BizDev CRM is engineered to run **completely free of cost** for internal sales teams and small-to-medium businesses.

---

## Zero-Cost Stack Options

| Component | Free Tier / Open Source Solution | Production Upgrade (Optional) |
|---|---|---|
| **Database** | SQLite (Single file `dev.db`) | Supabase / Neon / Render PostgreSQL |
| **Backend Hosting** | Render / Railway / Fly.io Free Tier | AWS EC2 / DigitalOcean Droplet |
| **Frontend Hosting** | Vercel / Netlify / Cloudflare Pages | AWS S3 + CloudFront |
| **Email Service** | Local Nodemailer Logger / Gmail SMTP | SendGrid / AWS SES |
| **WhatsApp** | Free `wa.me` Click-to-Chat links | Meta WhatsApp Cloud API |
| **AI Assistant** | Built-in Local Rule Engine | Google Gemini 1.5 Flash (Free tier available) |

---

## Deploying to Render / Vercel (100% Free)

### Step 1: Push Repository to GitHub
```bash
git init
git add .
git commit -m "Initial commit: Production-ready BizDev CRM"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### Step 2: Deploy Backend on Render
1. Create a **New Web Service** on [Render.com](https://render.com).
2. Connect your GitHub repository and set Root Directory to `backend`.
3. Build Command: `npm install && npx prisma generate && npx prisma db push && npm run prisma:seed`
4. Start Command: `npm run build && npm start`
5. Add Environment Variables:
   - `DATABASE_URL` = `file:./dev.db`
   - `JWT_SECRET` = `your-secure-random-secret-key`
   - `TIMEZONE` = `Asia/Karachi`

### Step 3: Deploy Frontend on Vercel
1. Import your repository into [Vercel](https://vercel.com).
2. Set Root Directory to `frontend`.
3. Add Environment Variable:
   - `VITE_API_URL` = `https://your-render-backend-url.onrender.com/api`
4. Click **Deploy**.
