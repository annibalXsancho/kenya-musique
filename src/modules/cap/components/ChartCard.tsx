import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { Card, Segmented } from '@core/ui';
import s from '../Cap.module.css';

export interface LegendItem {
  label: string;
  /** couleur de la marque (jamais du texte) */
  color: string;
  kind: 'bar' | 'line';
}

interface Props {
  title: string;
  subtitle?: string;
  legend?: LegendItem[];
  /** colonnes et lignes du jumeau « tableau » : tout ce que montre le graphique, sans survol */
  table: { head: string[]; rows: string[][] };
  children: ReactNode;
}

/** Carte de graphique : titre, légende (≥ 2 séries), bascule Graphique / Tableau. */
export function ChartCard({ title, subtitle, legend, table, children }: Props) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const id = useId();
  return (
    <Card className={s.chartCard}>
      <header className={s.chartHead}>
        <div>
          <h3 id={id}>{title}</h3>
          {subtitle && <p className={s.muted}>{subtitle}</p>}
        </div>
        <Segmented
          label={`Affichage : ${title}`}
          value={view}
          onChange={setView}
          options={[
            { value: 'chart', label: 'Graphique' },
            { value: 'table', label: 'Tableau' },
          ]}
        />
      </header>
      {legend && legend.length >= 2 && (
        <ul className={s.legend} aria-label="Légende">
          {legend.map((l) => (
            <li key={l.label}>
              <i
                className={l.kind === 'bar' ? s.keyBar : s.keyLine}
                style={{ background: l.color }}
              />
              {l.label}
            </li>
          ))}
        </ul>
      )}
      {view === 'chart' ? (
        <div role="img" aria-labelledby={id} className={s.plot}>
          {children}
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                {table.head.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
