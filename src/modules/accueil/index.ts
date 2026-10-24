import { lazy } from 'react';
import type { ModuleDef } from '@core/modules';

export const accueil: ModuleDef = {
  id: 'accueil',
  label: 'Accueil',
  path: '/',
  icon: 'home',
  order: 1,
  Page: lazy(() => import('./Page')),
};
