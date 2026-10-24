import type { ModuleDef } from '@core/modules';
import { accueil } from '../modules/accueil';
import { planning } from '../modules/planning';
import { agenda } from '../modules/agenda';
import { journal } from '../modules/journal';
import { cap } from '../modules/cap';

// Ajouter un module = un dossier + une ligne. Le retirer = retirer la ligne.
export const modules: ModuleDef[] = [accueil, planning, agenda, journal, cap].sort(
  (a, b) => a.order - b.order,
);
