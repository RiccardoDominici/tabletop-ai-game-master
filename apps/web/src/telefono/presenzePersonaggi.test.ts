import { describe, expect, it } from 'vitest';
import type { PersonaggioScena } from '@cantastorie/shared';
import { altrove, apriConNome, presentiQui } from './presenzePersonaggi';

const VISTA: PersonaggioScena[] = [
  { id: 'png_oste', nome: 'Oste Bruno', ritratto: null, presente: true },
  { id: 'png_guardia', nome: 'Sorella Teodora', ritratto: '/r/g.jpg', presente: false },
];

describe('fascia «Qui con voi» sul telefono', () => {
  it('presenti e altrove, separati; senza lista niente', () => {
    expect(presentiQui(VISTA).map((p) => p.id)).toEqual(['png_oste']);
    expect(altrove(VISTA).map((p) => p.id)).toEqual(['png_guardia']);
    expect(presentiQui(undefined)).toEqual([]);
    expect(altrove(undefined)).toEqual([]);
  });

  it('toccare un presente mette «Nome, » all’inizio solo se la casella è vuota', () => {
    expect(apriConNome('', 'Oste Bruno')).toBe('Oste, ');
    expect(apriConNome('   ', 'Sorella Teodora')).toBe('Teodora, ');
    expect(apriConNome('Aspetto', 'Oste Bruno')).toBeNull();
  });
});
