# AI-Powered Business Development CRM & Meeting Follow-Up System

An enterprise-grade **Business Development CRM and Automated Meeting Follow-Up Management System** built with **React 18, Vite, Node.js, Express, Prisma ORM, and SQLite / PostgreSQL**.

The system helps Business Development, Sales, and Relationship Management teams manage clients, contacts, meetings, pipelines, follow-ups, and automated multi-channel reminders (Email and WhatsApp).

---

## 🚀 Key Features

* **360° Client Portfolio Management**: Manage enterprise companies, primary contacts, secondary stakeholders, relationship statuses (`LEAD` &rarr; `ACTIVE_CLIENT`), priorities, and assigned managers.
* **Non-Destructive Archival (Soft-Delete)**: Archive clients with full preservation of historical notes and meetings, with instant one-click restoration.
* **Automated Meeting Follow-Up Workflow**: Record meeting notes, outcomes, and set next meeting & follow-up dates. The CRM automatically cascades next scheduled meetings, tasks, and follow-ups.
* **Automated 24-Hour & 1-Hour Reminders**: Background cron engine scans upcoming meetings and dispatches automated reminder briefings to the assigned BD Manager.
* **Multi-Channel Notification Routing**: Direct reminders to user-specific `notificationEmail` and `whatsappNumber` based on granular delivery preferences.
* **Zero Fake Delivery Claims**: Transparent delivery status tracking (`SENT`, `FAILED`, `NOT_CONFIGURED`) with direct click-to-chat (`wa.me`) link generation when API credentials are not configured.
* **Admin User Directory & RBAC Security**: Manage team members (`ADMIN`, `MANAGER`, `BD_EXECUTIVE`, `VIEWER`), auto-generate temporary passwords, enforce password complexity rules, and protect the last active Administrator.
* **Dynamic Integration Settings**: Configure SMTP email transports and WhatsApp Business Cloud API in the Admin Settings UI with real-time test dispatch.
* **AI Growth Assistant**: Meeting notes summarization, action-item extraction, and relationship health scoring.

---

## 📋 Technology Stack

* **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts, date-fns
* **Backend**: Node.js v20, Express, TypeScript, Prisma ORM, bcryptjs, jsonwebtoken, Zod, Nodemailer, node-cron
* **Database**: SQLite (local development zero-setup) / PostgreSQL 16 (production)
* **Deployment**: Docker, Docker Compose, Nginx, Render / Railway / Vercel ready

---

## 🛠️ Quick Start (Local Development)

### 1. Prerequisites
* **Node.js** (v18.x or v20.x)
* **npm** (v9.x or v10.x)

### 2. Clone & Install Dependencies
```bash
# Clone the repository
git clone <repo-url>
cd bizdev-crm

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Environment Configuration
```bash
# Create backend .env from example
cd ../backend
cp .env.example .env

# Create frontend .env from example
cd ../frontend
cp .env.example .env
```

### 4. Initialize Database & Run Migrations
The local development environment uses SQLite by default (zero setup required):
```bash
cd ../backend

# Generate Prisma Client
npx prisma generate

# Sync schema with database
npx prisma db push

# (Optional) Seed realistic demo accounts and client data
npx prisma db seed
```

### 5. Start Development Servers
Run both backend and frontend servers:
```bash
# In Terminal 1 (Backend API on port 5000)
cd backend
npm run dev

# In Terminal 2 (Frontend Web on port 5173)
cd frontend
npm run dev
```

* **Frontend Application**: [http://localhost:5173](http://localhost:5173)
* **Backend API**: [http://localhost:5000/api](http://localhost:5000/api)
* **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🔑 Default Demo Accounts

If you ran `npx prisma db seed`, the following accounts are ready to use:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@bizdevcrm.com` | `admin123` | Full system control, user management, integrations, audit logs |
| **BD Manager** | `manager@bizdevcrm.com` | `manager123` | Client portfolio, team meetings, follow-ups, pipeline |
| **BD Executive** | `executive@bizdevcrm.com` | `executive123` | Assigned accounts, scheduled meetings, tasks, notes |
| **Viewer** | `viewer@bizdevcrm.com` | `viewer123` | Read-only access to records and reports |

---

## 👤 Creating Your First Admin Account

You can create an Administrator using the CLI setup utility:
```bash
cd backend
node ../scripts/create_admin.js
```
Follow the prompt to enter Name, Email, and Password.

---

## 🐳 Docker Deployment (Complete Stack)

To run the complete production stack (PostgreSQL + Backend + Embedded Scheduler + Frontend Nginx) with a single command:

```bash
# Start all containers in detached mode
docker-compose up -d --build
```

* **Frontend**: [http://localhost:5173](http://localhost:5173)
* **Backend API**: [http://localhost:5000](http://localhost:5000)
* **PostgreSQL**: `localhost:5432`

To stop the containers:
```bash
docker-compose down
```

---

## ☁️ Cloud Deployment Guide

### Option 1: Free Tier Deployment on Render (1-Click Blueprint)
1. Fork or push this repository to GitHub.
2. Log into [Render.com](https://render.com) and click **New &rarr; Blueprint**.
3. Connect your repository. Render will automatically detect `render.yaml` and provision:
   * **PostgreSQL Database** (Free tier)
   * **Backend Web Service** (Node.js API + background scheduler)
   * **Frontend Static Site** (React + Vite)
4. Set `VITE_API_URL` on the frontend to your Render backend URL.

### Option 2: Frontend on Vercel / Netlify & Backend on Railway
* **Frontend (Vercel)**:
  * Root Directory: `frontend`
  * Build Command: `npm run build`
  * Output Directory: `dist`
  * Environment Variable: `VITE_API_URL=https://your-backend.railway.app/api`
* **Backend (Railway)**:
  * Deploy from repo with root directory `backend`
  * Add a PostgreSQL database plugin in Railway
  * Environment Variable: `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `JWT_SECRET=...`, `APP_TIMEZONE=Asia/Karachi`

---

## ⚙️ Environment Variables Reference

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Port for the backend API server | `5000` |
| `NODE_ENV` | Environment mode (`development` / `production`) | `development` |
| `DATABASE_URL` | SQLite file path or PostgreSQL connection URI | `file:./dev.db` |
| `JWT_SECRET` | Secret key used for signing JWT tokens | Random string |
| `APP_TIMEZONE` | Timezone for scheduled reminders and meetings | `Asia/Karachi` |
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username / email address | `user@domain.com` |
| `SMTP_PASS` | SMTP password or app-specific password | `••••••••` |
| `SMTP_FROM` | Sender address for outgoing emails | `crm@domain.com` |
| `WHATSAPP_API_URL` | Meta WhatsApp Cloud API endpoint | `https://graph.facebook.com/v19.0` |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta WhatsApp Phone Number ID | `your_phone_id` |
| `WHATSAPP_API_KEY` | Meta WhatsApp Cloud API Bearer Token | `your_token` |
| `GEMINI_API_KEY` | Google Gemini API Key for AI note analysis | `your_api_key` |

---

## 🧪 Running Automated Tests

```bash
cd backend
npm test
```
Runs the 29 automated end-to-end and unit test cases covering client management, user RBAC, password resets, meeting workflows, and notification routing.

---

## 📄 License
MIT License. Built for enterprise Business Development operations.
