import { useEffect, useRef, useState } from 'react';
import type { Doc } from '@core/model';
import { diffDays, formatShort } from '@core/lib/dates';
import { computeRange, monthsIn, widthOf, xOf } from '../timeline';
import s from '../Planning.module.css';

interface Props {
  phases: Doc<'phases'>[];
  sprints: Doc<'sprints'>[];
  indispos: Doc<'indisponibilites'>[];
  today: string;
  selectedId?: string;
  onSprint: (id: string) => void;
  onPhase: (id: string) => void;
}

/** Largeur minimale d'un jour : en dessous, la frise défile au lieu de se tasser. */
const MIN_PPD = 4;

/** Frise « une ligne par sprint » : libellés à gauche, barres alignées sur les mois. */
export function Timeline({
  phases,
  sprints,
  indispos,
  today,
  selectedId,
  onSprint,
  onPhase,
}: Props) {
  const dates = [
    ...phases.flatMap((p) => [p.debut, p.fin]),
    ...sprints.flatMap((p) => [p.debut, p.fin]),
    ...indispos.flatMap((p) => [p.debut, p.fin]),
  ];
  const { start, end } = computeRange(dates, today);
  const months = monthsIn(start, end);
  const totalDays = diffDays(start, end) + 1;
  const cours = indispos.filter((i) => i.type === 'cours');
  const rows = [...sprints].sort((a, b) => a.debut.localeCompare(b.debut) || a.numero - b.numero);

  // La frise remplit la largeur disponible ; elle ne défile que si elle deviendrait illisible.
  const box = useRef<HTMLDivElement>(null);
  const [boxWidth, setBoxWidth] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxWidth(el.clientWidth));
    ro.observe(el);
    setBoxWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const labelW = boxWidth < 560 ? 112 : 210;
  const ppd = Math.max(MIN_PPD, (boxWidth - labelW) / totalDays);
  const trackW = totalDays * ppd;
  const todayX = xOf(today, start, ppd) + ppd / 2;

  // Au premier affichage, si ça défile, on se place un peu avant aujourd'hui.
  useEffect(() => {
    const el = box.current;
    if (el && el.scrollWidth > el.clientWidth) el.scrollTo({ left: Math.max(0, todayX - 200) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxWidth > 0]);

  return (
    <div className={s.frame} ref={box}>
      <div
        className={s.grid}
        style={{ gridTemplateColumns: `${labelW}px ${trackW}px`, width: labelW + trackW }}
      >
        {/* En-tête : mois */}
        <div className={`${s.label} ${s.corner}`} />
        <div className={`${s.track} ${s.monthsRow}`}>
          {months.map((m) => (
            <span key={m.key} className={s.monthTick} style={{ left: m.offsetDays * ppd }}>
              {new Date(`${m.key}-01T00:00:00Z`).toLocaleDateString('fr-FR', {
                month: 'short',
                year: m.key.endsWith('-01') ? 'numeric' : undefined,
                timeZone: 'UTC',
              })}
            </span>
          ))}
        </div>

        {/* Phases */}
        {phases.length > 0 && (
          <>
            <div className={s.label}>
              <b>Phases</b>
            </div>
            <div className={`${s.track} ${s.phaseRow}`}>
              <Grid months={months} ppd={ppd} start={start} cours={cours} />
              {phases.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={s.phaseBar}
                  style={{ left: xOf(p.debut, start, ppd), width: widthOf(p.debut, p.fin, ppd) }}
                  title={p.nom}
                  onClick={() => onPhase(p.id)}
                >
                  {p.nom}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Un sprint par ligne */}
        {rows.map((sp) => {
          const slip = sp.finInitial ? diffDays(sp.finInitial, sp.fin) : 0;
          const startSlip = sp.debutInitial ? diffDays(sp.debutInitial, sp.debut) : 0;
          const width = widthOf(sp.debut, sp.fin, ppd);
          return (
            <div key={sp.id} className={s.rowContents}>
              <button
                type="button"
                className={`${s.label} ${s.labelBtn} ${selectedId === sp.id ? s.labelSel : ''}`}
                onClick={() => onSprint(sp.id)}
              >
                <b>
                  S{sp.numero} · {sp.sujet}
                </b>
                <small>
                  {formatShort(sp.debut)} → {formatShort(sp.fin)}
                  {slip !== 0 && (
                    <span className={s.slipText}>
                      {' '}
                      {slip > 0 ? '+' : ''}
                      {slip} j
                    </span>
                  )}
                </small>
              </button>
              <div className={`${s.track} ${s.sprintRow}`}>
                <Grid months={months} ppd={ppd} start={start} cours={cours} />
                {sp.debutInitial && sp.finInitial && (slip !== 0 || startSlip !== 0) && (
                  <div
                    className={s.ghost}
                    style={{
                      left: xOf(sp.debutInitial, start, ppd),
                      width: widthOf(sp.debutInitial, sp.finInitial, ppd),
                    }}
                    title="Dates initiales"
                  />
                )}
                <button
                  type="button"
                  className={`${s.bar} ${s[sp.statut]} ${selectedId === sp.id ? s.selected : ''}`}
                  style={{ left: xOf(sp.debut, start, ppd), width: Math.max(width, 10) }}
                  title={`S${sp.numero} · ${sp.sujet}`}
                  onClick={() => onSprint(sp.id)}
                />
              </div>
            </div>
          );
        })}

        {/* Aujourd'hui */}
        <div className={s.todayLayer} style={{ left: labelW }}>
          <div className={s.todayLine} style={{ left: todayX }} title="Aujourd’hui" />
        </div>
      </div>
    </div>
  );
}

/** Traits verticaux des débuts de mois, et semaines de cours hachurées (comme dans « Pilotage musique »). */
function Grid({
  months,
  ppd,
  start,
  cours,
}: {
  months: { key: string; offsetDays: number }[];
  ppd: number;
  start: string;
  cours: { id: string; libelle: string; debut: string; fin: string }[];
}) {
  return (
    <>
      {cours.map((c) => (
        <span
          key={c.id}
          className={s.cours}
          style={{ left: xOf(c.debut, start, ppd), width: widthOf(c.debut, c.fin, ppd) }}
          title={c.libelle}
        />
      ))}
      {months.map((m) => (
        <i key={m.key} className={s.gridLine} style={{ left: m.offsetDays * ppd }} />
      ))}
    </>
  );
}
