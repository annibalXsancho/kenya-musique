import { lazy } from 'react';
import type { ModuleDef } from '@core/modules';

export const journal: ModuleDef = {
  id: 'journal',
  label: 'Journal',
  path: '/journal',
  icon: 'journal',
  order: 4,
  Page: lazy(() => import('./Page')),
};
