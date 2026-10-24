import { Suspense } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { modules } from './modules';

export function App() {
  return (
    <div className="shell">
      <nav className="nav" aria-label="Navigation principale">
        {modules.map((m) => (
          <NavLink key={m.id} to={m.path} end={m.path === '/'} className="nav__link">
            {m.label}
          </NavLink>
        ))}
      </nav>
      <main className="main">
        <Suspense fallback={null}>
          <Routes>
            {modules.map((m) => (
              <Route key={m.id} path={m.path} element={<m.Page />} />
            ))}
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
