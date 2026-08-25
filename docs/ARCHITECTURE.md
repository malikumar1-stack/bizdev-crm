# System Architecture & Design Documentation

## 1. Domain Model Design

The CRM relational architecture links core business development entities to provide a 360-degree client view:

- **User**: System operator with specific RBAC role and notification preferences.
- **Company**: Enterprise organization record with industry, address, and size metadata.
- **Contact**: Executives and stakeholders at the company (name, email, phone, WhatsApp).
- **Client**: CRM account managing the ongoing relationship status (`LEAD`, `MEETING_SCHEDULED`, `FOLLOWUP_REQUIRED`, `ACTIVE_CLIENT`, etc.), assigned representative, priority, and cached next action dates.
- **Meeting**: Scheduled or completed discussions with meeting type, participants, agenda, outcome, notes, and 24h/1h reminder flags.
- **Followup**: Action items with due dates, reminder channels, and completion state.
- **Task**: Client-related to-dos and deliverables.
- **Opportunity**: Sales pipeline deals with stage, monetary value, and win probability.
- **Activity**: Chronological audit trail for client interactions.
- **Notification**: In-app and multi-channel dispatched alert records.

---

## 2. Notification Dispatcher Architecture

The system uses an **Abstract Notification Provider Interface**:

```typescript
export interface INotificationProvider {
  name: string;
  send(payload: NotificationPayload): Promise<{ success: boolean; channel: string; details?: any }>;
}
```

### Zero-Cost Fallbacks
1. **In-App Provider**: Persists notifications to the database and emits unread counter updates.
2. **Email Provider**: Uses Ethereal test sandbox or local logger if SMTP credentials are omitted; seamlessly switches to production SMTP / SendGrid when configured.
3. **WhatsApp Provider**: Formats `https://wa.me/{phone}?text={encoded_message}` direct click-to-chat links with pre-filled meeting details, enabling instantaneous client communication with zero API costs. Plugs into Meta WhatsApp Cloud API when API keys are supplied.
4. **Browser Push Provider**: Generates desktop notifications using the HTML5 Notification API.

---

## 3. Post-Meeting Automation Flow

When a user completes a meeting:
1. The **Meeting** record updates to `status: COMPLETED` with the selected outcome and notes.
2. If **Next Meeting Date** is specified, a new `Meeting` record is created with `status: SCHEDULED` and reminders initialized.
3. If **Next Follow-up Date** is specified, a new `Followup` record is created.
4. If **Create Task** is toggled, a new `Task` record is linked to the client.
5. The **Client** entity updates `lastMeetingDate`, `lastContactDate`, `nextMeetingDate`, `nextFollowupDate`, and transitions `relationshipStatus`.
6. An immutable **Activity** timeline entry is logged.
7. Dispatches instant confirmation alerts to the assigned user across enabled channels.
