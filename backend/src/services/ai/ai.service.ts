import { config } from '../../config';
import { RuleEngine } from './rule-engine';
import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';

export class AIService {
  /**
   * Chat with CRM assistant - handles live database contextual queries, drafting, and insights
   */
  async processUserChat(userId: string, prompt: string, clientId?: string) {
    const lower = prompt.toLowerCase();

    // 1. Handle "What meetings do I have scheduled?" / "meetings today or tomorrow"
    if (lower.includes('meeting') || lower.includes('schedule')) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const in2Days = new Date(now);
      in2Days.setDate(in2Days.getDate() + 3);

      const meetings = await prisma.meeting.findMany({
        where: {
          status: 'SCHEDULED',
          startTime: { gte: now, lte: in2Days }
        },
        include: { client: { include: { company: true, primaryContact: true } } },
        orderBy: { startTime: 'asc' }
      });

      if (meetings.length === 0) {
        return { reply: '📅 **No Upcoming Meetings:** You have no scheduled client meetings for today or tomorrow.\n\n💡 *Recommendation:* Review your pipeline to schedule discovery calls with recently added leads.' };
      }

      let reply = `📅 **Upcoming Scheduled Meetings (${meetings.length} Total):**\n\n`;
      meetings.forEach((m, idx) => {
        const dateStr = new Date(m.startTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        const timeStr = new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        reply += `${idx + 1}. **${m.client.company.name}** — ${dateStr} at ${timeStr}\n   • **Agenda:** ${m.agenda || m.title}\n   • **Format:** ${m.meetingType} (${m.location || m.meetingLink || 'Online'})\n   • **Contact:** ${m.client.primaryContact?.name || 'Key Stakeholder'}\n\n`;
      });
      return { reply };
    }

    // 2. Handle "overdue followups" / "overdue tasks"
    if (lower.includes('overdue') || lower.includes('urgent') || lower.includes('attention')) {
      const [overdueFollowups, urgentTasks] = await Promise.all([
        prisma.followup.findMany({
          where: { status: 'OVERDUE' },
          include: { client: { include: { company: true } } },
          take: 5
        }),
        prisma.task.findMany({
          where: { status: { not: 'COMPLETED' }, priority: 'URGENT' },
          include: { client: { include: { company: true } } },
          take: 5
        })
      ]);

      if (overdueFollowups.length === 0 && urgentTasks.length === 0) {
        return { reply: '✅ **All On Track:** Great news! There are currently no overdue follow-ups or urgent pending tasks in your CRM.' };
      }

      let reply = '⚠️ **Action Items Requiring Immediate Attention:**\n\n';
      if (overdueFollowups.length > 0) {
        reply += `**Overdue Follow-ups (${overdueFollowups.length}):**\n`;
        overdueFollowups.forEach(f => {
          reply += `• **${f.client.company.name}**: ${f.title} (Due: ${new Date(f.dueDate).toLocaleDateString()})\n`;
        });
        reply += '\n';
      }
      if (urgentTasks.length > 0) {
        reply += `**Urgent Deliverables (${urgentTasks.length}):**\n`;
        urgentTasks.forEach(t => {
          reply += `• **${t.title}** (${t.client?.company?.name || 'Internal'})\n`;
        });
      }
      return { reply };
    }

    // 3. Handle "Pipeline Summary" / "Deals" / "Revenue"
    if (lower.includes('pipeline') || lower.includes('deal') || lower.includes('revenue') || lower.includes('value')) {
      const opportunities = await prisma.opportunity.findMany({
        include: { client: { include: { company: true } } }
      });

      const totalValue = opportunities.reduce((sum, o) => sum + o.value, 0);
      const wonValue = opportunities.filter(o => o.stage === 'WON').reduce((sum, o) => sum + o.value, 0);
      const openOpps = opportunities.filter(o => o.stage !== 'WON' && o.stage !== 'LOST');

      let reply = `📊 **Active Deal Pipeline Intelligence:**\n\n` +
        `• **Total Pipeline Value:** $${totalValue.toLocaleString()}\n` +
        `• **Active Open Deals:** ${openOpps.length}\n` +
        `• **Closed/Won Value:** $${wonValue.toLocaleString()}\n\n` +
        `**Stage Distribution:**\n`;

      ['LEAD', 'MEETING', 'PROPOSAL', 'NEGOTIATION', 'WON'].forEach(stg => {
        const inStage = opportunities.filter(o => o.stage === stg);
        const stageVal = inStage.reduce((s, o) => s + o.value, 0);
        reply += `• **${stg}:** ${inStage.length} deal(s) — $${stageVal.toLocaleString()}\n`;
      });

      return { reply };
    }

    // 4. Handle "Draft email" / "Follow-up message"
    if (lower.includes('draft') || lower.includes('email') || lower.includes('template')) {
      const draft = `Subject: Follow-up & Next Steps — [Company Name] / BizDev Partnership

Hi [Contact Name],

Thank you for taking the time to speak with our team today. It was a pleasure learning more about [Company Name]'s strategic priorities for this quarter.

Based on our discussion, here is a quick summary of what we covered:
1. Overview of your current operational goals and key challenges.
2. How our enterprise solutions can accelerate your growth timeline.
3. Agreed next action items and deliverables.

As agreed, we are preparing the tailored proposal and term sheet for your review. We look forward to our next scheduled checkpoint on [Date/Time].

Please let me know if you have any questions in the meantime.

Best regards,

[Your Name]
Business Development Team
BizDev CRM`;
      return { reply: `✉️ **Generated Executive Follow-up Draft:**\n\n` + draft };
    }

    // 5. Handle "High Value Accounts" / "Priority" / "Clients"
    if (lower.includes('priority') || lower.includes('high value') || lower.includes('client')) {
      const clients = await prisma.client.findMany({
        where: { isArchived: false },
        include: { company: true, primaryContact: true, opportunities: true },
        take: 5
      });

      let reply = `🎯 **Top Strategic Client Accounts:**\n\n`;
      clients.forEach((c, i) => {
        const oppVal = c.opportunities.reduce((s, o) => s + o.value, 0);
        reply += `${i + 1}. **${c.company.name}** (${c.relationshipStatus})\n   • **Priority:** ${c.priority} &bull; **Pipeline Value:** $${oppVal.toLocaleString()}\n   • **Primary Contact:** ${c.primaryContact?.name || 'N/A'} (${c.primaryContact?.email || 'N/A'})\n\n`;
      });
      return { reply };
    }

    // 6. External Gemini AI or Generic Strategic Guidance
    if (config.ai.apiKey && config.ai.provider === 'gemini') {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.ai.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `You are an expert AI Business Development Copilot for BizDev CRM. Answer concisely, professionally, and accurately: "${prompt}"` }] }]
            })
          }
        );
        const data = await response.json();
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
          return { reply: data.candidates[0].content.parts[0].text };
        }
      } catch (geminiErr) {
        logger.warn('Gemini API call failed, using intelligent fallback:', geminiErr);
      }
    }

    // High Quality Intelligent Business Development Fallback
    return {
      reply: `💡 **Business Development Intelligence:**\n\nRegarding "${prompt}":\n\n• Ensure client communication logs are updated immediately following discovery calls.\n• Review your **Pipeline** tab to move advancing deals to Proposal/Negotiation.\n• Keep response times under 24 hours on all open inquiries to maximize relationship health scores.\n\n*You can also ask me for meeting summaries, overdue follow-ups, or email drafts anytime!*`
    };
  }

  async summarizeMeeting(notes: string, clientName: string) {
    const actionItems = notes
      .split(/[\n.]/)
      .map(s => s.trim())
      .filter(s => s.length > 5 && (s.toLowerCase().includes('send') || s.toLowerCase().includes('prepare') || s.toLowerCase().includes('follow') || s.toLowerCase().includes('share') || s.toLowerCase().includes('schedule')))
      .slice(0, 3);

    return {
      summary: `Key takeaways from meeting with ${clientName}: ${notes.slice(0, 150)}${notes.length > 150 ? '...' : ''}`,
      keyDecisions: ['Discussion completed', 'Next checkpoint established'],
      actionItems: actionItems.length > 0 ? actionItems : ['Review meeting minutes and follow up with stakeholder'],
      recommendedNextMeetingDays: 7
    };
  }

  async draftFollowup(client: any, contact: any, meeting: any, type: string) {
    const clientName = client?.company?.name || 'Valued Partner';
    const contactName = contact?.name || 'Stakeholder';
    return `Hi ${contactName},\n\nThank you for the productive meeting today regarding ${clientName}. Following up on our discussion, we have noted the action items and look forward to our next steps.\n\nBest regards,\nBusiness Development Team`;
  }

  async getClientHealth(client: any) {
    return RuleEngine.evaluateRelationshipHealth(client);
  }
}

export const aiService = new AIService();
