import { describe, expect, it } from 'vitest';
import type { StatoTavolo } from '@tabletop-ai-gm/shared';
import { attesaFinestra, testoAttesa } from './attesa';

function stato(parziale: Partial<StatoTavolo> = {}, aspettiamo: string[] = ['pg_paolo', 'pg_giulia']): StatoTavolo {
  return {
    fase: 'finestra',
    pg: [
      { id: 'pg_paolo', nome: 'Paolo Ferri', descrizione: '', telefoni: 1 },
      { id: 'pg_giulia', nome: 'Giulia', descrizione: '', telefoni: 1 },
    ],
    finestra: { aperta: true, turno: 3, invitati: ['pg_paolo', 'pg_giulia'], azioni: [], aspettiamo, chiusura_prevista_ms: null },
    ...parziale,
  } as StatoTavolo;
}

describe('chi stiamo aspettando', () => {
  it('«Aspettiamo: Paolo e Giulia», col primo nome; chi guarda è «te»', () => {
    expect(testoAttesa(stato())).toBe('Aspettiamo: Paolo e Giulia');
    expect(testoAttesa(stato(), 'pg_giulia')).toBe('Aspettiamo: Paolo e te');
    expect(attesaFinestra(stato())).toMatchObject({ ids: ['pg_paolo', 'pg_giulia'], tutti: false });
  });

  it('hanno scritto tutti: si parte; a finestra chiusa niente', () => {
    expect(testoAttesa(stato({}, []))).toBe('Hanno scritto tutti: si parte…');
    expect(testoAttesa(stato({ fase: 'narrazione' }))).toBeNull();
    const chiusa = stato();
    chiusa.finestra = { ...chiusa.finestra, aperta: false };
    expect(testoAttesa(chiusa)).toBeNull();
  });
});
