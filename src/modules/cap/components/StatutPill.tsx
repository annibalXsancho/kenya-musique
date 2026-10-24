import { Pill } from '@core/ui';
import type { KrStatut } from '@core/calc/kr';

/** Jamais la couleur seule : une icône et un libellé accompagnent chaque état. */
export function StatutPill({ statut }: { statut: KrStatut }) {
  if (statut === 'avance') return <Pill tone="accent">▲ En avance</Pill>;
  if (statut === 'retard') return <Pill tone="danger">▼ En retard</Pill>;
  return <Pill>● Dans les clous</Pill>;
}
