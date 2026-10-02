const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function formatDateTime(value: string | Date | null) {
  if (!value) return '-';
  return formatter.format(typeof value === 'string' ? new Date(value) : value);
}

// the value a datetime-local input wants, in the person's own time zone
export function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}