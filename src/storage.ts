import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { AppData, Chore, LogEntry, Period } from './types';

/**
 * On the phone, data lives in a JSON file in the app's private storage
 * (Android: /data/data/<app>/files), not in the WebView's browser storage.
 * It survives app restarts and updates, and is removed only if the app is uninstalled.
 *
 * Writes go to a temp file first, then the main file, so a crash mid-write
 * always leaves one intact copy.
 */
const FILE = 'choretrack-v1.json';
const TMP = 'choretrack-v1.tmp.json';
const LS_KEY = 'choretrack-v1'; // browser dev fallback only

export const isNative = Capacitor.isNativePlatform();

export function emptyData(): AppData {
  return { chores: [], cats: ['Other'], logs: [], household: 3, nid: 1 };
}

const PERIODS: Period[] = ['day', 'week', 'month'];

function normalize(raw: unknown): AppData | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.chores) || !Array.isArray(r.cats) || !Array.isArray(r.logs)) return null;
  const chores = (r.chores as Chore[]).filter(
    (c) => c && typeof c.id === 'string' && typeof c.name === 'string' && typeof c.cat === 'string' && c.n > 0 && PERIODS.includes(c.per),
  );
  const cats = (r.cats as unknown[]).filter((c): c is string => typeof c === 'string');
  for (const c of chores) if (!cats.includes(c.cat)) cats.push(c.cat);
  if (cats.length === 0) cats.push('Other');
  const logs = (r.logs as LogEntry[]).filter(
    (l) => l && typeof l.id === 'number' && typeof l.c === 'string' && typeof l.d === 'number' && typeof l.t === 'number',
  );
  const household = Math.min(12, Math.max(1, Math.round(Number(r.household) || 3)));
  const maxId = logs.reduce((m, l) => Math.max(m, l.id), 0);
  const nid = Math.max(Number(r.nid) || 1, maxId + 1);
  return { chores, cats, logs, household, nid };
}

async function readNative(path: string): Promise<{ data: AppData | null; exists: boolean }> {
  let text: string;
  try {
    const r = await Filesystem.readFile({ path, directory: Directory.Data, encoding: Encoding.UTF8 });
    text = typeof r.data === 'string' ? r.data : await r.data.text();
  } catch {
    return { data: null, exists: false };
  }
  try {
    return { data: normalize(JSON.parse(text)), exists: true };
  } catch {
    return { data: null, exists: true };
  }
}

export async function loadData(): Promise<AppData> {
  if (!isNative) {
    try {
      const s = localStorage.getItem(LS_KEY);
      return (s && normalize(JSON.parse(s))) || emptyData();
    } catch {
      return emptyData();
    }
  }
  const main = await readNative(FILE);
  if (main.data) return main.data;
  const tmp = await readNative(TMP);
  if (tmp.data) return tmp.data;
  if (main.exists) {
    // Keep an unreadable file aside instead of overwriting it.
    await Filesystem.copy({ from: FILE, to: `choretrack-v1.unreadable-${Date.now()}.json`, directory: Directory.Data, toDirectory: Directory.Data }).catch(() => {});
  }
  return emptyData();
}

async function writeNow(data: AppData): Promise<void> {
  const json = JSON.stringify(data);
  if (!isNative) {
    localStorage.setItem(LS_KEY, json);
    return;
  }
  await Filesystem.writeFile({ path: TMP, directory: Directory.Data, data: json, encoding: Encoding.UTF8 });
  await Filesystem.writeFile({ path: FILE, directory: Directory.Data, data: json, encoding: Encoding.UTF8 });
}

let pending: AppData | null = null;
let writing: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let onError: (e: unknown) => void = () => {};

export function setSaveErrorHandler(fn: (e: unknown) => void) {
  onError = fn;
}

export function scheduleSave(data: AppData) {
  pending = data;
  clearTimeout(timer);
  timer = setTimeout(() => void flushSave(), 250);
}

/** Write any pending change immediately (called when the app is backgrounded). */
export async function flushSave(): Promise<void> {
  clearTimeout(timer);
  while (writing) await writing;
  if (!pending) return;
  const d = pending;
  pending = null;
  writing = writeNow(d)
    .catch((e) => {
      if (!pending) pending = d; // retry on next change / flush
      onError(e);
    })
    .finally(() => {
      writing = null;
    });
  await writing;
}

export async function exportCsv(data: AppData, toCsv: (d: AppData) => string): Promise<void> {
  const csv = toCsv(data);
  const name = 'chore-log.csv';
  if (!isNative) {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const res = await Filesystem.writeFile({ path: name, directory: Directory.Cache, data: csv, encoding: Encoding.UTF8 });
  await Share.share({ title: 'Chore log', files: [res.uri], dialogTitle: 'Save or send chore-log.csv' });
}
