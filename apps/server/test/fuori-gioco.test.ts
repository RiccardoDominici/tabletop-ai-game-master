/**
 * Chi è fuori gioco non parla né agisce (docs/combattimento.md, «Fuori gioco»). Due bug della e2e finale
 * del 10 novembre (docs/e2e-finale.md):
 * - C1: un PNG a 0 punti ferita trattava per cinque turni e le sue battute uscivano ancora;
 * - C3: il morale tirato all'inizio dello scontro (il colpo d'apertura butta giù un PNG) si perdeva, il
 *   PNG «fuggito» restava in scena e l'attacco dopo apriva un secondo scontro.
 * Il caso ricostruito con le fixture: lo stato delle prove, lo scontro, e col server intero presenza,
 * catalogo, guardia delle righe [png_…] e messaggio del narratore.
 */
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { StatoTavolo, TiroMostrato } from '@tabletop-ai-gm/shared';
import { caricaCampagna } from '../src/campagna/caricatore';
import { caricaSchede } from '../src/campagna/schede';
import { loggerMuto } from '../src/logger';
import { MotoreProve } from '../src/prove/motore';
import { orologioDiSistema } from '../src/turni/orologio';
import { GestoreCombattimento } from '../src/prove/combattimento';
import { DadiACopione } from '../src/prove/dadi';
import { fattiDovuti } from '../src/prove/fatti-dovuti';
import { StatoProve } from '../src/prove/stato';
import type { ArbitroProve, DecisioneProva, IngressoArbitroProve } from '../src/prove/tipi';
import { caricaRegole } from '../src/regole/caricatore';
import { Prova, agisci, attendi, inizia } from './aiuti/partita';

const FIX = path.join(import.meta.dirname, 'fixtures', 'campagne');

describe('stato delle prove: morti e fuggiti', () => {
  it('a terra dai PF, morto e fuggito segnati; la fuga si dimentica col cambio di scena, la morte no', () => {
    const s = new StatoProve(new Map([['png_x', { id: 'png_x', pf_massimi: 6 }], ['png_y', { id: 'png_y', pf_massimi: 6 }]]));
    s.danneggia('png_x', 6);
    expect(s.fuoriGioco('png_x')).toBe('a_terra');
    s.segnaUscito('png_x', 'morto');
    s.segnaUscito('png_y', 'fuggito');
    expect([...s.tuttiFuori()]).toEqual([['png_x', 'morto'], ['png_y', 'fuggito']]);
    // Si salva e si riprende con la sessione.
    const copia = new StatoProve(new Map([['png_x', { id: 'png_x', pf_massimi: 6 }], ['png_y', { id: 'png_y', pf_massimi: 6 }]]));
    copia.importa(s.esporta('seme', 0));
    expect(copia.fuoriGioco('png_y')).toBe('fuggito');
    expect(s.dimenticaFughe()).toEqual(['png_y']);
    expect(s.fuoriGioco('png_y')).toBeNull();
    expect(s.fuoriGioco('png_x')).toBe('morto');
    // Il master che ridà PF a un morto lo riporta in gioco.
    s.cura('png_x', 3);
    expect(s.fuoriGioco('png_x')).toBeNull();
  });
});

describe('morale all’inizio dello scontro (C3)', () => {
  const bx = caricaRegole(path.join(FIX, 'bx')).sistema.combattimento;

  it('il colpo d’apertura butta giù un PNG: il fatto del morale c’è, chi cede fugge per davvero e lo scontro finisce', () => {
    const schede = new Map(Object.entries({ pg_a: 8, png_x: 6, png_y: 6 }).map(([id, p]) => [id, { id, pf_massimi: p }]));
    const dadi = new DadiACopione([2, 5, 6, 6]);
    const stato = new StatoProve(schede);
    const g = new GestoreCombattimento({
      regole: bx,
      stato,
      // Iniziativa per schieramento 2 e 5, poi il morale 6 + 6 = 12 contro 7.
      dadi: () => dadi,
      nome: (id) => id.replace(/^(pg|png)_/, ''),
      attacca: () => null,
      morale: () => 7,
      nuovoIdTiro: () => 'tm',
      log: loggerMuto(),
    });
    stato.danneggia('png_x', 6);
    const cand = [{ id: 'pg_a', lato: 'pg' as const, mod: 0 }, { id: 'png_x', lato: 'png' as const, mod: 0 }, { id: 'png_y', lato: 'png' as const, mod: 0 }];
    const r = g.dopoAzioni({ turno: 1, attacchi: [{ chi: 'pg_a', bersaglio: 'png_x' }], autori: ['pg_a'], candidati: () => cand });
    expect(r.fatti).toContain('Morale dei nemici: 12 contro 7 → CEDONO e fuggono (y).');
    expect(r.fatti.at(-1)).toBe('Il combattimento è finito: i nemici sono fuggiti o fuori combattimento.');
    expect(r.fuggiti).toEqual([{ id: 'png_y', nome: 'y' }]);
    expect(stato.fuoriGioco('png_x')).toBe('morto');
    expect(stato.fuoriGioco('png_y')).toBe('fuggito');
    // La fuga è un fatto che il tavolo deve sentire.
    expect(fattiDovuti([] as TiroMostrato[], [], r.fuggiti)).toEqual([{ tipo: 'fuggito', id: 'png_y', nome: 'y' }]);
  });
});

