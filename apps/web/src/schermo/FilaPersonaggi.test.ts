/** Fila dei ritratti sul proiettore: chi è presente, chi parla, nessun altrove, niente se vuota. */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { PersonaggioScena } from '@cantastorie/shared';
import { FilaPersonaggi } from './FilaPersonaggi';

const PERSONAGGI: PersonaggioScena[] = [
  { id: 'png_oste', nome: 'Oste Bruno', ritratto: '/r/oste.jpg', presente: true },
  { id: 'png_guardia', nome: 'Guardia Lia', ritratto: null, presente: true },
  { id: 'png_fabbro', nome: 'Fabbro Ugo', ritratto: '/r/ugo.jpg', presente: false },
];

const html = (parlante: string | null, personaggi: PersonaggioScena[] = PERSONAGGI) =>
  renderToStaticMarkup(createElement(FilaPersonaggi, { personaggi, parlante }));

describe('FilaPersonaggi (proiettore)', () => {
  it('mostra i presenti con il primo nome, niente di quelli altrove', () => {
    const out = html(null);
    expect(out).toContain('data-testid="personaggio-png_oste"');
    expect(out).toContain('data-testid="personaggio-png_guardia"');
    expect(out).not.toContain('png_fabbro');
    // Primo nome, come nelle altre righe dello schermo («Oste Bruno» → «Oste»).
    expect(out).toContain('>Oste<');
    expect(out).toContain('>Guardia<');
  });

  it('chi parla è evidenziato, gli altri no', () => {
    const out = html('png_guardia');
    expect(out).toContain('data-testid="personaggio-png_guardia" data-parla="true"');
    expect(out).toContain('data-testid="personaggio-png_oste" data-parla="false"');
  });

  it('il ritratto mancante diventa un’iniziale, quello presente un’immagine', () => {
    const out = html(null);
    expect(out).toContain('src="/r/oste.jpg"');
    expect(out).toContain('>G<');
    expect(out).not.toContain('<img src="/r/ugo.jpg"');
  });

  it('nessun presente (o nessun dato): non rende nulla', () => {
    expect(renderToStaticMarkup(createElement(FilaPersonaggi, { personaggi: undefined, parlante: null }))).toBe('');
    expect(html(null, [PERSONAGGI[2]!])).toBe('');
  });
});
