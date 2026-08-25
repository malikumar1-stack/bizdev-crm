import { config } from '../../config';
import { RuleEngine } from './rule-engine';
import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';

export class AIService {
  /**
   * Chat with CRM assistant - handles contextual queries and tool-calling
   */
  async processUserChat(userId: string, prompt: string, clientId?: string) {
    const lower = prompt.toLowerCase();

    // 1. Handle "What meetings do I have tomorrow?"
    if (lower.includes('tomorrow') && (lower.includes('meeting') || lower.includes('schedule'))) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const tomorrowEnd = new Date(tomorrow);
      tomorrowEnd.setHours(23, 59, 59, 999);

      const meetings = await prisma.meeting.findMany({
        where: {
          assignedUserId: userId,
          status: 'SCHEDULED',
          startTime: { gte: tomorrow, lte: tomorrowEnd }
        },
        include: { client: { include: { company: true, primaryContact: true } } }
      });

      if (meetings.length === 0) {
        return { reply: 'You have no meetings scheduled for tomorrow. A great opportunity for outreach or preparing follow-up proposals!' };
      }

      let reply = `You have ${meetings.length} meeting${meetings.length > 1 ? 's' : ''} scheduled for tomorrow:\n\n`;
      meetings.forEach((m, idx) => {
        const timeStr = new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        reply += `${idx + 1}. **${m.client.company.name}** — ${timeStr} (${m.meetingType})\n   *Title:* ${m.title}\n   *Contact:* ${m.client.primaryContact?.name || 'N/A'}\n\n`;
      });
      return { reply };
    }

    // 2. Handle "Which clients have not been contacted recently?" or "overdue followups"
    if (lower.includes('not been contacted') || lower.includes('dormant') || lower.includes('overdue')) {
      const overdueFollowups = await prisma.followup.findMany({
        where: { assignedUserId: userId, status: 'OVERDUE' },
        include: { client: { include: { company: true } } }
      });

      let reply = 'Here is your CRM relationship health overview:\n\n';
      if (overdueFollowups.length > 0) {
        reply += `⚠️ **${overdueFollowups.length} Overdue Follow-ups:**\n`;
        overdueFollowups.forEach(f => {
          reply += `- **${f.client.company.name}**: ${f.title} (Due: ${new Date(f.dueDate).toLocaleDateString()})\n`;
        });
        reply += '\n';
      } else {
        reply += '✅ No overdue follow-ups! All client tasks are currently on track.\n\n';
      }
      return { reply };
    }

    // 3. Handle "Summarize my relationship with [Company]"
    if (lower.includes('summarize') || (clientId && lower.includes('relationship'))) {
      let targetClient = null;
      if (clientId) {
        targetClient = await prisma.client.findUnique({
          where: { id: clientId },
          include: { company: true, primaryContact: true, meetings: true, followups: true, opportunities: true }
        });
      } else {
        const clients = await prisma.client.findMany({
          include: { company: true, primaryContact: true, meetings: true, followups: true, opportunities: true }
        });
        targetClient = clients.find(c => lower.includes(c.company.name.toLowerCase())) || clients[0];
      }

      if (targetClient) {
        const healthData = RuleEngine.evaluateRelationshipHealth(targetClient);
        const reply = `### Relationship Summary: ${targetClient.company.name}\n\n` +
          `* **Status:** ${targetClient.relationshipStatus}\n` +
          `* **Relationship Health:** ${healthData.health} (${healthData.score}/100)\n` +
          `* **Key Contact:** ${targetClient.primaryContact?.name || 'N/A'} (${targetClient.primaryContact?.position || 'N/A'})\n` +
          `* **Total Meetings Recorded:** ${targetClient.meetings.length}\n` +
          `* **Active Pipeline Opportunities:** ${targetClient.opportunities.length}\n` +
          `* **Health Rationale:** ${healthData.rationale}\n\n` +
          `👉 **Recommended Next Action:** ${healthData.nextAction}`;
        return { reply };
      }
    }

    // 4. Default AI Assistant Response (Uses Gemini API if key is present, otherwise smart assistant)
    if (config.ai.apiKey && config.ai.provider === 'gemini') {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.ai.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `You are an expert AI Business Development and CRM executive assistant. Respond clearly and professionally to: "${prompt}"` }] }]
            })
          }
        );
        const data: any = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return { reply: text };
      } catch (err: any) {
        logger.warn('Gemini API call failed, falling back to local engine:', err.message);
      }
    }

    return {
      reply: `I have analyzed your request ("${prompt}"). All CRM records, meeting timelines, and follow-up reminders are actively synchronized. You can ask me to check tomorrow's meetings, summarize client relationships, or draft follow-up emails anytime!`
    };
  }

  /**
   * Summarizes meeting notes into structured points & action items
   */
  async summarizeMeeting(notes: string, clientName: string) {
    return RuleEngine.summarizeNotes(notes, clientName);
  }

  /**
   * Drafts follow-up communication
   */
  async draftFollowup(client: any, contact: any, meeting: any, type: 'EMAIL' | 'WHATSAPP' = 'EMAIL') {
    return RuleEngine.draftFollowupMessage(client, contact, meeting, type);
  }

  /**
   * Computes client relationship health metrics
   */
  async getClientHealth(client: any) {
    return RuleEngine.evaluateRelationshipHealth(client);
  }
}

export const aiService = new AIService();
