import { describe, expect, it } from 'vitest';
import { parsePeriode, periodeOptions } from './period';
import { krPlanned, krSeries, krStatus, krValue } from './kr';
import { lastWeeks, plannedVsActual, practiceShare, weekStart, weeklyHours } from './hours';
import { sprintSlips } from './slip';

describe('parsePeriode', () => {
  it('trimestres, semestres, année', () => {
    expect(parsePeriode('T4 2026')).toEqual({ start: '2026-10-01', end: '2026-12-31' });
    expect(parsePeriode('t1 2028')).toEqual({ start: '2028-01-01', end: '2028-03-31' });
    expect(parsePeriode('T1 2028')?.end).toBe('2028-03-31');
    expect(parsePeriode('S2 2026')).toEqual({ start: '2026-07-01', end: '2026-12-31' });
    expect(parsePeriode('2027')).toEqual({ start: '2027-01-01', end: '2027-12-31' });
    expect(parsePeriode('T2 2028')).toEqual({ start: '2028-04-01', end: '2028-06-30' });
  });
  it('février bissextile', () => {
    expect(parsePeriode('T1 2028')?.end).toBe('2028-03-31');
    expect(parsePeriode('S1 2028')?.end).toBe('2028-06-30');
  });
  it('format inconnu → null', () => {
    expect(parsePeriode('printemps')).toBeNull();
    expect(parsePeriode('T5 2026')).toBeNull();
  });
  it('options : 3 années de trimestres + années', () => {
    const o = periodeOptions(2026);
    expect(o).toHaveLength(15);
    expect(o.every((p) => parsePeriode(p))).toBe(true);
  });
});

describe('krValue', () => {
  const sessions = [
    {
      date: '2026-10-05',
      contributions: [
        { krId: 'a', n: 1 },
        { krId: 'b', n: 5 },
      ],
    },
    { date: '2026-10-20', contributions: [{ krId: 'a', n: 2 }] },
  ];
  it('somme des contributions du KR', () => {
    expect(krValue({ id: 'a', mode: 'sessions', cible: 10 }, sessions)).toBe(3);
    expect(krValue({ id: 'b', mode: 'sessions', cible: 10 }, sessions)).toBe(5);
    expect(krValue({ id: 'zz', mode: 'sessions', cible: 10 }, sessions)).toBe(0);
  });
  it('borné dans le temps', () => {
    expect(krValue({ id: 'a', mode: 'sessions', cible: 10 }, sessions, { to: '2026-10-10' })).toBe(
      1,
    );
  });
  it('borné au début de la période : les sessions plus anciennes ne comptent pas', () => {
    expect(
      krValue({ id: 'a', mode: 'sessions', cible: 10 }, sessions, { from: '2026-10-10' }),
    ).toBe(2);
    expect(
      krValue({ id: 'a', mode: 'sessions', cible: 10 }, sessions, {
        from: '2026-10-05',
        to: '2026-10-05',
      }),
    ).toBe(1);
  });
  it('mode manuel : la valeur saisie, les sessions sont ignorées', () => {
    expect(krValue({ id: 'a', mode: 'manuel', cible: 10, valeurManuelle: 7 }, sessions)).toBe(7);
    expect(krValue({ id: 'a', mode: 'manuel', cible: 10 }, sessions)).toBe(0);
  });
});

describe('krPlanned / krStatus', () => {
  const [s, e] = ['2026-10-01', '2026-12-31'];
  it('trajectoire linéaire, bornée', () => {
    expect(krPlanned(92, s, e, '2026-09-15')).toBe(0);
    expect(krPlanned(92, s, e, '2027-01-15')).toBe(92);
    expect(krPlanned(92, s, e, '2026-11-15')).toBeCloseTo(92 * (46 / 92), 5); // 46e jour sur 92
    expect(krPlanned(92, s, e, '2026-12-31')).toBe(92);
  });
  it('±10 % : dans les clous ; au-delà : avance / retard', () => {
    expect(krStatus(10, 10).statut).toBe('clous');
    expect(krStatus(9.1, 10).statut).toBe('clous');
    expect(krStatus(10.9, 10).statut).toBe('clous');
    expect(krStatus(11.1, 10).statut).toBe('avance');
    expect(krStatus(8.9, 10).statut).toBe('retard');
  });
  it('écart et pourcentage', () => {
    const r = krStatus(6, 10);
    expect(r.ecart).toBe(-4);
    expect(r.ecartPct).toBeCloseTo(-0.4);
  });
  it('rien de prévu : pas de pourcentage, jamais en retard', () => {
    expect(krStatus(0, 0)).toEqual({ statut: 'clous', ecart: 0, ecartPct: null });
    expect(krStatus(2, 0).statut).toBe('avance');
  });
});

