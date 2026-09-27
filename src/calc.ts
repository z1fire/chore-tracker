import { PERIOD_DAYS, type Chore, type LogEntry, type RangeKey } from './types';
import { fmtShort } from './dates';

export interface Range {
  from: number;
  to: number;
  days: number;
}

const PRESET_DAYS: Record<Exclude<RangeKey, 'Custom'>, number> = { '7D': 7, '30D': 30, '3M': 91 };

export function resolveRange(key: RangeKey, custom: { from: number; to: number }, today: number): Range {
  if (key === 'Custom') {
    let from = Math.min(custom.from, today);
    let to = Math.min(custom.to, today);
    if (from > to) [from, to] = [to, from];
    return { from, to, days: to - from + 1 };
  }
  const days = PRESET_DAYS[key];
  return { from: today - days + 1, to: today, days };
}

export function rangeLabel(r: Range): string {
  return `${fmtShort(r.from)} – ${fmtShort(r.to)} · ${r.days} ${r.days === 1 ? 'day' : 'days'}`;
}

export function expectedPerDay(c: Pick<Chore, 'n' | 'per'>): number {
  return c.n / PERIOD_DAYS[c.per];
}

export function countByChore(logs: LogEntry[], from: number, to: number): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of logs) {
    if (l.d >= from && l.d <= to) m.set(l.c, (m.get(l.c) ?? 0) + 1);
  }
  return m;
}

export interface ChoreStats {
  mine: number;
  expected: number;
  myPerDay: number;
  expPerDay: number;
  share: number;
}

export function choreStats(c: Chore, mine: number, days: number): ChoreStats {
  const expPerDay = expectedPerDay(c);
  const expected = expPerDay * days;
  return { mine, expected, myPerDay: mine / days, expPerDay, share: expected > 0 ? mine / expected : 0 };
}

export function overallStats(chores: Chore[], counts: Map<string, number>, days: number) {
  let mine = 0;
  let expected = 0;
  for (const c of chores) {
    mine += counts.get(c.id) ?? 0;
    expected += expectedPerDay(c) * days;
  }
  return { mine, expected, share: expected > 0 ? mine / expected : 0 };
}

export function bucketSize(days: number): number {
  if (days <= 14) return 1;
  if (days <= 45) return Math.ceil(days / 10);
  return 7;
}

export interface Bucket {
  from: number;
  to: number;
  share: number;
}

/** Share per bucket for the given chores over [from, to]. */
export function trendBuckets(chores: Chore[], logs: LogEntry[], from: number, to: number): Bucket[] {
  const days = to - from + 1;
  const size = bucketSize(days);
  const ids = new Set(chores.map((c) => c.id));
  const perDay = chores.reduce((s, c) => s + expectedPerDay(c), 0);
  const n = Math.ceil(days / size);
  const mine = new Array<number>(n).fill(0);
  for (const l of logs) {
    if (l.d >= from && l.d <= to && ids.has(l.c)) mine[Math.floor((l.d - from) / size)]++;
  }
  const out: Bucket[] = [];
  for (let i = 0; i < n; i++) {
    const bFrom = from + i * size;
    const bTo = Math.min(to, bFrom + size - 1);
    const expected = perDay * (bTo - bFrom + 1);
    out.push({ from: bFrom, to: bTo, share: expected > 0 ? mine[i] / expected : 0 });
  }
  return out;
}

export function isAbove(share: number, fair: number): boolean {
  return share > fair * 1.15;
}

/** Up to 2 decimals, trailing zeros trimmed: 1.2, 0.71, 3 */
export function fmtNum(n: number): string {
  return String(Number(n.toFixed(2)));
}

export function fmtPct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

export function fmtMultiple(share: number, fair: number): string {
  return `${(share / fair).toFixed(1)}×`;
}
