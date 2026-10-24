import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDuree, formatShort } from '@core/lib/dates';
import type { KrPoint } from '@core/calc/kr';
import type { PlannedActual, WeekHours } from '@core/calc/hours';
import s from '../Cap.module.css';

/** Couleurs des marques : le texte garde toujours les jetons de texte. */
export const C = {
  accent: 'var(--accent)',
  muted: 'color-mix(in srgb, var(--text-2) 55%, transparent)',
  grid: 'var(--sep)',
  ink: 'var(--text-2)',
  surface: 'var(--tile)',
};

const axis = { fill: 'var(--text-2)', fontSize: 11 };

interface Row {
  key: string;
  color: string;
  name: string;
  value: string;
}

/** Infobulle : la valeur d'abord, le nom ensuite ; clé = trait court de la couleur de la série. */
function Tip({ active, title, rows }: { active?: boolean; title: string; rows: Row[] }) {
  if (!active) return null;
  return (
    <div className={s.tip}>
      <div className={s.tipTitle}>{title}</div>
      {rows.map((r) => (
        <div key={r.key} className={s.tipRow}>
          <i className={s.keyLine} style={{ background: r.color }} />
          <strong>{r.value}</strong>
          <span>{r.name}</span>
        </div>
      ))}
    </div>
  );
}

const hours = (min: number) => formatDuree(Math.round(min));

