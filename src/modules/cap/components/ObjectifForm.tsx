import { useState } from 'react';
import { Button, Field, Select } from '@core/ui';
import type { Doc } from '@core/model';
import { create, remove, update } from '@core/db';
import { periodeOptions } from '@core/calc/period';
import { todayISO } from '@core/lib/dates';
import s from '../Cap.module.css';

interface Props {
  objectif?: Doc<'objectifs'>;
  nextOrder: number;
  krs: Doc<'krs'>[];
  onDone: () => void;
}

export function ObjectifForm({ objectif, nextOrder, krs, onDone }: Props) {
  const year = Number(todayISO().slice(0, 4));
  const quarter = Math.floor((Number(todayISO().slice(5, 7)) - 1) / 3) + 1;
  const options = periodeOptions(year);
  const [titre, setTitre] = useState(objectif?.titre ?? '');
  const [periode, setPeriode] = useState(objectif?.periode ?? `T${quarter} ${year}`);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (objectif) await update('objectifs', objectif.id, { titre: titre.trim(), periode });
    else await create('objectifs', { titre: titre.trim(), periode, ordre: nextOrder });
    onDone();
  }
  async function del() {
    if (!objectif) return;
    if (
      !window.confirm(`Supprimer « ${objectif.titre} » et ses ${krs.length} résultat(s) clé(s) ?`)
    )
      return;
    for (const k of krs) await remove('krs', k.id);
    await remove('objectifs', objectif.id);
    onDone();
  }

  return (
    <form className={s.form} onSubmit={submit}>
      <Field
        label="Objectif"
        value={titre}
        onChange={(e) => setTitre(e.target.value)}
        autoFocus={!objectif}
        placeholder="Ex. Devenir à l’aise en improvisation"
      />
      <Select
        label="Période"
        value={periode}
        onChange={(e) => setPeriode(e.target.value)}
        options={(options.includes(periode) ? options : [periode, ...options]).map((p) => ({
          value: p,
          label: /^\d{4}$/.test(p) ? `Année ${p}` : p,
        }))}
      />
      <p className={s.muted}>
        La période définit la trajectoire prévue de ses résultats clés (linéaire du début à la fin).
      </p>
      <div className={s.actions}>
        <Button type="submit" disabled={!titre.trim()}>
          {objectif ? 'Enregistrer' : 'Créer l’objectif'}
        </Button>
        {objectif && (
          <Button variant="ghost" onClick={() => void del()}>
            Supprimer
          </Button>
        )}
      </div>
    </form>
  );
}
