import { addMinutes, minutesBetween, toLocalDT } from '@core/lib/dates';

interface Span {
  debut: string;
  fin: string;
  statut?: string;
}

/** Minutes planifiées dans [from, to[ (séances « non atteint » exclues, séances à cheval rognées). */
export function plannedMinutes(items: Span[], from: string, to: string): number {
  let total = 0;
  for (const c of items) {
    if (c.statut === 'non_atteint') continue;
    const start = c.debut > from ? c.debut : from;
    const end = c.fin < to ? c.fin : to;
    if (end > start) total += minutesBetween(start, end);
  }
  return total;
}

/** Prochain créneau d'une durée donnée, à l'heure pleine (ou demi-heure) suivant `now`, dans la plage 7 h – 22 h. */
export function nextFreeStart(now: Date, items: Span[], durationMin: number): string {
  const d = new Date(now);
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60);
  if (d.getHours() < 8) d.setHours(8, 0);
  for (let i = 0; i < 14 * 48; i++) {
    const start = toLocalDT(d);
    const end = addMinutes(start, durationMin);
    const h = d.getHours();
    const fits =
      h >= 8 &&
      new Date(end).getHours() + (new Date(end).getMinutes() ? 1 : 0) <= 22 &&
      end.slice(0, 10) === start.slice(0, 10);
    const busy = items.some((c) => c.statut !== 'non_atteint' && c.debut < end && c.fin > start);
    if (fits && !busy) return start;
    d.setMinutes(d.getMinutes() + 30);
  }
  return toLocalDT(d);
}

/** Durée proposée pour glisser une étape : son estimation, sinon 1 h ; une tâche : 30 min. */
export const defaultDuration = (estimationMin?: number) =>
  estimationMin && estimationMin > 0 ? Math.min(estimationMin, 240) : 60;
