import s from '../Cap.module.css';

interface Props {
  /** 0 → 1 */
  value: number;
  /** repère « prévu », 0 → 1 */
  planned?: number;
  danger?: boolean;
  label: string;
}

/** Jauge : la couleur du remplissage porte la gravité ; le repère gris est la trajectoire prévue. */
export function Meter({ value, planned, danger, label }: Props) {
  const v = Math.min(1, Math.max(0, value));
  return (
    <div
      className={s.meter}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
    >
      <div
        className={danger ? `${s.meterFill} ${s.meterDanger}` : s.meterFill}
        style={{ width: `${v * 100}%` }}
      />
      {planned !== undefined && (
        <div
          className={s.meterTick}
          style={{ left: `${Math.min(1, Math.max(0, planned)) * 100}%` }}
          title="Prévu"
        />
      )}
    </div>
  );
}
