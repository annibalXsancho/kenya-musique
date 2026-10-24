import { useState } from 'react';
import { Button, Field } from '@core/ui';
import type { Doc } from '@core/model';
import { create, update } from '@core/db';
import s from '../Cap.module.css';

export function VisionPanel({ vision, onDone }: { vision?: Doc<'vision'>; onDone: () => void }) {
  const [texte, setTexte] = useState(vision?.texte ?? '');
  const [horizon, setHorizon] = useState(vision?.horizon ?? '');
  const [piliers, setPiliers] = useState((vision?.piliers ?? []).join('\n'));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      texte: texte.trim(),
      horizon: horizon.trim(),
      piliers: piliers
        .split('\n')
        .map((p) => p.trim())
        .filter(Boolean),
    };
    if (vision) await update('vision', vision.id, data);
    else await create('vision', data);
    onDone();
  }

  return (
    <form className={s.form} onSubmit={submit}>
      <Field
        label="Vision"
        multiline
        rows={5}
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        autoFocus
        placeholder="Où je veux être, en une ou deux phrases"
      />
      <Field
        label="Horizon"
        value={horizon}
        onChange={(e) => setHorizon(e.target.value)}
        placeholder="Ex. fin 2028"
      />
      <Field
        label="Piliers"
        multiline
        value={piliers}
        onChange={(e) => setPiliers(e.target.value)}
        hint="Un pilier par ligne"
      />
      <div className={s.actions}>
        <Button type="submit">Enregistrer</Button>
        <Button variant="ghost" onClick={onDone}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
