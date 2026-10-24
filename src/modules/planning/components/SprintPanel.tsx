import { useState } from 'react';
import { Button, Field, Pill, ProgressBar, Select } from '@core/ui';
import type { Doc } from '@core/model';
import { create, remove, update } from '@core/db';
import { useList } from '@core/db/hooks';
import { sprintProgress } from '@core/calc/progress';
import { addDays, diffDays, formatShort, todayISO } from '@core/lib/dates';
import { ETAPES_TYPES, STATUTS, statutLabel, statutTone } from '../labels';
import { StepList } from './StepList';
import s from '../Planning.module.css';

type Sprint = Doc<'sprints'>;
type Statut = Sprint['statut'];

/** Gel des dates initiales au premier passage « en cours » (§7) : le glissement se mesure ensuite contre elles. */
export function freezePatch(
  sprint: Pick<Sprint, 'debutInitial' | 'finInitial'>,
  statut: string,
  debut: string,
  fin: string,
) {
  return statut === 'en_cours' && !sprint.debutInitial
    ? { debutInitial: debut, finInitial: fin }
    : {};
}

function SprintForm({
  sprint,
  phases,
  sprints,
  onSaved,
  onCancel,
}: {
  sprint?: Sprint;
  phases: Doc<'phases'>[];
  sprints: Sprint[];
  onSaved: (id: string) => void;
  onCancel: () => void;
}) {
  const today = todayISO();
  // Les sprints en backlog (souvent lointains) ne comptent pas pour proposer la date de début.
  const last = sprints
    .filter((p) => p.statut !== 'backlog')
    .sort((a, b) => b.fin.localeCompare(a.fin))[0];
  const defaultDebut = last && last.fin >= today ? addDays(last.fin, 1) : today;
  const currentPhase =
    phases.find((p) => p.debut <= today && today <= p.fin) ?? phases[phases.length - 1];

  const [sujet, setSujet] = useState(sprint?.sujet ?? '');
  const [objectif, setObjectif] = useState(sprint?.objectif ?? '');
  const [phaseId, setPhaseId] = useState(sprint?.phaseId ?? currentPhase?.id ?? '');
  const [debut, setDebut] = useState(sprint?.debut ?? defaultDebut);
  const [fin, setFin] = useState(sprint?.fin ?? addDays(defaultDebut, 13));
  const [numero, setNumero] = useState(
    String(sprint?.numero ?? Math.max(0, ...sprints.map((p) => p.numero)) + 1),
  );
  const [statut, setStatut] = useState<Statut>(sprint?.statut ?? 'planifie');
  const [withSteps, setWithSteps] = useState(true);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (fin < debut) return setError('La fin doit être après le début.');
    const data = {
      phaseId,
      numero: Number(numero),
      sujet: sujet.trim(),
      objectif: objectif.trim(),
      debut,
      fin,
      statut,
    };
    if (sprint) {
      await update('sprints', sprint.id, { ...data, ...freezePatch(sprint, statut, debut, fin) });
      return onSaved(sprint.id);
    }
    const created = await create('sprints', {
      ...data,
      krIds: [],
      ...freezePatch({}, statut, debut, fin),
    });
    if (withSteps) {
      for (const [i, titre] of ETAPES_TYPES.entries()) {
        await create('etapes', {
          sprintId: created.id,
          titre,
          ordre: i,
          statut: 'planifie',
          taches: [],
        });
      }
    }
    onSaved(created.id);
  }

  return (
    <form className={s.form} onSubmit={submit}>
      <Field
        label="Sujet"
        value={sujet}
        onChange={(e) => setSujet(e.target.value)}
        autoFocus={!sprint}
        placeholder="Ex. Gammes modales"
      />
      <Field
        label="Objectif"
        multiline
        value={objectif}
        onChange={(e) => setObjectif(e.target.value)}
        placeholder="Ce qui sera vrai à la fin du sprint"
      />
      <Select
        label="Phase"
        value={phaseId}
        onChange={(e) => setPhaseId(e.target.value)}
        options={phases.map((p) => ({ value: p.id, label: p.nom }))}
      />
      <div className={s.two}>
        <Field label="Début" type="date" value={debut} onChange={(e) => setDebut(e.target.value)} />
        <Field label="Fin" type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
      </div>
      <div className={s.two}>
        <Field
          label="Numéro"
          type="number"
          inputMode="numeric"
          min={1}
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
        />
        <Select
          label="Statut"
          value={statut}
          onChange={(e) => setStatut(e.target.value as Statut)}
          options={STATUTS}
        />
      </div>
      {!sprint && (
        <label className={s.check}>
          <input
            type="checkbox"
            checked={withSteps}
            onChange={(e) => setWithSteps(e.target.checked)}
          />
          Ajouter les 4 étapes types ({ETAPES_TYPES.join(', ')})
        </label>
      )}
      {statut === 'en_cours' && !sprint?.debutInitial && (
        <p className={s.muted}>
          Les dates seront gelées comme dates initiales pour mesurer le glissement.
        </p>
      )}
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      <div className={s.actions}>
        <Button type="submit" disabled={!sujet.trim() || !phaseId || !numero}>
          {sprint ? 'Enregistrer' : 'Créer le sprint'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

interface Props {
  sprint?: Sprint;
  phases: Doc<'phases'>[];
  sprints: Sprint[];
  onSaved: (id: string) => void;
  onClose: () => void;
}

/** Panneau d'un sprint : objectif, KR, avancement, statut, étapes dépliables ; ou formulaire de création/édition. */
export function SprintPanel({ sprint, phases, sprints, onSaved, onClose }: Props) {
  const [editing, setEditing] = useState(!sprint);
  const etapes = (useList('etapes') ?? []).filter((e) => e.sprintId === sprint?.id);

  if (editing || !sprint) {
    return (
      <SprintForm
        sprint={sprint}
        phases={phases}
        sprints={sprints}
        onSaved={(id) => {
          setEditing(false);
          onSaved(id);
        }}
        onCancel={() => (sprint ? setEditing(false) : onClose())}
      />
    );
  }

  const progress = sprintProgress(etapes);
  const slip = sprint.finInitial ? diffDays(sprint.finInitial, sprint.fin) : 0;
  const startSlip = sprint.debutInitial ? diffDays(sprint.debutInitial, sprint.debut) : 0;
  const phase = phases.find((p) => p.id === sprint.phaseId);

  async function changeStatut(statut: Statut) {
    await update('sprints', sprint!.id, {
      statut,
      ...freezePatch(sprint!, statut, sprint!.debut, sprint!.fin),
    });
  }
  async function del() {
    if (!window.confirm(`Supprimer le sprint S${sprint!.numero} et ses étapes ?`)) return;
    for (const e of etapes) await remove('etapes', e.id);
    await remove('sprints', sprint!.id);
    onClose();
  }

  return (
    <div className={s.stack}>
      <div className={s.meta}>
        <Pill tone={statutTone(sprint.statut)}>{statutLabel(sprint.statut)}</Pill>
        <span className={s.muted}>
          {formatShort(sprint.debut)} → {formatShort(sprint.fin)}
          {phase ? ` · ${phase.nom}` : ''}
        </span>
      </div>

      {(slip !== 0 || startSlip !== 0) && sprint.debutInitial && sprint.finInitial && (
        <p className={s.slipNote}>
          Glissement : fin {slip > 0 ? '+' : ''}
          {slip} j (initialement {formatShort(sprint.debutInitial)} →{' '}
          {formatShort(sprint.finInitial)})
        </p>
      )}

      <div>
        <h3>Objectif</h3>
        <p>{sprint.objectif || 'Pas d’objectif saisi.'}</p>
      </div>

      <div>
        <h3>KR</h3>
        <p>
          {sprint.krIds.length
            ? `${sprint.krIds.length} KR lié(s)`
            : 'Aucun KR lié. Les KR se définissent dans Cap.'}
        </p>
      </div>

      <div>
        <h3>Avancement</h3>
        <ProgressBar value={progress.ratio} label="Avancement du sprint" />
        <p className={s.muted}>
          {progress.total === 0
            ? 'Ajoute des étapes pour suivre l’avancement.'
            : `${progress.done}/${progress.total} étapes terminées (${Math.round(progress.ratio * 100)} %)`}
        </p>
      </div>

      <Select
        label="Statut"
        value={sprint.statut}
        onChange={(e) => void changeStatut(e.target.value as Statut)}
        options={STATUTS}
      />

      <StepList sprintId={sprint.id} etapes={etapes} />

      <div className={s.actions}>
        <Button variant="secondary" onClick={() => setEditing(true)}>
          Modifier le sprint
        </Button>
        <Button variant="ghost" onClick={() => void del()}>
          Supprimer
        </Button>
      </div>
    </div>
  );
}
