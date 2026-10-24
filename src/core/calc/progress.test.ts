import { describe, expect, it } from 'vitest';
import { sprintProgress, stepRatio } from './progress';

describe('stepRatio', () => {
  it('terminée = 100 %, sinon part des tâches faites, sans tâche = 0 %', () => {
    expect(stepRatio({ statut: 'termine', taches: [] })).toBe(1);
    expect(stepRatio({ statut: 'termine', taches: [{ fait: false }] })).toBe(1);
    expect(stepRatio({ statut: 'en_cours', taches: [{ fait: true }, { fait: false }] })).toBe(0.5);
    expect(stepRatio({ statut: 'backlog', taches: [] })).toBe(0);
  });
});

describe('sprintProgress', () => {
  it('moyenne des étapes : une étape terminée sans tâche compte autant qu’une autre', () => {
    const p = sprintProgress([
      { statut: 'termine', taches: [] },
      { statut: 'planifie', taches: [] },
      { statut: 'en_cours', taches: [{ fait: true }, { fait: false }, { fait: false }] },
      { statut: 'planifie', taches: [] },
    ]);
    expect(p.done).toBe(1);
    expect(p.total).toBe(4);
    expect(p.ratio).toBeCloseTo((1 + 0 + 1 / 3 + 0) / 4, 5);
  });
  it('tout terminé = 100 %', () => {
    expect(
      sprintProgress([
        { statut: 'termine', taches: [] },
        { statut: 'termine', taches: [] },
      ]).ratio,
    ).toBe(1);
  });
  it('sprint sans étape : 0 %', () => {
    expect(sprintProgress([])).toEqual({ done: 0, total: 0, ratio: 0 });
  });
});
