export type Period = 'day' | 'week' | 'month';

export interface Chore {
  id: string;
  name: string;
  cat: string; // category name
  n: number; // expected household count per period, > 0
  per: Period;
}

export interface LogEntry {
  id: number;
  c: string; // chore id
  d: number; // local day index (days since 2000-01-01)
  t: number; // epoch ms timestamp
}

export interface AppData {
  chores: Chore[];
  cats: string[]; // ordered category list
  logs: LogEntry[];
  household: number; // 1–12
  nid: number; // next log id
}

export type Tab = 'log' | 'insights' | 'chores';
export type RangeKey = '7D' | '30D' | '3M' | 'Custom';

// Prototype configuration flags (design.md §9)
export const CONFIG = {
  showFairShare: true,
  defaultRange: '3M' as RangeKey,
  startTab: 'log' as Tab,
};

export const PERIOD_DAYS: Record<Period, number> = { day: 1, week: 7, month: 30.44 };
