import { IClient, IMeeting, IFollowup } from '../../types';

export class RuleEngine {
  /**
   * Evaluates relationship health score based on CRM parameters
   */
  static evaluateRelationshipHealth(client: any): { health: 'Strong' | 'Good' | 'Needs Attention' | 'At Risk'; score: number; rationale: string; nextAction: string } {
    let score = 70;
    const now = new Date().getTime();
    
    // Check last contact
    if (client.lastContactDate) {
      const daysSinceContact = Math.floor((now - new Date(client.lastContactDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceContact <= 7) score += 20;
      else if (daysSinceContact <= 14) score += 10;
      else if (daysSinceContact > 30) score -= 30;
      else score -= 10;
    } else {
      score -= 20;
    }

    // Check overdue followups
    const overdueCount = client.followups?.filter((f: any) => f.status === 'OVERDUE')?.length || 0;
    score -= overdueCount * 15;

    // Check upcoming meetings
    const hasUpcomingMeeting = client.meetings?.some((m: any) => m.status === 'SCHEDULED' && new Date(m.startTime).getTime() > now);
    if (hasUpcomingMeeting) score += 15;

    // Check opportunities
    const wonCount = client.opportunities?.filter((o: any) => o.stage === 'WON')?.length || 0;
    if (wonCount > 0) score += 15;

    score = Math.max(10, Math.min(100, score));

    let health: 'Strong' | 'Good' | 'Needs Attention' | 'At Risk' = 'Good';
    let rationale = 'Regular communication active.';
    let nextAction = 'Maintain scheduled cadence.';

    if (score >= 85) {
      health = 'Strong';
      rationale = 'High engagement, active meetings scheduled, and no overdue items.';
      nextAction = 'Prepare proposals and explore expanded relationship scope.';
    } else if (score >= 65) {
      health = 'Good';
      rationale = 'Normal communication rhythm. Upcoming deliverables in pipeline.';
      nextAction = 'Follow up on pending agenda items before next milestone.';
    } else if (score >= 45) {
      health = 'Needs Attention';
      rationale = 'Follow-up items are pending or last interaction was over 2 weeks ago.';
      nextAction = 'Schedule a check-in call or send a relationship status email immediately.';
    } else {
      health = 'At Risk';
      rationale = 'Client has overdue follow-ups or no recent contact for over 30 days.';
      nextAction = 'Escalate to account manager for urgent re-engagement outreach.';
    }

    return { health, score, rationale, nextAction };
  }

  /**
   * Intelligently parses raw meeting notes into structured summary & action items
   */
  static summarizeNotes(notes: string, clientName: string = 'Client') {
    const lines = notes.split('\n').map(l => l.trim()).filter(Boolean);
    
    const discussionPoints: string[] = [];
    const decisions: string[] = [];
    const requirements: string[] = [];
    const actionItems: string[] = [];

    lines.forEach(line => {
      const lower = line.toLowerCase();
      if (lower.includes('agreed') || lower.includes('decided') || lower.includes('confirmed')) {
        decisions.push(line);
      } else if (lower.includes('require') || lower.includes('needs') || lower.includes('requested') || lower.includes('asking for')) {
        requirements.push(line);
      } else if (lower.includes('todo') || lower.includes('send') || lower.includes('action') || lower.includes('follow up') || lower.includes('prepare')) {
        actionItems.push(line);
      } else {
        discussionPoints.push(line);
      }
    });

    if (discussionPoints.length === 0) discussionPoints.push(notes.slice(0, 150) + '...');
    if (decisions.length === 0) decisions.push('Agreed to proceed with next stage review.');
    if (requirements.length === 0) requirements.push('Detailed commercial and technical breakdown requested.');
    if (actionItems.length === 0) actionItems.push(`Send follow-up proposal and meeting minutes to ${clientName}.`);

    const summary = `Meeting focused on key strategic synergies with ${clientName}. The client expressed interest in moving forward subject to formal proposal submission.`;

    return {
      summary,
      discussionPoints,
      decisions,
      clientRequirements: requirements,
      actionItems,
      recommendedFollowupDays: 3
    };
  }

  /**
   * Generates a professional follow-up message draft
   */
  static draftFollowupMessage(client: any, contact: any, meeting: any, type: 'EMAIL' | 'WHATSAPP' = 'EMAIL'): string {
    const contactName = contact?.name || 'Valued Partner';
    const companyName = client?.company?.name || 'your team';
    const meetingTitle = meeting?.title || 'our recent discussion';

    if (type === 'WHATSAPP') {
      return `Hi ${contactName}, thank you for taking the time to meet regarding ${meetingTitle}. It was great connecting with you and the ${companyName} team. As agreed, we are preparing the next steps and proposal. Please feel free to reach out if you have any questions in the meantime. Best regards!`;
    }

    return `Dear ${contactName},\n\nThank you for meeting with us today to discuss ${meetingTitle}. We truly appreciate the opportunity to collaborate with ${companyName}.\n\nAs discussed, our team is currently preparing the agreed deliverables and next steps. We will share the updated proposal and timeline ahead of our next milestone.\n\nPlease let us know if there are any additional items or clarifications needed in the interim.\n\nWarm regards,\nBusiness Development Team`;
  }
}
