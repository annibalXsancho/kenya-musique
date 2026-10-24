export const num = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
export const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${num(Math.abs(n))}`;
export const pct = (r: number) =>
  `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.round(Math.abs(r) * 100)} %`;
