/**
 * Sessioni su più serate (docs/richieste-2026-11-09.md §9): «La volta scorsa…» dai soli fatti pubblici,
 * con la guardia delle parole segrete; la durata e il consiglio di chiudere; la chiusura guidata
 * («Chiudi la sessione»: narrazione, «Cosa è successo stasera», registro e riassunto.yaml) e la ripresa
 * che comincia col riassunto.
 */
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { StatoTavolo, VoceTrascrizione } from '@cantastorie/shared';
import { loggerMuto } from '../src/logger';
import { NarratoreFinto } from '../src/llm/finto';
import { regexDaPython, type ParolaSegreta } from '../src/repertorio/segreti';
import { climaxInCorso, consiglioDiChiusura, DurataSerata, MINUTI_PREAVVISO } from '../src/sessione/durata';
import { analizzaRiassunto, frasiLaVoltaScorsa, leggiRiassunti, materialePubblico, paroleScappate, riservaDa, scriviRiassunto } from '../src/sessione/riassunto';
import { TITOLO_CHIUSURA } from '../src/narrazione/messaggio';
import { attendi, emetti, inizia, Prova, turno } from './aiuti/partita';

const voce = (tipo: VoceTrascrizione['tipo'], nome: string, testo: string, turno = 1): VoceTrascrizione => ({ id: Math.random(), turno, tipo, chi: nome, nome, testo }) as VoceTrascrizione;
const parola = (p: string, pubblica_dopo: string[] = []): ParolaSegreta => ({ parola: p, sorgente: p, regex: regexDaPython(`\\b${p}\\b`), pubblica_dopo, fatti: [] });

describe('il materiale del riassunto e la guardia', () => {
  it('solo ciò che il tavolo ha sentito: niente righe di sistema', () => {
    const m = materialePubblico([voce('narrazione', 'Narratore', 'Piove sulla locanda.'), voce('sistema', 'Sistema', 'Il master ha interrotto.'), voce('azione', 'Anna', 'Chiudo la porta.'), voce('battuta', 'Oste', 'Il vino è finito.')]);
    expect(m).toBe('Narratore: Piove sulla locanda.\nAnna (azione): Chiudo la porta.\nOste: Il vino è finito.');
  });

  it('una parola segreta mai detta al tavolo fa scartare il testo; se il tavolo l’ha sentita, no', () => {
    const parole = [parola('veleno'), parola('brocca')];
    expect(paroleScappate('L’oste ha messo il veleno nel vino.', 'Oste: Il vino è finito.', parole, null)).toEqual(['veleno']);
    expect(paroleScappate('Anna ha trovato la brocca.', 'Narratore: dietro il banco c’è una brocca.', parole, null)).toEqual([]);
    // Resa pubblica da un indizio rivelato: non conta più.
    expect(paroleScappate('Il veleno era nella brocca.', '', [parola('veleno', ['i_brocca'])], { indiziRivelati: new Set(['i_brocca']), battuteUsate: () => false })).toEqual([]);
  });

  it('testo del modello: al massimo cinque frasi, i fili a parte; la riserva toglie le righe segrete', () => {
    const r = analizzaRiassunto('[narratore] Uno. Due. Tre. Quattro. Cinque. Sei.\nFILO: Chi ha chiuso la porta?\nFILO: Dov’è l’oste?');
    expect(r.testo).toBe('Uno. Due. Tre. Quattro. Cinque.');
    expect(r.fili).toEqual(['Chi ha chiuso la porta?', 'Dov’è l’oste?']);
    expect(riservaDa({ scene: ['La locanda'], segni: ['Un tuono lontano', 'Il veleno nel pozzo.'], parole: [parola('veleno')], pubblico: null })).toBe('Siete passati da: La locanda. Un tuono lontano.');
    expect(frasiLaVoltaScorsa('Anna ha ascoltato il temporale.')).toEqual(['La volta scorsa.', 'Anna ha ascoltato il temporale.']);
  });

  it('modello che dice un segreto, o che non risponde: si legge la riserva', async () => {
    const log = loggerMuto();
    const segreto = new NarratoreFinto({ idPng: [], idPg: [], primoTokenMs: 1, msPerPezzo: 0, copione: () => 'L’oste ha messo il veleno nel vino.' });
    const r = await scriviRiassunto({ narratore: segreto, log }, { materiale: 'Oste: Il vino è finito.', parole: [parola('veleno')], pubblico: null, riserva: 'RISERVA', turno: 1 });
    expect(r).toMatchObject({ origine: 'riserva', testo: 'RISERVA', motivo: expect.stringMatching(/veleno/) });
    const buono = new NarratoreFinto({ idPng: [], idPg: [], primoTokenMs: 1, msPerPezzo: 0, copione: () => 'Anna ha chiuso la porta.\nFILO: Chi bussa?' });
    expect(await scriviRiassunto({ narratore: buono, log }, { materiale: 'Anna (azione): Chiudo la porta.', parole: [parola('veleno')], pubblico: null, riserva: 'RISERVA', turno: 1 })).toEqual({ testo: 'Anna ha chiuso la porta.', fili: ['Chi bussa?'], origine: 'modello' });
    expect(await scriviRiassunto({ narratore: null, log }, { materiale: 'x', parole: [], pubblico: null, riserva: 'RISERVA', turno: 1 })).toMatchObject({ origine: 'riserva' });
  });
});

