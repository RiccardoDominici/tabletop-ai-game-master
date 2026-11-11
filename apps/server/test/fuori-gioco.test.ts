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
import type { StatoTavolo, TiroMostrato } from '@cantastorie/shared';
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

describe('PNG a terra col server intero (C1)', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('Ruggero a 0 PF: la sua riga [png_…] si scarta, le sue battute escono dal catalogo, il narratore lo sa, il proiettore non lo mostra', async () => {
    prova = new Prova();
    const cartella = prova.campagna('prove', { battute: { 'png_ruggero.yaml': [BATTUTA_RUGGERO] } });
    const copione = (t: number): string =>
      t === 0
        ? '[narratore] Il fiume rumoreggia.\n[invito] tutti'
        : t === 2
          ? '[narratore] La spada di Corrado affonda nel fianco di Ruggero, che crolla nel fango.\n[png_ruggero] Fermi, fermi! Parliamo.\n[narratore] Ida guarda il fiume.\n[invito] tutti'
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
    expect(messaggi.at(-1)).not.toContain('PNG fuori gioco');
    // T2: il colpo lo butta giù. La sua riga [png_…] si scarta prima della voce.
    const s3 = await giocaTurno(s2, 'Guardo il fiume', 'Colpisco Ruggero con la spada');
    const t2 = s3.trascrizione.filter((v) => v.turno === 2).map((v) => v.testo);
    expect(t2).toContain('La spada di Corrado affonda nel fianco di Ruggero, che crolla nel fango.');
    expect(t2.join(' ')).not.toContain('Parliamo');
    // Il messaggio del turno 2 (dopo i tiri) dice già che Ruggero è fuori gioco, e non ha la sua battuta.
    // Nell'SRD un PNG a 0 muore.
    expect(messaggi.at(-1)).toMatch(/## PNG fuori gioco[^\n]*\n\n- Ruggero lo sgherro non è più in vita: non parla né agisce\./);
    // Sul proiettore non è più tra i presenti.
    expect(s3.scena.personaggi?.find((p) => p.id === 'png_ruggero')?.presente ?? false).toBe(false);
    expect(s2.scena.personaggi?.find((p) => p.id === 'png_ruggero')?.presente).toBe(true);
    expect(messaggi.at(-1)).not.toContain('ruggero_tratta');
    // T3, a scontro finito: resta fuori gioco.
    await giocaTurno(s3, 'Parlo con Ruggero', 'Aspetto');
    expect(messaggi.at(-1)).toContain('Ruggero lo sgherro non è più in vita');
    expect(messaggi.at(-1)).not.toContain('ruggero_tratta');
  });
});
