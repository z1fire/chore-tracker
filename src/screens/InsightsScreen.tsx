import { CaretRight } from '@phosphor-icons/react';
import { CONFIG, type AppData, type RangeKey } from '../types';
import { choreStats, countByChore, fmtMultiple, fmtNum, fmtPct, isAbove, overallStats, rangeLabel, trendBuckets, type Range } from '../calc';
import { dayToISO, isoToDay } from '../dates';
import { Segmented, ShareBar, TrendCard } from '../ui';

const RANGES = ['7D', '30D', '3M', 'Custom'] as const;

export function InsightsScreen(props: {
  data: AppData;
  today: number;
  rangeKey: RangeKey;
  range: Range;
  custom: { from: number; to: number };
  onRangeKey: (k: RangeKey) => void;
  onCustom: (c: { from: number; to: number }) => void;
  onOpen: (choreId: string) => void;
  onManage: () => void;
}) {
  const { data, range, custom, today } = props;
  const fair = 1 / data.household;

  if (data.chores.length === 0) {
    return (
      <div className="screen">
        <h1 className="title">Insights</h1>
        <div className="empty card">
          <p>Once you add chores and start logging them, you'll see your share of the household workload here.</p>
          <button type="button" className="btn btn-primary" onClick={props.onManage}>
            Add chores
          </button>
        </div>
      </div>
    );
  }

  const counts = countByChore(data.logs, range.from, range.to);
  const overall = overallStats(data.chores, counts, range.days);
  const buckets = trendBuckets(data.chores, data.logs, range.from, range.to);
  const rows = data.chores
    .map((c) => ({ c, s: choreStats(c, counts.get(c.id) ?? 0, range.days) }))
    .sort((a, b) => b.s.share - a.s.share || a.c.name.localeCompare(b.c.name));

  const setDate = (which: 'from' | 'to', v: string) => {
    const d = isoToDay(v);
    if (d === null) return;
    const next = { ...custom, [which]: Math.min(d, today) };
    props.onCustom(next);
  };

  return (
    <div className="screen">
      <h1 className="title">Insights</h1>
      <Segmented label="Date range" options={RANGES} value={props.rangeKey} onChange={props.onRangeKey} />
      {props.rangeKey === 'Custom' && (
        <div className="date-row">
          <label className="field">
            <span>From</span>
            <input type="date" value={dayToISO(custom.from)} max={dayToISO(Math.min(custom.to, today))} onChange={(e) => setDate('from', e.target.value)} />
          </label>
          <label className="field">
            <span>To</span>
            <input type="date" value={dayToISO(custom.to)} min={dayToISO(custom.from)} max={dayToISO(today)} onChange={(e) => setDate('to', e.target.value)} />
          </label>
        </div>
      )}
      <div className="range-label">{rangeLabel(range)}</div>

      <section className="card hero">
        <div className="card-title">Your share of expected household chores</div>
        <div className="hero-figure">
          <span className="big">{fmtPct(overall.share)}</span>
          {CONFIG.showFairShare && <span className="multiple">{fmtMultiple(overall.share, fair)} a fair share</span>}
        </div>
        <ShareBar share={overall.share} fair={fair} thick />
        <p className="footnote">
          {CONFIG.showFairShare && (
            <>
              The marker is a fair share: {fmtPct(fair)} with {data.household} {data.household === 1 ? 'person' : 'people'} in the household.{' '}
            </>
          )}
          {overall.mine} {overall.mine === 1 ? 'chore' : 'chores'} logged of about {Math.round(overall.expected)} expected.
        </p>
      </section>

      <TrendCard title="Trend" buckets={buckets} fair={fair} />

      <div className="section-label">By chore</div>
      <div className="card list">
        {rows.map(({ c, s }) => (
          <button key={c.id} type="button" className="row insight-row" onClick={() => props.onOpen(c.id)}>
            <div className="row-main">
              <div className="row-head">
                <span className="row-title">{c.name}</span>
                <span className={`pct${isAbove(s.share, fair) ? ' above' : ''}`}>{fmtPct(s.share)}</span>
              </div>
              <div className="row-sub">
                You {fmtNum(s.myPerDay)}/day · household expects {fmtNum(s.expPerDay)}/day
              </div>
              <ShareBar share={s.share} fair={fair} />
            </div>
            <CaretRight size={16} className="caret" />
          </button>
        ))}
      </div>
    </div>
  );
}
