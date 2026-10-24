export interface StepLike {
  statut: string;
  taches: { fait: boolean }[];
}

/** Avancement d'une étape : terminée = 100 % ; sinon part des tâches faites ; sans tâche = 0 %. */
export const stepRatio = (e: StepLike): number => {
  if (e.statut === 'termine') return 1;
  if (e.taches.length === 0) return 0;
  return e.taches.filter((t) => t.fait).length / e.taches.length;
};

export interface Progress {
  /** Étapes terminées / étapes totales */
  done: number;
  total: number;
  /** Moyenne de l'avancement des étapes, de 0 à 1 */
  ratio: number;
}

/** Avancement d'un sprint : moyenne de l'avancement de ses étapes (une étape pèse autant qu'une autre). */
export function sprintProgress(etapes: StepLike[]): Progress {
  const total = etapes.length;
  if (total === 0) return { done: 0, total: 0, ratio: 0 };
  return {
    done: etapes.filter((e) => e.statut === 'termine').length,
    total,
    ratio: etapes.reduce((sum, e) => sum + stepRatio(e), 0) / total,
  };
}
