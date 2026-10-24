import type { ReactNode } from 'react';
import { Card } from '../Card/Card';
import s from './Tile.module.css';

interface Props {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  children?: ReactNode;
}

/** Chiffre clé : étiquette, grande valeur, précision optionnelle. */
export function Tile({ label, value, hint, children }: Props) {
  return (
    <Card>
      <div className={s.label}>{label}</div>
      <div className={s.value}>{value}</div>
      {hint && <div className={s.hint}>{hint}</div>}
      {children}
    </Card>
  );
}
