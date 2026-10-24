import type { ReactNode } from 'react';
import s from './Pill.module.css';

/** Statut. Accent = en cours ; gris = le reste ; pointillés = backlog (§9). */
export function Pill({
  tone = 'neutral',
  children,
}: {
  tone?: 'accent' | 'neutral' | 'backlog';
  children: ReactNode;
}) {
  return <span className={`${s.pill} ${s[tone]}`}>{children}</span>;
}
