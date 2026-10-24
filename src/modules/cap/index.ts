import { lazy } from 'react';
import type { ModuleDef } from '@core/modules';

export const cap: ModuleDef = {
  id: 'cap',
  label: 'Cap',
  path: '/cap',
  icon: 'cap',
  order: 5,
  Page: lazy(() => import('./Page')),
};
