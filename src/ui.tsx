import { useEffect, type ReactNode } from 'react';
import { ChartBar, CheckSquare, ListBullets } from '@phosphor-icons/react';
import { CONFIG, type Tab } from './types';
import { isAbove, type Bucket } from './calc';
import { fmtShort } from './dates';

export function Segmented<T extends string>(props: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={props.label}>
      {props.options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={props.value === o}
          className={props.value === o ? 'on' : ''}
          onClick={() => props.onChange(o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/** Horizontal 0–100% bar with fair-share marker. */
export function ShareBar({ share, fair, thick }: { share: number; fair: number; thick?: boolean }) {
  return (
    <div className={`sharebar${thick ? ' thick' : ''}`}>
      <div className={`fill${isAbove(share, fair) ? ' above' : ''}`} style={{ width: `${Math.min(1, share) * 100}%` }} />
      {CONFIG.showFairShare && <div className="fair" style={{ left: `${Math.min(1, fair) * 100}%` }} />}
    </div>
  );
}

export function TrendCard({ buckets, fair, title }: { buckets: Bucket[]; fair: number; title: string }) {
  const max = Math.max(2 * fair, 1, ...buckets.map((b) => b.share));
  return (
    <section className="card trend">
      <div className="card-title">{title}</div>
      <div className="chart" role="img" aria-label={`${title}, ${buckets.length} bars`}>
        {buckets.map((b) => (
          <div key={b.from} className="col">
            <div
              className={`bar${isAbove(b.share, fair) ? ' above' : ''}`}
              style={{ height: `${(b.share / max) * 100}%` }}
            />
          </div>
        ))}
        {CONFIG.showFairShare && <div className="fairline" style={{ bottom: `${(fair / max) * 100}%` }} />}
      </div>
      {buckets.length > 0 && (
        <div className="chart-labels">
          <span>{fmtShort(buckets[0].from)}</span>
          <span>{fmtShort(buckets[buckets.length - 1].to)}</span>
        </div>
      )}
    </section>
  );
}

export function Sheet({ onClose, children, label }: { onClose: () => void; children: ReactNode; label: string }) {
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        {children}
      </div>
    </div>
  );
}

export interface SnackState {
  key: number;
  text: string;
  undo?: () => void;
}

export function Snackbar({ snack, onDone }: { snack: SnackState | null; onDone: () => void }) {
  useEffect(() => {
    if (!snack) return;
    const t = setTimeout(onDone, 5000);
    return () => clearTimeout(t);
  }, [snack, onDone]);
  if (!snack) return null;
  return (
    <div className="snackbar" role="status" key={snack.key}>
      <span>{snack.text}</span>
      {snack.undo && (
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            snack.undo?.();
            onDone();
          }}
        >
          Undo
        </button>
      )}
    </div>
  );
}

const NAV: { id: Tab; label: string; Icon: typeof CheckSquare }[] = [
  { id: 'log', label: 'Log', Icon: CheckSquare },
  { id: 'insights', label: 'Insights', Icon: ChartBar },
  { id: 'chores', label: 'Chores', Icon: ListBullets },
];

export function BottomNav({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  return (
    <nav className="bottomnav">
      {NAV.map(({ id, label, Icon }) => (
        <button key={id} type="button" className={tab === id ? 'on' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => onTab(id)}>
          <span className="pill">
            <Icon size={22} weight={tab === id ? 'fill' : 'regular'} />
          </span>
          <span className="navlabel">{label}</span>
        </button>
      ))}
    </nav>
  );
}

/** Groups chores by category, in category order, skipping empty categories. */
export function groupByCat<T extends { cat: string }>(cats: string[], items: T[]): [string, T[]][] {
  return cats.map((cat) => [cat, items.filter((i) => i.cat === cat)] as [string, T[]]).filter(([, list]) => list.length > 0);
}
