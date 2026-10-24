import { useCallback, useState } from 'react';
import { Button, Card, EmptyState, Field, Pill, Sheet } from '@core/ui';
import { create, update } from '@core/db';
import { useList, useReglages } from '@core/db/hooks';
import { diffDays, formatShort, todayISO } from '@core/lib/dates';
import { Timeline } from './components/Timeline';
import { PhaseForm } from './components/PhaseForm';
import { SprintPanel } from './components/SprintPanel';
import { UnavailabilityPanel } from './components/UnavailabilityPanel';
import s from './Planning.module.css';

const STATUT_LABEL = {
  backlog: 'Backlog',
  planifie: 'Planifié',
  en_cours: 'En cours',
  termine: 'Terminé',
} as const;

type Panel =
  { kind: 'sprint'; id?: string } | { kind: 'phase'; id?: string } | { kind: 'indispos' } | null;

export default function Page() {
  const phases = useList('phases');
  const sprints = useList('sprints');
  const indispos = useList('indisponibilites');
  const reglages = useReglages();
  const storedReglages = (useList('reglages') ?? [])[0];
  const [panel, setPanel] = useState<Panel>(null);
  const close = useCallback(() => setPanel(null), []);

  const loaded = phases && sprints && indispos;
  const ph = [...(phases ?? [])].sort((a, b) => a.debut.localeCompare(b.debut));
  const sp = sprints ?? [];
  const sorted = [...sp].sort((a, b) => a.debut.localeCompare(b.debut) || a.numero - b.numero);
  const cours = (indispos ?? []).filter((i) => i.type === 'cours');
  const saveCible = async (key: 'cibleHebdoMin' | 'cibleHebdoMax', raw: string) => {
    const h = Number(raw);
    if (!Number.isFinite(h) || h < 0) return;
    const minutes = Math.round(h * 60);
    if (minutes === reglages[key]) return;
    if (storedReglages) await update('reglages', storedReglages.id, { [key]: minutes });
    else await create('reglages', { [key]: minutes });
  };
  const sprint =
    panel?.kind === 'sprint' && panel.id ? sp.find((x) => x.id === panel.id) : undefined;
  const phase = panel?.kind === 'phase' && panel.id ? ph.find((x) => x.id === panel.id) : undefined;

  const title =
    panel?.kind === 'sprint'
      ? sprint
        ? `S${sprint.numero} · ${sprint.sujet}`
        : 'Nouveau sprint'
      : panel?.kind === 'phase'
        ? phase
          ? phase.nom
          : 'Nouvelle phase'
        : 'Indisponibilités';

  return (
    <section>
      <div className={s.head}>
        <div className={s.hero}>
          <span className={s.eyebrow}>Planning · {sp.length} sprints</span>
          <h1>L’année en sprints</h1>
          <p className={s.heroText}>
            Les semaines de cours apparaissent hachurées : pas de piano, matériel limité.
          </p>
        </div>
        <div className={s.headActions}>
          <Button variant="secondary" size="sm" onClick={() => setPanel({ kind: 'phase' })}>
            + Phase
          </Button>
          <Button
            size="sm"
            disabled={ph.length === 0}
            title={ph.length === 0 ? 'Crée d’abord une phase' : undefined}
            onClick={() => setPanel({ kind: 'sprint' })}
          >
            + Sprint
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setPanel({ kind: 'indispos' })}>
            Indisponibilités
          </Button>
        </div>
      </div>

      {loaded && ph.length === 0 && sp.length === 0 && (
        <EmptyState
          title="Aucun programme"
          text="Commence par une phase (ex. un trimestre), puis ajoute des sprints dedans."
          action={
            <Button onClick={() => setPanel({ kind: 'phase' })}>Créer la première phase</Button>
          }
        />
      )}

      {loaded && (ph.length > 0 || sp.length > 0) && (
        <>
          <Timeline
            phases={ph}
            sprints={sp}
            indispos={indispos}
            today={todayISO()}
            selectedId={panel?.kind === 'sprint' ? panel.id : undefined}
            onSprint={(id) => setPanel({ kind: 'sprint', id })}
            onPhase={(id) => setPanel({ kind: 'phase', id })}
          />
          <ul className={s.legend} aria-label="Légende">
            <li>
              <i className={`${s.swatch} ${s.swEnCours}`} /> En cours
            </li>
            <li>
              <i className={`${s.swatch} ${s.swPlan}`} /> Planifié
            </li>
            <li>
              <i className={`${s.swatch} ${s.swGrey}`} /> Terminé
            </li>
            <li>
              <i className={`${s.swatch} ${s.swBacklog}`} /> Backlog
            </li>
            <li>
              <i className={`${s.swatch} ${s.swCours}`} /> Semaines de cours
            </li>
          </ul>

          <div className={s.section}>
            <div className={s.secHead}>
              <h2>Sprints</h2>
              <Button
                variant="secondary"
                size="sm"
                disabled={ph.length === 0}
                onClick={() => setPanel({ kind: 'sprint' })}
              >
                Ajouter un sprint
              </Button>
            </div>
            <div className={s.tableWrap}>
              <table className={s.sprints}>
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Sujet</th>
                    <th>Statut</th>
                    <th>Début</th>
                    <th>Fin</th>
                    <th>Durée</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((x, i) => {
                    const prev = sorted[i - 1];
                    const weeks = (diffDays(x.debut, x.fin) + 1) / 7;
                    const flags: string[] = [];
                    if (prev && x.debut <= prev.fin)
                      flags.push(
                        x.debut === prev.fin
                          ? `commence le jour où S${prev.numero} finit`
                          : `chevauche S${prev.numero}`,
                      );
                    if (weeks > 5 && x.statut !== 'backlog' && x.statut !== 'termine')
                      flags.push('au-delà du plafond de 5 sem.');
                    return (
                      <tr key={x.id} onClick={() => setPanel({ kind: 'sprint', id: x.id })}>
                        <td className={s.num}>{x.numero}</td>
                        <td>
                          {x.sujet}
                          {flags.map((f) => (
                            <span key={f} className={s.flag}>
                              {f}
                            </span>
                          ))}
                        </td>
                        <td>
                          <Pill
                            tone={
                              x.statut === 'en_cours'
                                ? 'accent'
                                : x.statut === 'backlog'
                                  ? 'backlog'
                                  : 'neutral'
                            }
                          >
                            {STATUT_LABEL[x.statut]}
                          </Pill>
                        </td>
                        <td className={s.num}>{formatShort(x.debut)}</td>
                        <td className={s.num}>{formatShort(x.fin)}</td>
                        <td className={s.num}>{weeks.toFixed(1).replace('.', ',')} sem.</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className={`${s.section} ${s.cols}`}>
            <section>
              <div className={s.secHead}>
                <h2>Semaines de cours</h2>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPanel({ kind: 'indispos' })}
                >
                  Modifier
                </Button>
              </div>
              {cours.length === 0 && (
                <p className={s.muted} style={{ paddingTop: 'var(--s-3)' }}>
                  Aucune période saisie. Ajoute tes semaines à l’ISTP pour les voir sur la frise.
                </p>
              )}
              {cours.map((c) => (
                <div key={c.id} className={s.period}>
                  <span>{c.libelle}</span>
                  <span className={s.num}>{formatShort(c.debut)}</span>
                  <span className={s.num}>{formatShort(c.fin)}</span>
                </div>
              ))}
            </section>
            <Card>
              <h3>Rythme cible</h3>
              <div className={s.rythme}>
                <Field
                  label="Plancher (h / semaine)"
                  type="number"
                  min={0}
                  step={0.5}
                  defaultValue={reglages.cibleHebdoMin / 60}
                  key={`min-${reglages.cibleHebdoMin}`}
                  onBlur={(e) => saveCible('cibleHebdoMin', e.target.value)}
                />
                <Field
                  label="Plafond (h / semaine)"
                  type="number"
                  min={0}
                  step={0.5}
                  defaultValue={reglages.cibleHebdoMax / 60}
                  key={`max-${reglages.cibleHebdoMax}`}
                  onBlur={(e) => saveCible('cibleHebdoMax', e.target.value)}
                />
              </div>
            </Card>
          </div>
        </>
      )}

      <Sheet open={panel !== null} onClose={close} title={title}>
        {panel?.kind === 'phase' && (
          <PhaseForm
            key={panel.id ?? 'new'}
            phase={phase}
            sprintCount={phase ? sp.filter((x) => x.phaseId === phase.id).length : 0}
            nextOrder={ph.length}
            onDone={close}
          />
        )}
        {panel?.kind === 'sprint' && (
          <SprintPanel
            key={panel.id ?? 'new'}
            sprint={sprint}
            phases={ph}
            sprints={sp}
            onSaved={(id) => setPanel({ kind: 'sprint', id })}
            onClose={close}
          />
        )}
        {panel?.kind === 'indispos' && <UnavailabilityPanel items={indispos ?? []} />}
      </Sheet>
    </section>
  );
}