describe('krSeries', () => {
  it('courbe prévue complète, réelle jusqu’à aujourd’hui seulement, cumulative', () => {
    const kr = { id: 'a', mode: 'sessions' as const, cible: 10 };
    const sessions = [
      { date: '2026-09-20', contributions: [{ krId: 'a', n: 5 }] }, // avant la période : ignorée
      { date: '2026-10-03', contributions: [{ krId: 'a', n: 2 }] },
      { date: '2026-10-20', contributions: [{ krId: 'a', n: 1 }] },
    ];
    const pts = krSeries(kr, sessions, '2026-10-01', '2026-12-31', '2026-10-24');
    expect(pts[0].date).toBe('2026-10-01');
    expect(pts[pts.length - 1]).toMatchObject({ date: '2026-12-31', prevu: 10 });
    expect(pts[pts.length - 1].reel).toBeUndefined();
    const today = pts.find((p) => p.date === '2026-10-24')!;
    expect(today.reel).toBe(3);
    expect(pts.find((p) => p.date === '2026-10-08')!.reel).toBe(2);
    const reels = pts.filter((p) => p.reel !== undefined).map((p) => p.reel!);
    expect([...reels].sort((a, b) => a - b)).toEqual(reels); // jamais décroissante
  });
});

describe('semaines et heures', () => {
  it('lundi de la semaine', () => {
    expect(weekStart('2026-10-24')).toBe('2026-10-19'); // samedi
    expect(weekStart('2026-10-19')).toBe('2026-10-19'); // lundi
    expect(weekStart('2026-10-25')).toBe('2026-10-19'); // dimanche
    expect(weekStart('2026-10-26')).toBe('2026-10-26');
  });
  it('dernières semaines, la plus récente en dernier', () => {
    expect(lastWeeks('2026-10-24', 3)).toEqual(['2026-10-05', '2026-10-12', '2026-10-19']);
  });
  const sessions = [
    { date: '2026-10-19', dureeMin: 90, type: 'pratique' },
    { date: '2026-10-21', dureeMin: 60, type: 'veille' },
    { date: '2026-10-25', dureeMin: 30, type: 'production' },
    { date: '2026-10-26', dureeMin: 120, type: 'pratique' },
  ];
  it('minutes et part de pratique par semaine, dimanche compris', () => {
    const w = weeklyHours(sessions, ['2026-10-19', '2026-10-26'], ['pratique', 'production']);
    expect(w[0]).toMatchObject({ total: 180, pratique: 120 });
    expect(w[0].part).toBeCloseTo(2 / 3);
    expect(w[1]).toMatchObject({ total: 120, pratique: 120, part: 1 });
  });
  it('semaine vide : part nulle (pas 0 %)', () => {
    expect(weeklyHours([], ['2026-10-19'], ['pratique'])[0]).toEqual({
      week: '2026-10-19',
      total: 0,
      pratique: 0,
      part: null,
    });
  });
  it('part sur plusieurs semaines pondérée par les minutes', () => {
    const w = weeklyHours(sessions, ['2026-10-19', '2026-10-26'], ['pratique', 'production']);
    expect(practiceShare(w)).toBeCloseTo(240 / 300);
    expect(practiceShare(weeklyHours([], ['2026-10-19'], ['pratique']))).toBeNull();
  });
  it('prévu (agenda, même manqué) vs réalisé (journal)', () => {
    const pv = plannedVsActual(
      [
        { debut: '2026-10-20T18:00:00', fin: '2026-10-20T19:30:00' },
        { debut: '2026-10-25T10:00:00', fin: '2026-10-25T11:00:00' },
        { debut: '2026-10-26T10:00:00', fin: '2026-10-26T12:00:00' },
      ],
      sessions,
      ['2026-10-19', '2026-10-26'],
    );
    expect(pv).toEqual([
      { week: '2026-10-19', prevu: 150, reel: 180 },
      { week: '2026-10-26', prevu: 120, reel: 120 },
    ]);
  });
});

describe('sprintSlips', () => {
  const base = { id: 'x', numero: 1, sujet: 's', debut: '2026-10-01', fin: '2026-10-14' };
  it('fin repoussée par rapport à la fin gelée', () => {
    const r = sprintSlips(
      [
        {
          ...base,
          statut: 'en_cours',
          debutInitial: '2026-10-01',
          finInitial: '2026-10-10',
          fin: '2026-10-15',
        },
      ],
      '2026-10-12',
    );
    expect(r).toMatchObject([{ finDays: 5, overdueDays: 0 }]);
  });
  it('échéance dépassée sur un sprint non terminé', () => {
    expect(sprintSlips([{ ...base, statut: 'en_cours' }], '2026-10-20')[0].overdueDays).toBe(6);
  });
  it('ni terminé ni backlog ne comptent comme dépassés', () => {
    expect(
      sprintSlips(
        [
          { ...base, statut: 'termine' },
          { ...base, id: 'y', statut: 'backlog' },
        ],
        '2026-10-20',
      ),
    ).toEqual([]);
  });
  it('tri : le pire d’abord', () => {
    const r = sprintSlips(
      [
        {
          ...base,
          id: 'a',
          statut: 'en_cours',
          debutInitial: base.debut,
          finInitial: '2026-10-12',
        },
        {
          ...base,
          id: 'b',
          statut: 'en_cours',
          debutInitial: base.debut,
          finInitial: '2026-10-01',
        },
      ],
      '2026-10-10',
    );
    expect(r.map((x) => x.id)).toEqual(['b', 'a']);
  });
});
