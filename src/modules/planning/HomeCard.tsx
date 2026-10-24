import { Link } from 'react-router-dom';
import { Card, ProgressBar } from '@core/ui';
import { useList } from '@core/db/hooks';
import { sprintProgress } from '@core/calc/progress';

export default function HomeCard() {
  const sprints = useList('sprints') ?? [];
  const etapes = useList('etapes') ?? [];
  const sprint = sprints.find((x) => x.statut === 'en_cours');
  const p = sprint ? sprintProgress(etapes.filter((e) => e.sprintId === sprint.id)) : null;
  return (
    <Card>
      <h3>Sprint en cours</h3>
      {sprint && p ? (
        <>
          <p>
            S{sprint.numero} · {sprint.sujet}
          </p>
          <ProgressBar value={p.ratio} label="Avancement du sprint" />
          <p>
            {p.done}/{p.total} étapes · {Math.round(p.ratio * 100)} %
          </p>
        </>
      ) : (
        <p>Aucun sprint en cours.</p>
      )}
      <Link to="/planning">Ouvrir le Planning</Link>
    </Card>
  );
}
