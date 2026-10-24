import { addDays, dayNum, fromDayNum, minutesBetween } from '../lib/dates';

/** Lundi de la semaine contenant `iso`. */
export function weekStart(iso: string): string {
  const n = dayNum(iso);
  return fromDayNum(n - ((n + 3) % 7)); // 1970-01-01 était un jeudi
}

/** Les `count` dernières semaines (lundis), la semaine en cours comprise, de la plus ancienne à la plus récente. */
export function lastWeeks(today: string, count: number): string[] {
  const current = weekStart(today);
  return Array.from({ length: count }, (_, i) => addDays(current, -7 * (count - 1 - i)));
}

export interface WeekHours {
  week: string;
  /** minutes totales de la semaine */
  total: number;
  /** dont minutes de pratique (types « pratique ») */
  pratique: number;
  /** part de pratique (0–1) ; `null` si aucune minute */
  part: number | null;
}

interface SessionHours {
  date: string;
  dureeMin: number;
  type: string;
}

export function weeklyHours(
  sessions: SessionHours[],
  weeks: string[],
  typesPratique: string[],
): WeekHours[] {
  return weeks.map((week) => {
    const end = addDays(week, 6);
    let total = 0;
    let pratique = 0;
    for (const s of sessions) {
      if (s.date < week || s.date > end) continue;
      total += s.dureeMin;
      if (typesPratique.includes(s.type)) pratique += s.dureeMin;
    }
    return { week, total, pratique, part: total > 0 ? pratique / total : null };
  });
}

/** Part de pratique sur plusieurs semaines (pondérée par les minutes) ; `null` sans aucune minute. */
export function practiceShare(weeks: WeekHours[]): number | null {
  const total = weeks.reduce((s, w) => s + w.total, 0);
  if (total === 0) return null;
  return weeks.reduce((s, w) => s + w.pratique, 0) / total;
}

export interface PlannedActual {
  week: string;
  prevu: number;
  reel: number;
}

interface Slot {
  debut: string;
  fin: string;
}

/** Prévu = toutes les séances de l'agenda de la semaine (même manquées) ; réalisé = sessions du Journal. */
export function plannedVsActual(
  creneaux: Slot[],
  sessions: { date: string; dureeMin: number }[],
  weeks: string[],
): PlannedActual[] {
  return weeks.map((week) => {
    const end = addDays(week, 7);
    let prevu = 0;
    for (const c of creneaux) {
      const day = c.debut.slice(0, 10);
      if (day >= week && day < end) prevu += minutesBetween(c.debut, c.fin);
    }
    let reel = 0;
    for (const s of sessions) if (s.date >= week && s.date < end) reel += s.dureeMin;
    return { week, prevu, reel };
  });
}
