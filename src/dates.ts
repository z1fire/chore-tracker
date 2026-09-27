const EPOCH = Date.UTC(2000, 0, 1);
const DAY_MS = 86400000;

/** Local calendar day as days since 2000-01-01. */
export function dayIndex(date: Date): number {
  return Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - EPOCH) / DAY_MS);
}

export function todayIndex(): number {
  return dayIndex(new Date());
}

export function dayToDate(d: number): Date {
  return new Date(2000, 0, 1 + d);
}

const pad = (n: number) => String(n).padStart(2, '0');

export function dayToISO(d: number): string {
  const x = dayToDate(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

export function isoToDay(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return dayIndex(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

/** "Jun 29" */
export function fmtShort(d: number): string {
  return dayToDate(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** "Mon, Sep 21" */
export function fmtWeekdayShort(d: number): string {
  return dayToDate(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** "Sunday, September 27" */
export function fmtLong(d: number): string {
  return dayToDate(d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

/** "7:42 PM" */
export function fmtClock(t: number): string {
  return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** "19:42" */
export function fmtClock24(t: number): string {
  const x = new Date(t);
  return `${pad(x.getHours())}:${pad(x.getMinutes())}`;
}

/** Epoch ms for 12:00 local on the given day. */
export function noonOf(d: number): number {
  const x = dayToDate(d);
  x.setHours(12, 0, 0, 0);
  return x.getTime();
}
