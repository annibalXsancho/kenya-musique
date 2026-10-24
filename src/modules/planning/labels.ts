export type Statut = 'backlog' | 'planifie' | 'en_cours' | 'termine';

export const STATUTS: { value: Statut; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'planifie', label: 'Planifié' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine', label: 'Terminé' },
];

export const statutLabel = (s: string) => STATUTS.find((x) => x.value === s)?.label ?? s;

/** Accent pour « en cours », pointillés pour « backlog », gris pour le reste (§9). */
export const statutTone = (s: string) =>
  s === 'en_cours' ? 'accent' : s === 'backlog' ? 'backlog' : 'neutral';

export const ETAPES_TYPES = ['Cartographie', 'Priorisation et niveaux', 'Pratique', 'REX'];
