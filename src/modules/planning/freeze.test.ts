import { describe, expect, it } from 'vitest';
import { freezePatch } from './components/SprintPanel';

describe('gel des dates initiales', () => {
  it('au premier passage « en cours », fige début et fin', () => {
    expect(freezePatch({}, 'en_cours', '2026-10-12', '2026-10-26')).toEqual({
      debutInitial: '2026-10-12',
      finInitial: '2026-10-26',
    });
  });
  it('ne regèle jamais : le glissement se mesure toujours contre les premières dates', () => {
    const frozen = { debutInitial: '2026-10-12', finInitial: '2026-10-26' };
    expect(freezePatch(frozen, 'en_cours', '2026-10-12', '2026-11-02')).toEqual({});
  });
  it('rien tant que le sprint n’est pas en cours', () => {
    expect(freezePatch({}, 'planifie', '2026-10-12', '2026-10-26')).toEqual({});
    expect(freezePatch({}, 'backlog', '2026-10-12', '2026-10-26')).toEqual({});
  });
});
