import { describe, expect, it } from 'vitest';
import { assignLanes, computeRange, monthsIn, widthOf, xOf } from './timeline';

describe('frise', () => {
  it('la période couvre des mois entiers et au moins ~5 mois depuis aujourd’hui', () => {
    const r = computeRange(['2026-10-12'], '2026-10-24');
    expect(r.start).toBe('2026-10-01');
    expect(r.end >= '2027-03-22').toBe(true);
    expect(
      r.end.endsWith('-31') ||
        r.end.endsWith('-30') ||
        r.end.endsWith('-28') ||
        r.end.endsWith('-29'),
    ).toBe(true);
  });
  it('inclut un élément plus ancien ou plus lointain', () => {
    const r = computeRange(['2026-06-15', '2028-01-10'], '2026-10-24');
    expect(r.start).toBe('2026-06-01');
    expect(r.end).toBe('2028-01-31');
  });
  it('découpe en mois avec offsets et durées exacts (année bissextile comprise)', () => {
    const m = monthsIn('2027-12-01', '2028-03-31');
    expect(m.map((x) => [x.key, x.offsetDays, x.days])).toEqual([
      ['2027-12', 0, 31],
      ['2028-01', 31, 31],
      ['2028-02', 62, 29],
      ['2028-03', 91, 31],
    ]);
  });
  it('couloirs : pas de chevauchement sur une même ligne, réutilisation des lignes libres', () => {
    const items = [
      { id: 'a', debut: '2026-10-01', fin: '2026-10-14' },
      { id: 'b', debut: '2026-10-10', fin: '2026-10-20' },
      { id: 'c', debut: '2026-10-15', fin: '2026-10-30' },
    ];
    const lanes = Object.fromEntries(assignLanes(items).map((x) => [x.item.id, x.lane]));
    expect(lanes).toEqual({ a: 0, b: 1, c: 0 });
  });
  it('un sprint qui commence le lendemain de la fin d’un autre reste sur la même ligne', () => {
    const l = assignLanes([
      { debut: '2026-10-01', fin: '2026-10-07' },
      { debut: '2026-10-08', fin: '2026-10-14' },
    ]);
    expect(l.map((x) => x.lane)).toEqual([0, 0]);
  });
  it('pixels : largeur inclusive', () => {
    expect(xOf('2026-10-03', '2026-10-01', 8)).toBe(16);
    expect(widthOf('2026-10-01', '2026-10-14', 8)).toBe(112);
  });
});
