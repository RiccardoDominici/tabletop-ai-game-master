/**
 * The facts a prewritten line carries (repertorio/fatti-battuta.ts, docs/repertorio.md «Facts a line carries»): the
 * loader reads `attori`, `menzionati` and `richiede.stati`, and the Engine keeps a line out of the catalogue when its
 * facts contradict the ledger, before the reader sees it. Invented fixture `mini`: Oste Bruno and Guardia Lia.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import YAML from 'yaml';
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import type { EntitaRegistro } from '../src/coerenza/registro';
import { caricaRepertorio, ErroreRepertorio } from '../src/repertorio/caricatore';
import { motivoControRegistro, motivoEsito } from '../src/repertorio/fatti-battuta';
import type { EsitoRegistro } from '../src/coerenza/registro';
import { StatoRepertorio } from '../src/repertorio/stato';
import type { Battuta } from '../src/repertorio/tipi';
import { StatoOrologi } from '../src/scena/orologi';

const campagna = caricaCampagna(path.join(import.meta.dirname, 'fixtures', 'campagne', 'mini'));

function carica(battute: Array<Record<string, unknown>>): Battuta[] {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fatti-battuta-'));
  try {
    fs.writeFileSync(path.join(dir, 'narrazione.yaml'), YAML.stringify({ battute }));
    return caricaRepertorio(campagna, undefined, dir).battute;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const base = (id: string, testo: string[], altro: Record<string, unknown> = {}): Record<string, unknown> => ({ id, chi: 'narratore', tipo: 'momento', quando: 'un PG guarda la sala', temi: ['sala'], testo, ...altro });

const e = (id: string, nomi: string[], stato: EntitaRegistro['stato'], presenza: EntitaRegistro['presenza'] = 'in_scena'): EntitaRegistro => ({ id, tipo: 'png', nome: nomi[0]!, nomi, stato, presenza, uscito: null });
const ledger = (oste: Partial<EntitaRegistro>, guardia: Partial<EntitaRegistro> = {}): EntitaRegistro[] => [
  { ...e('png_oste', ['Oste Bruno', 'Bruno', 'oste'], 'in_piedi'), ...oste },
  { ...e('png_guardia', ['Guardia Lia', 'Lia'], 'in_piedi'), ...guardia },
];

describe('the loader reads the facts a line carries', () => {
  it('attori, menzionati and richiede.stati; untagged lines have attori null', () => {
    const [a, b] = carica([
      base('nar_conti', ['[narratore] Bruno conta le monete sul banco.'], { attori: ['png_oste'], menzionati: ['png_guardia'] }),
      base('nar_corpo', ['[narratore] Il corpo di Bruno è riverso dietro il banco.'], { richiede: { stati: { png_oste: ['a_terra', 'morto'] } } }),
    ]);
    expect(a).toMatchObject({ attori: ['png_oste'], menzionati: ['png_guardia'] });
    expect(b!.attori).toBeNull();
    expect(b!.richiede.stati).toEqual({ png_oste: ['a_terra', 'morto'] });
  });

  it('a wrong id, a wrong state, or stati in an alternative is an error (ignoring it would offer the line)', () => {
    expect(() => carica([base('x1', ['[narratore] Qualcosa.'], { attori: ['png_nessuno'] })])).toThrow(ErroreRepertorio);
    expect(() => carica([base('x2', ['[narratore] Qualcosa.'], { richiede: { stati: { png_oste: 'svenuto' } } })])).toThrow(/a_terra/);
    expect(() =>
      carica([base('x3', ['[narratore] Qualcosa.'], { richiede: { oppure: [{ stati: { png_oste: 'morto' } }, { privata: true }] } })]),
    ).toThrow(/stati solo nella base/);
  });
});

describe('the Engine checks the line against the ledger', () => {
  const [conti, corpo, vecchia, parla] = carica([
    base('nar_conti', ['[narratore] Conta le monete sul banco, senza alzare gli occhi.'], { attori: ['png_oste'] }),
    base('nar_corpo', ['[narratore] Il corpo di Bruno è riverso dietro il banco.'], { richiede: { stati: { png_oste: ['a_terra', 'morto'] } } }),
    base('nar_vecchia', ['[narratore] Bruno schiocca le dita.']),
    base('nar_ricorda', ['[narratore] Qualcuno ricorda le storie di Bruno.'], { menzionati: ['png_oste'] }),
  ]) as [Battuta, Battuta, Battuta, Battuta];

  it('a tagged actor must be here and in play, even unnamed (a pronoun, a zero subject)', () => {
    expect(motivoControRegistro(conti, ledger({}))).toBeNull();
    expect(motivoControRegistro(conti, ledger({ presenza: 'uscito' }))).toMatch(/not in the scene/);
    expect(motivoControRegistro(conti, ledger({ stato: 'morto' }))).toMatch(/out of play/);
  });

  it('a tagged state lets a line tell the body, and keeps it back while he stands', () => {
    expect(motivoControRegistro(corpo, ledger({ stato: 'morto' }))).toBeNull();
    expect(motivoControRegistro(corpo, ledger({}))).toMatch(/assumes png_oste a_terra\/morto/);
  });

  it('untagged: a named NPC out of play keeps the line back (the rule before the tags); one away does not', () => {
    expect(motivoControRegistro(vecchia, ledger({ stato: 'fuggito', presenza: 'altrove' }))).toMatch(/names png_oste, out of play/);
    expect(motivoControRegistro(vecchia, ledger({ presenza: 'altrove' }))).toBeNull();
  });

  it('a mention asks nothing', () => {
    expect(motivoControRegistro(parla, ledger({ stato: 'morto' }))).toBeNull();
  });

  it('the catalogue applies it: with the ledger the line is not available, so the reader never sees it', () => {
    const battute = [conti, corpo, vecchia, parla];
    const s = new StatoRepertorio({ battute, perId: new Map(battute.map((b) => [b.id, b])), avvisi: [] }, campagna, new StatoOrologi(campagna));
    s.presenza = null;
    s.presenti = null;
    s.registro = () => ({ entita: ledger({ stato: 'morto' }) });
    expect(s.disponibili().map((b) => b.id)).toEqual(['nar_corpo', 'nar_ricorda']);
    s.registro = () => ({ entita: ledger({}) });
    expect(s.disponibili().map((b) => b.id)).toEqual(['nar_conti', 'nar_vecchia', 'nar_ricorda']);
  });
});

describe('a line that tells an outcome carries it, and the Engine checks it against the card', () => {
  const [colpo, mancato, fuga] = carica([
    base('nar_colpo', ['[narratore] La lama trova il fianco, e Bruno barcolla.'], { attori: ['png_oste'], richiede: { esito: { tipo: 'colpito', bersaglio: 'png_oste' } } }),
    base('nar_mancato', ['[narratore] La lancia taglia l\'aria dove nessuno c\'è più.'], { richiede: { esito: { tipo: 'mancato', chi: 'png_guardia' } } }),
    base('nar_fuga', ['[narratore] Dei passi corrono via, verso la strada.'], { menzionati: ['png_guardia'], richiede: { esito: { tipo: 'fugge', chi: 'png_guardia' } } }),
  ]) as [Battuta, Battuta, Battuta];
  const pg = { id: 'pg_ida', tipo: 'pg' as const, nome: 'Ida', nomi: ['Ida'], stato: 'in_piedi' as const, presenza: 'in_scena' as const, uscito: null };
  const carta = (chi: string, bersaglio: string, riuscita: boolean, aTerra = false): EsitoRegistro => ({ id: `${chi}-${bersaglio}`, chi, nome: chi, bersaglio: { id: bersaglio, nome: bersaglio }, tipo: 'attacco', etichetta: 'x', riuscita, aTerra, privata: false });

  it('the loader reads richiede.esito', () => {
    expect(colpo.richiede.esito).toEqual({ tipo: 'colpito', chi: null, bersaglio: 'png_oste' });
    expect(() => carica([base('x9', ['[narratore] Qualcosa.'], { richiede: { esito: { tipo: 'ferito' } } })])).toThrow(/colpito/);
  });

  it('a hit line: only with a card that hit that target; for an answered action, only that PC\'s card', () => {
    const entita = [pg, ...ledger({})];
    expect(motivoEsito(colpo, entita, { esiti: [carta('pg_ida', 'png_oste', true)] }, null)).toBeNull();
    expect(motivoEsito(colpo, entita, { esiti: [carta('pg_ida', 'png_oste', false)] }, null)).toMatch(/no card of this turn/);
    expect(motivoEsito(colpo, entita, { esiti: [] }, null)).toMatch(/no card/);
    expect(motivoEsito(colpo, entita, { esiti: [carta('pg_ida', 'png_oste', true)] }, 'pg_corrado')).toMatch(/by pg_corrado/);
  });

  it('an NPC\'s miss: its own card missed; a flight: the ledger has it fled', () => {
    const entita = [pg, ...ledger({}, { stato: 'fuggito', presenza: 'altrove' })];
    expect(motivoEsito(mancato, [pg, ...ledger({})], { esiti: [carta('png_guardia', 'pg_ida', false)] }, null)).toBeNull();
    expect(motivoEsito(mancato, [pg, ...ledger({})], { esiti: [carta('png_guardia', 'pg_ida', true)] }, null)).toMatch(/mancato/);
    expect(motivoEsito(fuga, entita, { esiti: [] }, null)).toBeNull();
    expect(motivoEsito(fuga, [pg, ...ledger({})], { esiti: [] }, null)).toMatch(/fleeing/);
    // With the turn's flights known: only a flight of that turn, not one of an earlier turn still in the ledger.
    expect(motivoEsito(fuga, entita, { esiti: [], fughe: new Set(['png_guardia']) }, null)).toBeNull();
    expect(motivoEsito(fuga, entita, { esiti: [], fughe: new Set() }, null)).toMatch(/not a flight of this turn/);
  });

  it('the catalogue and the answered action apply it', () => {
    const battute = [colpo];
    const s = new StatoRepertorio({ battute, perId: new Map(battute.map((b) => [b.id, b])), avvisi: [] }, campagna, new StatoOrologi(campagna));
    s.presenza = null;
    s.presenti = null;
    s.registro = () => ({ entita: [pg, ...ledger({})], esiti: [carta('pg_ida', 'png_oste', true)] });
    expect(s.disponibili().map((b) => b.id)).toEqual(['nar_colpo']);
    expect(s.rispondeA(colpo, { autore: 'pg_ida', privata: false })).toBe(true);
    expect(s.rispondeA(colpo, { autore: 'pg_corrado', privata: false })).toBe(false);
    s.registro = () => ({ entita: [pg, ...ledger({})], esiti: [carta('pg_ida', 'png_oste', false)] });
    expect(s.disponibili()).toEqual([]);
  });

  it('a subito line is checked against the cards of its own turn, also when said in the next window', () => {
    const b = { ...colpo, fino_al_turno: 4 };
    const s = new StatoRepertorio({ battute: [b], perId: new Map([[b.id, b]]), avvisi: [] }, campagna, new StatoOrologi(campagna));
    s.presenza = null;
    s.presenti = null;
    // The ledger moved on to turn 5 (no cards yet); turn 4 had Ida's hit.
    s.registro = () => ({ entita: [pg, ...ledger({})], esiti: [], turno: 5 });
    s.carteDi = (t) => ({ esiti: t === 4 ? [carta('pg_ida', 'png_oste', true)] : [] });
    expect(s.motivoEsitoPer(b, 'pg_ida')).toBeNull();
    expect(s.motivoEsitoPer(b, 'pg_corrado')).toMatch(/by pg_corrado/);
    expect(s.motivoEsitoPer({ ...b, fino_al_turno: undefined }, 'pg_ida')).toMatch(/no card/);
  });

  it('a line written for one action is not offered after its turn', () => {
    const b = { ...colpo, richiede: { ...colpo.richiede, esito: null }, fino_al_turno: 4 };
    const s = new StatoRepertorio({ battute: [b], perId: new Map([[b.id, b]]), avvisi: [] }, campagna, new StatoOrologi(campagna));
    s.presenza = null;
    s.presenti = null;
    expect(s.motivoIndisponibile(b, 4)).toBeNull();
    expect(s.motivoIndisponibile(b, 5)).toMatch(/its moment has passed/);
  });
});
