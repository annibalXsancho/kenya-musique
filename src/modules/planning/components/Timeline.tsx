import { useEffect, useRef } from 'react';
import type { Doc } from '@core/model';
import { diffDays } from '@core/lib/dates';
import { assignLanes, computeRange, monthsIn, widthOf, xOf } from '../timeline';
import s from '../Planning.module.css';

interface Props {
  phases: Doc<'phases'>[];
  sprints: Doc<'sprints'>[];
  indispos: Doc<'indisponibilites'>[];
  today: string;
  ppd: number;
  selectedId?: string;
  onSprint: (id: string) => void;
  onPhase: (id: string) => void;
  onIndispo: () => void;
}

const HEAD = 30;
const PHASE_ROW = 40;
const LANE = 46;

export function Timeline({
  phases,
  sprints,
  indispos,
  today,
  ppd,
  selectedId,
  onSprint,
  onPhase,
  onIndispo,
}: Props) {
  const dates = [
    ...phases.flatMap((p) => [p.debut, p.fin]),
    ...sprints.flatMap((p) => [p.debut, p.fin]),
    ...indispos.flatMap((p) => [p.debut, p.fin]),
  ];
  const { start, end } = computeRange(dates, today);
  const months = monthsIn(start, end);
  const width = (diffDays(start, end) + 1) * ppd;
  const lanes = assignLanes(sprints);
  const laneCount = Math.max(1, ...lanes.map((l) => l.lane + 1));
  const height = HEAD + PHASE_ROW + laneCount * LANE + 16;
  const todayX = xOf(today, start, ppd) + ppd / 2;

  // Au premier affichage, la frise est centrée un peu avant aujourd'hui.
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ left: Math.max(0, todayX - 140) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={s.scroller} ref={scroller}>
      <div className={s.canvas} style={{ width, height }}>
        {months.map((m, i) => (
          <div
            key={m.key}
            className={i % 2 ? `${s.month} ${s.monthAlt}` : s.month}
            style={{ left: m.offsetDays * ppd, width: m.days * ppd, height }}
          >
            <span className={s.monthLabel}>{m.label}</span>
          </div>
        ))}

        {indispos.map((u) => (
          <button
            key={u.id}
            type="button"
            className={s.unavail}
            style={{
              left: xOf(u.debut, start, ppd),
              width: widthOf(u.debut, u.fin, ppd),
              top: HEAD,
              height: height - HEAD,
            }}
            title={`${u.libelle}`}
            aria-label={`Indisponibilité : ${u.libelle}`}
            onClick={onIndispo}
          />
        ))}

        {phases.map((p) => (
          <button
            key={p.id}
            type="button"
            className={s.phase}
            style={{
              left: xOf(p.debut, start, ppd),
              width: widthOf(p.debut, p.fin, ppd),
              top: HEAD + 6,
            }}
            onClick={() => onPhase(p.id)}
          >
            {p.nom}
          </button>
        ))}

        {lanes.map(({ item: sp, lane }) => {
          const top = HEAD + PHASE_ROW + lane * LANE;
          const slip = sp.finInitial ? diffDays(sp.finInitial, sp.fin) : 0;
          const startSlip = sp.debutInitial ? diffDays(sp.debutInitial, sp.debut) : 0;
          return (
            <div key={sp.id}>
              {sp.debutInitial && sp.finInitial && (slip !== 0 || startSlip !== 0) && (
                <div
                  className={s.ghost}
                  style={{
                    left: xOf(sp.debutInitial, start, ppd),
                    width: widthOf(sp.debutInitial, sp.finInitial, ppd),
                    top: top + 34,
                  }}
                  title="Dates initiales"
                />
              )}
              <button
                type="button"
                className={`${s.sprint} ${s[sp.statut]} ${selectedId === sp.id ? s.selected : ''}`}
                style={{
                  left: xOf(sp.debut, start, ppd),
                  width: widthOf(sp.debut, sp.fin, ppd),
                  top,
                }}
                onClick={() => onSprint(sp.id)}
              >
                <span className={s.sprintLabel}>
                  S{sp.numero} · {sp.sujet}
                </span>
                {slip !== 0 && (
                  <span className={s.slip}>
                    {slip > 0 ? '+' : ''}
                    {slip} j
                  </span>
                )}
              </button>
            </div>
          );
        })}

        <div className={s.today} style={{ left: todayX, height }}>
          <span className={s.todayLabel}>Aujourd’hui</span>
        </div>
      </div>
    </div>
  );
}
