/**
 * Catalogo B2 sul repertorio vero di prova-f0: pertinenza per temi e per PNG (anche per
 * soprannome), segno solo se dovuto, riempitivi solo allo stallo, finali per stato
 * dell'orologio, anti-ripetizione, esempi di voce mai selezionabili.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { RADICE_REPO } from '../src/percorsi';
import { caricaRepertorio } from '../src/repertorio/caricatore';
import { nomiDeiPng, pngNominati, temaPresente } from '../src/repertorio/pertinenza';
import { caricaParoleSegrete } from '../src/repertorio/segreti';
import { StatoRepertorio } from '../src/repertorio/stato';
import { StatoOrologi } from '../src/scena/orologi';

const VERA = path.join(RADICE_REPO, 'campagne', 'prova-f0');
const presente = fs.existsSync(path.join(VERA, 'repertorio'));

describe.skipIf(!presente)('catalogo B2', () => {
  const c = caricaCampagna(VERA);
  const rep = caricaRepertorio(c);
  const parole = caricaParoleSegrete(path.join(VERA, 'repertorio'));
  const nomiPng = nomiDeiPng(c);
  const nuovo = () => {
    const orologi = new StatoOrologi(c);
    return { orologi, s: new StatoRepertorio(rep, c, orologi) };
  };
  const cat = (s: StatoRepertorio, testoAzioni: string, o: Partial<{ turno: number; stallo: boolean; segnoDovuto: boolean }> = {}) =>
    s.catalogo({ turno: o.turno ?? 1, testoAzioni, stallo: o.stallo ?? false, segnoDovuto: o.segnoDovuto ?? false, nomiPng, parole });

  it('soprannomi: «nano» → Baldrin, «ostessa» → Ottavia, «forestiero» → Sebastiano', () => {
    expect([...pngNominati('chiedo al nano se gioca a dadi', nomiPng)]).toEqual(['png_baldrin']);
    expect([...pngNominati("l'ostessa ci porta la zuppa", nomiPng)]).toEqual(['png_ottavia']);
    expect([...pngNominati('parlo con il forestiero alla grata', nomiPng)]).toEqual(['png_sebastiano']);
    expect(pngNominati('guardo il fuoco', nomiPng).size).toBe(0);
    expect(temaPresente('apro un sacco di farina', ['sacco'])).toBe(true);
    expect(temaPresente('guardo i sacchi', ['sacco'])).toBe(false);
  });

  it('solo battute pertinenti, mai gli esempi di voce; il PNG nominato porta le sue', () => {
    const { s } = nuovo();
    const { battute, perche } = cat(s, 'chiedo al nano se gli va una partita a dadi');
    expect(battute.length).toBeGreaterThan(0);
    expect(battute.every((b) => !b.solo_esempio)).toBe(true);
    expect(battute.some((b) => b.chi === 'png_baldrin')).toBe(true);
    expect(battute.some((b) => b.chi === 'png_ottavia' && perche[b.id] === 'png')).toBe(false);
    expect(battute.some((b) => b.tipo === 'segno_orologio')).toBe(false); // segno non dovuto
    expect(battute.some((b) => b.riempitivo)).toBe(false); // niente stallo
  });

  it('segno d’orologio solo quando è dovuto; riempitivi solo allo stallo', () => {
    const { s } = nuovo();
    expect(cat(s, 'guardo il fuoco', { segnoDovuto: true }).battute.map((b) => b.id)).toContain('nar_segno_1');
    const stallo = cat(s, '', { stallo: true }).battute;
    expect(stallo.some((b) => b.riempitivo)).toBe(true);
    expect(stallo.every((b) => b.riempitivo || b.tipo === 'segno_orologio')).toBe(true);
  });

  it('a orologio completo i finali e la folla sono nel catalogo anche senza parole dei giocatori', () => {
    const { s, orologi } = nuovo();
    for (let t = 1; t <= 6; t++) orologi.avanza('o_colpevole', t, false);
    const { battute, perche } = cat(s, 'guardo il fuoco', { turno: 8 });
    const finali = battute.filter((b) => b.tipo === 'finale');
    expect(finali.length).toBeGreaterThan(0);
    expect(finali.every((b) => perche[b.id] === 'stato')).toBe(true);
    // Prima del completo, nessun finale.
    expect(cat(nuovo().s, 'guardo il fuoco').battute.some((b) => b.tipo === 'finale')).toBe(false);
  });

  it('anti-ripetizione: una battuta non torna entro 3 turni', () => {
    const { s } = nuovo();
    const azione = 'chiedo al nano se gli va una partita a dadi';
    const b = cat(s, azione, { turno: 2 }).battute.find((x) => x.max_usi > 1);
    if (!b) return; // nessuna battuta ripetibile pertinente: niente da provare
    expect(s.usa(b.id, 2, false)).toMatchObject({ ok: true });
    for (const t of [3, 4, 5]) expect(cat(s, azione, { turno: t }).battute.map((x) => x.id)).not.toContain(b.id);
    expect(cat(s, azione, { turno: 6 }).battute.map((x) => x.id)).toContain(b.id);
  });
});
