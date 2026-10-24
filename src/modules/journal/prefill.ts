import type { Doc } from '@core/model';
import { minutesBetween } from '@core/lib/dates';

/** Valeurs d'une session pré-remplie à partir d'une séance de l'agenda (« Valider »). */
export function sessionFromCreneau(c: Doc<'creneaux'>) {
  return {
    date: c.debut.slice(0, 10),
    dureeMin: Math.max(1, minutesBetween(c.debut, c.fin)),
    intention: c.intention || c.titre,
    sprintId: c.sprintId,
    etapeId: c.etapeId,
    creneauId: c.id,
    doneQuand: c.doneQuand,
  };
}
