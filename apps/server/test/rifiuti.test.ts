/**
 * D2, second pass of the final end-to-end run (indagine-B T10): after «Carisma 3 contro CD 13, fallita» toward Ugo,
 * Haiku still had him say «Il sentiero lo conosco io» and point the path. After a failed social check toward an NPC,
 * that NPC refuses for the rest of the turn: the Engine marks it (`negati`), the repertoire keeps only its refusal,
 * and its improvised lines that give in are replaced by its refusal (narrazione/guardia-rifiuti.ts). The run's case on
 * fixture names, in Italian and English, then with the whole server.
 */
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { StatoTavolo } from '@tabletop-ai-gm/shared';
import { caricaCampagna } from '../src/campagna/caricatore';
import { caricaSchede } from '../src/campagna/schede';
import { impostaLingua } from '../src/lingua';
import { loggerMuto } from '../src/logger';
import { guardiaRifiuti } from '../src/narrazione/guardia-rifiuti';
import { DadiACopione } from '../src/prove/dadi';
import { MotoreProve } from '../src/prove/motore';
import type { ArbitroProve, DecisioneProva, IngressoArbitroProve } from '../src/prove/tipi';
import { caricaRepertorio } from '../src/repertorio/caricatore';
import { nomiDeiPng } from '../src/repertorio/pertinenza';
import { StatoRepertorio } from '../src/repertorio/stato';
import { StatoOrologi } from '../src/scena/orologi';
import { orologioDiSistema } from '../src/turni/orologio';
import { Prova, agisci, attendi, inizia } from './aiuti/partita';

const FIX = path.join(import.meta.dirname, 'fixtures', 'campagne');
const c = caricaCampagna(path.join(FIX, 'prove'));
const base = (id: string): DecisioneProva => ({ id, tipo: 'nessuna', caratteristica: null, abilita: null, bersaglio: null, arma: null, prova_scena: null, difficolta: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null });
/** The arbiter of the run: Charisma (persuasion) toward the NPC, with or without the target written. */
class Arbitro implements ArbitroProve {
  constructor(private readonly conBersaglio = true) {}
  async classifica(i: IngressoArbitroProve): Promise<Record<string, DecisioneProva>> {
    return Object.fromEntries(i.azioni.map((a) => [a.id, /pane|monete/i.test(a.testo) ? { ...base(a.id), tipo: 'prova', abilita: 'persuasione', bersaglio: this.conBersaglio ? 'png_bertoldo' : null } : base(a.id)]));
  }
}

describe('refusal guard', () => {
  const g = guardiaRifiuti(new Set(['png_bertoldo']), nomiDeiPng(c));

  it('the NPC who refused: a line that gives in is replaced, a line that says no stays', () => {
    expect(g('png_bertoldo', 'Il sentiero lo conosco io: passa dietro il mulino.')).toBe('png_bertoldo');
    expect(g('png_bertoldo', 'No, non te lo dico. Torna domani.')).toBeNull();
    // Another NPC is free to speak.
    expect(g('png_ruggero', 'Il sentiero passa dietro il mulino.')).toBeNull();
  });

  it('a narrator sentence where that NPC gives, points or reveals', () => {
    expect(g('narratore', 'Bertoldo mastica il pane in silenzio, poi indica con la mano il sentiero che sale.')).toBe('png_bertoldo');
    expect(g('narratore', 'Teo porge a Bertoldo il pane e gli chiede la strada.')).toBeNull();
    expect(g('narratore', 'Bertoldo non indica niente: guarda il fiume.')).toBeNull();
  });

  it('in English', () => {
    impostaLingua('en');
    try {
      const e = caricaCampagna(path.join(FIX, 'en-mini'));
      const ge = guardiaRifiuti(new Set(['png_keeper']), nomiDeiPng(e));
      expect(ge('png_keeper', 'The cellar is behind the counter, friend.')).toBe('png_keeper');
      expect(ge('png_keeper', 'No. Nothing to see here.')).toBeNull();
      expect(ge('narratore', 'Hale wipes his hands and points at the cellar door.')).toBe('png_keeper');
    } finally {
      impostaLingua('it');
    }
  });
});

