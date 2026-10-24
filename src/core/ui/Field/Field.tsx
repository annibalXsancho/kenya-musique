import { useId } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import s from './Field.module.css';

type Common = { label: string; hint?: string };
type InputProps = Common & InputHTMLAttributes<HTMLInputElement> & { multiline?: false };
type AreaProps = Common & TextareaHTMLAttributes<HTMLTextAreaElement> & { multiline: true };

export function Field(props: InputProps | AreaProps) {
  const id = useId();
  const { label, hint, multiline, ...rest } = props;
  return (
    <div className={s.field}>
      <label htmlFor={id} className={s.label}>
        {label}
      </label>
      {multiline ? (
        <textarea id={id} rows={3} className={s.control} {...(rest as AreaProps)} />
      ) : (
        <input id={id} className={s.control} {...(rest as InputProps)} />
      )}
      {hint && <span className={s.hint}>{hint}</span>}
    </div>
  );
}
