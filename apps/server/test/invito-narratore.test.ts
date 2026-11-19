/**
 * The narrator's closing invitation (turni/narrazione.ts, invitoDelNarratore): the Engine puts its own lines of the turn
 * (a fall, the round order) before it. Final round, attempt 4, PR T18: a PC's announcement that quoted a question was
 * taken for the invitation, and the table heard the PC fall before his own act.
 */
import { describe, expect, it } from 'vitest';
import { invitoDelNarratore, type VoceUscita } from '../src/turni/narrazione';

const annuncio: VoceUscita = { tipo: 'improvvisata', etichetta: 'narratore', testo: 'Ida: «Lo stringo e chiedo: chi vi ha dato le lettere?».', frasi: ['t1-f0'], attribuita: true };
const invito: VoceUscita = { tipo: 'improvvisata', etichetta: 'narratore', testo: 'Il fuoco crepita. Cosa fate?', frasi: ['t1-f1'] };
const riga: VoceUscita = { tipo: 'usa', id: 'nar_fuoco', per: null, versione: 0, righe: [{ etichetta: 'narratore', testo: 'Il fuoco crepita.' }] };

describe('the narrator\'s closing invitation', () => {
  it('the last improvised narrator line that asks', () => {
    expect(invitoDelNarratore([annuncio, invito])).toBe(invito);
  });
  it('never a player\'s announcement, even when it quotes a question', () => {
    expect(invitoDelNarratore([annuncio])).toBeNull();
    expect(invitoDelNarratore([riga, annuncio])).toBeNull();
  });
  it('not a line, not a statement, not an NPC', () => {
    expect(invitoDelNarratore([riga])).toBeNull();
    expect(invitoDelNarratore([{ ...invito, testo: 'Il fuoco crepita.' }])).toBeNull();
    expect(invitoDelNarratore([{ ...invito, etichetta: 'png_ida' }])).toBeNull();
    expect(invitoDelNarratore([])).toBeNull();
  });
});
