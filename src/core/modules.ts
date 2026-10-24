import type { ComponentType, LazyExoticComponent } from 'react';

export type IconName = 'home' | 'planning' | 'agenda' | 'journal' | 'cap';

export interface ModuleDef {
  id: string;
  label: string;
  path: string;
  icon: IconName;
  order: number;
  Page: LazyExoticComponent<ComponentType>;
  HomeCard?: ComponentType;
}
