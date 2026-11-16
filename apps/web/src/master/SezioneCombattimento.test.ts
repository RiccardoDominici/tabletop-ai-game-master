/** Game Master panel, «Combattimento» (docs/combattimento.md): a fight asked from the panel with manual rolls, not started yet. */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { StatoMaster } from '@tabletop-ai-gm/shared';
import { SezioneCombattimento } from './SezioneCombattimento';

const stato = (c: Partial<NonNullable<StatoMaster['combattimento']>>): StatoMaster =>
  ({ combattimento: { attivo: false, schede: [], condizioni: [], ...c }, tavolo: {} }) as unknown as StatoMaster;
const render = (s: StatoMaster): string => renderToStaticMarkup(createElement(SezioneCombattimento, { stato: s }));

describe('SezioneCombattimento (Game Master panel)', () => {
  it('asked, not started: it says initiative comes at the close, and offers «Termina» to cancel instead of «Inizia»', () => {
    const out = render(stato({ chiesto: true }));
    expect(out).toContain('alla chiusura: si tira l’iniziativa');
    expect(out).toContain('data-testid="master-combattimento-termina"');
    expect(out).not.toContain('data-testid="master-combattimento-inizia"');
  });

  it('no fight and none asked: «Inizia combattimento»', () => {
    const out = render(stato({}));
    expect(out).toContain('non in corso');
    expect(out).toContain('data-testid="master-combattimento-inizia"');
  });
});
