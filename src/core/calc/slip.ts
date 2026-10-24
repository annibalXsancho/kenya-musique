import { diffDays } from '../lib/dates';

interface SprintLike {
  id: string;
  numero: number;
  sujet: string;
  statut: string;
  debut: string;
  fin: string;
  debutInitial?: string;
  finInitial?: string;
}

export interface Slip {
  id: string;
  numero: number;
  sujet: string;
  /** jours de décalage de la fin par rapport à la fin initiale (> 0 = retard) */
  finDays: number;
  /** jours de dépassement : sprint non terminé dont la fin est passée */
  overdueDays: number;
}

/** Sprints qui dérivent : fin repoussée par rapport aux dates gelées, ou échéance dépassée. Tri : le pire d'abord. */
export function sprintSlips(sprints: SprintLike[], today: string): Slip[] {
  const out: Slip[] = [];
  for (const s of sprints) {
    const finDays = s.finInitial ? diffDays(s.finInitial, s.fin) : 0;
    const overdueDays =
      s.statut !== 'termine' && s.statut !== 'backlog' && today > s.fin
        ? diffDays(s.fin, today)
        : 0;
    if (finDays !== 0 || overdueDays > 0)
      out.push({ id: s.id, numero: s.numero, sujet: s.sujet, finDays, overdueDays });
  }
  return out.sort(
    (a, b) => Math.max(b.finDays, b.overdueDays) - Math.max(a.finDays, a.overdueDays),
  );
}
