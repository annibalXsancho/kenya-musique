import type { ButtonHTMLAttributes } from 'react';
import s from './Button.module.css';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'sm';
}

export function Button({ variant = 'primary', size = 'md', className, ...rest }: Props) {
  return (
    <button
      type="button"
      className={[s.button, s[variant], s[size], className].filter(Boolean).join(' ')}
      {...rest}
    />
  );
}