describe('durata della serata', () => {
  it('il consiglio arriva a venti minuti dalla fine, mai durante un climax', () => {
    const d = new DurataSerata(1);
    expect(d.stato(0).minutiPassati).toBeNull();
    d.comincia(0);
    const quasi = (60 - MINUTI_PREAVVISO - 1) * 60_000;
    expect(d.stato(quasi).fineVicina).toBe(false);
    expect(consiglioDiChiusura(d.stato(quasi + 60_000), false)).toMatch(/Mancano circa 20 minuti.*pausa naturale/);
    expect(consiglioDiChiusura(d.stato(quasi + 60_000), true)).toBeNull();
    expect(consiglioDiChiusura(d.stato(70 * 60_000), false)).toMatch(/oltre la durata prevista/);
    expect(d.imposta(2)).toBe(true);
    expect(d.stato(70 * 60_000)).toMatchObject({ ore: 2, origine: 'master', fineVicina: false });
    expect(new DurataSerata(null).stato(0)).toMatchObject({ ore: 2.5, origine: 'predefinito' });
  });

  it('climax: la scena lo dice, o un orologio è a un segno dalla fine', () => {
    const scena = (dati: Record<string, unknown>) => ({ id: 's', titolo: 's', apertura: [], umore: 'x', intensita: null, png_presenti: [], rientro: { battuta: null, frasi: [] }, dati });
    const orologio = (pieni: number) => ({ partito: true, segmenti: 6, pieni }) as never;
    expect(climaxInCorso(scena({ climax: true }), [])).toBe(true);
    expect(climaxInCorso(scena({}), [orologio(5)])).toBe(true);
    expect(climaxInCorso(scena({}), [orologio(3)])).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
// Col server: una serata breve, «Chiudi la sessione», la ripresa con «La volta scorsa…».

let prova: Prova;
afterEach(async () => prova?.chiudi());

/** Il narratore finto: chiusura, riassunto o turno normale, a seconda del messaggio. */
const copione = (_t: number, messaggio: string): string => {
  if (messaggio.includes('## Il riassunto')) return 'Anna ha ascoltato il temporale sulla locanda.\nFILO: Chi arriverà con la piena?';
  if (messaggio.includes(TITOLO_CHIUSURA)) return '[narratore] La pioggia batte sui vetri, e la locanda si fa silenziosa.\n[narratore] Domani il fiume dirà la sua.\n[invito] tutti';
  return '[narratore] Anna, il tuono rotola lontano.\n[invito] tutti';
};

describe('chiusura guidata e ripresa', () => {
  it('Chiudi la sessione: chiusura narrata, «Cosa è successo stasera», registro e riassunto.yaml; la ripresa comincia con «La volta scorsa…»', async () => {
    prova = new Prova();
    const cartella = prova.campagna('mini');
    const primo = await prova.avvia(cartella, copione);
    const schermo = await prova.proiettore(primo.url);
    const tel = await prova.telefono(primo.url, 'pg_anna');
    const m = await prova.master(primo.url);
    const s = await inizia(schermo, tel);
    const s2 = await turno(tel, 'pg_anna', s, 'Ascolto il temporale.');
    expect((await m.stato()).sessione!.serata).toMatchObject({ ore: 2.5, chiudibile: true, chiusa: false });

    const chiusa = attendi(tel, (x) => !!x.fine_serata, 15_000);
    expect(await m.comanda({ tipo: 'chiudi_sessione' })).toEqual({ ok: true });
    const fine = await chiusa;
    expect(fine.fase).toBe('pausa');
    expect(fine.fine_serata).toMatchObject({ di_riserva: false, riassunto: { testo: 'Anna ha ascoltato il temporale sulla locanda.', fili: ['Chi arriverà con la piena?'] } });
    expect(fine.trascrizione.filter((v) => v.turno === s2.turno).map((v) => v.testo).join(' ')).toContain('La pioggia batte sui vetri');
    expect(fine.diario!.serate.map((x) => x.testo)).toEqual(['Anna ha ascoltato il temporale sulla locanda.']);
    expect((await m.stato()).sessione!.serata).toMatchObject({ chiusa: true, chiudibile: false });
    // Registro e riassunto.yaml accanto (one-shot: logs/registri/<campagna>/<sessione>/), sessione ancora aperta.
    const registri = path.join(prova.cartella, 'log', 'registri');
    const dir = fs.readdirSync(registri, { recursive: true }).map(String).find((f) => f.endsWith('riassunto.yaml'));
    expect(dir).toBeDefined();
    expect(leggiRiassunti(path.dirname(path.join(registri, dir!)))[0]).toMatchObject({ testo: 'Anna ha ascoltato il temporale sulla locanda.' });
    expect(fs.existsSync(path.join(path.dirname(path.join(registri, dir!)), 'registro.yaml'))).toBe(true);

    // Un'altra sera: il server riparte, ritrova la sessione, e all'«Inizia» legge la volta scorsa.
    await primo.s.chiudi();
    const secondo = await prova.avvia(cartella, copione);
    const schermo2 = await prova.proiettore(secondo.url);
    const tel2 = await prova.telefono(secondo.url, 'pg_anna');
    const pronto = attendi(tel2, (x: StatoTavolo) => x.fase === 'finestra' && x.trascrizione.some((v) => v.testo.startsWith('La volta scorsa.')), 15_000);
    await emetti((cb) => schermo2.emit('schermo:inizia', cb));
    const ripresa = await pronto;
    const letto = ripresa.trascrizione.find((v) => v.testo.startsWith('La volta scorsa.'))!;
    expect(letto.testo).toBe('La volta scorsa. Anna ha ascoltato il temporale sulla locanda.');
    expect(ripresa.la_volta_scorsa).toBe('La volta scorsa. Anna ha ascoltato il temporale sulla locanda.');
    expect(ripresa.fine_serata ?? null).toBeNull();
  }, 60_000);
});

describe('pacchetto dopo senza riassunto_iniziale', () => {
  it('la volta scorsa viene dal riassunto.yaml del pacchetto prima, senza modello', async () => {
    const { caricaCampagna } = await import('../src/campagna/caricatore');
    const { SerataGuidata } = await import('../src/scena/serata');
    const { scriviRiassuntoSerata } = await import('../src/sessione/riassunto');
    prova = new Prova();
    const cartella = prova.campagna('arco');
    const s2 = path.join(cartella, 'sessioni', '02', 'sessione.yaml');
    fs.writeFileSync(s2, fs.readFileSync(s2, 'utf8').replace(/^riassunto_iniziale:.*$/m, ''));
    scriviRiassuntoSerata(path.join(cartella, 'sessioni', '01'), { etichetta: 'Sessione 01', quando: '2026-11-09T21:00:00.000Z', testo: 'L’oste ha confessato davanti a tutti.', fili: [] });
    const c = caricaCampagna(cartella, undefined, { pacchetto: 2 });
    const serata = new SerataGuidata({ campagna: c, narratore: null, log: loggerMuto(), parole: () => [], pubblico: () => null });
    serata.preparaPerPacchetto();
    expect(serata.prendiLaVoltaScorsa()).toEqual(['La volta scorsa.', 'L’oste ha confessato davanti a tutti.']);
    expect(serata.pubblico([]).diario.serate.map((x) => x.etichetta)).toEqual(['Sessione 01']);
    // Con riassunto_iniziale ci pensa già il caricatore: niente doppioni.
    const conRiassunto = new SerataGuidata({ campagna: caricaCampagna(prova.campagna('arco'), undefined, { pacchetto: 2 }), narratore: null, log: loggerMuto(), parole: () => [], pubblico: () => null });
    conRiassunto.preparaPerPacchetto();
    expect(conRiassunto.prendiLaVoltaScorsa()).toEqual([]);
  });
});
