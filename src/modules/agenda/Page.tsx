import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EventInput } from '@fullcalendar/core';
import { Button, ProgressBar, Segmented, Sheet } from '@core/ui';
import { create, update } from '@core/db';
import { useList, useReglages } from '@core/db/hooks';
import { addDays, formatDuree } from '@core/lib/dates';
import { useMediaQuery } from '@core/lib/useMediaQuery';
import { Calendar } from './components/Calendar';
import type { CalendarHandle, DropPayload, RangeInfo, ViewName } from './components/Calendar';
import { CreneauPanel } from './components/CreneauPanel';
import { PlaceForm } from './components/PlaceForm';
import { Planifiable } from './components/Planifiable';
import type { Item } from './components/Planifiable';
import { plannedMinutes } from './time';
import s from './Agenda.module.css';

// Référence stable pendant le chargement (évite de recalculer les mémos à chaque rendu).
const NONE: never[] = [];

type Panel =
  | { kind: 'creneau'; id?: string; draft?: { debut: string; fin: string } }
  | { kind: 'place'; item: Item }
  | { kind: 'todo' }
  | null;

export default function Page() {
  const navigate = useNavigate();
  const wide = useMediaQuery('(min-width: 1024px)');
  const phone = useMediaQuery('(max-width: 767px)');
  const creneaux = useList('creneaux') ?? NONE;
  const sprints = useList('sprints') ?? NONE;
  const etapes = useList('etapes') ?? NONE;
  const indispos = useList('indisponibilites') ?? NONE;
  const reglages = useReglages();

  const cal = useRef<CalendarHandle>(null);
  const [view, setView] = useState<ViewName>(phone ? 'timeGrid3Day' : 'timeGridWeek');
  const [range, setRange] = useState<RangeInfo>({ start: '', end: '', title: '' });
  const [panel, setPanel] = useState<Panel>(null);
  const [now, setNow] = useState(() => new Date());
  const close = useCallback(() => setPanel(null), []);

  // « À valider » se met à jour tout seul quand une séance se termine.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Raccourcis : ← → pour naviguer, T pour aujourd'hui.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (
        (e.target as HTMLElement).closest(
          'input, textarea, select, [contenteditable], [role="dialog"]',
        )
      )
        return;
      if (e.key === 'ArrowLeft') cal.current?.prev();
      else if (e.key === 'ArrowRight') cal.current?.next();
      else if (e.key.toLowerCase() === 't') cal.current?.today();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Balayage horizontal (iPhone) : jour précédent / suivant sur les vues courtes.
  const touch = useRef<{ x: number; y: number } | null>(null);
  const swipe = {
    onTouchStart: (e: React.TouchEvent) =>
      (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }),
    onTouchEnd: (e: React.TouchEvent) => {
      const t = touch.current;
      touch.current = null;
      if (!t || view === 'timeGridWeek') return;
      const dx = e.changedTouches[0].clientX - t.x;
      const dy = e.changedTouches[0].clientY - t.y;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8)
        (dx < 0 ? cal.current?.next : cal.current?.prev)?.call(cal.current);
    },
  };

  const stepById = useMemo(() => new Map(etapes.map((e) => [e.id, e])), [etapes]);
  const sprintById = useMemo(() => new Map(sprints.map((p) => [p.id, p])), [sprints]);

  const events = useMemo<EventInput[]>(() => {
    const out: EventInput[] = creneaux.map((c) => {
      const past = new Date(c.fin) <= now;
      const toValidate = c.statut === 'planifie' && past;
      const sp = c.sprintId ? sprintById.get(c.sprintId) : undefined;
      return {
        id: c.id,
        title: c.titre || (c.etapeId ? stepById.get(c.etapeId)?.titre : '') || '',
        start: c.debut,
        end: c.fin,
        editable: c.statut !== 'valide',
        classNames: [
          c.statut === 'valide' ? s.evValide : c.statut === 'non_atteint' ? s.evMiss : s.evPlanifie,
          toValidate ? s.evToValidate : '',
        ],
        extendedProps: {
          statut: c.statut,
          toValidate,
          sprint: sp ? `S${sp.numero} · ${sp.sujet}` : '',
        },
      };
    });
    for (const u of indispos) {
      out.push({
        id: `u-${u.id}`,
        title: u.libelle,
        start: u.debut,
        end: addDays(u.fin, 1),
        allDay: true,
        display: 'background',
        classNames: [s.unavail],
      });
    }
    return out;
  }, [creneaux, indispos, now, sprintById, stepById]);

  const activeSprints = sprints
    .filter((p) => p.statut === 'en_cours')
    .sort((a, b) => a.numero - b.numero);
  const planned = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of creneaux) {
      if (!c.etapeId || c.statut === 'non_atteint') continue;
      m.set(
        c.etapeId,
        (m.get(c.etapeId) ?? 0) + (new Date(c.fin).getTime() - new Date(c.debut).getTime()) / 60000,
      );
    }
    return m;
  }, [creneaux]);

  // Jauge : heures planifiées dans la période affichée, comparées à la cible hebdomadaire (vue semaine).
  const total = range.start ? plannedMinutes(creneaux, range.start, range.end) : 0;
  const isWeek = view === 'timeGridWeek';
  const toValidateCount = creneaux.filter(
    (c) => c.statut === 'planifie' && new Date(c.fin) <= now,
  ).length;

  async function moved(id: string, debut: string, fin: string) {
    await update('creneaux', id, { debut, fin });
  }
  async function dropped(p: DropPayload, debut: string, fin: string) {
    await create('creneaux', {
      debut,
      fin,
      titre: p.titre,
      intention: p.intention ?? '',
      sprintId: p.sprintId,
      etapeId: p.etapeId,
    });
  }
  const validate = (id: string) => {
    close();
    navigate(`/journal?nouvelle=1&creneau=${id}`);
  };

  const list = (draggable: boolean) => (
    <Planifiable
      sprints={activeSprints}
      etapes={etapes}
      planned={planned}
      draggable={draggable}
      onPlace={(item) => setPanel({ kind: 'place', item })}
    />
  );

  const current =
    panel?.kind === 'creneau' && panel.id ? creneaux.find((c) => c.id === panel.id) : undefined;
  const titles = {
    creneau: current ? 'Séance' : 'Nouvelle séance',
    place: 'Planifier',
    todo: 'À planifier',
  } as const;

  return (
    <section className={s.page}>
      <header className={s.top}>
        <div>
          <h1>Agenda</h1>
          <p className={s.range}>{range.title}</p>
        </div>
        <div className={s.controls}>
          <div className={s.nav}>
            <button
              type="button"
              className={s.navBtn}
              onClick={() => cal.current?.prev()}
              aria-label="Précédent"
            >
              ‹
            </button>
            <Button size="sm" variant="secondary" onClick={() => cal.current?.today()}>
              Aujourd’hui
            </Button>
            <button
              type="button"
              className={s.navBtn}
              onClick={() => cal.current?.next()}
              aria-label="Suivant"
            >
              ›
            </button>
          </div>
          <Segmented
            label="Vue"
            value={view}
            onChange={(v) => {
              setView(v);
              cal.current?.setView(v);
            }}
            options={[
              { value: 'timeGridDay', label: 'Jour' },
              ...(phone ? [{ value: 'timeGrid3Day' as const, label: '3 jours' }] : []),
              { value: 'timeGridWeek', label: 'Semaine' },
            ]}
          />
          {!wide && (
            <Button size="sm" onClick={() => setPanel({ kind: 'todo' })}>
              À planifier
            </Button>
          )}
        </div>
      </header>

      <div className={s.gauge}>
        <div className={s.gaugeText}>
          <strong>{formatDuree(total)}</strong> planifiées
          {isWeek && (
            <span className={s.muted}>
              {' '}
              · cible {formatDuree(reglages.cibleHebdoMin)} à {formatDuree(reglages.cibleHebdoMax)}
            </span>
          )}
        </div>
        {isWeek && (
          <ProgressBar
            value={total / reglages.cibleHebdoMax}
            label="Heures planifiées sur la cible de la semaine"
          />
        )}
        {toValidateCount > 0 && (
          <span className={s.pending}>
            {toValidateCount} séance{toValidateCount > 1 ? 's' : ''} à valider
          </span>
        )}
      </div>

      <div className={s.layout}>
        <div className={s.cal} {...swipe}>
          <Calendar
            ref={cal}
            events={events}
            initialView={view}
            onRange={setRange}
            onMove={(id, d, f) => void moved(id, d, f)}
            onSelect={(debut, fin) => setPanel({ kind: 'creneau', draft: { debut, fin } })}
            onOpen={(id) => setPanel({ kind: 'creneau', id })}
            onDropExternal={(p, d, f) => void dropped(p, d, f)}
          />
        </div>
        {wide && (
          <aside className={s.aside}>
            <h2 className={s.asideTitle}>À planifier</h2>
            <p className={s.muted}>Glisse une étape ou une tâche sur la grille.</p>
            {list(true)}
          </aside>
        )}
      </div>

      <Sheet open={panel !== null} onClose={close} title={panel ? titles[panel.kind] : ''}>
        {panel?.kind === 'creneau' && (
          <CreneauPanel
            key={panel.id ?? panel.draft?.debut}
            creneau={current}
            draft={panel.draft}
            sprints={sprints}
            etapes={etapes}
            now={now}
            onClose={close}
            onValidate={validate}
          />
        )}
        {panel?.kind === 'place' && (
          <PlaceForm item={panel.item} creneaux={creneaux} onDone={close} />
        )}
        {panel?.kind === 'todo' && list(false)}
      </Sheet>
    </section>
  );
}
