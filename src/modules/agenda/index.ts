import { lazy } from 'react';
import type { ModuleDef } from '@core/modules';

export const agenda: ModuleDef = {
  id: 'agenda',
  label: 'Agenda',
  path: '/agenda',
  icon: 'agenda',
  order: 3,
  Page: lazy(() => import('./Page')),
};
