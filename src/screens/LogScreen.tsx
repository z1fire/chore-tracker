import { CaretLeft, CaretRight, Minus, Plus } from '@phosphor-icons/react';
import type { AppData } from '../types';
import { fmtLong, fmtWeekdayShort } from '../dates';
import { fmtNum } from '../calc';
import { groupByCat } from '../ui';

export function LogScreen(props: {
  data: AppData;
  day: number;
  today: number;
  onDay: (d: number) => void;
  onAdd: (choreId: string) => void;
  onRemove: (choreId: string) => void;
  onManage: () => void;
}) {
  const { data, day, today } = props;
  const isToday = day === today;
  const title = isToday ? 'Today' : day === today - 1 ? 'Yesterday' : fmtWeekdayShort(day);
  const kicker = isToday ? fmtLong(day) : 'Logging for a past day';

  const counts = new Map<string, number>();
  let total = 0;
  for (const l of data.logs) {
    if (l.d === day) {
      counts.set(l.c, (counts.get(l.c) ?? 0) + 1);
      total++;
    }
  }

  const groups = groupByCat(data.cats, data.chores);
  const when = isToday ? 'today' : day === today - 1 ? 'yesterday' : 'on this day';

  return (
    <div className="screen">
      <header className="log-header">
        <div>
          <div className="kicker">{kicker}</div>
          <h1 className="title">{title}</h1>
        </div>
        <div className="stepper">
          <button type="button" className="btn btn-icon btn-ghost" aria-label="Previous day" onClick={() => props.onDay(day - 1)}>
            <CaretLeft size={20} />
          </button>
          <button type="button" className="btn btn-icon btn-ghost" aria-label="Next day" disabled={isToday} onClick={() => props.onDay(day + 1)}>
            <CaretRight size={20} />
          </button>
        </div>
      </header>

      {data.chores.length === 0 ? (
        <div className="empty card">
          <p>No chores yet. Add the chores your household does, then log them here as you do them.</p>
          <button type="button" className="btn btn-primary" onClick={props.onManage}>
            <Plus size={18} /> Add chores
          </button>
        </div>
      ) : (
        <>
          <p className="summary">
            {total > 0 ? `${total} logged ${when}` : `Nothing logged ${when} yet. Tap + when you finish a chore.`}
          </p>
          {groups.map(([cat, chores]) => (
            <section key={cat} className="group">
              <div className="section-label">{cat}</div>
              <div className="card list">
                {chores.map((c) => {
                  const n = counts.get(c.id) ?? 0;
                  return (
                    <div key={c.id} className="row log-row">
                      <div className="row-main">
                        <div className="row-title">{c.name}</div>
                        <div className="row-sub">
                          Household expects {fmtNum(c.n)} / {c.per}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-icon btn-ghost"
                        aria-label={`Remove one ${c.name}`}
                        style={{ visibility: n > 0 ? 'visible' : 'hidden' }}
                        onClick={() => props.onRemove(c.id)}
                      >
                        <Minus size={18} />
                      </button>
                      <span className={`count${n === 0 ? ' zero' : ''}`}>{n}</span>
                      <button type="button" className="btn btn-icon btn-primary" aria-label={`Log ${c.name}`} onClick={() => props.onAdd(c.id)}>
                        <Plus size={20} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
