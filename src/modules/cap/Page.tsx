import { useCallback, useMemo, useState } from 'react';
import { Button, Card, EmptyState, Pill, Segmented, Sheet, Tile } from '@core/ui';
import { useList, useReglages } from '@core/db/hooks';
import { krPlanned, krStatus, krValue } from '@core/calc/kr';
import { parsePeriode } from '@core/calc/period';
import {
  lastWeeks,
  plannedVsActual,
  practiceShare,
  weekStart,
  weeklyHours,
} from '@core/calc/hours';
import { sprintSlips } from '@core/calc/slip';
import { formatDuree, formatShort, todayISO } from '@core/lib/dates';
import { ChartCard } from './components/ChartCard';
import { C, HoursChart, PlannedActualChart, PracticeChart } from './components/charts';
import { KrForm } from './components/KrForm';
import { KrPanel } from './components/KrPanel';
import { Meter } from './components/Meter';
import { ObjectifForm } from './components/ObjectifForm';
import { StatutPill } from './components/StatutPill';
import { VisionPanel } from './components/VisionPanel';
import { num, pct, signed } from './format';
import s from './Cap.module.css';

type Panel =
  | { kind: 'vision' }
  | { kind: 'objectif'; id?: string }
  | { kind: 'kr'; id: string }
  | { kind: 'krNew'; objectifId: string }
  | null;

const NONE: never[] = [];

