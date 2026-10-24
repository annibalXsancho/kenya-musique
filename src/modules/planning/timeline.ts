import { addDays, dayNum, diffDays, fromDayNum } from '@core/lib/dates';

/** Géométrie de la frise : tout est calculé en jours entiers, puis converti en pixels. */

const monthStart = (iso: string) => `${iso.slice(0, 7)}-01`;
const monthEnd = (iso: string) => {
  const [y, m] = iso.split('-').map(Number);
  return fromDayNum(Math.round(Date.UTC(y, m, 1) / 86_400_000) - 1);
};

/** Période affichée : du 1er du mois le plus ancien à la fin du mois le plus tardif, au moins `minDays` jours autour d'aujourd'hui. */
export function computeRange(
  dates: string[],
  today: string,
  minDays = 150,
): { start: string; end: string } {
  const sorted = [...dates, today].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const wanted = addDays(today, minDays);
  return { start: monthStart(first), end: monthEnd(last > wanted ? last : wanted) };
}

export interface MonthCell {
  key: string;
  label: string;
  offsetDays: number;
  days: number;
}

export function monthsIn(start: string, end: string): MonthCell[] {
  const out: MonthCell[] = [];
  let cur = monthStart(start);
  while (cur <= end) {
    const last = monthEnd(cur);
    const [y, m] = cur.split('-').map(Number);
    out.push({
      key: cur.slice(0, 7),
      label: new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }),
      offsetDays: diffDays(start, cur),
      days: diffDays(cur, last) + 1,
    });
    cur = addDays(last, 1);
  }
  return out;
}

/** Couloirs : deux sprints qui se chevauchent ne sont jamais sur la même ligne. */
export function assignLanes<T extends { debut: string; fin: string }>(
  items: T[],
): { item: T; lane: number }[] {
  const laneEnd: number[] = [];
  return [...items]
    .sort((a, b) => a.debut.localeCompare(b.debut) || a.fin.localeCompare(b.fin))
    .map((item) => {
      const s = dayNum(item.debut);
      let lane = laneEnd.findIndex((end) => end < s);
      if (lane === -1) lane = laneEnd.length;
      laneEnd[lane] = dayNum(item.fin);
      return { item, lane };
    });
}

/** Position horizontale (px) d'un jour, et largeur d'un intervalle inclusif. */
export const xOf = (iso: string, start: string, ppd: number) => diffDays(start, iso) * ppd;
export const widthOf = (debut: string, fin: string, ppd: number) =>
  (diffDays(debut, fin) + 1) * ppd;
