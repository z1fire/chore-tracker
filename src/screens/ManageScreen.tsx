import { CaretRight, DownloadSimple, Minus, Plus } from '@phosphor-icons/react';
import type { AppData } from '../types';
import { fmtNum, fmtPct } from '../calc';
import { groupByCat } from '../ui';

export function ManageScreen(props: {
  data: AppData;
  onAddChore: () => void;
  onEditChore: (id: string) => void;
  onEditCat: (name: string | null) => void;
  onHousehold: (n: number) => void;
  onExport: () => void;
}) {
  const { data } = props;
  const groups = groupByCat(data.cats, data.chores);

  return (
    <div className="screen">
      <header className="manage-header">
        <h1 className="title">Chores</h1>
        <button type="button" className="btn btn-primary nowrap" onClick={props.onAddChore}>
          <Plus size={18} /> Add chore
        </button>
      </header>
      <p className="helper">Expected counts are for the whole household, not just you.</p>

      {groups.length === 0 ? (
        <div className="card empty-small">No chores yet. Tap “Add chore” to create your first one.</div>
      ) : (
        groups.map(([cat, chores]) => (
          <section key={cat} className="group">
            <div className="section-label">{cat}</div>
            <div className="card list">
              {chores.map((c) => (
                <button key={c.id} type="button" className="row manage-row" onClick={() => props.onEditChore(c.id)}>
                  <span className="row-title">{c.name}</span>
                  <span className="row-sub">
                    {fmtNum(c.n)} / {c.per}
                  </span>
                  <CaretRight size={16} className="caret" />
                </button>
              ))}
            </div>
          </section>
        ))
      )}

      <section className="group">
        <div className="section-label">Categories</div>
        <div className="card list">
          {data.cats.map((cat) => {
            const n = data.chores.filter((c) => c.cat === cat).length;
            return (
              <button key={cat} type="button" className="row manage-row" onClick={() => props.onEditCat(cat)}>
                <span className="row-title">{cat}</span>
                <span className="row-sub">
                  {n} {n === 1 ? 'chore' : 'chores'}
                </span>
                <CaretRight size={16} className="caret" />
              </button>
            );
          })}
          <button type="button" className="row manage-row accent-row" onClick={() => props.onEditCat(null)}>
            <Plus size={18} />
            <span className="row-title">New category</span>
          </button>
        </div>
      </section>

      <section className="group">
        <div className="section-label">Household</div>
        <div className="card list">
          <div className="row manage-row">
            <div className="row-main">
              <div className="row-title">People in household</div>
              <div className="row-sub">Fair share is {fmtPct(1 / data.household)} each</div>
            </div>
            <div className="num-stepper">
              <button type="button" className="btn btn-icon btn-secondary" aria-label="Fewer people" disabled={data.household <= 1} onClick={() => props.onHousehold(data.household - 1)}>
                <Minus size={18} />
              </button>
              <span className="count">{data.household}</span>
              <button type="button" className="btn btn-icon btn-secondary" aria-label="More people" disabled={data.household >= 12} onClick={() => props.onHousehold(data.household + 1)}>
                <Plus size={18} />
              </button>
            </div>
          </div>
          <button type="button" className="row manage-row" onClick={props.onExport} disabled={data.logs.length === 0}>
            <div className="row-main">
              <div className="row-title">Export data</div>
              <div className="row-sub">
                CSV of all {data.logs.length} {data.logs.length === 1 ? 'entry' : 'entries'}
              </div>
            </div>
            <DownloadSimple size={20} className="caret" />
          </button>
        </div>
      </section>
      <p className="footnote">Your data is saved on this phone, inside the app. Export a CSV if you want a copy elsewhere.</p>
    </div>
  );
}
