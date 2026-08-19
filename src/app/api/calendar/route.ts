import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user');

  if (!userId) {
    return new Response('Missing user parameter', { status: 400 });
  }

  // Create a start time (e.g. next top of the hour)
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 1, 0, 0));
  const end = new Date(start.getTime() + 5 * 60000); // 5 minutes duration

  // Format dates for ICS (YYYYMMDDTHHMMSSZ)
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const dtstamp = formatDate(now);
  const dtstart = formatDate(start);
  const dtend = formatDate(end);
  const uid = `lead-reminder-${userId}@leadbysolvecrew.vercel.app`;

  // Standard iCalendar format with HOURLY recurrence
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LEAD//Hourly Reminders//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    'RRULE:FREQ=HOURLY',
    'SUMMARY:LEAD Check-in',
    'DESCRIPTION:Time to focus on your goal. Open LEAD to take action: https://leadbysolvecrew.vercel.app/',
    'URL:https://leadbysolvecrew.vercel.app/',
    'BEGIN:VALARM',
    'TRIGGER:-PT0M',
    'ACTION:DISPLAY',
    'DESCRIPTION:LEAD Reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return new Response(icsContent, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="lead_reminders.ics"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