describe('chi è fuggito non è più bersaglio (C3)', () => {
  it('l’attacco a un PNG fuggito non tira e non apre un secondo scontro; l’arbitro non lo vede in scena', async () => {
    const c = caricaCampagna(path.join(FIX, 'prove'));
    const schede = caricaSchede(c);
    const arbitro: ArbitroProve = { classifica: async (i: IngressoArbitroProve) => Object.fromEntries(i.azioni.map((a) => [a.id, { ...base(a.id), tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'spada_lunga' }])) };
    const nome = (id: string): string => c.pg.find((p) => p.id === id)?.nome ?? c.png.find((p) => p.id === id)?.nome ?? id;
    const presenti = new Set(c.scena.png_presenti.filter((id) => id !== 'png_ruggero'));
    const m = new MotoreProve({ schede, arbitro, log: loggerMuto(), orologio: orologioDiSistema, attivo: true, conIndizi: false, contesto: () => ({ campagna: c, scenaPubblica: '', narrazione: '', versione: 1, pgAlTavolo: ['pg_corrado'], presenti, nome }), dadi: new DadiACopione([15, 3]) });
    m.stato.segnaUscito('png_ruggero', 'fuggito');
    const r = await m.risolvi(1, [{ id: 'a1', autore: 'pg_corrado', testo: 'Colpisco Ruggero con la spada', privata: false, revisione: 1 }]);
    expect(r.tiri).toEqual([]);
    expect(r.fatti[0]).toMatch(/Ruggero lo sgherro ha preso la fuga e non è più qui: nessun tiro/);
    expect(m.inCombattimento).toBe(false);
    expect(m.righePersonaggi({ campagna: c, scenaPubblica: '', narrazione: '', versione: 1, pgAlTavolo: ['pg_corrado'], presenti, nome })).not.toMatch(/- png_ruggero =/);
  });
});

const base = (id: string): DecisioneProva => ({ id, tipo: 'nessuna', caratteristica: null, abilita: null, bersaglio: null, arma: null, prova_scena: null, difficolta: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null });
class Arbitro implements ArbitroProve {
  async classifica(i: IngressoArbitroProve): Promise<Record<string, DecisioneProva>> {
    return Object.fromEntries(i.azioni.map((a) => [a.id, /colpisco/i.test(a.testo) ? { ...base(a.id), tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'spada_lunga' } : base(a.id)]));
  }
}

/** Una battuta di Ruggero nel repertorio: con Ruggero a terra non deve più comparire nel catalogo. */
const BATTUTA_RUGGERO = {
  id: 'ruggero_tratta',
  chi: 'png_ruggero',
  tipo: 'reazione',
  quando: 'i PG parlano con Ruggero',
  temi: ['ruggero'],
  testo: ['[png_ruggero] Fermi. Parliamone, da gente ragionevole.'],
  max_usi: 3,
};

/**
 * A narrator line that NAMES Ruggero acting (third e2e pass: «Zirrà schiocca le dita.», a narrator filler, came out
 * eight turns after Zirrà fell): with Ruggero out of play it leaves the catalogue too, though its speaker is the narrator.
 */
const BATTUTA_SU_RUGGERO = {
  id: 'nar_ruggero_sputa',
  chi: 'narratore',
  tipo: 'reazione',
  quando: 'i PG parlano con Ruggero',
  temi: ['ruggero'],
  testo: ['[narratore] Ruggero sputa nel fiume e ride.'],
  max_usi: 3,
};