describe('the Engine marks who refused; the repertoire keeps only the refusal', () => {
  const schede = caricaSchede(c);
  const nome = (id: string): string => c.pg.find((p) => p.id === id)?.nome ?? c.png.find((p) => p.id === id)?.nome ?? id;
  const motore = (arbitro: ArbitroProve, dadi: number[]) =>
    new MotoreProve({ schede, arbitro, log: loggerMuto(), orologio: orologioDiSistema, attivo: true, conIndizi: false, contesto: () => ({ campagna: c, scenaPubblica: '', narrazione: '', versione: 1, pgAlTavolo: ['pg_ida', 'pg_teo'], nome }), dadi: new DadiACopione(dadi) });

  it('a failed social check toward the NPC (written target, or the NPC the action speaks to) → negati', async () => {
    const testo = 'Porto a Bertoldo il pane del tempio e gli chiedo la strada.';
    const r = await motore(new Arbitro(), [2]).risolvi(1, [{ id: 'a1', autore: 'pg_ida', testo, privata: false, revisione: 1 }]);
    expect(r.negati).toEqual([{ png: 'png_bertoldo', autore: 'pg_ida', privata: false }]);
    const senzaBersaglio = await motore(new Arbitro(false), [2]).risolvi(1, [{ id: 'a1', autore: 'pg_ida', testo, privata: false, revisione: 1 }]);
    expect(senzaBersaglio.negati.map((n) => n.png)).toEqual(['png_bertoldo']);
    // A success: nobody refuses.
    expect((await motore(new Arbitro(), [20]).risolvi(1, [{ id: 'a1', autore: 'pg_ida', testo, privata: false, revisione: 1 }])).negati).toEqual([]);
  });

  it('only the NPC’s refusal line is available while it refuses', () => {
    const rifiuto = { ...caricaRepertorio(c).perId.get('bertoldo_saluto')!, id: 'bertoldo_no', tipo: 'rifiuto' as const };
    const rep = caricaRepertorio(c);
    rep.perId.set(rifiuto.id, rifiuto);
    rep.battute.push(rifiuto);
    const s = new StatoRepertorio(rep, c, new StatoOrologi(c));
    s.negati = () => new Set(['png_bertoldo']);
    expect(s.motivoIndisponibile(rep.perId.get('bertoldo_saluto')!)).toMatch(/png_bertoldo ha appena rifiutato/);
    expect(s.motivoIndisponibile(rifiuto)).toBeNull();
  });
});

describe('the run’s case with the whole server', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());
  beforeAll(() => impostaLingua('it'));
  afterAll(() => impostaLingua('it'));

  it('after the failed check Bertoldo does not give the path: his line and the narrator’s become his refusal', async () => {
    prova = new Prova();
    const cartella = prova.campagna('prove');
    const copione = (t: number): string =>
      t === 0
        ? '[narratore] Il fiume rumoreggia.\n[invito] tutti'
        : '[narratore] Ida porge a Bertoldo il pane e gli chiede la strada.\n[png_bertoldo] Benedizione. Il sentiero lo conosco io.\n[narratore] Bertoldo mastica il pane, poi indica con la mano il sentiero del mulino.\n[invito] tutti';
    const { url } = await prova.avvia(cartella, copione, {}, { arbitroProve: new Arbitro(), dadi: new DadiACopione([2]) });
    const schermo = await prova.proiettore(url);
    const ida = await prova.telefono(url, 'pg_ida');
    const s1 = await inizia(schermo, ida);
    const dopo = attendi(ida, (x) => x.fase === 'finestra' && x.turno === 2);
    await agisci(ida, 'pg_ida', 'Porto a Bertoldo il pane del tempio e gli chiedo la strada.', s1.versione_scena);
    const s2: StatoTavolo = await dopo;
    const detto = s2.trascrizione.filter((v) => v.turno === 1).map((v) => v.testo).join(' ');
    expect(detto).not.toMatch(/sentiero/);
    // His refusal, once: the second sentence that gave in is just dropped.
    expect(detto.match(/Bertoldo scuote la testa e non risponde\./g)).toHaveLength(1);
    expect(detto).toContain('Ida porge a Bertoldo il pane');
  });
});
