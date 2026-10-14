// Times as plain numbers: minutes since 00:00. No Date, no time zones. The worklets run on the UI thread too.

export type TimeValue = { hours: number; minutes: number };
export type TimeRange = { start: TimeValue; end: TimeValue };

export const DAY = 1440;

export function toMinutes(t: TimeValue) {
  return t.hours * 60 + t.minutes;
}

/** Minutes (any number, past midnight too) to a time of day. */
export function fromMinutes(total: number): TimeValue {
  const m = ((Math.round(total) % DAY) + DAY) % DAY;
  return { hours: Math.floor(m / 60), minutes: m % 60 };
}

/** The locale's clock (12 or 24 hours), where Intl knows it; 12 otherwise. */
export function localeHourCycle(): 12 | 24 {
  try {
    const cycle = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle;
    if (cycle === 'h23' || cycle === 'h24') return 24;
    if (cycle === 'h11' || cycle === 'h12') return 12;
  } catch {
    // No Intl: fall through.
  }
  return 12;
}

/** "2:30" and "PM", or "14:30" and "". */
export function formatTime(total: number, cycle: 12 | 24) {
  'worklet';
  const m = ((Math.round(total) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const minutes = mm < 10 ? `0${mm}` : `${mm}`;
  if (cycle === 24) return { time: `${h < 10 ? `0${h}` : h}:${minutes}`, period: '' };
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return { time: `${h12}:${minutes}`, period: h < 12 ? 'AM' : 'PM' };
}

/** "2:30 PM" or "14:30", for screen readers and labels. */
export function spokenTime(total: number, cycle: 12 | 24) {
  const { time, period } = formatTime(total, cycle);
  return period ? `${time} ${period}` : time;
}

/** "1 h 30 min", "45 min", "2 h". */
export function formatDuration(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest} min`;
  if (rest === 0) return `${h} h`;
  return `${h} h ${rest} min`;
}

/** "1 hour 30 minutes", for screen readers. */
export function spokenDuration(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  const hours = h === 1 ? '1 hour' : `${h} hours`;
  const mins = rest === 1 ? '1 minute' : `${rest} minutes`;
  if (h === 0) return mins;
  if (rest === 0) return hours;
  return `${hours} ${mins}`;
}

/** The slot nearest `slot` that's allowed (`open` is one flag per slot of the day), or -1 if none is. */
export function nearestOpen(slot: number, open: boolean[], wrap: boolean, lo: number, hi: number, prefer: number) {
  'worklet';
  const n = open.length;
  const isOpen = (k: number) => {
    'worklet';
    if (!wrap && (k < lo || k > hi)) return false;
    return open[((k % n) + n) % n];
  };
  if (isOpen(slot)) return slot;
  for (let d = 1; d <= n; d += 1) {
    const first = slot + (prefer >= 0 ? d : -d);
    const second = slot + (prefer >= 0 ? -d : d);
    if (isOpen(first)) return first;
    if (isOpen(second)) return second;
  }
  return -1;
}
