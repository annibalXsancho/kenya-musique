import { describe, expect, it } from 'vitest';
import { defaultDuration, nextFreeStart, plannedMinutes } from './time';

const c = (debut: string, fin: string, statut = 'planifie') => ({ debut, fin, statut });

describe('plannedMinutes', () => {
  const week = ['2026-10-19T00:00:00', '2026-10-26T00:00:00'] as const;
  it('additionne les séances de la période', () => {
    expect(
      plannedMinutes(
        [
          c('2026-10-20T18:00:00', '2026-10-20T19:30:00'),
          c('2026-10-22T09:00:00', '2026-10-22T10:00:00'),
        ],
        ...week,
      ),
    ).toBe(150);
  });
  it('exclut les séances « non atteint »', () => {
    expect(
      plannedMinutes([c('2026-10-20T18:00:00', '2026-10-20T19:00:00', 'non_atteint')], ...week),
    ).toBe(0);
  });
  it('rogne une séance à cheval sur la période', () => {
    expect(plannedMinutes([c('2026-10-18T23:00:00', '2026-10-19T01:00:00')], ...week)).toBe(60);
    expect(plannedMinutes([c('2026-10-25T23:00:00', '2026-10-26T02:00:00')], ...week)).toBe(60);
  });
  it('compte les séances validées', () => {
    expect(
      plannedMinutes([c('2026-10-20T18:00:00', '2026-10-20T19:00:00', 'valide')], ...week),
    ).toBe(60);
  });
});

describe('nextFreeStart', () => {
  it('arrondit à la prochaine demi-heure', () => {
    expect(nextFreeStart(new Date(2026, 9, 24, 14, 10), [], 60)).toBe('2026-10-24T14:30:00');
    expect(nextFreeStart(new Date(2026, 9, 24, 14, 40), [], 60)).toBe('2026-10-24T15:00:00');
  });
  it('saute les séances existantes', () => {
    const busy = [c('2026-10-24T14:30:00', '2026-10-24T16:00:00')];
    expect(nextFreeStart(new Date(2026, 9, 24, 14, 10), busy, 60)).toBe('2026-10-24T16:00:00');
  });
  it('passe au lendemain matin si la journée est pleine', () => {
    expect(nextFreeStart(new Date(2026, 9, 24, 21, 40), [], 60)).toBe('2026-10-25T08:00:00');
  });
  it('commence à 8 h le matin tôt', () => {
    expect(nextFreeStart(new Date(2026, 9, 24, 5, 0), [], 60)).toBe('2026-10-24T08:00:00');
  });
});

describe('defaultDuration', () => {
  it('estimation de l’étape, plafonnée ; sinon 1 h', () => {
    expect(defaultDuration(90)).toBe(90);
    expect(defaultDuration(600)).toBe(240);
    expect(defaultDuration(undefined)).toBe(60);
    expect(defaultDuration(0)).toBe(60);
  });
});
