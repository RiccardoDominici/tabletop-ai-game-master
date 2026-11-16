/** Game Master panel, «Coerenza» (docs/coerenza.md §2): the ledger's rows, the violations stopped, private facts behind spoilers. */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { CoerenzaMaster } from '@tabletop-ai-gm/shared';
import { VistaCoerenza } from './SezioneCoerenza';

const C: CoerenzaMaster = {
  entita: [
    { id: 'pg_ida', nome: 'Ida', tipo: 'pg', stato: 'in_piedi', presenza: 'in_scena' },
    { id: 'png_ruggero', nome: 'Ruggero', tipo: 'png', stato: 'morto', presenza: 'in_scena' },
    { id: 'png_bertoldo', nome: 'Bertoldo', tipo: 'png', stato: 'in_piedi', presenza: 'uscito' },
    { id: 'png_lontano', nome: 'Lontano', tipo: 'png', stato: 'in_piedi', presenza: 'altrove' },
  ],
  privati: [{ turno: 2, testo: 'Il lucchetto cede.', conosciuto_da: ['pg_teo'] }],
  eventi: [{ turno: 3, tipo: 'stato', id: 'png_ruggero', da: 'grave', a: 'morto', causa: 'carte del turno' }],
  violazioni: [{ turno: 4, regola: 'R-fuori', azione: 'sostituita', etichetta: 'narratore', frase: 'Ruggero ride.', sostituto: ['Ruggero giace a terra, senza vita.'] }],
};
const render = (c: CoerenzaMaster, senzaSpoiler = false) => renderToStaticMarkup(createElement(VistaCoerenza, { coerenza: c, senzaSpoiler }));

describe('SezioneCoerenza (Game Master panel)', () => {
  it('who is how and where (not those elsewhere), the violations with what was said instead, the journal, the private facts', () => {
    const out = render(C);
    expect(out).toContain('data-testid="master-coerenza-png_ruggero" data-stato="morto"');
    expect(out).toContain('data-presenza="uscito"');
    expect(out).not.toContain('Lontano');
    expect(out).toContain('data-regola="R-fuori"');
    expect(out).toContain('t4 · R-fuori · sostituita');
    expect(out).toContain('Ruggero ride.');
    expect(out).toContain('detto invece: Ruggero giace a terra, senza vita.');
    expect(out).toContain('t3 · png_ruggero: grave → morto (carte del turno)');
    expect(out).toContain('Il lucchetto cede.');
    expect(out).toContain('1 violazioni');
  });

  it('without spoilers: the rule and the action stay, the sentences and the private facts do not', () => {
    const out = render(C, true);
    expect(out).toContain('t4 · R-fuori · sostituita');
    expect(out).not.toContain('Ruggero ride.');
    expect(out).not.toContain('Il lucchetto cede.');
  });
});
