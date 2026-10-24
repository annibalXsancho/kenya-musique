import { useState } from 'react';
import { Button, Field } from '@core/ui';
import type { Doc } from '@core/model';
import { create, remove, update } from '@core/db';
import { addDays, todayISO } from '@core/lib/dates';
import s from '../Planning.module.css';

interface Props {
  phase?: Doc<'phases'>;
  sprintCount: number;
  nextOrder: number;
  onDone: () => void;
}

export function PhaseForm({ phase, sprintCount, nextOrder, onDone }: Props) {
  const [nom, setNom] = useState(phase?.nom ?? '');
  const [debut, setDebut] = useState(phase?.debut ?? todayISO());
  const [fin, setFin] = useState(phase?.fin ?? addDays(todayISO(), 90));
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (fin < debut) return setError('La fin doit être après le début.');
    if (phase) await update('phases', phase.id, { nom: nom.trim(), debut, fin });
    else await create('phases', { nom: nom.trim(), debut, fin, ordre: nextOrder });
    onDone();
  }

  async function del() {
    if (!phase) return;
    if (sprintCount > 0)
      return setError('Cette phase contient des sprints : supprime-les ou déplace-les d’abord.');
    await remove('phases', phase.id);
    onDone();
  }

  return (
    <form className={s.form} onSubmit={submit}>
      <Field
        label="Nom"
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        autoFocus={!phase}
        placeholder="Ex. Fondations"
      />
      <div className={s.two}>
        <Field label="Début" type="date" value={debut} onChange={(e) => setDebut(e.target.value)} />
        <Field label="Fin" type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
      </div>
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      <div className={s.actions}>
        <Button type="submit" disabled={!nom.trim() || !debut || !fin}>
          {phase ? 'Enregistrer' : 'Créer la phase'}
        </Button>
        {phase && (
          <Button variant="ghost" onClick={() => void del()}>
            Supprimer
          </Button>
        )}
      </div>
    </form>
  );
}
