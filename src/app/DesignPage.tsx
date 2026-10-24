import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  EmptyState,
  Field,
  Pill,
  ProgressBar,
  Segmented,
  Sheet,
  SyncIndicator,
  Tile,
} from '@core/ui';
import s from './DesignPage.module.css';

type Theme = 'auto' | 'light' | 'dark';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={s.section}>
      <h2>{title}</h2>
      <div className={s.row}>{children}</div>
    </section>
  );
}

/** Page cachée : tous les composants du design system, dans tous leurs états. */
export default function DesignPage() {
  const [theme, setTheme] = useState<Theme>('auto');
  const [seg, setSeg] = useState('semaine');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    return () => root.removeAttribute('data-theme');
  }, [theme]);

  return (
    <div>
      <h1>Design</h1>
      <p className={s.lead}>Composants du design system.</p>
      <div className={s.theme}>
        <Segmented
          label="Thème"
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'light', label: 'Clair' },
            { value: 'dark', label: 'Sombre' },
          ]}
        />
      </div>

      <Section title="Boutons">
        <Button>Nouvelle session</Button>
        <Button variant="secondary">Secondaire</Button>
        <Button variant="ghost">Discret</Button>
        <Button size="sm">Petit</Button>
        <Button disabled>Désactivé</Button>
      </Section>

      <Section title="Statuts">
        <Pill tone="accent">En cours</Pill>
        <Pill>Planifié</Pill>
        <Pill>Terminé</Pill>
        <Pill tone="backlog">Backlog</Pill>
      </Section>

      <Section title="Tuiles">
        <div className={s.grid}>
          <Tile label="Heures cette semaine" value="6 h 30" hint="cible 5 à 9 h">
            <div className={s.gap}>
              <ProgressBar value={0.72} label="Heures de la semaine" />
            </div>
          </Tile>
          <Tile label="Part de pratique" value="80 %" hint="cible 80 %" />
          <Card>
            <h3>Carte</h3>
            <p>Surface arrondie, sans bordure dure.</p>
          </Card>
        </div>
      </Section>

      <Section title="Progression">
        <div className={s.wide}>
          <ProgressBar value={0} label="0 %" />
          <ProgressBar value={0.4} label="40 %" />
          <ProgressBar value={1} label="100 %" />
        </div>
      </Section>

      <Section title="Formulaire">
        <div className={s.form}>
          <Field label="Intention" placeholder="Ce que je veux travailler" />
          <Field label="Durée (min)" type="number" hint="Minutes effectives" />
          <Field label="Note" multiline placeholder="Facultatif" />
          <Segmented
            label="Période"
            value={seg}
            onChange={setSeg}
            options={[
              { value: 'jour', label: 'Jour' },
              { value: 'semaine', label: 'Semaine' },
              { value: 'mois', label: 'Mois' },
            ]}
          />
        </div>
      </Section>

      <Section title="Synchronisation">
        <SyncIndicator state={{ status: 'synced' }} />
        <SyncIndicator state={{ status: 'pending', count: 3 }} />
        <SyncIndicator state={{ status: 'offline' }} />
      </Section>

      <Section title="État vide">
        <div className={s.wide}>
          <Card>
            <EmptyState
              title="Aucune session"
              text="Logue ta première session en moins d'une minute."
              action={<Button size="sm">Nouvelle session</Button>}
            />
          </Card>
        </div>
      </Section>

      <Section title="Panneau">
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Ouvrir le panneau
        </Button>
      </Section>
      <Sheet open={open} onClose={() => setOpen(false)} title="Détail du sprint">
        <p>Panneau latéral sur desktop, feuille du bas sur mobile.</p>
        <div className={s.form}>
          <Field label="Objectif" placeholder="Objectif du sprint" />
          <Button onClick={() => setOpen(false)}>Enregistrer</Button>
        </div>
      </Sheet>
    </div>
  );
}
