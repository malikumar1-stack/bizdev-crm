# Security Architecture & Controls Summary

This document provides a comprehensive security overview of the **Business Development CRM & Meeting Follow-Up Management System**.

---

## 1. Password Hashing & Storage
- **Algorithm**: Passwords are never stored in plaintext. Passwords are cryptographically salted and hashed using **bcryptjs with 10 salt rounds**.
- **Protection**: Mitigates rainbow table, dictionary, and brute-force cracking attacks.

---

## 2. Authentication & Session/Token Security
- **Stateless Tokens**: Uses **JSON Web Tokens (JWT)** signed via **HMAC SHA-256** using a configurable secret (`JWT_SECRET`).
- **Token Expiry**: Fixed 7-day expiration window (`expiresIn: '7d'`).
- **Instant Revocation**: Inactive or deactivated accounts are rejected on every authenticated API call by verifying user status in the database.
- **Login Auditing**: The system automatically records the `lastLoginAt` timestamp on every successful authentication.

---

## 3. Role-Based Access Control (RBAC) & Authorization
- **Strict Role Hierarchy**:
  - `ADMIN`: Full system administrative access, user directory, password resets, system settings, integration transports, and audit logs.
  - `MANAGER`: Client portfolio management, team meetings, follow-ups, pipeline, and client archival.
  - `BD_EXECUTIVE`: Management of assigned client accounts, deals, meetings, tasks, and notes.
  - `VIEWER`: Read-only access to CRM records, calendars, and performance reports.
- **Backend Middleware Enforcement**: All protected endpoints enforce token authentication (`authenticateToken`) and role guards (`requireRole`).

---

## 4. Account Lifecycle & Administrative Protections
- **Last Active Admin Protection**: The CRM strictly forbids deleting, deactivating, or demoting the last active Administrator.
- **Safe User Deactivation & Client Reassignment**:
  - Deactivating a user instantly revokes login permissions.
  - Supports atomic reassignment transferring all assigned clients, upcoming meetings, pending follow-ups, and tasks to an active manager without altering past activity logs.
- **Admin Password Reset**:
  - Auto-generates high-entropy 10-character temporary credentials.
  - Automatically flags `forcePasswordChange = true` requiring password update upon first login.
- **Self-Service Password Complexity**:
  - Minimum 8 characters, uppercase letter (`A-Z`), lowercase letter (`a-z`), numeric digit (`0-9`), and special character (`!@#$%^&*`).

---

## 5. Client Data Protection & Soft-Deletion
- **Non-Destructive Archival (Soft-Delete)**: Deleting/archiving a client flags `isArchived: true` and `archivedAt: new Date()` instead of hard deleting records, preserving historical interaction logs and notes.
- **Instant Restoration**: Archived clients can be restored with a single click.

---

## 6. Secret Protection & Integration Transports
- **Credential Masking in UI**: Stored SMTP passwords and WhatsApp API keys are masked as `••••••••` when returned to the frontend.
- **Zero Fake Claims**: When WhatsApp API is unconfigured, the system explicitly reports status as `NOT_CONFIGURED` and generates verified `wa.me` click-to-chat links.

---

## 7. Audit Logging & Traceability
- **Audit Logs Table (`audit_logs`)**: Tracks all administrative actions: user creation, role changes, password resets, user deactivations, client archival/restoration, and settings updates with acting `userId`, timestamp, IP address, and change diffs.
- **Activity Timeline (`activities`)**: Chronological audit trail of client relationship events.
- **Notification Logs Table (`notification_logs`)**: Complete historical record of all reminder attempts.

---

## 8. Database Security & Injection Prevention
- **Prisma ORM Parameterization**: Complete immunity against SQL injection vulnerabilities through parameterized queries.
- **Input Validation**: Request payloads are validated and sanitized using **Zod schemas**.

---

## 9. Deployment & Network Hardening
- Deploy behind HTTPS reverse proxy (Nginx / Cloudflare / AWS ALB) with TLS 1.3.
- Restrict CORS origin in production to the specific frontend domain (`FRONTEND_URL`).
- Inject secrets via environment variables; never commit live `.env` files to version control.
