import { Link } from 'react-router-dom';
import { Card, ProgressBar } from '@core/ui';
import { useList, useReglages } from '@core/db/hooks';
import { weekStart } from '@core/calc/hours';
import { addDays, formatDuree, minutesBetween, todayISO } from '@core/lib/dates';

export default function HomeCard() {
  const creneaux = useList('creneaux') ?? [];
  const { cibleHebdoMin } = useReglages();
  const start = weekStart(todayISO());
  const end = addDays(start, 7);
  const planned = creneaux
    .filter(
      (c) =>
        c.statut !== 'non_atteint' && c.debut.slice(0, 10) >= start && c.debut.slice(0, 10) < end,
    )
    .reduce((sum, c) => sum + minutesBetween(c.debut, c.fin), 0);
  return (
    <Card>
      <h3>Semaine planifiée</h3>
      <p>
        {formatDuree(planned)} sur {formatDuree(cibleHebdoMin)} de cible
      </p>
      <ProgressBar value={planned / cibleHebdoMin} label="Heures planifiées cette semaine" />
      <Link to="/agenda">Ouvrir l'Agenda</Link>
    </Card>
  );
}
