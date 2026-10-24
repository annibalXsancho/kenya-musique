import { useState } from 'react';
import { Button, Field, Select } from '@core/ui';
import type { Doc } from '@core/model';
import { create } from '@core/db';
import { addMinutes, joinDT } from '@core/lib/dates';
import { nextFreeStart } from '../time';
import type { Item } from './Planifiable';
import s from '../Agenda.module.css';

const DURATIONS = [30, 45, 60, 90, 120, 180, 240];

/** Placer une étape ou une tâche sans glisser (iPhone) : jour, heure et durée, proposés au prochain créneau libre. */
export function PlaceForm({
  item,
  creneaux,
  onDone,
}: {
  item: Item;
  creneaux: Doc<'creneaux'>[];
  onDone: () => void;
}) {
  const [duree, setDuree] = useState(DURATIONS.includes(item.durationMin) ? item.durationMin : 60);
  const suggested = nextFreeStart(new Date(), creneaux, duree);
  const [day, setDay] = useState(suggested.slice(0, 10));
  const [time, setTime] = useState(suggested.slice(11, 16));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const debut = joinDT(day, time);
    await create('creneaux', {
      debut,
      fin: addMinutes(debut, duree),
      titre: item.titre,
      intention: item.intention ?? '',
      sprintId: item.sprintId,
      etapeId: item.etapeId,
    });
    onDone();
  }

  return (
    <form className={s.form} onSubmit={submit}>
      <p>
        <strong>{item.titre}</strong>
        {item.intention ? ` · ${item.intention}` : ''}
      </p>
      <Field label="Jour" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
      <div className={s.two}>
        <Field
          label="Heure"
          type="time"
          step={300}
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
        <Select
          label="Durée"
          value={String(duree)}
          onChange={(e) => setDuree(Number(e.target.value))}
          options={DURATIONS.map((d) => ({
            value: String(d),
            label: d >= 60 ? `${Math.floor(d / 60)} h${d % 60 ? ` ${d % 60}` : ''}` : `${d} min`,
          }))}
        />
      </div>
      <div className={s.actions}>
        <Button type="submit" disabled={!day || !time}>
          Planifier
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
