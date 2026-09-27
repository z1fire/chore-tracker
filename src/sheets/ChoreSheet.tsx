import { useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import type { Chore, Period } from '../types';
import { expectedPerDay, fmtNum } from '../calc';
import { Segmented, Sheet } from '../ui';

const PERIODS = ['day', 'week', 'month'] as const;

export function ChoreSheet(props: {
  chore: Chore | null;
  cats: string[];
  logCount: number;
  onAddCat: (name: string) => string;
  onSave: (v: { name: string; cat: string; n: number; per: Period }) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { chore, cats } = props;
  const [name, setName] = useState(chore?.name ?? '');
  const [cat, setCat] = useState(chore?.cat ?? cats[0]);
  const [nText, setNText] = useState(chore ? String(chore.n) : '1');
  const [per, setPer] = useState<Period>(chore?.per ?? 'day');
  const [newCat, setNewCat] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const n = Number(nText.replace(',', '.'));
  const nValid = Number.isFinite(n) && n > 0;
  const valid = name.trim() !== '' && nValid && cats.includes(cat);
  const perDay = nValid ? expectedPerDay({ n, per }) : 0;

  const addCat = () => {
    const t = (newCat ?? '').trim();
    if (!t) return;
    setCat(props.onAddCat(t));
    setNewCat(null);
  };

  return (
    <Sheet onClose={props.onClose} label={chore ? 'Edit chore' : 'New chore'}>
      <h2 className="sheet-title">{chore ? 'Edit chore' : 'New chore'}</h2>
      <label className="field">
        <span>Name</span>
        <input type="text" value={name} autoFocus={!chore} placeholder="e.g. Load dishwasher" maxLength={60} onChange={(e) => setName(e.target.value)} />
      </label>

      <div className="field">
        <span>Category</span>
        <div className="chips">
          {cats.map((c) => (
            <button key={c} type="button" className={`chip${c === cat ? ' on' : ''}`} aria-pressed={c === cat} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
          {newCat === null && (
            <button type="button" className="chip dashed" onClick={() => setNewCat('')}>
              <Plus size={14} /> New category
            </button>
          )}
        </div>
        {newCat !== null && (
          <div className="inline-add">
            <input
              type="text"
              value={newCat}
              autoFocus
              placeholder="Category name"
              maxLength={30}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCat()}
            />
            <button type="button" className="btn btn-ghost" onClick={() => setNewCat(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" disabled={!newCat.trim()} onClick={addCat}>
              Add
            </button>
          </div>
        )}
      </div>

      <div className="field">
        <span>Expected (whole household)</span>
        <div className="expected-row">
          <input type="number" inputMode="decimal" min="0" step="any" value={nText} onChange={(e) => setNText(e.target.value)} aria-label="Times" />
          <span className="times-per">times per</span>
          <Segmented label="Period" options={PERIODS} value={per} onChange={setPer} />
        </div>
        <p className="hint">
          {nValid
            ? `About ${fmtNum(perDay)} per day, or ${Math.round(perDay * 91)} over 3 months.`
            : 'Enter how often the household should do this, more than 0.'}
        </p>
      </div>

      {confirmDelete ? (
        <div className="confirm">
          <p>
            Delete “{chore?.name}”{props.logCount > 0 && ` and its ${props.logCount} logged ${props.logCount === 1 ? 'entry' : 'entries'}`}? This can't be
            undone.
          </p>
          <div className="actions">
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>
              Keep chore
            </button>
            <button type="button" className="btn btn-danger" onClick={props.onDelete}>
              Delete
            </button>
          </div>
        </div>
      ) : (
        <div className="actions">
          {chore && (
            <button type="button" className="btn btn-ghost danger-text push-left" onClick={() => setConfirmDelete(true)}>
              Delete
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={props.onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={!valid} onClick={() => props.onSave({ name: name.trim(), cat, n, per })}>
            Save
          </button>
        </div>
      )}
    </Sheet>
  );
}
