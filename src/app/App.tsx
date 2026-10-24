import { Suspense, lazy, useEffect } from 'react';
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { Button, Icon } from '@core/ui';
import { useUser } from '@core/auth/client';
import { startSync } from '@core/sync/manager';
import { LoginPage } from './LoginPage';
import { SyncStatus } from './SyncStatus';
import { modules } from './modules';
import s from './App.module.css';

const DesignPage = lazy(() => import('./DesignPage'));

export function App() {
  const user = useUser();
  // La synchro tourne tant qu'un compte est connecté ; les données locales restent lisibles hors ligne.
  useEffect(() => (user ? startSync() : undefined), [user]);
  if (!user) return <LoginPage />;
  return <Shell />;
}

function Shell() {
  const navigate = useNavigate();
  const newSession = () => navigate('/journal?nouvelle=1');

  // Raccourci « N » : nouvelle session, sauf pendant une saisie.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (el.closest('input, textarea, select, [contenteditable], [role="dialog"]')) return;
      e.preventDefault();
      navigate('/journal?nouvelle=1');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navigate]);

  return (
    <div className={s.shell}>
      <nav className={s.nav} aria-label="Navigation principale">
        <div className={s.links}>
          {modules.map((m) => (
            <NavLink key={m.id} to={m.path} end={m.path === '/'} className={s.link}>
              <span className={s.icon}>
                <Icon name={m.icon} />
              </span>
              {m.label}
            </NavLink>
          ))}
        </div>
        <div className={s.status}>
          <SyncStatus />
        </div>
        <Button size="sm" className={s.newDesktop} onClick={newSession}>
          Nouvelle session
        </Button>
      </nav>
      <main className={s.main}>
        <Suspense fallback={null}>
          <Routes>
            {modules.map((m) => (
              <Route key={m.id} path={m.path} element={<m.Page />} />
            ))}
            <Route path="/design" element={<DesignPage />} />
          </Routes>
        </Suspense>
      </main>
      <button type="button" className={s.fab} onClick={newSession}>
        <Icon name="plus" size={18} /> Session
      </button>
    </div>
  );
}
