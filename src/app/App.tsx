import { Suspense, lazy } from 'react';
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { Button, Icon } from '@core/ui';
import { modules } from './modules';
import s from './App.module.css';

const DesignPage = lazy(() => import('./DesignPage'));

export function App() {
  const navigate = useNavigate();
  // Branché sur le formulaire de log en S2 ; en attendant, ouvre le Journal.
  const newSession = () => navigate('/journal');

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
