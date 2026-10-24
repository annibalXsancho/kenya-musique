import { useCallback, useState } from 'react';
import { Button, EmptyState, Sheet } from '@core/ui';
import { useList } from '@core/db/hooks';
import { todayISO } from '@core/lib/dates';
import { useMediaQuery } from '@core/lib/useMediaQuery';
import { Timeline } from './components/Timeline';
import { PhaseForm } from './components/PhaseForm';
import { SprintPanel } from './components/SprintPanel';
import { UnavailabilityPanel } from './components/UnavailabilityPanel';
import s from './Planning.module.css';

type Panel =
  { kind: 'sprint'; id?: string } | { kind: 'phase'; id?: string } | { kind: 'indispos' } | null;

export default function Page() {
  const phases = useList('phases');
  const sprints = useList('sprints');
  const indispos = useList('indisponibilites');
  const [panel, setPanel] = useState<Panel>(null);
  const wide = useMediaQuery('(min-width: 768px)');
  const close = useCallback(() => setPanel(null), []);

  const loaded = phases && sprints && indispos;
  const ph = [...(phases ?? [])].sort((a, b) => a.debut.localeCompare(b.debut));
  const sp = sprints ?? [];
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
        <h1>Planning</h1>
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
            ppd={wide ? 8 : 6}
            selectedId={panel?.kind === 'sprint' ? panel.id : undefined}
            onSprint={(id) => setPanel({ kind: 'sprint', id })}
            onPhase={(id) => setPanel({ kind: 'phase', id })}
          />
          <ul className={s.legend} aria-label="Légende">
            <li>
              <i className={`${s.swatch} ${s.swEnCours}`} /> En cours
            </li>
            <li>
              <i className={`${s.swatch} ${s.swGrey}`} /> Planifié / terminé
            </li>
            <li>
              <i className={`${s.swatch} ${s.swBacklog}`} /> Backlog
            </li>
          </ul>
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
