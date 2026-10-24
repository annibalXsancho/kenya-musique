import { addDays } from '../lib/dates';

export interface Period {
  start: string;
  end: string;
}

/** « T4 2026 » → 1er oct. – 31 déc. ; « S1 2026 » → semestre ; « 2026 » → année. `null` si le format est inconnu. */
export function parsePeriode(p: string): Period | null {
  const s = p.trim().toUpperCase();
  let m = /^T([1-4])\s+(\d{4})$/.exec(s);
  if (m) {
    const q = Number(m[1]);
    const y = Number(m[2]);
    return span(y, (q - 1) * 3 + 1, 3);
  }
  m = /^S([12])\s+(\d{4})$/.exec(s);
  if (m) return span(Number(m[2]), (Number(m[1]) - 1) * 6 + 1, 6);
  m = /^(\d{4})$/.exec(s);
  if (m) return span(Number(m[1]), 1, 12);
  return null;
}

function span(year: number, firstMonth: number, months: number): Period {
  const pad = (n: number) => String(n).padStart(2, '0');
  const start = `${year}-${pad(firstMonth)}-01`;
  const nextMonth = firstMonth + months;
  const next =
    nextMonth > 12 ? `${year + 1}-${pad(nextMonth - 12)}-01` : `${year}-${pad(nextMonth)}-01`;
  return { start, end: addDays(next, -1) };
}

/** Périodes proposées dans les formulaires : trimestres et année, de l'an dernier à l'an prochain. */
export function periodeOptions(year: number): string[] {
  const out: string[] = [];
  for (const y of [year - 1, year, year + 1]) {
    for (let q = 1; q <= 4; q++) out.push(`T${q} ${y}`);
    out.push(String(y));
  }
  return out;
}
