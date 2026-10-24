import { describe, expect, it } from 'vitest';
import { nextSlot, orderCards, recentSessions, regularity, sprintDay } from './home';

describe('sprintDay', () => {
  const sp = { debut: '2026-10-19', fin: '2026-11-01' };
  it('compte le jour courant', () => {
    expect(sprintDay(sp, '2026-10-19')).toEqual({ jour: 1, total: 14 });
    expect(sprintDay(sp, '2026-11-01')).toEqual({ jour: 14, total: 14 });
  });
  it('null hors du sprint', () => {
    expect(sprintDay(sp, '2026-10-18')).toBeNull();
    expect(sprintDay(sp, '2026-11-02')).toBeNull();
  });
});

describe('nextSlot', () => {
  const c = (debut: string, statut = 'planifie') => ({ debut, statut });
  it('prend la première séance planifiée à venir', () => {
    const list = [c('2026-10-26T18:00:00'), c('2026-10-24T09:00:00'), c('2026-10-25T10:00:00')];
    expect(nextSlot(list, '2026-10-24T12:00:00')?.debut).toBe('2026-10-25T10:00:00');
  });
  it('ignore validées et manquées', () => {
    expect(nextSlot([c('2026-10-25T10:00:00', 'valide')], '2026-10-24T12:00:00')).toBeUndefined();
  });
});

describe('regularity', () => {
  it('14 jours, cumul par jour', () => {
    const r = regularity(
      [
        { date: '2026-10-24', dureeMin: 30 },
        { date: '2026-10-24', dureeMin: 20 },
        { date: '2026-10-10', dureeMin: 60 },
        { date: '2026-10-09', dureeMin: 60 },
      ],
      '2026-10-24',
    );
    expect(r).toHaveLength(14);
    expect(r[0].date).toBe('2026-10-11');
    expect(r[13]).toEqual({ date: '2026-10-24', minutes: 50 });
    expect(r.filter((d) => d.minutes > 0)).toHaveLength(1);
  });
});

describe('recentSessions', () => {
  it('trie du plus récent et limite', () => {
    const s = ['2026-10-01', '2026-10-03', '2026-10-02', '2026-10-04'].map((date) => ({
      date,
      createdAt: date,
    }));
    expect(recentSessions(s).map((x) => x.date)).toEqual([
      '2026-10-04',
      '2026-10-03',
      '2026-10-02',
    ]);
  });
});

describe('orderCards', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  it("respecte l'ordre réglé, les inconnus à la suite", () => {
    expect(orderCards(items, ['c', 'a']).map((x) => x.id)).toEqual(['c', 'a', 'b']);
    expect(orderCards(items, []).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });
});
