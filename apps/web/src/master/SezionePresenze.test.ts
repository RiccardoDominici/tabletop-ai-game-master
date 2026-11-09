/** Pannello del master: ogni PNG con «In scena», «Altrove» e «Auto» (solo se deciso a mano). */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { PresenzaMaster, StatoMaster } from '@cantastorie/shared';
import { SezionePresenze } from './SezionePresenze';

const PRESENZE: PresenzaMaster[] = [
  { id: 'png_oste', nome: 'Oste Bruno', presente: true, manuale: false, incontrato: true },
  { id: 'png_fabbro', nome: 'Fabbro Ugo', presente: false, manuale: true, incontrato: false },
];
const render = (presenze: PresenzaMaster[] | undefined) =>
  renderToStaticMarkup(createElement(SezionePresenze, { stato: { presenze } as unknown as StatoMaster }));

describe('SezionePresenze (pannello del master)', () => {
  it('ogni PNG ha i due pulsanti; «Auto» solo se la presenza è a mano', () => {
    const out = render(PRESENZE);
    expect(out).toContain('data-testid="master-presenza-in-png_oste"');
    expect(out).toContain('data-testid="master-presenza-altrove-png_fabbro"');
    expect(out).toContain('data-testid="master-presenza-auto-png_fabbro"');
    expect(out).not.toContain('master-presenza-auto-png_oste');
    expect(out).toContain('a mano');
    expect(out).toContain('non ancora incontrato');
  });

  it('senza presenze (server vecchio) non rende nulla', () => {
    expect(render(undefined)).toBe('');
    expect(render([])).toBe('');
  });
});
