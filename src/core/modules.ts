import { createContext } from 'react';
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

/** Modules actifs, fournis par l'app : l'Accueil y lit les `HomeCard` sans importer d'autre module. */
export const ModulesContext = createContext<ModuleDef[]>([]);
