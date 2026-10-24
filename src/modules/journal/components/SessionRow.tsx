import { Pill } from '@core/ui';
import { formatDateFr, formatDuree } from '@core/lib/dates';
import type { Session } from '@core/model';
import s from '../Journal.module.css';

export function SessionRow({ session, onOpen }: { session: Session; onOpen: () => void }) {
  return (
    <button type="button" className={s.row} onClick={onOpen}>
      <span className={s.date}>{formatDateFr(session.date)}</span>
      <span className={s.main}>
        <span className={s.intention}>{session.intention || 'Sans intention'}</span>
        <span className={s.meta}>
          {formatDuree(session.dureeMin)} · {session.type}
        </span>
      </span>
      {!session.conditionAtteinte && <Pill>Non atteinte</Pill>}
    </button>
  );
}
