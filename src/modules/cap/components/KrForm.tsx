import { useState } from 'react';
import { Button, Field, Segmented } from '@core/ui';
import type { Doc } from '@core/model';
import { create, remove, update } from '@core/db';
import s from '../Cap.module.css';

interface Props {
  kr?: Doc<'krs'>;
  objectifId: string;
  onDone: (id?: string) => void;
  onCancel: () => void;
}

export function KrForm({ kr, objectifId, onDone, onCancel }: Props) {
  const [libelle, setLibelle] = useState(kr?.libelle ?? '');
  const [unite, setUnite] = useState(kr?.unite ?? '');
  const [cible, setCible] = useState(kr ? String(kr.cible) : '');
  const [mode, setMode] = useState<'sessions' | 'manuel'>(kr?.mode ?? 'sessions');
  const [manuelle, setManuelle] = useState(
    kr?.valeurManuelle !== undefined ? String(kr.valeurManuelle) : '',
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      libelle: libelle.trim(),
      unite: unite.trim(),
      cible: Number(cible),
      mode,
      valeurManuelle: mode === 'manuel' && manuelle !== '' ? Number(manuelle) : undefined,
    };
    if (kr) {
      await update('krs', kr.id, data);
      return onDone(kr.id);
    }
    const created = await create('krs', { ...data, objectifId });
    onDone(created.id);
  }

  return (
    <form className={s.form} onSubmit={submit}>
      <Field
        label="Résultat clé"
        value={libelle}
        onChange={(e) => setLibelle(e.target.value)}
        autoFocus={!kr}
        placeholder="Ex. Morceaux joués de bout en bout"
      />
      <div className={s.two}>
        <Field
          label="Cible"
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          value={cible}
          onChange={(e) => setCible(e.target.value)}
        />
        <Field
          label="Unité"
          value={unite}
          onChange={(e) => setUnite(e.target.value)}
          placeholder="morceaux, h, %…"
        />
      </div>
      <div>
        <div className={s.legendLabel}>Valeur atteinte</div>
        <Segmented
          label="Source de la valeur"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'sessions', label: 'Depuis les sessions' },
            { value: 'manuel', label: 'Saisie manuelle' },
          ]}
        />
        <p className={s.muted}>
          {mode === 'sessions'
            ? 'Chaque session indique sa contribution : la valeur est calculée, jamais ressaisie.'
            : 'Tu mets la valeur à jour toi-même (par exemple un niveau mesuré).'}
        </p>
      </div>
      {mode === 'manuel' && (
        <Field
          label="Valeur actuelle"
          type="number"
          inputMode="decimal"
          step="any"
          value={manuelle}
          onChange={(e) => setManuelle(e.target.value)}
        />
      )}
      <div className={s.actions}>
        <Button type="submit" disabled={!libelle.trim() || cible === '' || Number(cible) <= 0}>
          {kr ? 'Enregistrer' : 'Ajouter le résultat clé'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
        {kr && (
          <Button
            variant="ghost"
            onClick={async () => {
              if (!window.confirm(`Supprimer « ${kr.libelle} » ?`)) return;
              await remove('krs', kr.id);
              onDone();
            }}
          >
            Supprimer
          </Button>
        )}
      </div>
    </form>
  );
}
