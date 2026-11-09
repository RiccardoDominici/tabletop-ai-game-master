/** Pannello del master: ogni PNG con «In scena», «Altrove» e «Auto» (solo se deciso a mano). */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { PresenzaMaster, StatoMaster } from '@cantastorie/shared';
import { SezionePresenze } from './SezionePresenze';

const PRESENZE: PresenzaMaster[] = [
  { id: 'png_oste', nome: 'Oste Bruno', presente: true, manuale: false, incontrato: true, nascosto: false, rivelato: false },
  { id: 'png_fabbro', nome: 'Fabbro Ugo', presente: false, manuale: true, incontrato: false, nascosto: false, rivelato: false },
];
const render = (presenze: PresenzaMaster[] | undefined) =>
  renderToStaticMarkup(createElement(SezionePresenze, { stato: { presenze } as unknown as StatoMaster }));

describe('SezionePresenze (pannello del master)', () => {
  it('un PNG nascosto e non ancora rivelato ha il pulsante «Rivela»; uno rivelato o già sentito no', () => {
    const base = { nome: 'Figura', presente: true, manuale: false };
    const out = render([
      { id: 'png_ombra', ...base, incontrato: false, nascosto: true, rivelato: false },
      { id: 'png_velo', ...base, incontrato: false, nascosto: true, rivelato: true },
      { id: 'png_eco', ...base, incontrato: true, nascosto: true, rivelato: false },
    ]);
    expect(out).toContain('data-testid="master-presenza-rivela-png_ombra"');
    expect(out).not.toContain('data-testid="master-presenza-rivela-png_velo"');
    expect(out).not.toContain('data-testid="master-presenza-rivela-png_eco"');
  });
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
