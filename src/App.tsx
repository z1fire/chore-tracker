import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { CONFIG, type AppData, type Chore, type Period, type RangeKey, type Tab } from './types';
import { dayToISO, fmtClock24, noonOf, todayIndex } from './dates';
import { resolveRange } from './calc';
import { exportCsv, flushSave, isNative, loadData, scheduleSave, setSaveErrorHandler } from './storage';
import { BottomNav, Snackbar, type SnackState } from './ui';
import { LogScreen } from './screens/LogScreen';
import { InsightsScreen } from './screens/InsightsScreen';
import { ChoreDetail } from './screens/ChoreDetail';
import { ManageScreen } from './screens/ManageScreen';
import { ChoreSheet } from './sheets/ChoreSheet';
import { CategorySheet } from './sheets/CategorySheet';

function useToday(): number {
  const [today, setToday] = useState(todayIndex);
  useEffect(() => {
    const tick = () => setToday(todayIndex());
    const iv = setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(iv);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return today;
}

function newChoreId(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Adds a category, keeping "Other" last. */
function withCat(cats: string[], name: string): string[] {
  const i = cats.indexOf('Other');
  return i === -1 ? [...cats, name] : [...cats.slice(0, i), name, ...cats.slice(i)];
}

function toCsv(data: AppData): string {
  const byId = new Map(data.chores.map((c) => [c.id, c]));
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = ['date,time,chore,category'];
  for (const l of [...data.logs].sort((a, b) => a.t - b.t)) {
    const c = byId.get(l.c);
    if (!c) continue;
    lines.push(`${dayToISO(l.d)},${fmtClock24(l.t)},${q(c.name)},${q(c.cat)}`);
  }
  return lines.join('\n') + '\n';
}

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const dataRef = useRef<AppData | null>(null);
  const today = useToday();

  const [tab, setTab] = useState<Tab>(CONFIG.startTab);
  const [daysBack, setDaysBack] = useState(0);
  const [rangeKey, setRangeKey] = useState<RangeKey>(CONFIG.defaultRange);
  const [custom, setCustom] = useState(() => ({ from: todayIndex() - 29, to: todayIndex() }));
  const [detailId, setDetailId] = useState<string | null>(null);
  const [choreSheet, setChoreSheet] = useState<{ id: string | null } | null>(null);
  const [catSheet, setCatSheet] = useState<{ name: string | null } | null>(null);
  const [snack, setSnack] = useState<SnackState | null>(null);
  const snackKey = useRef(0);

  const showSnack = useCallback((text: string, undo?: () => void) => {
    setSnack({ key: ++snackKey.current, text, undo });
  }, []);
  const clearSnack = useCallback(() => setSnack(null), []);

  useEffect(() => {
    setSaveErrorHandler(() => showSnack("Couldn't save. Your last change will be retried."));
    loadData().then((d) => {
      dataRef.current = d;
      setData(d);
    });
    const flush = () => {
      if (document.visibilityState === 'hidden') void flushSave();
    };
    document.addEventListener('visibilitychange', flush);
    const pause = isNative ? CapApp.addListener('pause', () => void flushSave()) : null;
    return () => {
      document.removeEventListener('visibilitychange', flush);
      pause?.then((h) => h.remove());
    };
  }, [showSnack]);

  /** Apply a change, re-render and persist. */
  const update = useCallback((fn: (d: AppData) => AppData) => {
    const cur = dataRef.current;
    if (!cur) return;
    const next = fn(cur);
    if (next === cur) return;
    dataRef.current = next;
    setData(next);
    scheduleSave(next);
  }, []);

  const logDay = today - daysBack;
  const range = useMemo(() => resolveRange(rangeKey, custom, today), [rangeKey, custom, today]);

  // ---- actions ----
  const addLog = (choreId: string) => {
    const d = dataRef.current!;
    const entry = { id: d.nid, c: choreId, d: logDay, t: daysBack === 0 ? Date.now() : noonOf(logDay) };
    update((x) => ({ ...x, logs: [...x.logs, entry], nid: x.nid + 1 }));
    const name = d.chores.find((c) => c.id === choreId)?.name ?? 'Chore';
    showSnack(`Logged ${name}`, () => update((x) => ({ ...x, logs: x.logs.filter((l) => l.id !== entry.id) })));
  };

  const restoreLog = (entry: AppData['logs'][number]) =>
    update((x) => (x.chores.some((c) => c.id === entry.c) ? { ...x, logs: [...x.logs, entry] } : x));

  const removeLog = (choreId: string) => {
    const d = dataRef.current!;
    let last: AppData['logs'][number] | undefined;
    for (const l of d.logs) if (l.c === choreId && l.d === logDay && (!last || l.t >= last.t)) last = l;
    if (!last) return;
    const entry = last;
    update((x) => ({ ...x, logs: x.logs.filter((l) => l.id !== entry.id) }));
    const name = d.chores.find((c) => c.id === choreId)?.name ?? 'Chore';
    showSnack(`Removed ${name}`, () => restoreLog(entry));
  };

  const deleteLog = (id: number) => {
    const entry = dataRef.current!.logs.find((l) => l.id === id);
    if (!entry) return;
    update((x) => ({ ...x, logs: x.logs.filter((l) => l.id !== id) }));
    showSnack('Entry deleted', () => restoreLog(entry));
  };

  const addCategory = (name: string): string => {
    const existing = dataRef.current!.cats.find((c) => c.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    update((x) => ({ ...x, cats: withCat(x.cats, name) }));
    return name;
  };

  const saveChore = (v: { name: string; cat: string; n: number; per: Period }) => {
    const id = choreSheet?.id;
    if (id) {
      update((x) => ({ ...x, chores: x.chores.map((c) => (c.id === id ? { ...c, ...v } : c)) }));
      showSnack('Chore saved');
    } else {
      const chore: Chore = { id: newChoreId(), ...v };
      update((x) => ({ ...x, chores: [...x.chores, chore] }));
      showSnack(`Added ${chore.name}`);
    }
    setChoreSheet(null);
  };

  const deleteChore = () => {
    const id = choreSheet?.id;
    if (!id) return;
    const name = dataRef.current!.chores.find((c) => c.id === id)?.name;
    update((x) => ({ ...x, chores: x.chores.filter((c) => c.id !== id), logs: x.logs.filter((l) => l.c !== id) }));
    setChoreSheet(null);
    if (detailId === id) setDetailId(null);
    showSnack(`Deleted ${name}`);
  };

  const saveCategory = (name: string) => {
    const original = catSheet?.name ?? null;
    if (original === null) {
      update((x) => ({ ...x, cats: withCat(x.cats, name) }));
    } else if (name !== original) {
      update((x) => ({
        ...x,
        cats: x.cats.map((c) => (c === original ? name : c)),
        chores: x.chores.map((c) => (c.cat === original ? { ...c, cat: name } : c)),
      }));
    }
    setCatSheet(null);
  };

  const deleteCategory = (moveTo: string | null) => {
    const original = catSheet?.name;
    if (!original) return;
    update((x) => ({
      ...x,
      cats: x.cats.filter((c) => c !== original),
      chores: moveTo ? x.chores.map((c) => (c.cat === original ? { ...c, cat: moveTo } : c)) : x.chores,
    }));
    setCatSheet(null);
    showSnack(`Deleted ${original}`);
  };

  const doExport = async () => {
    try {
      await exportCsv(dataRef.current!, toCsv);
    } catch (e) {
      if (!String(e).toLowerCase().includes('cancel')) showSnack("Couldn't export the CSV");
    }
  };

  // ---- Android back button ----
  const backRef = useRef<() => void>(() => {});
  useEffect(() => {
    backRef.current = () => {
      if (catSheet) setCatSheet(null);
      else if (choreSheet) setChoreSheet(null);
      else if (detailId) setDetailId(null);
      else if (tab !== 'log') setTab('log');
      else void flushSave().then(() => CapApp.exitApp());
    };
  });
  useEffect(() => {
    if (!isNative) return;
    const h = CapApp.addListener('backButton', () => backRef.current());
    return () => {
      h.then((x) => x.remove());
    };
  }, []);

  if (!data) return <div className="app loading" />;

  const detailChore = detailId ? data.chores.find((c) => c.id === detailId) : undefined;
  const sheetChore = choreSheet?.id ? (data.chores.find((c) => c.id === choreSheet.id) ?? null) : null;

  return (
    <div className="app">
      <main className="content">
        {tab === 'log' && (
          <LogScreen
            data={data}
            day={logDay}
            today={today}
            onDay={(d) => setDaysBack(Math.max(0, today - d))}
            onAdd={addLog}
            onRemove={removeLog}
            onManage={() => setTab('chores')}
          />
        )}
        {tab === 'insights' && (
          <InsightsScreen
            data={data}
            today={today}
            rangeKey={rangeKey}
            range={range}
            custom={custom}
            onRangeKey={setRangeKey}
            onCustom={setCustom}
            onOpen={setDetailId}
            onManage={() => setTab('chores')}
          />
        )}
        {tab === 'chores' && (
          <ManageScreen
            data={data}
            onAddChore={() => setChoreSheet({ id: null })}
            onEditChore={(id) => setChoreSheet({ id })}
            onEditCat={(name) => setCatSheet({ name })}
            onHousehold={(n) => update((x) => ({ ...x, household: Math.min(12, Math.max(1, n)) }))}
            onExport={doExport}
          />
        )}
      </main>
      <BottomNav
        tab={tab}
        onTab={(t) => {
          setTab(t);
          setDetailId(null);
        }}
      />

      {detailChore && tab === 'insights' && (
        <ChoreDetail
          data={data}
          chore={detailChore}
          range={range}
          onBack={() => setDetailId(null)}
          onEdit={() => setChoreSheet({ id: detailChore.id })}
          onDeleteLog={deleteLog}
        />
      )}

      {choreSheet && (
        <ChoreSheet
          key={choreSheet.id ?? 'new'}
          chore={sheetChore}
          cats={data.cats}
          logCount={sheetChore ? data.logs.filter((l) => l.c === sheetChore.id).length : 0}
          onAddCat={addCategory}
          onSave={saveChore}
          onDelete={deleteChore}
          onClose={() => setChoreSheet(null)}
        />
      )}
      {catSheet && (
        <CategorySheet
          key={catSheet.name ?? 'new'}
          data={data}
          name={catSheet.name}
          onSave={saveCategory}
          onDelete={deleteCategory}
          onClose={() => setCatSheet(null)}
        />
      )}

      <Snackbar snack={snack} onDone={clearSnack} />
    </div>
  );
}
