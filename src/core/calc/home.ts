import { addDays, diffDays } from '../lib/dates';

interface SprintDates {
  debut: string;
  fin: string;
}

export interface SprintDay {
  /** jour courant du sprint (1 = premier jour) */
  jour: number;
  /** durée totale en jours */
  total: number;
}

/** « Jour J / N » : `null` si aujourd'hui est hors du sprint. */
export function sprintDay(sprint: SprintDates, today: string): SprintDay | null {
  if (today < sprint.debut || today > sprint.fin) return null;
  return { jour: diffDays(sprint.debut, today) + 1, total: diffDays(sprint.debut, sprint.fin) + 1 };
}

/** Prochaine séance de l'agenda (planifiée, pas encore commencée), à partir de `now` (date-heure locale). */
export function nextSlot<T extends { debut: string; statut: string }>(
  creneaux: T[],
  now: string,
): T | undefined {
  return creneaux
    .filter((c) => c.statut === 'planifie' && c.debut.slice(0, 16) >= now.slice(0, 16))
    .sort((a, b) => a.debut.localeCompare(b.debut))[0];
}

export interface RegularityDay {
  date: string;
  /** minutes loguées ce jour-là */
  minutes: number;
}

/** Les `count` derniers jours (aujourd'hui compris), du plus ancien au plus récent, avec les minutes loguées. */
export function regularity(
  sessions: { date: string; dureeMin: number }[],
  today: string,
  count = 14,
): RegularityDay[] {
  const days = Array.from({ length: count }, (_, i) => ({
    date: addDays(today, i - (count - 1)),
    minutes: 0,
  }));
  for (const s of sessions) {
    const d = days.find((x) => x.date === s.date);
    if (d) d.minutes += s.dureeMin;
  }
  return days;
}

/** Sessions les plus récentes d'abord (date, puis création). */
export function recentSessions<T extends { date: string; createdAt: string }>(
  sessions: T[],
  n = 3,
): T[] {
  return [...sessions]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, n);
}

/** Ordre des cartes : celles listées d'abord (dans l'ordre réglé), puis les autres dans l'ordre naturel. */
export function orderCards<T extends { id: string }>(items: T[], order: string[]): T[] {
  const rank = (id: string) => {
    const i = order.indexOf(id);
    return i === -1 ? order.length : i;
  };
  return items
    .map((it, i) => ({ it, i }))
    .sort((a, b) => rank(a.it.id) - rank(b.it.id) || a.i - b.i)
    .map((x) => x.it);
}
