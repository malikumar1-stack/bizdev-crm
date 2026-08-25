# BizDev CRM — REST API Documentation

Base URL: `/api`

All authenticated endpoints require the header:
`Authorization: Bearer <jwt_token>`

---

## 1. Authentication (`/api/auth`)

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `POST` | `/auth/login` | User login with email & password | Public |
| `GET` | `/auth/me` | Get current authenticated user profile | Authenticated |

---

## 2. Clients (`/api/clients`)

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `GET` | `/clients` | List clients with search, status, and priority filters | Authenticated |
| `POST` | `/clients` | Create new client with company & contact details | Admin, Manager, BD Exec |
| `GET` | `/clients/:id` | Get Client 360 profile with timeline, meetings, follow-ups, health | Authenticated |
| `PUT` | `/clients/:id` | Update client information and relationship status | Admin, Manager, BD Exec |
| `DELETE` | `/clients/:id` | Soft-delete / remove client | Admin, Manager |

---

## 3. Meetings (`/api/meetings`)

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `GET` | `/meetings` | List meetings with date range & status filters | Authenticated |
| `POST` | `/meetings` | Schedule new client meeting & initialize 24h/1h reminders | Admin, Manager, BD Exec |
| `GET` | `/meetings/:id` | Get meeting details and participant list | Authenticated |
| `PUT` | `/meetings/:id` | Update meeting time, location, or agenda | Admin, Manager, BD Exec |
| `POST` | `/meetings/:id/workflow` | **Critical Post-Meeting Workflow**: Log outcome, notes, auto-schedule next meeting/follow-up | Admin, Manager, BD Exec |

---

## 4. Follow-ups & Tasks (`/api/followups` & `/api/tasks`)

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `GET` | `/followups` | List follow-up items with due dates and priorities | Authenticated |
| `POST` | `/followups` | Create new follow-up item | Admin, Manager, BD Exec |
| `PATCH` | `/followups/:id/complete` | 1-click mark follow-up as completed | Admin, Manager, BD Exec |
| `GET` | `/tasks` | List client action items and deliverables | Authenticated |
| `POST` | `/tasks` | Create new task on client profile | Admin, Manager, BD Exec |
| `PATCH` | `/tasks/:id/status` | Update task status (`TODO`, `IN_PROGRESS`, `COMPLETED`) | Admin, Manager, BD Exec |

---

## 5. Opportunity Pipeline (`/api/opportunities`)

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `GET` | `/opportunities` | List deals grouped by pipeline stages | Authenticated |
| `POST` | `/opportunities` | Create new deal | Admin, Manager, BD Exec |
| `PATCH` | `/opportunities/:id/stage` | Advance opportunity stage (`LEAD` -> `WON`) | Admin, Manager, BD Exec |

---

## 6. Reports & Analytics (`/api/reports`)

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `GET` | `/reports/dashboard` | Aggregated KPIs, upcoming meetings, today's follow-ups, charts | Authenticated |
| `GET` | `/reports/analytics` | Team velocity scorecard and pipeline conversion funnel | Authenticated |

---

## 7. AI CRM Copilot (`/api/ai`)

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `POST` | `/ai/chat` | Contextual natural language CRM querying | Authenticated |
| `POST` | `/ai/summarize-notes` | Extract decisions and action items from meeting notes | Authenticated |
| `POST` | `/ai/draft-followup` | Draft email / WhatsApp follow-up messages | Authenticated |

---

## 8. Global Search & Notifications

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `GET` | `/search?q=...` | Global search across clients, meetings, follow-ups, deals | Authenticated |
| `GET` | `/notifications` | Retrieve notifications and unread alert count | Authenticated |
| `PATCH` | `/notifications/:id/read` | Mark notification as read | Authenticated |
| `POST` | `/notifications/read-all` | Mark all notifications as read | Authenticated |
