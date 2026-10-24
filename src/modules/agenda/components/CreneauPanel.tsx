import { useState } from 'react';
import { Button, Field, Pill, Select } from '@core/ui';
import type { Doc } from '@core/model';
import { create, remove, update } from '@core/db';
import { addMinutes, formatDuree, joinDT, minutesBetween } from '@core/lib/dates';
import s from '../Agenda.module.css';

type Creneau = Doc<'creneaux'>;

interface Props {
  /** Séance existante ; sinon `draft` donne la plage sélectionnée sur la grille. */
  creneau?: Creneau;
  draft?: { debut: string; fin: string };
  sprints: Doc<'sprints'>[];
  etapes: Doc<'etapes'>[];
  now: Date;
  onClose: () => void;
  onValidate: (id: string) => void;
}

export function CreneauPanel({ creneau, draft, sprints, etapes, now, onClose, onValidate }: Props) {
  const start = creneau?.debut ?? draft?.debut ?? '';
  const end = creneau?.fin ?? draft?.fin ?? addMinutes(start, 60);
  const [titre, setTitre] = useState(creneau?.titre ?? '');
  const [sprintId, setSprintId] = useState(creneau?.sprintId ?? '');
  const [etapeId, setEtapeId] = useState(creneau?.etapeId ?? '');
  const [day, setDay] = useState(start.slice(0, 10));
  const [from, setFrom] = useState(start.slice(11, 16));
  const [to, setTo] = useState(end.slice(11, 16));
  const [intention, setIntention] = useState(creneau?.intention ?? '');
  const [doneQuand, setDoneQuand] = useState(creneau?.doneQuand ?? '');
  const [contrainte, setContrainte] = useState(creneau?.contrainte ?? '');
  const [error, setError] = useState('');

  const debut = joinDT(day, from);
  const fin = joinDT(day, to);
  const duree = minutesBetween(debut, fin);
  const over = creneau && creneau.statut === 'planifie' && new Date(creneau.fin) <= now;
  const stepOptions = etapes.filter(
    (e) => e.sprintId === sprintId && (e.statut !== 'termine' || e.id === etapeId),
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (duree <= 0) return setError('La fin doit être après le début (même jour).');
    const data = {
      debut,
      fin,
      titre: titre.trim(),
      intention: intention.trim(),
      doneQuand: doneQuand.trim(),
      contrainte: contrainte.trim(),
      sprintId: sprintId || undefined,
      etapeId: etapeId || undefined,
    };
    if (creneau) await update('creneaux', creneau.id, data);
    else await create('creneaux', data);
    onClose();
  }

  async function setStatut(statut: Creneau['statut']) {
    if (creneau) await update('creneaux', creneau.id, { statut });
    onClose();
  }

  return (
    <div className={s.stack}>
      {creneau?.statut === 'valide' && (
        <div className={s.notice}>
          <Pill>Validée</Pill>
          <span>Cette séance est enregistrée dans le Journal.</span>
          <Button size="sm" variant="ghost" onClick={() => void setStatut('planifie')}>
            Rouvrir
          </Button>
        </div>
      )}
      {creneau?.statut === 'non_atteint' && (
        <div className={s.notice}>
          <Pill>Non atteinte</Pill>
          <span>Séance marquée comme non réalisée.</span>
          <Button size="sm" variant="ghost" onClick={() => void setStatut('planifie')}>
            Remettre à planifier
          </Button>
        </div>
      )}
      {over && creneau && (
        <div className={`${s.notice} ${s.noticeAccent}`}>
          <strong>Séance terminée : l’as-tu faite ?</strong>
          <div className={s.actions}>
            <Button onClick={() => onValidate(creneau.id)}>Valider et logger la session</Button>
            <Button variant="secondary" onClick={() => void setStatut('non_atteint')}>
              Non atteinte
            </Button>
          </div>
        </div>
      )}

      <form className={s.form} onSubmit={submit}>
        <Field
          label="Titre"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          autoFocus={!creneau}
          placeholder="Ex. Pratique, mix du morceau…"
        />
        <div className={s.two}>
          <Select
            label="Sprint"
            value={sprintId}
            onChange={(e) => {
              setSprintId(e.target.value);
              setEtapeId('');
            }}
            options={[
              { value: '', label: 'Aucun' },
              ...sprints
                .filter((p) => p.statut !== 'termine' || p.id === sprintId)
                .map((p) => ({ value: p.id, label: `S${p.numero} · ${p.sujet}` })),
            ]}
          />
          <Select
            label="Étape"
            value={etapeId}
            disabled={!sprintId}
            onChange={(e) => setEtapeId(e.target.value)}
            options={[
              { value: '', label: 'Aucune' },
              ...stepOptions.map((x) => ({ value: x.id, label: x.titre })),
            ]}
          />
        </div>
        <Field label="Jour" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        <div className={s.two}>
          <Field
            label="Début"
            type="time"
            step={300}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <Field
            label="Fin"
            type="time"
            step={300}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <p className={s.muted}>{duree > 0 ? `Durée : ${formatDuree(duree)}` : ' '}</p>
        <Field
          label="Intention"
          multiline
          value={intention}
          onChange={(e) => setIntention(e.target.value)}
          placeholder="Ce que je veux travailler"
        />
        <Field
          label="Terminé quand…"
          value={doneQuand}
          onChange={(e) => setDoneQuand(e.target.value)}
          placeholder="Condition de sortie"
          hint="Rappelée quand tu loggues la session"
        />
        <Field
          label="Contrainte"
          value={contrainte}
          onChange={(e) => setContrainte(e.target.value)}
          placeholder="Ex. au casque, 20 minutes max"
        />
        {error && (
          <p role="alert" className={s.error}>
            {error}
          </p>
        )}
        <div className={s.actions}>
          <Button type="submit">{creneau ? 'Enregistrer' : 'Ajouter la séance'}</Button>
          {creneau && (
            <Button
              variant="ghost"
              onClick={async () => {
                await remove('creneaux', creneau.id);
                onClose();
              }}
            >
              Supprimer
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
