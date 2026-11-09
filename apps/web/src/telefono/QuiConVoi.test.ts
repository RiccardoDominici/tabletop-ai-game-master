/** «Qui con voi» sul telefono: presenti toccabili, altrove attenuati, niente se non c'è nessuno. */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { StatoTavolo } from '@cantastorie/shared';
import { QuiConVoi } from './QuiConVoi';

const stato = (personaggi?: StatoTavolo['scena']['personaggi']) => ({ scena: { personaggi } }) as unknown as StatoTavolo;
const render = (s: StatoTavolo) => renderToStaticMarkup(createElement(QuiConVoi, { stato: s }));

describe('QuiConVoi (telefono)', () => {
  it('i presenti sono pulsanti con il primo nome; gli altrove sono in lista attenuata', () => {
    const out = render(
      stato([
        { id: 'png_oste', nome: 'Oste Bruno', ritratto: '/r/oste.jpg', presente: true },
        { id: 'png_guardia', nome: 'Sorella Teodora', ritratto: null, presente: false },
      ]),
    );
    expect(out).toContain('data-testid="qui-con-voi-png_oste"');
    expect(out).toContain('aria-label="Rivolgiti a Oste Bruno"');
    expect(out).toContain('src="/r/oste.jpg"');
    expect(out).toContain('data-testid="altrove"');
    expect(out).toContain('data-testid="altrove-png_guardia"');
    expect(out).toContain('Sorella Teodora');
    expect(out).not.toContain('qui-con-voi-png_guardia');
  });

  it('nessun PNG (o nessun dato di scena): la fascia non c’è', () => {
    expect(render(stato([]))).toBe('');
    expect(render(stato(undefined))).toBe('');
  });
});
