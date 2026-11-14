/**
 * Set di regole delle campagne (docs/regole.md): caricatore (SRD predefinito, set a 2d6 e sotto soglia,
 * set rotto → SRD, licenza non libera → regole/.gitignore), tiri puri dei tre tipi, passi del manuale
 * per parole chiave, e un turno coi set di prova attraverso il Motore delle prove (arbitro finto).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { caricaSchede, type SchedaNumerica } from '../src/campagna/schede';
import { loggerMuto } from '../src/logger';
import { DadiACopione } from '../src/prove/dadi';
import { MotoreProve, dadiAttiviRegole, type AzionePerProve } from '../src/prove/motore';
import { passiPerAzioni, schemaRegole } from '../src/prove/arbitro-regole';
import type { ArbitroProve, DecisioneRegole, IngressoArbitroProve } from '../src/prove/tipi';
import { caricaRegole, leggiSistema } from '../src/regole/caricatore';
import { cercaEstratti } from '../src/regole/estratti';
import { ID_DIFESA, intervalloFascia, tiraCol } from '../src/regole/risoluzione';
import { caricaSchedeGeneriche } from '../src/regole/schede';
import type { RegoleCampagna } from '../src/regole/tipi';
import { orologioDiSistema } from '../src/turni/orologio';
import { caricaRepertorio } from '../src/repertorio/caricatore';
import { rispondeA } from '../src/repertorio/stato';
import { regolaEsiti } from '../src/prove/testi';
import { impostaLingua } from '../src/lingua';

const FIX = path.join(import.meta.dirname, 'fixtures', 'campagne');

describe('caricatore del set di regole', () => {
  it('senza regole.yaml: l’SRD 5.2 del codice, con riassunto e passi dagli assets', () => {
    const r = caricaRegole(path.join(FIX, 'prove'));
    expect(r.sistema).toMatchObject({ id: 'srd-5.2', srd: true, risoluzione: { tipo: 'd20_cd' } });
    expect(r.sistema.caratteristiche).toHaveLength(6);
    expect(r.riassunto).toMatch(/Classe Difficoltà/);
    expect(r.estratti.map((e) => e.id)).toContain('influenzare');
  });

  it('il set a 2d6 e quello sotto soglia, senza avvisi', () => {
    const p = caricaRegole(path.join(FIX, 'pbta'));
    expect(p.sistema).toMatchObject({ id: 'due-sei-prova', srd: false, modificatore: 'diretto', risoluzione: { tipo: '2d6_fasce', facce: 6, numero: 2 }, vantaggio: { tipo: 'bonus', valore: 1 } });
    expect(p.sistema.mosse.map((m) => m.id)).toEqual(['convincere', 'agire_sotto_pressione', 'menare_le_mani', 'leggere_la_situazione']);
    expect(p.avvisi).toEqual([]);
    const s = caricaRegole(path.join(FIX, 'soglia'));
    expect(s.sistema).toMatchObject({ modificatore: 'soglia', risoluzione: { tipo: 'sotto_soglia', facce: 100, critico: 1, disastro: 100 }, vantaggio: { tipo: 'dado_bonus' } });
    expect(s.sistema.risoluzione.gradi.map((g) => g.divisore)).toEqual([5, 2]);
  });

  it('un set rotto non ferma la sessione: si torna all’SRD; gli errori dicono cosa manca', () => {
    const errori: string[] = [];
    expect(leggiSistema({ id: 'x', risoluzione: { tipo: '3d6' } }, errori, [])).toBeNull();
    expect(errori.join(' ')).toMatch(/risoluzione\.tipo/);
    const e2: string[] = [];
    leggiSistema({ id: 'y', risoluzione: { tipo: 'd20_cd' }, caratteristiche: [{ id: 'Forza Bruta' }], difficolta: [{ id: 'media' }] }, e2, []);
    expect(e2.join(' ')).toMatch(/snake_case/);
    expect(e2.join(' ')).toMatch(/serve valore/);
    expect(e2.join(' ')).toMatch(/licenza\.libera/);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tabletop-ai-gm-regole-'));
    fs.mkdirSync(path.join(dir, 'regole'));
    fs.writeFileSync(path.join(dir, 'regole', 'regole.yaml'), 'id: rotto\nrisoluzione: {tipo: boh}\n');
    expect(caricaRegole(dir).sistema.srd).toBe(true);
  });

  it('licenza non libera: il caricatore scrive regole/.gitignore e il set resta fuori dal repository', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tabletop-ai-gm-regole-'));
    fs.cpSync(path.join(FIX, 'pbta', 'regole'), path.join(dir, 'regole'), { recursive: true });
    const f = path.join(dir, 'regole', 'regole.yaml');
    fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/libera: true/, 'libera: false'));
    expect(caricaRegole(dir).sistema.licenza.libera).toBe(false);
    expect(fs.readFileSync(path.join(dir, 'regole', '.gitignore'), 'utf8')).toMatch(/^\*$/m);
  });
});

describe('tiri dei set non SRD', () => {
  const p = caricaRegole(path.join(FIX, 'pbta')).sistema;
  const s = caricaRegole(path.join(FIX, 'soglia')).sistema;

  it('2d6 a fasce: 10+, 7–9, 6-; bonus del vantaggio e difficoltà rischiosa', () => {
    expect(p.risoluzione.fasce.map((_, i) => intervalloFascia(p.risoluzione.fasce, i))).toEqual(['10+', '7–9', '6-']);
    expect(tiraCol(p, new DadiACopione([6, 4]), 2, null, null, 'Fascino')).toMatchObject({ dadi: [6, 4], dado: 10, totale: 12, grado: { id: 'successo' }, riuscita: true });
    const parz = tiraCol(p, new DadiACopione([3, 4]), 0, null, null, 'Fascino, Convincere qualcuno');
    expect(parz).toMatchObject({ totale: 7, grado: { id: 'parziale', nome: 'Successo con un costo' }, riuscita: true, contro: { tipo: 'fasce', descrizione: '7–9' } });
    expect(parz.regola).toBe('2d6+0 (Fascino, Convincere qualcuno): 7–9, successo con un costo');
    expect(tiraCol(p, new DadiACopione([3, 3]), 1, 'rischiosa', 'vantaggio', 'Sangue freddo')).toMatchObject({ modificatore: 1, totale: 7, vantaggio: 'vantaggio' });
    expect(tiraCol(p, new DadiACopione([1, 2]), 2, null, null, 'Vigore')).toMatchObject({ totale: 5, grado: { id: 'fallimento' }, riuscita: false });
  });

  it('d100 sotto soglia: difficoltà come divisore, gradi, dado bonus, critico e disastro', () => {
    // d10 a copione: unità 3 (4−1), decine 2 (3−1) → 23.
    const e = tiraCol(s, new DadiACopione([4, 3]), 65, 'difficile', null, 'Persuadere');
    expect(e).toMatchObject({ dado: 23, contro: { tipo: 'soglia', valore: 32 }, riuscita: true, grado: { id: 'successo', nome: 'Successo difficile' } });
    expect(e.regola).toBe('Persuadere 65%: d100 difficile, serve 32 o meno');
    const bonus = tiraCol(s, new DadiACopione([4, 3, 1]), 65, null, 'vantaggio', 'Persuadere');
    expect(bonus).toMatchObject({ dadi: [23, 3], dado: 3, grado: { nome: 'Successo estremo' } });
    expect(tiraCol(s, new DadiACopione([1, 1]), 99, null, null, 'X')).toMatchObject({ dado: 100, riuscita: false, grado: { id: 'disastro' } });
    expect(tiraCol(s, new DadiACopione([2, 1]), 5, null, null, 'X')).toMatchObject({ dado: 1, riuscita: true, grado: { id: 'critico' } });
  });

  it('d20 sotto soglia (alla Cairn): vantaggio = due dadi, si tiene il più basso', () => {
    const errori: string[] = [];
    const cairn = leggiSistema({ id: 'cairn-like', risoluzione: { tipo: 'sotto_soglia', dado: 20 }, caratteristiche: [{ id: 'forza', nome: 'Forza' }], vantaggio: { tipo: 'due_dadi' }, licenza: { nome: 'CC-BY-SA-4.0', libera: true } }, errori, [])!;
    expect(errori).toEqual([]);
    expect(tiraCol(cairn, new DadiACopione([14]), 11, null, null, 'Forza')).toMatchObject({ dado: 14, riuscita: false });
    expect(tiraCol(cairn, new DadiACopione([14, 9]), 11, null, 'vantaggio', 'Forza')).toMatchObject({ dadi: [14, 9], dado: 9, riuscita: true });
  });
});

describe('attacco d20 contro la difesa del bersaglio', () => {
  const d20 = caricaRegole(path.join(FIX, 'prove')).sistema;
  // La CA del bersaglio fa da difficoltà: un attacco la batte come una CD, ma si chiama CA.
  const difesa = { ...d20, difficolta: [{ id: ID_DIFESA, nome: 'difesa di Goblin', valore: 14, divisore: null, modificatore: null }] };
  afterEach(() => impostaLingua('it'));

  it('la carta dice CA (non CD) e la regola la nomina una volta sola', () => {
    expect(d20.risoluzione.tipo).toBe('d20_cd');
    const att = tiraCol(difesa, new DadiACopione([12]), 3, ID_DIFESA, null, 'Spada lunga', true);
    expect(att).toMatchObject({ contro: { tipo: 'CA', valore: 14, descrizione: 'difesa di Goblin' }, totale: 15, riuscita: true });
    expect(att.regola).toBe('Spada lunga: d20+3 contro CA 14 (difesa di goblin)');
    // Una prova (non un attacco) contro la stessa difficoltà resta una CD.
    expect(tiraCol(difesa, new DadiACopione([12]), 3, ID_DIFESA, null, 'Spada lunga', false)).toMatchObject({ contro: { tipo: 'CD' } });
  });

  it('in inglese la sigla è AC, dal pacchetto della lingua', () => {
    impostaLingua('en');
    const att = tiraCol(difesa, new DadiACopione([12]), 3, ID_DIFESA, null, 'Longsword', true);
    expect(att.regola).toBe('Longsword: d20+3 against AC 14 (difesa di goblin)');
  });

  it('l’attacco del Motore: CA nella carta, arma e abilità una volta sola nella regola', async () => {
    // Le schede numeriche (le armi di chi attacca) vanno passate al Motore come in campagna.
    const { m } = motore('bx', [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4], new ArbitroFinto({
      'Colpisco Ruggero con la spada': { tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'spada' },
    }), caricaSchede(caricaCampagna(path.join(FIX, 'bx'))));
    const r = await m.risolvi(1, [az('a1', 'pg_corrado', 'Colpisco Ruggero con la spada')]);
    expect(r.tiri[0]).toMatchObject({ contro: { tipo: 'CA', valore: 13 }, regola: 'Spada, Forza: d20+1 contro CA 13 (difesa di ruggero lo sgherro)' });
  });
});

describe('passi del manuale', () => {
  const r = caricaRegole(path.join(FIX, 'pbta'));
  it('per parole chiave, pochi e deterministici', () => {
    expect(cercaEstratti(r.estratti, 'Convinco Bertoldo a lasciarci passare').map((e) => e.id)).toEqual(['convincere']);
    expect(cercaEstratti(r.estratti, 'Colpisco Ruggero con la spada').map((e) => e.id)).toEqual(['combattere']);
    expect(cercaEstratti(r.estratti, 'Mi siedo e guardo il tramonto')).toEqual([]);
    expect(passiPerAzioni(r, ['Convinco Bertoldo', 'Aiuto Ida'])).toMatch(/### Convincere qualcuno[\s\S]*### Aiutare un compagno/);
  });
  it('lo schema dell’arbitro usa il vocabolario del set', () => {
    const sch = JSON.stringify(schemaRegole(r));
    expect(sch).toContain('"menare_le_mani"');
    expect(sch).toContain('"sangue_freddo"');
    expect(sch).not.toContain('"persuasione"');
  });
});

// ------------------------------------------------------------------ un turno col Motore

const vuota = (id: string): DecisioneRegole => ({ id, tipo: 'nessuna', caratteristica: null, abilita: null, bersaglio: null, arma: null, prova_scena: null, difficolta: null, abilita_bersaglio: null, mossa: null, vantaggio: null, motivo: '', aiuta: null, reazione: null });
class ArbitroFinto implements ArbitroProve<DecisioneRegole> {
  constructor(private readonly r: Record<string, Partial<DecisioneRegole>>) {}
  async classifica(i: IngressoArbitroProve): Promise<Record<string, DecisioneRegole>> {
    return Object.fromEntries(i.azioni.map((a) => [a.id, { ...vuota(a.id), ...(this.r[a.testo] ?? {}) }]));
  }
}
function motore(cartella: string, dadi: number[], arbitro: ArbitroProve<DecisioneRegole>, schedeNumeriche: ReadonlyMap<string, SchedaNumerica> = new Map()): { m: MotoreProve; regole: RegoleCampagna } {
  const c = caricaCampagna(path.join(FIX, cartella));
  const regole = caricaRegole(path.join(FIX, cartella));
  const schede = caricaSchedeGeneriche(regole.sistema, c);
  for (const s of schede.values()) expect(s.avvisi, s.id).toEqual([]);
  expect(dadiAttiviRegole(c, schede, regole.sistema.nome).attivo).toBe(true);
  const nome = (id: string): string => c.pg.find((p) => p.id === id)?.nome ?? c.png.find((p) => p.id === id)?.nome ?? id;
  const m = new MotoreProve({
    schede: schedeNumeriche,
    regole: { regole, schede },
    arbitro,
    log: loggerMuto(),
    orologio: orologioDiSistema,
    attivo: true,
    conIndizi: false,
    contesto: () => ({ campagna: c, scenaPubblica: '', narrazione: '', versione: 1, pgAlTavolo: c.pg.map((p) => p.id), nome }),
    dadi: new DadiACopione(dadi),
  });
  return { m, regole };
}
const az = (id: string, autore: string, testo: string): AzionePerProve => ({ id, autore, testo, privata: false, revisione: 1 });

describe('un turno coi set di prova', () => {
  it('2d6: la mossa Convincere con 7–9, e l’attacco con lo scambio del successo parziale', async () => {
    const { m } = motore('pbta', [4, 3, 3, 3, 5, 5, 5, 6], new ArbitroFinto({
      'Convinco Bertoldo a lasciarci passare': { tipo: 'prova', mossa: 'convincere', bersaglio: 'png_bertoldo' },
      'Colpisco Ruggero con la spada': { tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'spada' },
    }));
    const r = await m.risolvi(1, [az('a1', 'pg_ida', 'Convinco Bertoldo a lasciarci passare'), az('a2', 'pg_corrado', 'Colpisco Ruggero con la spada')]);
    expect(r.tiri[0]).toMatchObject({ risoluzione: '2d6_fasce', facce: 6, dadi: [4, 3], dado: 7, modificatore: 2, totale: 9, grado: { id: 'parziale' }, regola: '2d6+2 (Fascino, Convincere qualcuno): 7–9, successo con un costo' });
    expect(r.fatti[0]).toMatch(/→ SUCCESSO CON UN COSTO\. Esito della mossa «Convincere qualcuno»: il PNG lo fa, ma vuole qualcosa in cambio, subito\./);
    // Corrado: 3+3+2 = 8 (parziale) → spada 1d8 = 5 − armatura 1 = 4; scambio: Ruggero 5+5+2 = 12 → mazza 6 − 1 = 5.
    expect(r.tiri.slice(1).map((t) => [t.chi, t.totale, t.grado?.id, t.danno?.totale])).toEqual([
      ['pg_corrado', 8, 'parziale', 4],
      ['png_ruggero', 12, 'successo', 5],
    ]);
    expect(m.stato.puntiFerita('png_ruggero')).toEqual({ attuali: 3, massimi: 7 });
    expect(m.stato.puntiFerita('pg_corrado')).toEqual({ attuali: 3, massimi: 8 });
    expect(r.fatti[1]).toMatch(/Scambio: Ruggero lo sgherro colpisce Corrado Lanzi: 5 danni \(raccontalo in una frase sua\)/);
  });

  it('d100: Persuadere difficile sotto la soglia, con il grado nella carta e nel fatto', async () => {
    const { m } = motore('soglia', [4, 3], new ArbitroFinto({ 'Convinco Bertoldo a lasciarci passare': { tipo: 'prova', abilita: 'persuadere', bersaglio: 'png_bertoldo', difficolta: 'difficile' } }));
    const r = await m.risolvi(1, [az('a1', 'pg_ida', 'Convinco Bertoldo a lasciarci passare')]);
    expect(r.tiri[0]).toMatchObject({ risoluzione: 'sotto_soglia', facce: 100, dado: 23, contro: { tipo: 'soglia', valore: 32 }, grado: { nome: 'Successo difficile' }, riuscita: true });
    expect(r.fatti[0]).toBe('[1] Ida Ferraro: Persuadere 65%: d100 difficile, serve 32 o meno: 23 → SUCCESSO DIFFICILE.');
  });
});

describe('coerenza col set: narratore e repertorio', () => {
  it('il narratore riceve come si tira e che cosa vuol dire ogni fascia (un 7–9 non è un successo pieno)', () => {
    const { m } = motore('pbta', [1], new ArbitroFinto({}));
    const r = m.regolaEsiti();
    expect(r.startsWith(regolaEsiti())).toBe(true);
    expect(r).toContain('Regole del manuale «Mondo a 2d6 (set di prova)»: Si tirano 2d6 più la statistica');
    expect(r).toContain('- 7–9 «Successo con un costo»: riesce, ma devi dare un costo, una scelta difficile o una complicazione');
    expect(r).toContain('- 6- «Fallimento»: non riesce, e la situazione peggiora');
    expect(r).toContain('anche l’avversario colpisce');
    const { m: d100 } = motore('soglia', [1], new ArbitroFinto({}));
    expect(d100.regolaEsiti()).toMatch(/«Successo difficile»: riesce particolarmente bene\.[\s\S]*«Disastro»/);
  });

  it('richiede.prova accetta gli id del set (la mossa convincere) e si apre solo dopo quella riuscita', async () => {
    const c = caricaCampagna(path.join(FIX, 'pbta'));
    const b = caricaRepertorio(c).perId.get('bertoldo_confessa')!;
    expect(b.richiede.prova).toBe('convincere');
    const { m } = motore('pbta', [6, 4], new ArbitroFinto({ 'Convinco Bertoldo': { tipo: 'prova', mossa: 'convincere', bersaglio: 'png_bertoldo' } }));
    const r = await m.risolvi(1, [az('a1', 'pg_ida', 'Convinco Bertoldo')]);
    const prove = r.perAzione.get('a1')!.riuscite;
    expect(prove).toEqual(expect.arrayContaining(['prova', 'convincere', 'fascino']));
    expect(rispondeA(b, { autore: 'pg_ida', privata: false, prove })).toBe(true);
    expect(rispondeA(b, { autore: 'pg_ida', privata: false, prove: ['prova'] })).toBe(false);
  });
});
