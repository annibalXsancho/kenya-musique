/** Date locale du jour au format AAAA-MM-JJ. */
export function todayISO(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const nowISO = () => new Date().toISOString();

/** « ven. 23 oct. » */
export function formatDateFr(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/** 90 → « 1 h 30 », 45 → « 45 min ». */
export function formatDuree(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

// ── Jours entiers (AAAA-MM-JJ), calculés en UTC : aucun décalage dû à l'heure d'été ──
export const dayNum = (iso: string): number => {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
};
export const fromDayNum = (n: number): string =>
  new Date(n * 86_400_000).toISOString().slice(0, 10);
export const addDays = (iso: string, n: number): string => fromDayNum(dayNum(iso) + n);
/** Nombre de jours de `a` à `b` (positif si `b` est après `a`). */
export const diffDays = (a: string, b: string): number => dayNum(b) - dayNum(a);

/** « 12 nov. » */
export function formatShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
