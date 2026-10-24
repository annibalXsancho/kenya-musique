import { useEffect, useRef } from 'react';
import { Draggable } from '@fullcalendar/interaction';
import { Button, EmptyState, Pill, ProgressBar } from '@core/ui';
import type { Doc } from '@core/model';
import { formatDuree } from '@core/lib/dates';
import { defaultDuration } from '../time';
import s from '../Agenda.module.css';

export interface Item {
  titre: string;
  intention?: string;
  sprintId: string;
  etapeId: string;
  durationMin: number;
}

interface Props {
  sprints: Doc<'sprints'>[];
  etapes: Doc<'etapes'>[];
  /** minutes déjà planifiées par étape */
  planned: Map<string, number>;
  draggable: boolean;
  onPlace: (item: Item) => void;
}

/** Étapes et tâches des sprints en cours, à glisser sur la grille (ou à placer d'un toucher). */
export function Planifiable({ sprints, etapes, planned, draggable, onPlace }: Props) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!draggable || !box.current) return;
    const d = new Draggable(box.current, {
      itemSelector: '[data-planifiable]',
      longPressDelay: 200,
      eventData: (el) => {
        const it = JSON.parse(el.dataset.item ?? '{}') as Item;
        return {
          title: it.titre,
          duration: { minutes: it.durationMin },
          create: true,
          extendedProps: { intention: it.intention, sprintId: it.sprintId, etapeId: it.etapeId },
        };
      },
    });
    return () => d.destroy();
  }, [draggable]);

  return (
    <div ref={box} className={s.todo}>
      {sprints.length === 0 && (
        <EmptyState
          title="Aucun sprint en cours"
          text="Passe un sprint en « En cours » dans Planning : ses étapes apparaîtront ici."
        />
      )}
      {sprints.map((sp) => {
        const steps = etapes
          .filter((e) => e.sprintId === sp.id && e.statut !== 'termine')
          .sort((a, b) => a.ordre - b.ordre);
        return (
          <div key={sp.id} className={s.todoSprint}>
            <div className={s.todoHead}>
              <Pill tone="accent">S{sp.numero}</Pill>
              <strong>{sp.sujet}</strong>
            </div>
            {steps.length === 0 && <p className={s.muted}>Toutes les étapes sont terminées.</p>}
            {steps.map((e) => {
              const mins = planned.get(e.id) ?? 0;
              const item: Item = {
                titre: e.titre,
                sprintId: sp.id,
                etapeId: e.id,
                durationMin: defaultDuration(e.estimationMin),
              };
              const tasks = e.taches.filter((t) => !t.fait);
              return (
                <div key={e.id} className={s.step}>
                  <div
                    className={draggable ? `${s.card} ${s.grab}` : s.card}
                    data-planifiable=""
                    data-item={JSON.stringify(item)}
                  >
                    <div className={s.cardTop}>
                      <span className={s.cardTitle}>{e.titre}</span>
                      <Button size="sm" onClick={() => onPlace(item)}>
                        Placer
                      </Button>
                    </div>
                    <span className={s.muted}>
                      {mins > 0 ? `${formatDuree(mins)} planifiées` : 'Rien de planifié'}
                      {e.estimationMin ? ` · estimation ${formatDuree(e.estimationMin)}` : ''}
                    </span>
                    {e.estimationMin ? (
                      <ProgressBar
                        value={mins / e.estimationMin}
                        label={`Planifié pour ${e.titre}`}
                      />
                    ) : null}
                  </div>
                  {tasks.map((t) => {
                    const ti: Item = {
                      titre: e.titre,
                      intention: t.texte,
                      sprintId: sp.id,
                      etapeId: e.id,
                      durationMin: 30,
                    };
                    return (
                      <div
                        key={t.id}
                        className={draggable ? `${s.task} ${s.grab}` : s.task}
                        data-planifiable=""
                        data-item={JSON.stringify(ti)}
                      >
                        <span className={s.taskText}>{t.texte}</span>
                        <button
                          type="button"
                          className={s.taskBtn}
                          onClick={() => onPlace(ti)}
                          aria-label={`Placer ${t.texte}`}
                        >
                          +
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
