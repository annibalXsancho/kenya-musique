import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Button, Field, Pill, ProgressBar, Select } from '@core/ui';
import type { Doc } from '@core/model';
import { create, remove, update } from '@core/db';
import { newId } from '@core/lib/ids';
import { stepRatio } from '@core/calc/progress';
import { STATUTS, statutTone, statutLabel } from '../labels';
import s from '../Planning.module.css';

type Etape = Doc<'etapes'>;

/** Statut déduit des tâches : tout fait → terminé ; au moins une faite → en cours ; terminé mais décoché → en cours. */
function statutFromTasks(current: string, taches: { fait: boolean }[]): string {
  if (taches.length > 0 && taches.every((t) => t.fait)) return 'termine';
  if (current === 'termine') return 'en_cours';
  if (taches.some((t) => t.fait) && (current === 'backlog' || current === 'planifie'))
    return 'en_cours';
  return current;
}

function Step({ etape }: { etape: Etape }) {
  const [open, setOpen] = useState(false);
  const [titre, setTitre] = useState(etape.titre);
  const [estimation, setEstimation] = useState(
    etape.estimationMin ? String(etape.estimationMin) : '',
  );
  const [task, setTask] = useState('');
  const done = etape.taches.filter((t) => t.fait).length;
  const patch = (p: Parameters<typeof update<'etapes'>>[2]) => update('etapes', etape.id, p);

  async function toggle(id: string) {
    const taches = etape.taches.map((t) => (t.id === id ? { ...t, fait: !t.fait } : t));
    await patch({ taches, statut: statutFromTasks(etape.statut, taches) as Etape['statut'] });
  }
  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!task.trim()) return;
    await patch({ taches: [...etape.taches, { id: newId(), texte: task.trim(), fait: false }] });
    setTask('');
  }

  return (
    <div className={s.step}>
      <button
        type="button"
        className={s.stepHead}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className={open ? `${s.chev} ${s.chevOpen}` : s.chev} aria-hidden="true">
          ›
        </span>
        <span className={s.stepTitle}>{etape.titre}</span>
        {etape.taches.length > 0 && (
          <span className={s.muted}>
            {done}/{etape.taches.length}
          </span>
        )}
        <Pill tone={statutTone(etape.statut)}>{statutLabel(etape.statut)}</Pill>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className={s.stepBody}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <div className={s.stepInner}>
              {etape.note && <p className={s.muted}>{etape.note}</p>}
              {etape.taches.length > 0 && (
                <ProgressBar value={stepRatio(etape)} label={`Avancement de ${etape.titre}`} />
              )}
              <div className={s.tasks}>
                {etape.taches.map((t) => (
                  <div key={t.id} className={s.task}>
                    <label>
                      <input type="checkbox" checked={t.fait} onChange={() => void toggle(t.id)} />
                      <span className={t.fait ? s.taskDone : undefined}>{t.texte}</span>
                    </label>
                    <button
                      type="button"
                      className={s.iconBtn}
                      aria-label={`Retirer ${t.texte}`}
                      onClick={() =>
                        void patch({ taches: etape.taches.filter((x) => x.id !== t.id) })
                      }
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <form onSubmit={addTask} className={s.inline}>
                <Field
                  label="Nouvelle tâche"
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="Ajouter une tâche"
                />
                <Button type="submit" size="sm" variant="secondary" disabled={!task.trim()}>
                  Ajouter
                </Button>
              </form>
              <div className={s.two}>
                <Field
                  label="Titre"
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  onBlur={() =>
                    titre.trim() && titre !== etape.titre && void patch({ titre: titre.trim() })
                  }
                />
                <Field
                  label="Estimation (min)"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={estimation}
                  onChange={(e) => setEstimation(e.target.value)}
                  onBlur={() => {
                    const n = Number(estimation);
                    if (
                      estimation === ''
                        ? etape.estimationMin !== undefined
                        : n !== etape.estimationMin
                    )
                      void patch({
                        estimationMin: estimation === '' ? undefined : Math.max(0, Math.round(n)),
                      });
                  }}
                />
              </div>
              <Select
                label="Statut"
                value={etape.statut}
                onChange={(e) => void patch({ statut: e.target.value as Etape['statut'] })}
                options={STATUTS}
              />
              <div>
                <Button variant="ghost" size="sm" onClick={() => void remove('etapes', etape.id)}>
                  Supprimer l’étape
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function StepList({ sprintId, etapes }: { sprintId: string; etapes: Etape[] }) {
  const [titre, setTitre] = useState('');
  const sorted = [...etapes].sort(
    (a, b) => a.ordre - b.ordre || a.createdAt.localeCompare(b.createdAt),
  );

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!titre.trim()) return;
    await create('etapes', {
      sprintId,
      titre: titre.trim(),
      ordre: sorted.length ? sorted[sorted.length - 1].ordre + 1 : 0,
      statut: 'planifie',
      taches: [],
    });
    setTitre('');
  }

  return (
    <div className={s.stack}>
      <h3>Étapes</h3>
      {sorted.length === 0 && <p>Aucune étape.</p>}
      <div>
        {sorted.map((e) => (
          <Step key={e.id} etape={e} />
        ))}
      </div>
      <form onSubmit={add} className={s.inline}>
        <Field
          label="Nouvelle étape"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Ajouter une étape"
        />
        <Button type="submit" size="sm" variant="secondary" disabled={!titre.trim()}>
          Ajouter
        </Button>
      </form>
    </div>
  );
}
