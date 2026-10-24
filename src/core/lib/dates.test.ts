import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMinutes,
  diffDays,
  formatDuree,
  joinDT,
  minutesBetween,
  toLocalDT,
  todayISO,
} from './dates';

describe('dates', () => {
  it('jours entiers : pas de décalage autour du changement d’heure', () => {
    expect(diffDays('2026-10-24', '2026-10-26')).toBe(2); // fin de l'heure d'été en Europe : 25 oct. 2026
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
  it('date-heure locale aller-retour', () => {
    const dt = toLocalDT(new Date(2026, 9, 24, 18, 5));
    expect(dt).toBe('2026-10-24T18:05:00');
    expect(joinDT('2026-10-24', '18:05')).toBe(dt);
    expect(joinDT('2026-10-24', '18:05:00')).toBe(dt);
  });
  it('minutes entre deux dates-heures', () => {
    expect(minutesBetween('2026-10-24T18:00:00', '2026-10-24T19:30:00')).toBe(90);
    expect(addMinutes('2026-10-24T23:30:00', 45)).toBe('2026-10-25T00:15:00');
  });
  it('formats', () => {
    expect(formatDuree(90)).toBe('1 h 30');
    expect(formatDuree(45)).toBe('45 min');
    expect(todayISO(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
