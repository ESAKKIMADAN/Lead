export interface TaskCalendarData {
  title: string;
  scheduledTime?: string | null;
  targetDate?: string | null;
  details?: string | null;
  type?: 'short_term' | 'long_term' | 'event' | 'daily' | string;
}

// Helper to compute start and end Date objects in local time
export function getTaskStartAndEndDates(task: TaskCalendarData): { startDate: Date; endDate: Date } {
  const now = new Date();

  let year = now.getFullYear();
  let month = now.getMonth();
  let day = now.getDate();

  if (task.targetDate) {
    const cleanDateStr = task.targetDate.split('T')[0];
    const parts = cleanDateStr.split('-').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      year = parts[0];
      month = parts[1] - 1;
      day = parts[2];
    }
  }

  let hours = 9;
  let minutes = 0;

  if (task.scheduledTime) {
    const parts = task.scheduledTime.split(':').map(Number);
    if (parts.length >= 2 && !parts.some(isNaN)) {
      hours = parts[0];
      minutes = parts[1];
    }
  }

  const startDate = new Date(year, month, day, hours, minutes, 0, 0);

  // If only time was provided (no target date) and time has already passed today, schedule for tomorrow
  if (!task.targetDate && task.scheduledTime && startDate.getTime() <= now.getTime()) {
    startDate.setDate(startDate.getDate() + 1);
  }

  // Default duration: 30 minutes
  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

  return { startDate, endDate };
}

// Format Date object to YYYYMMDDTHHmmssZ UTC string for calendar format
export function formatDateToUtcIcs(date: Date): string {
  return date.toISOString().replace(/-|:|\.\d+/g, '');
}

// ── 1. GENERATE GOOGLE CALENDAR INTENT URL ──
export function generateGoogleCalendarUrl(task: TaskCalendarData): string {
  const { startDate, endDate } = getTaskStartAndEndDates(task);

  const startUtc = formatDateToUtcIcs(startDate);
  const endUtc = formatDateToUtcIcs(endDate);

  const isEvent = task.type === 'long_term' || task.type === 'event';
  const prefix = isEvent ? '📅 Event: ' : '⏰ Alarm Task: ';

  const title = encodeURIComponent(`${prefix}${task.title}`);
  const details = encodeURIComponent(task.details || `Reminder set via Lead app for "${task.title}".`);
  const location = encodeURIComponent('Lead App');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startUtc}/${endUtc}&details=${details}&location=${location}`;
}

// ── 2. GENERATE iCALENDAR (.ICS) FILE CONTENT WITH BUILT-IN ALARMS ──
export function generateIcsContent(task: TaskCalendarData): string {
  const { startDate, endDate } = getTaskStartAndEndDates(task);

  const startUtc = formatDateToUtcIcs(startDate);
  const endUtc = formatDateToUtcIcs(endDate);
  const nowUtc = formatDateToUtcIcs(new Date());

  const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@leadapp.com`;
  const title = task.title.replace(/\n/g, ' ');
  const description = (task.details || `Reminder set via Lead app for "${task.title}".`).replace(/\n/g, ' ');

  const isEvent = task.type === 'long_term' || task.type === 'event';
  const summaryPrefix = isEvent ? '📅 ' : '⏰ ';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lead App//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowUtc}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SUMMARY:${summaryPrefix}${title}`,
    `DESCRIPTION:${description}`,
    'LOCATION:Lead App',
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT0M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Alarm: Time for ${title}`,
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Upcoming Reminder: ${title} in 15 minutes`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

// ── 3. DOWNLOAD / OPEN .ICS FILE (FOR APPLE CALENDAR / PHONE CALENDAR ALARM) ──
export function downloadIcsFile(task: TaskCalendarData): void {
  const icsContent = generateIcsContent(task);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });

  const cleanFilename = task.title.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20) || 'task_reminder';
  const filename = `${cleanFilename}_alarm.ics`;

  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(link.href);
}

// ── 4. AUTOMATIC DEVICE DETECTION & ROUTING (TASK ➔ ALARM, EVENT ➔ CALENDAR) ──
export function autoAddCalendarReminder(task: TaskCalendarData): void {
  if (typeof window === 'undefined') return;

  const isEvent = task.type === 'long_term' || task.type === 'event';
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isEvent) {
    // EVENT / GOAL MODE ➔ Add to Calendar (Google Calendar or Apple Calendar)
    if (isIOS) {
      downloadIcsFile(task);
    } else {
      const googleUrl = generateGoogleCalendarUrl(task);
      const newWindow = window.open(googleUrl, '_blank');
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        downloadIcsFile(task);
      }
    }
  } else {
    // TASK / DAILY SYSTEM MODE ➔ Trigger Alarm (Download .ics with VALARM triggers / Alarm Intent)
    downloadIcsFile(task);
  }
}
