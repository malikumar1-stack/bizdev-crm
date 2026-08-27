import { IMeeting } from '../types';

export function getGoogleCalendarUrl(meeting: Partial<IMeeting>): string {
  const title = encodeURIComponent(meeting.title || 'Client Meeting');
  const details = encodeURIComponent(
    'Agenda: ' + (meeting.agenda || 'N/A') + '\nClient: ' + (meeting.client?.company?.name || 'CRM Client') + '\nFormat: ' + (meeting.meetingType || 'ONLINE') + '\nLink: ' + (meeting.meetingLink || meeting.location || 'N/A')
  );
  const location = encodeURIComponent(meeting.meetingLink || meeting.location || 'Online');

  let startTimeStr = '';
  let endTimeStr = '';

  if (meeting.startTime) {
    const start = new Date(meeting.startTime);
    const end = meeting.endTime ? new Date(meeting.endTime) : new Date(start.getTime() + 60 * 60 * 1000);
    startTimeStr = start.toISOString().replace(/-|:|\.\d+/g, '');
    endTimeStr = end.toISOString().replace(/-|:|\.\d+/g, '');
  } else {
    const now = new Date();
    startTimeStr = now.toISOString().replace(/-|:|\.\d+/g, '');
    endTimeStr = new Date(now.getTime() + 60 * 60 * 1000).toISOString().replace(/-|:|\.\d+/g, '');
  }

  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + title + '&dates=' + startTimeStr + '/' + endTimeStr + '&details=' + details + '&location=' + location;
}

export function downloadIcsFile(meeting: Partial<IMeeting>) {
  const title = meeting.title || 'Client Meeting';
  const description = 'Agenda: ' + (meeting.agenda || 'N/A') + '\nClient: ' + (meeting.client?.company?.name || 'CRM Client') + '\nLink: ' + (meeting.meetingLink || meeting.location || 'Online');
  const location = meeting.meetingLink || meeting.location || 'Online';
  const start = meeting.startTime ? new Date(meeting.startTime) : new Date();
  const end = meeting.endTime ? new Date(meeting.endTime) : new Date(start.getTime() + 60 * 60 * 1000);
  const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, '');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BizDev CRM//Meeting Reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:bizdev-' + (meeting.id || Date.now()) + '@bizdevcrm.com',
    'DTSTAMP:' + formatDate(new Date()),
    'DTSTART:' + formatDate(start),
    'DTEND:' + formatDate(end),
    'SUMMARY:' + title,
    'DESCRIPTION:' + description,
    'LOCATION:' + location,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Meeting Reminder (24h): ' + title,
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Urgent Meeting Reminder (1h): ' + title,
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Starting in 15 mins: ' + title,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', title.replace(/[^a-zA-Z0-9]/g, '_') + '_reminder.ics');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}