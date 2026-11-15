/**
 * NPCs that change in play (docs/mondo.md §4): the Engine's limits on the proposals of the narrator and of the
 * checks, the [atteggiamento] line of the protocol, the checks that see the attitude as it is now, the turn's
 * message, the snapshot and registro.yaml (the path to the next session). Invented fixtures: mondo, prove.
 */
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { caricaSchede } from '../src/campagna/schede';
import { loggerMuto } from '../src/logger';
import { AtteggiamentiInGioco } from '../src/mondo/atteggiamenti';
import { ParserNarratore } from '../src/narrazione/parser';
import { DadiACopione } from '../src/prove/dadi';
import { MotoreProve } from '../src/prove/motore';
import type { ArbitroProve, DecisioneProva, IngressoArbitroProve } from '../src/prove/tipi';
import { estraiRegistro, definizioniRegistro } from '../src/sessione/registro';
import { orologioDiSistema } from '../src/turni/orologio';
import { inizia, Prova, turno } from './aiuti/partita';

const FIX = path.join(import.meta.dirname, 'fixtures', 'campagne');
const MONDO = path.join(FIX, 'mondo');
const presenti = new Set(['png_mugnaio', 'png_ladra']);

describe('AtteggiamentiInGioco: the Engine’s limits', () => {
  it('starts from the cards; a proposal is one step, by an NPC in the scene', () => {
    const a = new AtteggiamentiInGioco(caricaCampagna(MONDO));
    expect(a.stato('png_mugnaio', 'pg_anna')).toBe('indifferente');
    expect(a.proponi('png_mugnaio', 'pg_anna', 'amichevole', 1, 'narratore', { presenti: new Set() })).toEqual({ ok: false, motivo: 'png_mugnaio is not in the scene' });
    expect(a.proponi('png_ladra', 'pg_anna', 'amichevole', 1, 'narratore', { presenti })).toMatchObject({ ok: false, motivo: expect.stringMatching(/one step/) });
    expect(a.proponi('png_mugnaio', 'pg_anna', 'amichevole', 1, 'narratore', { presenti })).toMatchObject({ ok: true, cambi: [{ da: 'indifferente', a: 'amichevole', causa: 'narratore' }] });
    expect(a.stato('png_mugnaio', 'pg_anna')).toBe('amichevole');
  });

  it('one change per NPC per turn, at most two a turn, no flip-flop of the same pair, a check never makes hostile', () => {
    const a = new AtteggiamentiInGioco(caricaCampagna(MONDO));
    expect(a.proponi('png_mugnaio', 'pg_anna', 'amichevole', 1, 'narratore', { presenti }).ok).toBe(true);
    expect(a.proponi('png_mugnaio', 'pg_bruno', 'indifferente', 1, 'narratore', { presenti })).toMatchObject({ ok: false, motivo: expect.stringMatching(/already changed in this turn/) });
    expect(a.proponi('png_ladra', 'pg_bruno', 'amichevole', 1, 'prova', { presenti }).ok).toBe(true);
    expect(a.proponi('png_mugnaio', 'pg_anna', 'indifferente', 2, 'narratore', { presenti })).toMatchObject({ ok: false, motivo: expect.stringMatching(/changed at turn 1/) });
    expect(a.proponi('png_mugnaio', 'pg_anna', 'indifferente', 4, 'narratore', { presenti }).ok).toBe(true);
    expect(a.proponi('png_mugnaio', 'pg_bruno', 'indifferente', 5, 'prova', { presenti, nonOstile: true }).ok).toBe(true);
    expect(a.proponi('png_mugnaio', 'pg_bruno', 'ostile', 9, 'prova', { presenti, nonOstile: true })).toMatchObject({ ok: false, motivo: expect.stringMatching(/never makes an NPC hostile/) });
    // A consequence or the Game Master: any state, no limits.
    expect(a.imposta('png_mugnaio', 'tutti', 'ostile', 9, 'conseguenza', 'o_x@1').map((c) => c.pg)).toEqual(['pg_anna', 'pg_bruno']);
    const b = new AtteggiamentiInGioco(caricaCampagna(MONDO));
    b.importa(JSON.parse(JSON.stringify(a.esporta())));
    expect(b.stato('png_mugnaio', 'pg_bruno')).toBe('ostile');
    expect(b.stato('png_ladra', 'pg_bruno')).toBe('amichevole');
  });
});

