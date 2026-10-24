import { lazy } from 'react';
import type { ModuleDef } from '@core/modules';

export const planning: ModuleDef = {
  id: 'planning',
  label: 'Planning',
  path: '/planning',
  icon: 'planning',
  order: 2,
  Page: lazy(() => import('./Page')),
};
