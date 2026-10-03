const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
const clock = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
const longDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

// the orange pill on the inbox, like "Tue 9:15:12 AM"
export function formatPillTime(value: string) {
  const date = new Date(value);
  return `${weekday.format(date)} ${clock.format(date)}`;
}

// like "Nov 3, 10:23 AM"
export function formatLongDate(value: string | Date | null) {
  if (!value) return '-';
  return longDate.format(typeof value === 'string' ? new Date(value) : value);
}

// the value a datetime-local input wants, in the person's own time zone
export function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// tomorrow at the given hour, as a datetime-local value
export function tomorrowAt(hour: number) {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hour, 0, 0, 0);
  return toLocalInputValue(date);
}