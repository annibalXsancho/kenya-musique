import { useState } from 'react';
import { Button, Field, Pill, Select } from '@core/ui';
import type { Doc } from '@core/model';
import { create, remove, update } from '@core/db';
import { formatShort, todayISO } from '@core/lib/dates';
import s from '../Planning.module.css';

type Indispo = Doc<'indisponibilites'>;

function IndispoForm({ item, onDone }: { item?: Indispo; onDone: () => void }) {
  const [libelle, setLibelle] = useState(item?.libelle ?? '');
  const [debut, setDebut] = useState(item?.debut ?? todayISO());
  const [fin, setFin] = useState(item?.fin ?? todayISO());
  const [type, setType] = useState<string>(item?.type ?? 'cours');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (fin < debut) return setError('La fin doit être après le début.');
    const data = { libelle: libelle.trim(), debut, fin, type: type as 'cours' | 'autre' };
    if (item) await update('indisponibilites', item.id, data);
    else await create('indisponibilites', data);
    onDone();
  }

  return (
    <form className={s.form} onSubmit={submit}>
      <Field
        label="Libellé"
        value={libelle}
        onChange={(e) => setLibelle(e.target.value)}
        autoFocus
        placeholder="Ex. Semaine de cours"
      />
      <div className={s.two}>
        <Field label="Du" type="date" value={debut} onChange={(e) => setDebut(e.target.value)} />
        <Field label="Au" type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
      </div>
      <Select
        label="Type"
        value={type}
        onChange={(e) => setType(e.target.value)}
        options={[
          { value: 'cours', label: 'Cours' },
          { value: 'autre', label: 'Autre' },
        ]}
      />
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      <div className={s.actions}>
        <Button type="submit" disabled={!libelle.trim()}>
          {item ? 'Enregistrer' : 'Ajouter'}
        </Button>
        {item && (
          <Button
            variant="ghost"
            onClick={async () => {
              await remove('indisponibilites', item.id);
              onDone();
            }}
          >
            Supprimer
          </Button>
        )}
        <Button variant="ghost" onClick={onDone}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

/** Liste et saisie des indisponibilités (semaines de cours…), hachurées sur la frise. */
export function UnavailabilityPanel({ items }: { items: Indispo[] }) {
  const [editing, setEditing] = useState<Indispo | 'new' | null>(null);
  const sorted = [...items].sort((a, b) => a.debut.localeCompare(b.debut));

  if (editing)
    return (
      <IndispoForm item={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />
    );

  return (
    <div className={s.stack}>
      <p>Ces périodes apparaissent hachurées sur la frise et seront grisées dans l’agenda.</p>
      <div>
        <Button onClick={() => setEditing('new')}>Ajouter une période</Button>
      </div>
      {sorted.length === 0 && <p>Aucune indisponibilité saisie.</p>}
      <div className={s.rows}>
        {sorted.map((u) => (
          <button key={u.id} type="button" className={s.rowBtn} onClick={() => setEditing(u)}>
            <span className={s.rowMain}>
              <strong>{u.libelle}</strong>
              <span className={s.muted}>
                {formatShort(u.debut)} → {formatShort(u.fin)}
              </span>
            </span>
            <Pill>{u.type === 'cours' ? 'Cours' : 'Autre'}</Pill>
          </button>
        ))}
      </div>
    </div>
  );
}
