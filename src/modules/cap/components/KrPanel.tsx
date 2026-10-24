import { useState } from 'react';
import { Button, Field } from '@core/ui';
import type { Doc } from '@core/model';
import { update } from '@core/db';
import { krSeries } from '@core/calc/kr';
import type { KrStatus } from '@core/calc/kr';
import { formatDateFr } from '@core/lib/dates';
import { KrChart } from './charts';
import { KrForm } from './KrForm';
import { StatutPill } from './StatutPill';
import { num, pct, signed } from '../format';
import s from '../Cap.module.css';

interface Props {
  kr: Doc<'krs'>;
  objectif?: Doc<'objectifs'>;
  period: { start: string; end: string } | null;
  actual: number;
  planned: number;
  status: KrStatus;
  sessions: Doc<'sessions'>[];
  today: string;
  onClose: () => void;
}

/** Un KR en détail : où il en est, contre la trajectoire, et les sessions qui l'ont alimenté. */
export function KrPanel({
  kr,
  objectif,
  period,
  actual,
  planned,
  status,
  sessions,
  today,
  onClose,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [manuelle, setManuelle] = useState(
    kr.valeurManuelle !== undefined ? String(kr.valeurManuelle) : '',
  );

  if (editing)
    return (
      <KrForm
        kr={kr}
        objectifId={kr.objectifId}
        onDone={() => setEditing(false)}
        onCancel={() => setEditing(false)}
      />
    );

  const u = kr.unite ? ` ${kr.unite}` : '';
  const feeders = sessions
    .map((x) => ({
      x,
      n: x.contributions.filter((c) => c.krId === kr.id).reduce((t, c) => t + c.n, 0),
    }))
    .filter((f) => f.n > 0 && (!period || (f.x.date >= period.start && f.x.date <= period.end)))
    .sort((a, b) => b.x.date.localeCompare(a.x.date));

  return (
    <div className={s.stack}>
      <div className={s.meta}>
        <StatutPill statut={status.statut} />
        <span className={s.muted}>{objectif ? `${objectif.titre} · ${objectif.periode}` : ''}</span>
      </div>

      <div className={s.bigRow}>
        <span className={s.big}>{num(actual)}</span>
        <span className={s.muted}>
          / {num(kr.cible)}
          {u}
        </span>
      </div>
      <p className={s.muted}>
        Prévu aujourd’hui : {num(planned)}
        {u}. Écart : {signed(status.ecart)}
        {u}
        {status.ecartPct !== null ? ` (${pct(status.ecartPct)})` : ''}.
      </p>

      {period ? (
        <KrChart
          points={krSeries(kr, sessions, period.start, period.end, today)}
          unite={kr.unite}
          today={today}
        />
      ) : (
        <p className={s.muted}>
          Période de l’objectif non reconnue : modifie l’objectif pour afficher la trajectoire.
        </p>
      )}
      <ul className={s.legend} aria-label="Légende">
        <li>
          <i className={s.keyLine} style={{ background: 'var(--accent)' }} />
          Réel
        </li>
        <li>
          <i
            className={s.keyLine}
            style={{ background: 'color-mix(in srgb, var(--text-2) 55%, transparent)' }}
          />
          Prévu (linéaire)
        </li>
      </ul>

      {kr.mode === 'manuel' && (
        <Field
          label="Valeur actuelle"
          type="number"
          inputMode="decimal"
          step="any"
          value={manuelle}
          onChange={(e) => setManuelle(e.target.value)}
          onBlur={() =>
            manuelle !== '' &&
            Number(manuelle) !== kr.valeurManuelle &&
            void update('krs', kr.id, { valeurManuelle: Number(manuelle) })
          }
          hint="Saisie manuelle : enregistrée en quittant le champ"
        />
      )}

      {kr.mode === 'sessions' && (
        <div>
          <h3>Sessions qui l’ont alimenté</h3>
          {feeders.length === 0 && (
            <p className={s.muted}>
              Aucune session n’a encore contribué. Renseigne la contribution en loggant une session.
            </p>
          )}
          <div className={s.rows}>
            {feeders.map(({ x, n }) => (
              <div key={x.id} className={s.feedRow}>
                <span className={s.feedDate}>{formatDateFr(x.date)}</span>
                <span className={s.feedMain}>{x.intention || 'Sans intention'}</span>
                <strong>
                  +{num(n)}
                  {u}
                </strong>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={s.actions}>
        <Button variant="secondary" onClick={() => setEditing(true)}>
          Modifier
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Fermer
        </Button>
      </div>
    </div>
  );
}
