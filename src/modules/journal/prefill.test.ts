import { describe, expect, it } from 'vitest';
import type { Doc } from '@core/model';
import { sessionFromCreneau } from './prefill';

const base = {
  id: 'abcdefghij01234',
  createdAt: '2026-10-24T10:00:00.000Z',
  updatedAt: '2026-10-24T10:00:00.000Z',
  deleted: false,
  debut: '2026-10-24T18:00:00',
  fin: '2026-10-24T19:30:00',
  titre: 'Pratique',
  intention: '',
  doneQuand: 'II-V-I sans erreur',
  contrainte: '',
  krIds: [],
  statut: 'planifie',
} as Doc<'creneaux'>;

describe('sessionFromCreneau', () => {
  it('reprend date, durée, sprint, étape et lie la séance', () => {
    const s = sessionFromCreneau({
      ...base,
      sprintId: 'sprint000000001',
      etapeId: 'etape00000001x',
    });
    expect(s).toMatchObject({
      date: '2026-10-24',
      dureeMin: 90,
      sprintId: 'sprint000000001',
      etapeId: 'etape00000001x',
      creneauId: base.id,
    });
  });
  it('l’intention retombe sur le titre ; la condition prévue est conservée', () => {
    expect(sessionFromCreneau(base).intention).toBe('Pratique');
    expect(sessionFromCreneau({ ...base, intention: 'Autumn Leaves' }).intention).toBe(
      'Autumn Leaves',
    );
    expect(sessionFromCreneau(base).doneQuand).toBe('II-V-I sans erreur');
  });
});
