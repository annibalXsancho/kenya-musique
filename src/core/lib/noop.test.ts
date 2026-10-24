import { describe, expect, it } from 'vitest';
import { modules } from '../../app/modules';

describe('registre des modules', () => {
  it('déclare les 5 modules MVP dans l’ordre', () => {
    expect(modules.map((m) => m.id)).toEqual(['accueil', 'planning', 'agenda', 'journal', 'cap']);
  });
});
