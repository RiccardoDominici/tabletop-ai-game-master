/** Game Master panel, «Mondo» (docs/mondo.md): attitudes changed, the world's log, owed marks, stalls; secrets behind spoilers. */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { MondoMaster, StatoMaster } from '@tabletop-ai-gm/shared';
import { prossimoLivelloStallo, SezioneMondo, VistaMondo } from './SezioneMondo';

const MONDO: MondoMaster = {
  atteggiamenti: [{ png: 'png_oste', nome: 'Oste Bruno', pg: 'pg_anna', nome_pg: 'Anna', stato: 'amichevole', base: 'indifferente', turno: 3, causa: 'narratore' }],
  cronaca: [
    { turno: 2, id: 'o_piena@1', tipo: 'conseguenza', orologio: 'o_piena', segno: 1, cosa: 'La cantina si allaga.', visto: false, emerso_al_turno: 5 },
    { turno: 4, id: 'p_fiume#0', tipo: 'presagio', orologio: 'o_piena', segno: 2, cosa: "L'argine cede.", visto: true, emerso_al_turno: null },
  ],
  debiti: [{ orologio: 'o_sera', nome: 'La sera scende', debito: 1 }],
  stallo: 2,
};
const render = (mondo: MondoMaster, senzaSpoiler = false) => renderToStaticMarkup(createElement(VistaMondo, { mondo, senzaSpoiler }));

describe('SezioneMondo (Game Master panel)', () => {
  it('shows the attitudes, the log (newest first, seen or off-screen, surfaced), the owed marks and the stall', () => {
    const out = render(MONDO);
    expect(out).toContain('data-testid="master-mondo-atteggiamento-png_oste-pg_anna"');
    expect(out).toContain('Oste Bruno verso Anna: amichevole (era indifferente) · t3 · narratore');
    expect(out.indexOf('argine cede')).toBeGreaterThan(-1);
    expect(out.indexOf('argine cede')).toBeLessThan(out.indexOf('La cantina si allaga.'));
    expect(out).toContain('data-visto="false"');
    expect(out).toContain('emerso al t5');
    expect(out).toContain('La sera scende: 1 segni dovuti a fatti del gioco');
    expect(out).toContain('Stalli di fila: 2 (la prossima mossa del mondo è S3).');
  });

  it('without spoilers, what happened is hidden', () => {
    const out = render(MONDO, true);
    expect(out).not.toContain('La cantina si allaga.');
    expect(out).toContain('attiva gli spoiler');
    expect(out).not.toContain('La sera scende');
  });

  it('nothing from an older server; an empty world says so', () => {
    expect(renderToStaticMarkup(createElement(SezioneMondo, { stato: {} as unknown as StatoMaster }))).toBe('');
    expect(render({ atteggiamenti: [], cronaca: [], debiti: [], stallo: 0 })).toContain('Il mondo non si è ancora mosso.');
    expect([0, 1, 2, 3].map(prossimoLivelloStallo)).toEqual([1, 2, 3, 1]);
  });
});
