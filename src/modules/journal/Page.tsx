import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, EmptyState, Segmented, Select, Sheet } from '@core/ui';
import { create, remove, update } from '@core/db';
import { useList, useReglages } from '@core/db/hooks';
import { todayISO } from '@core/lib/dates';
import type { CreateInput, Session } from '@core/model';
import { sessionFromCreneau } from './prefill';
import { SessionForm } from './components/SessionForm';
import { SessionRow } from './components/SessionRow';
import s from './Journal.module.css';

export default function Page() {
  const sessions = useList('sessions');
  const sprints = useList('sprints');
  const creneaux = useList('creneaux');
  const reglages = useReglages();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<Session | 'new' | null>(null);
  const [type, setType] = useState('');
  const [sprintId, setSprintId] = useState('');
  const [missed, setMissed] = useState(false);

  // « Nouvelle session » (barre, bouton flottant, touche N) arrive par /journal?nouvelle=1.
  const current = editing ?? (params.get('nouvelle') ? 'new' : null);
  const close = useCallback(() => {
    setEditing(null);
    setParams({}, { replace: true });
  }, [setParams]);

  const sorted = useMemo(
    () =>
      [...(sessions ?? [])].sort(
        (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
      ),
    [sessions],
  );
  const visible = sorted.filter(
    (x) =>
      (!type || x.type === type) &&
      (!sprintId || x.sprintId === sprintId) &&
      (!missed || !x.conditionAtteinte),
  );

  const last = [...(sessions ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  // « Valider » dans l'agenda arrive par /journal?nouvelle=1&creneau=<id> : formulaire pré-rempli depuis la séance.
  const fromCreneau = (creneaux ?? []).find((c) => c.id === params.get('creneau'));
  const defaults = {
    date: todayISO(),
    dureeMin: last?.dureeMin ?? 45,
    type: last?.type ?? reglages.typesSession[0],
    intention: last?.intention ?? '',
    sprintId: last?.sprintId,
    ...(fromCreneau ? sessionFromCreneau(fromCreneau) : {}),
  };
  const sprintOptions = (sprints ?? []).map((p) => ({
    id: p.id,
    label: `S${p.numero} · ${p.sujet}`,
  }));

  async function save(data: CreateInput<'sessions'>) {
    if (current && current !== 'new') await update('sessions', current.id, data);
    else {
      const created = await create('sessions', data);
      if (data.creneauId)
        await update('creneaux', data.creneauId, { statut: 'valide', sessionId: created.id });
    }
    close();
  }
  async function del() {
    if (current && current !== 'new') await remove('sessions', current.id);
    close();
  }

  return (
    <section>
      <div className={s.head}>
        <h1>Journal</h1>
        <Button onClick={() => setEditing('new')}>Nouvelle session</Button>
      </div>

      {sessions && sessions.length > 0 && (
        <div className={s.filters}>
          <Select
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={[
              { value: '', label: 'Tous' },
              ...reglages.typesSession.map((t) => ({ value: t, label: t })),
            ]}
          />
          {sprintOptions.length > 0 && (
            <Select
              label="Sprint"
              value={sprintId}
              onChange={(e) => setSprintId(e.target.value)}
              options={[
                { value: '', label: 'Tous' },
                ...sprintOptions.map((p) => ({ value: p.id, label: p.label })),
              ]}
            />
          )}
          <div>
            <div className={s.legend}>Condition</div>
            <Segmented
              label="Condition"
              value={missed ? 'non' : 'toutes'}
              onChange={(v) => setMissed(v === 'non')}
              options={[
                { value: 'toutes', label: 'Toutes' },
                { value: 'non', label: 'Non atteinte' },
              ]}
            />
          </div>
        </div>
      )}

      {sessions && sessions.length === 0 && (
        <EmptyState
          title="Aucune session"
          text="Logue ta première session en moins d'une minute."
          action={<Button onClick={() => setEditing('new')}>Nouvelle session</Button>}
        />
      )}
      {sessions && sessions.length > 0 && visible.length === 0 && (
        <EmptyState title="Aucun résultat" text="Aucune session ne correspond à ces filtres." />
      )}
      <div className={s.list}>
        {visible.map((x) => (
          <SessionRow key={x.id} session={x} onOpen={() => setEditing(x)} />
        ))}
      </div>

      <Sheet
        open={current !== null}
        onClose={close}
        title={current === 'new' ? 'Nouvelle session' : 'Session'}
      >
        {current && (
          <SessionForm
            key={current === 'new' ? `new-${fromCreneau?.id ?? ''}` : current.id}
            initial={current === 'new' ? undefined : current}
            defaults={defaults}
            types={reglages.typesSession}
            sprints={sprintOptions}
            onSubmit={save}
            onDelete={current === 'new' ? undefined : del}
          />
        )}
      </Sheet>
    </section>
  );
}