/* ── Heures par semaine, avec la bande cible ── */
export function HoursChart({
  weeks,
  cibleMin,
  cibleMax,
}: {
  weeks: WeekHours[];
  cibleMin: number;
  cibleMax: number;
}) {
  const data = weeks.map((w) => ({ ...w, label: formatShort(w.week), h: w.total / 60 }));
  const top = Math.max(cibleMax / 60, ...data.map((d) => d.h)) * 1.15;
  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid vertical={false} stroke={C.grid} />
        <XAxis
          dataKey="label"
          tick={axis}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={16}
        />
        <YAxis
          tick={axis}
          axisLine={false}
          tickLine={false}
          width={44}
          domain={[0, Math.ceil(top)]}
          tickFormatter={(v: number) => `${v} h`}
        />
        <ReferenceArea
          y1={cibleMin / 60}
          y2={cibleMax / 60}
          fill={C.ink}
          fillOpacity={0.1}
          ifOverflow="extendDomain"
        />
        <Tooltip
          cursor={{ fill: 'var(--sep)', opacity: 0.5 }}
          content={({ active, payload }) => {
            const d = payload?.[0]?.payload as (typeof data)[number] | undefined;
            if (!d) return null;
            return (
              <Tip
                active={active}
                title={`Semaine du ${d.label}`}
                rows={[
                  { key: 'h', color: C.accent, name: 'au total', value: hours(d.total) },
                  {
                    key: 'c',
                    color: C.muted,
                    name: `cible ${hours(cibleMin)} à ${hours(cibleMax)}`,
                    value:
                      d.total < cibleMin
                        ? 'sous la cible'
                        : d.total > cibleMax
                          ? 'au-dessus'
                          : 'dans la cible',
                  },
                ]}
              />
            );
          }}
        />
        <Bar
          dataKey="h"
          fill={C.accent}
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── Part de pratique, ligne cible ── */
export function PracticeChart({ weeks, cible }: { weeks: WeekHours[]; cible: number }) {
  const data = weeks.map((w) => ({
    ...w,
    label: formatShort(w.week),
    pct: w.part === null ? null : Math.round(w.part * 100),
  }));
  return (
    <ResponsiveContainer width="100%" height={230}>
      <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={C.grid} />
        <XAxis
          dataKey="label"
          tick={axis}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={16}
        />
        <YAxis
          tick={axis}
          axisLine={false}
          tickLine={false}
          width={44}
          domain={[0, 100]}
          ticks={[0, 50, 100]}
          tickFormatter={(v: number) => `${v} %`}
        />
        <ReferenceLine
          y={Math.round(cible * 100)}
          stroke={C.ink}
          strokeOpacity={0.6}
          label={{
            value: `Cible ${Math.round(cible * 100)} %`,
            position: 'insideBottomRight',
            fill: 'var(--text-2)',
            fontSize: 11,
          }}
        />
        <Tooltip
          cursor={{ stroke: 'var(--text-2)', strokeOpacity: 0.4 }}
          content={({ active, payload }) => {
            const d = payload?.[0]?.payload as (typeof data)[number] | undefined;
            if (!d) return null;
            return (
              <Tip
                active={active}
                title={`Semaine du ${d.label}`}
                rows={[
                  {
                    key: 'p',
                    color: C.accent,
                    name: 'de pratique',
                    value: d.pct === null ? 'aucune session' : `${d.pct} %`,
                  },
                  { key: 't', color: C.muted, name: 'sur', value: hours(d.total) },
                ]}
              />
            );
          }}
        />
        <Line
          dataKey="pct"
          stroke={C.accent}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          connectNulls={false}
          dot={{ r: 4, fill: C.accent, stroke: C.surface, strokeWidth: 2 }}
          activeDot={{ r: 5, fill: C.accent, stroke: C.surface, strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ── Prévu (agenda) vs réalisé (journal) ── */
export function PlannedActualChart({ weeks }: { weeks: PlannedActual[] }) {
  const data = weeks.map((w) => ({
    ...w,
    label: formatShort(w.week),
    p: w.prevu / 60,
    r: w.reel / 60,
  }));
  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        barGap={2}
        barCategoryGap="28%"
      >
        <CartesianGrid vertical={false} stroke={C.grid} />
        <XAxis
          dataKey="label"
          tick={axis}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={16}
        />
        <YAxis
          tick={axis}
          axisLine={false}
          tickLine={false}
          width={44}
          tickFormatter={(v: number) => `${v} h`}
        />
        <Tooltip
          cursor={{ fill: 'var(--sep)', opacity: 0.5 }}
          content={({ active, payload }) => {
            const d = payload?.[0]?.payload as (typeof data)[number] | undefined;
            if (!d) return null;
            return (
              <Tip
                active={active}
                title={`Semaine du ${d.label}`}
                rows={[
                  { key: 'r', color: C.accent, name: 'réalisé', value: hours(d.reel) },
                  { key: 'p', color: C.muted, name: 'prévu', value: hours(d.prevu) },
                ]}
              />
            );
          }}
        />
        <Bar
          dataKey="p"
          fill={C.muted}
          radius={[4, 4, 0, 0]}
          maxBarSize={14}
          isAnimationActive={false}
        />
        <Bar
          dataKey="r"
          fill={C.accent}
          radius={[4, 4, 0, 0]}
          maxBarSize={14}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── Un KR : réel contre trajectoire prévue ── */
export function KrChart({
  points,
  unite,
  today,
}: {
  points: KrPoint[];
  unite: string;
  today: string;
}) {
  const last = [...points].reverse().find((p) => p.reel !== undefined)?.date;
  const fmt = (n: number) => `${Math.round(n * 10) / 10}${unite ? ` ${unite}` : ''}`;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={points} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={C.grid} />
        <XAxis
          dataKey="date"
          tick={axis}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatShort}
          minTickGap={32}
        />
        <YAxis tick={axis} axisLine={false} tickLine={false} width={44} />
        <ReferenceLine x={today} stroke={C.ink} strokeOpacity={0.35} />
        <Tooltip
          cursor={{ stroke: 'var(--text-2)', strokeOpacity: 0.4 }}
          content={({ active, payload }) => {
            const d = payload?.[0]?.payload as KrPoint | undefined;
            if (!d) return null;
            return (
              <Tip
                active={active}
                title={formatShort(d.date)}
                rows={[
                  ...(d.reel !== undefined
                    ? [{ key: 'r', color: C.accent, name: 'réel', value: fmt(d.reel) }]
                    : []),
                  { key: 'p', color: C.muted, name: 'prévu', value: fmt(d.prevu) },
                ]}
              />
            );
          }}
        />
        <Line
          dataKey="prevu"
          stroke={C.ink}
          strokeOpacity={0.55}
          strokeWidth={2}
          strokeLinecap="round"
          dot={false}
          isAnimationActive={false}
        />
        <Line
          dataKey="reel"
          stroke={C.accent}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          dot={(p: { cx?: number; cy?: number; payload?: KrPoint; index?: number }) =>
            p.payload?.date === last && p.cx !== undefined && p.cy !== undefined ? (
              <circle
                key={`d${p.index}`}
                cx={p.cx}
                cy={p.cy}
                r={5}
                fill={C.accent}
                stroke={C.surface}
                strokeWidth={2}
              />
            ) : (
              <g key={`n${p.index}`} />
            )
          }
          activeDot={{ r: 5, fill: C.accent, stroke: C.surface, strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