export default function Page() {
  const vision = (useList('vision') ?? NONE)[0];
  const objectifs = useList('objectifs') ?? NONE;
  const krs = useList('krs') ?? NONE;
  const sessions = useList('sessions') ?? NONE;
  const creneaux = useList('creneaux') ?? NONE;
  const sprints = useList('sprints') ?? NONE;
  const reglages = useReglages();
  const [panel, setPanel] = useState<Panel>(null);
  const [span, setSpan] = useState<'8' | '12' | '26'>('8');
  const close = useCallback(() => setPanel(null), []);
  const today = todayISO();

  // ── Résultats clés : tout est calculé à partir des sessions, jamais ressaisi ──
  const rows = useMemo(
    () =>
      krs.map((kr) => {
        const objectif = objectifs.find((o) => o.id === kr.objectifId);
        const period = objectif ? parsePeriode(objectif.periode) : null;
        const actual = krValue(kr, sessions, { from: period?.start, to: period?.end });
        const planned = period ? krPlanned(kr.cible, period.start, period.end, today) : 0;
        return { kr, objectif, period, actual, planned, status: krStatus(actual, planned) };
      }),
    [krs, objectifs, sessions, today],
  );
  const count = { avance: 0, clous: 0, retard: 0 };
  for (const r of rows) count[r.status.statut]++;

  // ── Rythme ──
  const n = Number(span);
  const weeks = useMemo(() => lastWeeks(today, n), [today, n]);
  const hoursByWeek = useMemo(
    () => weeklyHours(sessions, weeks, reglages.typesPratique),
    [sessions, weeks, reglages.typesPratique],
  );
  const planVsReal = useMemo(
    () => plannedVsActual(creneaux, sessions, weeks),
    [creneaux, sessions, weeks],
  );
  const share = practiceShare(hoursByWeek);
  const current = weeklyHours(sessions, [weekStart(today)], reglages.typesPratique)[0];
  const slips = sprintSlips(sprints, today);

  const selectedKr = panel?.kind === 'kr' ? rows.find((r) => r.kr.id === panel.id) : undefined;
  const editingObjectif =
    panel?.kind === 'objectif' && panel.id ? objectifs.find((o) => o.id === panel.id) : undefined;
  const sortedObjectifs = [...objectifs].sort(
    (a, b) => a.ordre - b.ordre || a.createdAt.localeCompare(b.createdAt),
  );
  const worstSlip = slips[0] ? Math.max(slips[0].finDays, slips[0].overdueDays) : 0;
  const okCount = count.avance + count.clous;
  const title =
    panel?.kind === 'vision'
      ? 'Vision'
      : panel?.kind === 'objectif'
        ? editingObjectif
          ? 'Objectif'
          : 'Nouvel objectif'
        : panel?.kind === 'kr'
          ? (selectedKr?.kr.libelle ?? 'Résultat clé')
          : 'Nouveau résultat clé';

  return (
    <section>
      <h1>Cap</h1>
      <p className={s.lead}>Ce qui avance, ce qui dérive, et de combien.</p>

      {/* ── Le verdict en un coup d'œil ── */}
      <div className={s.tiles}>
        <Tile
          label="Résultats clés"
          value={rows.length ? `${okCount}/${rows.length}` : '—'}
          hint={rows.length ? 'en avance ou dans les clous' : 'Aucun résultat clé défini'}
        >
          {rows.length > 0 && (
            <div className={s.tileNote}>
              {count.retard > 0 ? (
                <Pill tone="danger">▼ {count.retard} en retard</Pill>
              ) : (
                <Pill>✓ Aucun en retard</Pill>
              )}
            </div>
          )}
        </Tile>
        <Tile
          label="Cette semaine"
          value={formatDuree(current.total)}
          hint={`cible ${formatDuree(reglages.cibleHebdoMin)} à ${formatDuree(reglages.cibleHebdoMax)}`}
        >
          <div className={s.tileNote}>
            <Meter
              value={current.total / reglages.cibleHebdoMax}
              planned={reglages.cibleHebdoMin / reglages.cibleHebdoMax}
              label="Heures de la semaine sur la cible"
            />
          </div>
        </Tile>
        <Tile
          label={`Pratique · ${n} sem.`}
          value={share === null ? '—' : `${Math.round(share * 100)} %`}
          hint={`cible ${Math.round(reglages.partPratiqueCible * 100)} %`}
        >
          <div className={s.tileNote}>
            <Meter
              value={share ?? 0}
              planned={reglages.partPratiqueCible}
              danger={share !== null && share < reglages.partPratiqueCible - 0.1}
              label="Part de pratique"
            />
          </div>
        </Tile>
        <Tile
          label="Sprints"
          value={slips.length ? String(slips.length) : '0'}
          hint={slips.length ? `en glissement · jusqu’à ${worstSlip} j` : 'en glissement'}
        >
          <div className={s.tileNote}>
            {slips.length ? <Pill tone="danger">▼ À recadrer</Pill> : <Pill>✓ Dans les temps</Pill>}
          </div>
        </Tile>
      </div>

      {/* ── Vision ── */}
      <Card className={s.vision}>
        <div className={s.visionHead}>
          <h3>Vision</h3>
          <Button variant="ghost" size="sm" onClick={() => setPanel({ kind: 'vision' })}>
            {vision ? 'Modifier' : 'Définir'}
          </Button>
        </div>
        {vision?.texte ? (
          <>
            <p className={s.visionText}>{vision.texte}</p>
            <div className={s.chips}>
              {vision.horizon && <Pill tone="accent">{vision.horizon}</Pill>}
              {vision.piliers.map((p) => (
                <Pill key={p}>{p}</Pill>
              ))}
            </div>
          </>
        ) : (
          <p className={s.muted}>
            Écris où tu veux être et tes piliers : ils restent sous tes yeux ici.
          </p>
        )}
      </Card>

      {/* ── Objectifs et résultats clés ── */}
      <div className={s.sectionHead}>
        <h2>Objectifs</h2>
        <Button size="sm" onClick={() => setPanel({ kind: 'objectif' })}>
          + Objectif
        </Button>
      </div>
      {objectifs.length === 0 && (
        <EmptyState
          title="Aucun objectif"
          text="Un objectif a une période et des résultats clés mesurables : la trajectoire s’en déduit."
          action={<Button onClick={() => setPanel({ kind: 'objectif' })}>Créer un objectif</Button>}
        />
      )}
      <div className={s.objectifs}>
        {sortedObjectifs.map((o) => {
          const mine = rows.filter((r) => r.kr.objectifId === o.id);
          return (
            <Card key={o.id} className={s.objectif}>
              <div className={s.objHead}>
                <div>
                  <h3>{o.titre}</h3>
                  <span className={s.muted}>
                    {/^\d{4}$/.test(o.periode) ? `Année ${o.periode}` : o.periode}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPanel({ kind: 'objectif', id: o.id })}
                >
                  Modifier
                </Button>
              </div>
              <div className={s.krs}>
                {mine.map((r) => {
                  const u = r.kr.unite ? ` ${r.kr.unite}` : '';
                  return (
                    <button
                      key={r.kr.id}
                      type="button"
                      className={s.kr}
                      onClick={() => setPanel({ kind: 'kr', id: r.kr.id })}
                    >
                      <span className={s.krTop}>
                        <span className={s.krTitle}>{r.kr.libelle}</span>
                        <StatutPill statut={r.status.statut} />
                      </span>
                      <Meter
                        value={r.actual / r.kr.cible}
                        planned={r.planned / r.kr.cible}
                        danger={r.status.statut === 'retard'}
                        label={`Avancement de ${r.kr.libelle}`}
                      />
                      <span className={s.krMeta}>
                        <strong>{num(r.actual)}</strong> / {num(r.kr.cible)}
                        {u} · prévu {num(r.planned)}
                        {r.status.statut !== 'clous' && (
                          <>
                            {' '}
                            · écart {signed(r.status.ecart)}
                            {r.status.ecartPct !== null ? ` (${pct(r.status.ecartPct)})` : ''}
                          </>
                        )}
                      </span>
                    </button>
                  );
                })}
                {mine.length === 0 && <p className={s.muted}>Aucun résultat clé.</p>}
              </div>
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPanel({ kind: 'krNew', objectifId: o.id })}
                >
                  + Résultat clé
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── Rythme : un seul filtre, au-dessus des graphiques ── */}
      <div className={s.sectionHead}>
        <h2>Rythme</h2>
        <Segmented
          label="Période affichée"
          value={span}
          onChange={setSpan}
          options={[
            { value: '8', label: '8 sem.' },
            { value: '12', label: '12 sem.' },
            { value: '26', label: '26 sem.' },
          ]}
        />
      </div>
      <div className={s.charts}>
        <ChartCard
          title="Heures par semaine"
          subtitle={`La bande grise est la cible (${formatDuree(reglages.cibleHebdoMin)} à ${formatDuree(reglages.cibleHebdoMax)}).`}
          table={{
            head: ['Semaine du', 'Heures', 'Vs cible'],
            rows: hoursByWeek.map((w) => [
              formatShort(w.week),
              formatDuree(w.total),
              w.total < reglages.cibleHebdoMin
                ? 'sous la cible'
                : w.total > reglages.cibleHebdoMax
                  ? 'au-dessus'
                  : 'dans la cible',
            ]),
          }}
        >
          <HoursChart
            weeks={hoursByWeek}
            cibleMin={reglages.cibleHebdoMin}
            cibleMax={reglages.cibleHebdoMax}
          />
        </ChartCard>
        <ChartCard
          title="Part de pratique"
          subtitle="Pratique et production, en part du temps de la semaine."
          table={{
            head: ['Semaine du', 'Part', 'Sur'],
            rows: hoursByWeek.map((w) => [
              formatShort(w.week),
              w.part === null ? '—' : `${Math.round(w.part * 100)} %`,
              formatDuree(w.total),
            ]),
          }}
        >
          <PracticeChart weeks={hoursByWeek} cible={reglages.partPratiqueCible} />
        </ChartCard>
        <ChartCard
          title="Prévu et réalisé"
          subtitle="Séances de l’agenda contre sessions du Journal."
          legend={[
            { label: 'Prévu (agenda)', color: C.muted, kind: 'bar' },
            { label: 'Réalisé (journal)', color: C.accent, kind: 'bar' },
          ]}
          table={{
            head: ['Semaine du', 'Prévu', 'Réalisé'],
            rows: planVsReal.map((w) => [
              formatShort(w.week),
              formatDuree(w.prevu),
              formatDuree(w.reel),
            ]),
          }}
        >
          <PlannedActualChart weeks={planVsReal} />
        </ChartCard>
        <Card className={s.chartCard}>
          <header className={s.chartHead}>
            <div>
              <h3>Glissement des sprints</h3>
              <p className={s.muted}>
                Fin repoussée depuis le passage « en cours », ou échéance dépassée.
              </p>
            </div>
          </header>
          {slips.length === 0 ? (
            <p className={s.okLine}>✓ Aucun sprint en glissement.</p>
          ) : (
            <div className={s.rows}>
              {slips.map((x) => (
                <div key={x.id} className={s.feedRow}>
                  <span className={s.feedMain}>
                    <strong>S{x.numero}</strong> · {x.sujet}
                  </span>
                  <span className={s.slips}>
                    {x.finDays !== 0 && (
                      <Pill tone={x.finDays > 0 ? 'danger' : 'accent'}>
                        {x.finDays > 0 ? '▼' : '▲'} fin {x.finDays > 0 ? '+' : '−'}
                        {Math.abs(x.finDays)} j
                      </Pill>
                    )}
                    {x.overdueDays > 0 && <Pill tone="danger">▼ dépassé de {x.overdueDays} j</Pill>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Sheet open={panel !== null} onClose={close} title={title}>
        {panel?.kind === 'vision' && <VisionPanel vision={vision} onDone={close} />}
        {panel?.kind === 'objectif' && (
          <ObjectifForm
            key={panel.id ?? 'new'}
            objectif={editingObjectif}
            nextOrder={objectifs.length}
            krs={krs.filter((k) => k.objectifId === panel.id)}
            onDone={close}
          />
        )}
        {panel?.kind === 'krNew' && (
          <KrForm
            objectifId={panel.objectifId}
            onDone={(id) => (id ? setPanel({ kind: 'kr', id }) : close())}
            onCancel={close}
          />
        )}
        {panel?.kind === 'kr' && selectedKr && (
          <KrPanel
            key={panel.id}
            kr={selectedKr.kr}
            objectif={selectedKr.objectif}
            period={selectedKr.period}
            actual={selectedKr.actual}
            planned={selectedKr.planned}
            status={selectedKr.status}
            sessions={sessions}
            today={today}
            onClose={close}
          />
        )}
      </Sheet>
    </section>
  );
}
