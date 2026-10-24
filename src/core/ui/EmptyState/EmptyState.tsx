import type { ReactNode } from 'react';
import s from './EmptyState.module.css';

interface Props {
  title: string;
  text?: string;
  action?: ReactNode;
}

export function EmptyState({ title, text, action }: Props) {
  return (
    <div className={s.box}>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}