describe('the [atteggiamento] line', () => {
  it('is a control line: never read aloud, NPC and PC resolved through the aliases', () => {
    const p = new ParserNarratore({ idPng: ['png_mugnaio'], idPg: ['pg_anna'], alias: { piero: 'png_mugnaio', anna: 'pg_anna' } });
    const e = [...p.aggiungi('[narratore] Il mugnaio sorride.\n[atteggiamento] Piero anna amichevole\n[atteggiamento] png_mugnaio\n[invito] tutti\n'), ...p.chiudi()];
    expect(e.filter((x) => x.tipo === 'frase').map((x) => (x as { testo: string }).testo)).toEqual(['Il mugnaio sorride.']);
    expect(e.find((x) => x.tipo === 'atteggiamento')).toMatchObject({ png: 'png_mugnaio', pg: 'pg_anna', stato: 'amichevole' });
    expect(e.find((x) => x.tipo === 'anomalia')).toMatchObject({ codice: 'atteggiamento_illeggibile' });
  });
});

describe('checks and attitudes', () => {
  const c = caricaCampagna(path.join(FIX, 'prove'));
  const base = (id: string): DecisioneProva => ({ id, tipo: 'nessuna', caratteristica: null, abilita: null, bersaglio: null, arma: null, prova_scena: null, difficolta: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null });
  class Arbitro implements ArbitroProve {
    async classifica(i: IngressoArbitroProve): Promise<Record<string, DecisioneProva>> {
      return Object.fromEntries(i.azioni.map((a) => [a.id, /pane/i.test(a.testo) ? { ...base(a.id), tipo: 'prova', abilita: 'persuasione', bersaglio: 'png_bertoldo' } : base(a.id)]));
    }
  }
  const nome = (id: string): string => c.pg.find((p) => p.id === id)?.nome ?? c.png.find((p) => p.id === id)?.nome ?? id;
  const motore = (dadi: number[], atteggiamento?: (png: string, pg: string) => 'ostile' | 'indifferente' | 'amichevole' | null) =>
    new MotoreProve({ schede: caricaSchede(c), arbitro: new Arbitro(), log: loggerMuto(), orologio: orologioDiSistema, attivo: true, conIndizi: false, contesto: () => ({ campagna: c, scenaPubblica: '', narrazione: '', versione: 1, pgAlTavolo: ['pg_ida'], nome }), dadi: new DadiACopione(dadi), ...(atteggiamento ? { atteggiamento } : {}) });
  const azione = [{ id: 'a1', autore: 'pg_ida', testo: 'Porto a Bertoldo il pane e gli chiedo la strada.', privata: false, revisione: 1 }];

  it('a social check aimed at an NPC is reported with its outcome', async () => {
    expect((await motore([20, 20]).risolvi(1, azione)).sociali).toEqual([{ png: 'png_bertoldo', autore: 'pg_ida', riuscita: true, privata: false }]);
    expect((await motore([2, 2]).risolvi(1, azione)).sociali).toEqual([{ png: 'png_bertoldo', autore: 'pg_ida', riuscita: false, privata: false }]);
  });

  it('the check sees the attitude in play: friendly on the card, hostile now → disadvantage', async () => {
    const amico = await motore([15, 5]).risolvi(1, azione); // the card: amichevole → advantage, the higher die
    expect(amico.tiri[0]).toMatchObject({ vantaggio: 'vantaggio', dado: 15 });
    const ostile = await motore([15, 5], () => 'ostile').risolvi(1, azione);
    expect(ostile.tiri[0]).toMatchObject({ vantaggio: 'svantaggio', dado: 5 });
  });
});

