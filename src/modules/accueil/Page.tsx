import { Suspense, useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, EmptyState, Pill, ProgressBar, Tile } from '@core/ui';
import { ModulesContext } from '@core/modules';
import { create, update } from '@core/db';
import { useList, useReglages } from '@core/db/hooks';
import { krPlanned, krStatus, krValue } from '@core/calc/kr';
import { parsePeriode } from '@core/calc/period';
import { lastWeeks, weeklyHours } from '@core/calc/hours';
import { nextSlot, orderCards, recentSessions, regularity, sprintDay } from '@core/calc/home';
import { sprintSlips } from '@core/calc/slip';
import { formatDateFr, formatDuree, formatShort, toLocalDT, todayISO } from '@core/lib/dates';
import s from './Accueil.module.css';

const NONE: never[] = [];

export default function Page() {
  const navigate = useNavigate();
  const modules = useContext(ModulesContext);
  const sprints = useList('sprints') ?? NONE;
  const etapes = useList('etapes') ?? NONE;
  const creneaux = useList('creneaux') ?? NONE;
  const sessions = useList('sessions') ?? NONE;
  const krs = useList('krs') ?? NONE;
  const objectifs = useList('objectifs') ?? NONE;
  const storedReglages = (useList('reglages') ?? NONE)[0];
  const reglages = useReglages();
  const [organizing, setOrganizing] = useState(false);

  const now = toLocalDT(new Date());
  const today = todayISO();
  const sprint = sprints.find((x) => x.statut === 'en_cours');
  const day = sprint ? sprintDay(sprint, today) : null;

  // ── Aujourd'hui : prochaine séance, sinon prochaine étape ──
  const slot = nextSlot(creneaux, now);
  const slotEtape = slot?.etapeId ? etapes.find((e) => e.id === slot.etapeId) : undefined;
  const nextEtape = sprint
    ? [...etapes]
        .filter((e) => e.sprintId === sprint.id && e.statut !== 'termine')
        .sort((a, b) => a.ordre - b.ordre)[0]
    : undefined;

  // ── Tuiles ──
  const week = lastWeeks(today, 1);
  const current = weeklyHours(sessions, week, reglages.typesPratique)[0];
  const rows = krs.map((kr) => {
    const objectif = objectifs.find((o) => o.id === kr.objectifId);
    const period = objectif ? parsePeriode(objectif.periode) : null;
    const actual = krValue(kr, sessions, { from: period?.start, to: period?.end });
    const planned = period ? krPlanned(kr.cible, period.start, period.end, today) : 0;
    return { kr, status: krStatus(actual, planned) };
  });
  const late = rows.filter((r) => r.status.statut === 'retard');
  const okCount = rows.length - late.length;
  const days = regularity(sessions, today, 14);
  const activeDays = days.filter((d) => d.minutes > 0).length;
  const slips = sprintSlips(sprints, today);

  const recent = recentSessions(sessions, 3);
  const sprintLabel = (id?: string) => {
    const sp = sprints.find((x) => x.id === id);
    return sp ? `S${sp.numero}` : null;
  };

  // ── Cartes des modules, dans l'ordre réglé ──
  const cards = orderCards(
    modules.filter((m) => m.HomeCard),
    reglages.ordreCartesAccueil,
  );
  const move = async (id: string, delta: -1 | 1) => {
    const ids = cards.map((c) => c.id);
    const i = ids.indexOf(id);
    const j = i + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    if (storedReglages) await update('reglages', storedReglages.id, { ordreCartesAccueil: ids });
    else await create('reglages', { ordreCartesAccueil: ids });
  };

  const alerts: { key: string; text: string; to: string }[] = [
    ...late.map((r) => ({
      key: `kr-${r.kr.id}`,
      text: `${r.kr.libelle} : en retard${
        r.status.ecartPct !== null ? ` (${Math.round(r.status.ecartPct * 100)} %)` : ''
      }`,
      to: '/cap',
    })),
    ...slips.map((x) => ({
      key: `sp-${x.id}`,
      text: `Sprint ${x.numero} · ${x.sujet} : ${
        x.overdueDays > 0 ? `${x.overdueDays} j de dépassement` : `fin repoussée de ${x.finDays} j`
      }`,
      to: '/planning',
    })),
  ];

  return (
    <section>
      <p className={s.date}>{formatDateFr(today)}</p>
      <h1>{sprint ? `Sprint ${sprint.numero} · ${sprint.sujet}` : 'Accueil'}</h1>
      {sprint && (
        <p className={s.lead}>
          {day
            ? `Jour ${day.jour} sur ${day.total}`
            : `Du ${formatShort(sprint.debut)} au ${formatShort(sprint.fin)}`}
          {sprint.objectif && <> · {sprint.objectif}</>}
        </p>
      )}
      {sprint && day && <ProgressBar value={day.jour / day.total} label="Jour du sprint" />}

      {/* ── Je fais quoi aujourd'hui ? ── */}
      <Card className={s.next}>
        <div className={s.nextText}>
          <div className={s.label}>{slot ? 'Prochaine séance' : 'Prochaine étape'}</div>
          {slot ? (
            <>
              <div className={s.big}>{slot.titre || slotEtape?.titre || 'Séance'}</div>
              <div className={s.muted}>
                {formatDateFr(slot.debut.slice(0, 10))} · {slot.debut.slice(11, 16)}–
                {slot.fin.slice(11, 16)}
                {slot.intention && <> · {slot.intention}</>}
              </div>
            </>
          ) : nextEtape ? (
            <>
              <div className={s.big}>{nextEtape.titre}</div>
              <div className={s.muted}>
                Rien n'est planifié. <Link to="/agenda">Planifier dans l'Agenda</Link>
              </div>
            </>
          ) : (
            <div className={s.muted}>
              Rien de prévu. <Link to="/planning">Définir un sprint</Link>
            </div>
          )}
        </div>
        <Button onClick={() => navigate('/journal?nouvelle=1')}>Nouvelle session</Button>
      </Card>

      {/* ── Ça avance ? ── */}
      <div className={s.tiles}>
        <Tile
          label="Cette semaine"
          value={formatDuree(current.total)}
          hint={`cible ${formatDuree(reglages.cibleHebdoMin)} à ${formatDuree(reglages.cibleHebdoMax)}`}
        >
          <ProgressBar
            value={current.total / reglages.cibleHebdoMax}
            label="Heures de la semaine"
          />
        </Tile>
        <Tile
          label="Résultats clés"
          value={rows.length ? `${okCount}/${rows.length}` : '—'}
          hint={rows.length ? 'en avance ou dans les clous' : 'Aucun résultat clé défini'}
        />
        <Tile label="Régularité" value={`${activeDays}/14`} hint="jours avec une session">
          <div className={s.dots} role="img" aria-label={`${activeDays} jours actifs sur 14`}>
            {days.map((d) => (
              <span
                key={d.date}
                className={d.minutes > 0 ? s.dotOn : s.dot}
                title={`${formatShort(d.date)} · ${d.minutes ? formatDuree(d.minutes) : 'rien'}`}
              />
            ))}
          </div>
        </Tile>
      </div>

      {/* ── Alertes d'écart ── */}
      {alerts.length > 0 && (
        <div className={s.block}>
          <h2>À surveiller</h2>
          <ul className={s.list}>
            {alerts.map((a) => (
              <li key={a.key}>
                <Link to={a.to} className={s.row}>
                  <Pill tone="danger">▼</Pill>
                  <span>{a.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Dernières sessions ── */}
      <div className={s.block}>
        <h2>Dernières sessions</h2>
        {recent.length === 0 ? (
          <EmptyState
            title="Aucune session"
            text="Loggue ta première session en moins d'une minute."
            action={
              <Button onClick={() => navigate('/journal?nouvelle=1')}>Nouvelle session</Button>
            }
          />
        ) : (
          <ul className={s.list}>
            {recent.map((x) => (
              <li key={x.id}>
                <Link to="/journal" className={s.row}>
                  <span className={s.rowMain}>
                    {formatDateFr(x.date)} · {x.type}
                    {sprintLabel(x.sprintId) && <> · {sprintLabel(x.sprintId)}</>}
                  </span>
                  <span className={s.muted}>
                    {formatDuree(x.dureeMin)}
                    {!x.conditionAtteinte && ' · condition non atteinte'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Cartes des modules ── */}
      {cards.length > 0 && (
        <div className={s.block}>
          <div className={s.head}>
            <h2>Modules</h2>
            <Button variant="ghost" size="sm" onClick={() => setOrganizing((v) => !v)}>
              {organizing ? 'Terminé' : 'Réordonner'}
            </Button>
          </div>
          <div className={s.cards}>
            {cards.map((m, i) => {
              const HomeCard = m.HomeCard!;
              return (
                <div key={m.id} className={s.cardWrap}>
                  {organizing && (
                    <div className={s.move}>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={i === 0}
                        aria-label={`Monter ${m.label}`}
                        onClick={() => void move(m.id, -1)}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={i === cards.length - 1}
                        aria-label={`Descendre ${m.label}`}
                        onClick={() => void move(m.id, 1)}
                      >
                        ↓
                      </Button>
                    </div>
                  )}
                  <Suspense fallback={null}>
                    <HomeCard />
                  </Suspense>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
