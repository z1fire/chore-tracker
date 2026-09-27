import { useState } from 'react';
import type { AppData } from '../types';
import { Sheet } from '../ui';

export function CategorySheet(props: {
  data: AppData;
  name: string | null;
  onSave: (name: string) => void;
  onDelete: (moveTo: string | null) => void;
  onClose: () => void;
}) {
  const { data, name: original } = props;
  const [name, setName] = useState(original ?? '');
  const [moving, setMoving] = useState(false);
  const others = data.cats.filter((c) => c !== original);
  const [moveTo, setMoveTo] = useState(others.includes('Other') ? 'Other' : (others[0] ?? ''));

  const trimmed = name.trim();
  const duplicate = others.some((c) => c.toLowerCase() === trimmed.toLowerCase());
  const valid = trimmed !== '' && !duplicate;
  const choreCount = original ? data.chores.filter((c) => c.cat === original).length : 0;
  const canDelete = original !== null && data.cats.length > 1;

  const onDeleteClick = () => {
    if (choreCount === 0) props.onDelete(null);
    else setMoving(true);
  };

  return (
    <Sheet onClose={props.onClose} label={original ? 'Edit category' : 'New category'}>
      <h2 className="sheet-title">{original ? 'Edit category' : 'New category'}</h2>
      <label className="field">
        <span>Name</span>
        <input
          type="text"
          value={name}
          autoFocus={!original}
          maxLength={30}
          placeholder="e.g. Kitchen"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && valid && props.onSave(trimmed)}
        />
      </label>
      <p className="hint">
        {duplicate
          ? 'There is already a category with that name.'
          : original
            ? 'Renaming keeps all chores and their history.'
            : 'Empty categories show up only here, in the Chores tab, until you add a chore to them.'}
      </p>

      {moving ? (
        <div className="confirm">
          <p>
            Move {choreCount} {choreCount === 1 ? 'chore' : 'chores'} to:
          </p>
          <div className="chips">
            {others.map((c) => (
              <button key={c} type="button" className={`chip${c === moveTo ? ' on' : ''}`} aria-pressed={c === moveTo} onClick={() => setMoveTo(c)}>
                {c}
              </button>
            ))}
          </div>
          <div className="actions">
            <button type="button" className="btn btn-secondary" onClick={() => setMoving(false)}>
              Keep category
            </button>
            <button type="button" className="btn btn-danger" disabled={!moveTo} onClick={() => props.onDelete(moveTo)}>
              Delete and move
            </button>
          </div>
        </div>
      ) : (
        <div className="actions">
          {canDelete && (
            <button type="button" className="btn btn-ghost danger-text push-left" onClick={onDeleteClick}>
              Delete
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={props.onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={!valid} onClick={() => props.onSave(trimmed)}>
            Save
          </button>
        </div>
      )}
    </Sheet>
  );
}