describe('registro.yaml carries the attitudes and the world’s log', () => {
  it('from the last snapshot, each with its turn and cause; nothing when nothing changed', () => {
    const c = caricaCampagna(MONDO);
    const foto = (mondo: unknown) => ({ seq: 1, ts: '2026-11-15T10:00:00Z', tipo: 'fotografia', turno: 3, dati: { fase: 'finestra', turno: 3, versioneScena: 1, scena: 'scena_mulino', luogo: 'scena_mulino', situazione: null, situazioniMostrate: [], umore: null, orologi: { o_voci: { pieni: 1, ultimoTurno: 2, partito: true } }, repertorio: null, note: { elenco: [], prossimoId: 1 }, pausa: { richiesta: false, invitoSospeso: null }, prossimoIdTrascrizione: 1, mondo } });
    const sessione = { id: 's1', campagna: 'mondo', modo: 'improvvisa', creata: 'x', aggiornata: 'x', stato: 'chiusa', motivo_chiusura: null, turno: 3, pacchetto: null };
    const vuoto = estraiRegistro(sessione, [foto({ porte: [] })], definizioniRegistro(c)).registro;
    expect('atteggiamenti' in vuoto || 'mondo' in vuoto).toBe(false);
    const r = estraiRegistro(
      sessione,
      [foto({ porte: [], cronaca: [{ turno: 2, id: 'o_piena@1', tipo: 'conseguenza', orologio: 'o_piena', segno: 1, cosa: 'X', visto: false, scena: 'scena_bosco', emerso_al_turno: 3 }], atteggiamenti: [{ png: 'png_mugnaio', pg: 'pg_anna', da: 'indifferente', a: 'amichevole', turno: 2, causa: 'narratore', perche: 'narrator' }] })],
      definizioniRegistro(c),
    ).registro;
    expect(r.atteggiamenti).toEqual([{ id: 'png_mugnaio', pg: 'pg_anna', da: 'indifferente', a: 'amichevole', turno: 2, causa: 'narratore', perche: 'narrator' }]);
    expect(r.mondo).toEqual([{ id: 'o_piena', conseguenza: 'o_piena@1', tipo: 'conseguenza', segno: 1, cosa: 'X', visto: false, scena: 'scena_bosco', turno: 2, emerso_al_turno: 3 }]);
    // The fronts' extra clock is in the registro's clocks too.
    expect(r.orologi.map((o) => o.id)).toContain('o_voci');
  });
});

describe('server, mode A: the narrator proposes, the Engine checks, the next message knows', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('a one-step change is accepted and told to the narrator; a two-step one is rejected', async () => {
    prova = new Prova();
    const cartella = prova.campagna('mondo');
    const copione = (t: number): string =>
      t === 1
        ? '[narratore] Anna, il mugnaio ti guarda meglio.\n[atteggiamento] png_mugnaio pg_anna amichevole\n[atteggiamento] png_ladra pg_anna amichevole\n[invito] tutti'
        : '[narratore] Anna, la ruota gira.\n[invito] tutti';
    const { url, messaggi } = await prova.avvia(cartella, copione, { TAGM_MODO: 'improvvisa' });
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    let s = await inizia(schermo, tel);
    s = await turno(tel, 'pg_anna', s, 'Anna aiuta il mugnaio a spostare un sacco.');
    const n1 = prova.narrazioni().find((r) => r['tipo'] === 'turno' && r['turno'] === 1)!;
    expect(n1['atteggiamenti']).toEqual([
      { png: 'png_mugnaio', pg: 'pg_anna', stato: 'amichevole', ok: true },
      { png: 'png_ladra', pg: 'pg_anna', stato: 'amichevole', ok: false, motivo: 'png_ladra towards pg_anna: one step at a time (ostile → amichevole)' },
    ]);
    expect(s.trascrizione.map((v) => v.testo).join(' ')).not.toContain('atteggiamento');
    s = await turno(tel, 'pg_anna', s, 'Anna chiede al mugnaio della farina.');
    expect(messaggi.at(-1)).toContain('Mugnaio Piero verso Anna: adesso amichevole (prima indifferente).');
  });
});
