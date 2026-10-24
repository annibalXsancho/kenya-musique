import { addDays, diffDays } from '../lib/dates';

export interface KrLike {
  id: string;
  mode: 'sessions' | 'manuel';
  cible: number;
  valeurManuelle?: number;
}

export interface SessionLike {
  date: string;
  contributions: { krId: string; n: number }[];
}

/**
 * Valeur atteinte : somme des contributions des sessions, ou valeur saisie à la main.
 * `from` / `to` bornent dans le temps : un KR ne compte que les sessions de la période de son objectif.
 */
export function krValue(
  kr: KrLike,
  sessions: SessionLike[],
  range: { from?: string; to?: string } = {},
): number {
  if (kr.mode === 'manuel') return kr.valeurManuelle ?? 0;
  let total = 0;
  for (const s of sessions) {
    if (range.to && s.date > range.to) continue;
    if (range.from && s.date < range.from) continue;
    for (const c of s.contributions) if (c.krId === kr.id) total += c.n;
  }
  return total;
}

/** Trajectoire prévue : linéaire de 0 (début de période) à la cible (fin de période). */
export function krPlanned(cible: number, start: string, end: string, today: string): number {
  if (today <= start) return 0;
  if (today >= end) return cible;
  return (cible * (diffDays(start, today) + 1)) / (diffDays(start, end) + 1);
}

export type KrStatut = 'avance' | 'clous' | 'retard';

export interface KrStatus {
  statut: KrStatut;
  /** réel − prévu, dans l'unité du KR */
  ecart: number;
  /** écart relatif au prévu ; `null` tant que rien n'est prévu */
  ecartPct: number | null;
}

/** Dans les clous = à ±10 % du prévu ; au-dessus : en avance ; en dessous : en retard. */
export function krStatus(actual: number, planned: number, tolerance = 0.1): KrStatus {
  const ecart = actual - planned;
  if (planned <= 0) return { statut: actual > 0 ? 'avance' : 'clous', ecart, ecartPct: null };
  const ratio = actual / planned;
  const statut: KrStatut =
    ratio > 1 + tolerance ? 'avance' : ratio < 1 - tolerance ? 'retard' : 'clous';
  return { statut, ecart, ecartPct: ecart / planned };
}

export interface KrPoint {
  date: string;
  prevu: number;
  /** absent après aujourd'hui */
  reel?: number;
}

/** Courbes réel vs prévu, un point par semaine (+ début, aujourd'hui et fin de période). */
export function krSeries(
  kr: KrLike,
  sessions: SessionLike[],
  start: string,
  end: string,
  today: string,
): KrPoint[] {
  const dates = new Set<string>([start, end]);
  for (let d = start; d <= end; d = addDays(d, 7)) dates.add(d);
  if (today > start && today < end) dates.add(today);
  return [...dates].sort().map((date) => ({
    date,
    prevu: round(krPlanned(kr.cible, start, end, date)),
    ...(date <= today
      ? {
          reel: round(
            kr.mode === 'manuel' && date < today
              ? 0
              : krValue(kr, sessions, { from: start, to: date }),
          ),
        }
      : {}),
  }));
}

const round = (n: number) => Math.round(n * 100) / 100;
