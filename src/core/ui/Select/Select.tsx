import { useId } from 'react';
import type { SelectHTMLAttributes } from 'react';
import s from '../Field/Field.module.css';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, ...rest }: Props) {
  const id = useId();
  return (
    <div className={s.field}>
      <label htmlFor={id} className={s.label}>
        {label}
      </label>
      <select id={id} className={s.control} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
