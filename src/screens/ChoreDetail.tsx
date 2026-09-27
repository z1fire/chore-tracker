import { ArrowLeft, PencilSimple, Trash } from '@phosphor-icons/react';
import { CONFIG, type AppData, type Chore } from '../types';
import { choreStats, fmtMultiple, fmtNum, fmtPct, isAbove, rangeLabel, trendBuckets, type Range } from '../calc';
import { fmtClock, fmtWeekdayShort } from '../dates';
import { TrendCard } from '../ui';

const MAX_HISTORY = 40;

export function ChoreDetail(props: {
  data: AppData;
  chore: Chore;
  range: Range;
  onBack: () => void;
  onEdit: () => void;
  onDeleteLog: (id: number) => void;
}) {
  const { data, chore, range } = props;
  const fair = 1 / data.household;
  const entries = data.logs.filter((l) => l.c === chore.id && l.d >= range.from && l.d <= range.to).sort((a, b) => b.t - a.t);
  const s = choreStats(chore, entries.length, range.days);
  const buckets = trendBuckets([chore], data.logs, range.from, range.to);
  const above = isAbove(s.share, fair);
  const times = s.mine === 1 ? 'time' : 'times';
  const days = range.days === 1 ? 'day' : 'days';
  const split =
    data.household === 1
      ? "You're the only person in the household, so a fair share is 100%."
      : `An even split between ${data.household} people would be ${fmtPct(fair)}.`;

  return (
    <div className="detail">
      <div className="topbar">
        <button type="button" className="btn btn-icon btn-ghost" aria-label="Back" onClick={props.onBack}>
          <ArrowLeft size={22} />
        </button>
        <button type="button" className="btn btn-icon btn-ghost" aria-label="Edit chore" onClick={props.onEdit}>
          <PencilSimple size={20} />
        </button>
      </div>
      <div className="screen">
        <div className="kicker">{chore.cat}</div>
        <h1 className="title">{chore.name}</h1>
        <div className="range-label">{rangeLabel(range)}</div>

        <div className="tiles">
          <div className="tile">
            <div className="tile-label">You</div>
            <div className="tile-figure">{fmtNum(s.myPerDay)}</div>
            <div className="tile-sub">per day</div>
          </div>
          <div className="tile">
            <div className="tile-label">Expected</div>
            <div className="tile-figure">{fmtNum(s.expPerDay)}</div>
            <div className="tile-sub">per day</div>
          </div>
          <div className={`tile${above ? ' above' : ''}`}>
            <div className="tile-label">Your share</div>
            <div className="tile-figure">{fmtPct(s.share)}</div>
            {CONFIG.showFairShare && <div className="tile-sub">{fmtMultiple(s.share, fair)} fair share</div>}
          </div>
        </div>

        <p className="sentence">
          You did this {s.mine} {times} in {range.days} {days}. The household expects about {Math.round(s.expected)}, so you covered{' '}
          {fmtPct(s.share)} of it. {split}
        </p>

        <TrendCard title="Trend" buckets={buckets} fair={fair} />

        <div className="section-label">History</div>
        {entries.length === 0 ? (
          <div className="card empty-small">No entries in this range.</div>
        ) : (
          <div className="card list">
            {entries.slice(0, MAX_HISTORY).map((l) => (
              <div key={l.id} className="row history-row">
                <span className="row-title">{fmtWeekdayShort(l.d)}</span>
                <span className="row-sub">{fmtClock(l.t)}</span>
                <button type="button" className="btn btn-icon btn-ghost" aria-label="Delete entry" onClick={() => props.onDeleteLog(l.id)}>
                  <Trash size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="footnote">
          {entries.length > MAX_HISTORY && `Showing the latest ${MAX_HISTORY} of ${entries.length}. `}
          Past entries are added from the Log tab.
        </p>
      </div>
    </div>
  );
}