describe('PNG a terra col server intero (C1)', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('Ruggero a 0 PF: la sua riga [png_…] si scarta, le sue battute escono dal catalogo, il narratore lo sa, il proiettore non lo mostra', async () => {
    prova = new Prova();
    const cartella = prova.campagna('prove', { battute: { 'png_ruggero.yaml': [BATTUTA_RUGGERO, BATTUTA_SU_RUGGERO] } });
    const copione = (t: number): string =>
      t === 0
        ? '[narratore] Il fiume rumoreggia.\n[invito] tutti'
        : t === 2
          ? '[narratore] La spada di Corrado affonda nel fianco di Ruggero, che crolla nel fango.\n[png_ruggero] Fermi, fermi! Parliamo.\n[narratore] Ida guarda il fiume.\n[invito] tutti'
          : t === 3
            ? // Third e2e pass, bug 2: the narrator has the dead one answer the player who talks to him.
              '[narratore] Ida si china su Ruggero.\n[narratore] Lo sgherro alza la testa e ride.\n[narratore] Parla piano, e dice che il guado è sorvegliato.\n[invito] tutti'
            : '[narratore] Ida e Corrado aspettano sul ponte.\n[invito] tutti';
    // T2: Corrado 10 + 5 colpisce, 8 + 3 = 11 danni: Ruggero (11 PF) va a 0 col colpo che apre lo scontro.
    const { url, messaggi } = await prova.avvia(cartella, copione, {}, { arbitroProve: new Arbitro(), dadi: new DadiACopione([10, 8, 15, 5, 10]) });
    const schermo = await prova.proiettore(url);
    const ida = await prova.telefono(url, 'pg_ida');
    const corrado = await prova.telefono(url, 'pg_corrado');
    const giocaTurno = async (s: StatoTavolo, perIda: string, perCorrado: string): Promise<StatoTavolo> => {
      const dopo = attendi(ida, (x) => x.fase === 'finestra' && x.turno === s.turno + 1);
      await agisci(corrado, 'pg_corrado', perCorrado, s.versione_scena);
      await agisci(ida, 'pg_ida', perIda, s.versione_scena);
      return dopo;
    };
    const s1 = await inizia(schermo, ida);
    // T1, Ruggero in piedi: la sua battuta è nel catalogo, e nessuno è fuori gioco.
    const s2 = await giocaTurno(s1, 'Parlo con Ruggero', 'Aspetto');
    expect(messaggi.at(-1)).toContain('ruggero_tratta');
    expect(messaggi.at(-1)).toContain('nar_ruggero_sputa');
    expect(messaggi.at(-1)).not.toContain('non è più in vita');
    // T2: il colpo lo butta giù. La sua riga [png_…] si scarta prima della voce.
    const s3 = await giocaTurno(s2, 'Guardo il fiume', 'Colpisco Ruggero con la spada');
    const t2 = s3.trascrizione.filter((v) => v.turno === 2).map((v) => v.testo);
    expect(t2).toContain('La spada di Corrado affonda nel fianco di Ruggero, che crolla nel fango.');
    expect(t2.join(' ')).not.toContain('Parliamo');
    // Il messaggio del turno 2 (dopo i tiri) dice già che Ruggero è fuori gioco, e non ha la sua battuta.
    // Nell'SRD un PNG a 0 muore.
    // «Cosa è vero adesso» (the coherence ledger, docs/coerenza.md §2): the fallen are a row of the scene.
    expect(messaggi.at(-1)).toMatch(/## Cosa è vero adesso[^\n]*\n\n- In scena: [^\n]*Ruggero lo sgherro non è più in vita: non parla né agisce, il corpo è lì/);
    // Sul proiettore non è più tra i presenti.
    expect(s3.scena.personaggi?.find((p) => p.id === 'png_ruggero')?.presente ?? false).toBe(false);
    expect(s2.scena.personaggi?.find((p) => p.id === 'png_ruggero')?.presente).toBe(true);
    expect(messaggi.at(-1)).not.toContain('ruggero_tratta');
    // T3, a scontro finito: resta fuori gioco.
    const s4 = await giocaTurno(s3, 'Parlo con Ruggero', 'Aspetto');
    // What the dead one «does» becomes the Engine's line about his state, said once; the rest is dropped.
    const t3 = s4.trascrizione.filter((v) => v.turno === 3).map((v) => v.testo);
    expect(t3).toEqual(['Parlo con Ruggero', 'Aspetto', 'Ida si china su Ruggero.', 'Ruggero giace a terra, senza vita.']);
    expect(messaggi.at(-1)).toContain('Ruggero lo sgherro non è più in vita');
    expect(messaggi.at(-1)).not.toContain('ruggero_tratta');
    // The narrator's own line that names him is gone too.
    expect(messaggi.at(-1)).not.toContain('nar_ruggero_sputa');
  });
});

describe('a PC out of play does not act (run of 15 November)', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('the narrator hears that the unconscious PC does not act, not what the player wrote', async () => {
    prova = new Prova();
    const { url, messaggi } = await prova.avvia(prova.campagna('prove'), () => '[narratore] Il fiume rumoreggia.\n[invito] tutti');
    const schermo = await prova.proiettore(url);
    const ida = await prova.telefono(url, 'pg_ida');
    const master = await prova.master(url);
    const s1 = await inizia(schermo, ida);
    // The Game Master sets Ida's HP to 0 (as an NPC's blow would).
    expect(await master.comanda({ tipo: 'pf', id: 'pg_ida', valore: 0 })).toEqual({ ok: true });
    const dopo = attendi(ida, (x: StatoTavolo) => x.fase === 'finestra' && x.turno === 2);
    await agisci(ida, 'pg_ida', 'Prendo Bertoldo per un braccio e lo porto lontano dal ponte', s1.versione_scena);
    await dopo;
    const m = messaggi.at(-1)!;
    expect(m).toContain('Ida Ferraro (pg_ida): (non agisce, è a terra, privo di sensi');
    expect(m).not.toContain('Prendo Bertoldo per un braccio');
  });
});
