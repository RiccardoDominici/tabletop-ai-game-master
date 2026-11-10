/**
 * Giudizio nozze-neve 2: segreti e meta-linguaggio al tavolo.
 * - La guardia dei segreti AGISCE sulle righe improvvisate pubbliche: una parola ancora segreta, mai
 *   sentita al tavolo, non arriva alla voce. Va al telefono di chi ha agito in privato (se il turno ha
 *   solo la sua azione privata), altrimenti il PNG dice la sua deviazione (battuta `rifiuto`).
 * - Ciò che è privato non rende pubblico niente: né per la guardia né per la misura delle fughe.
 * - «annuncia» al tavolo veniva dal prompt, che chiamava così la riga dell'azione: la parola non c'è più.
 */
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { EsitoPrivato } from '@cantastorie/shared';
import { misuraFughe } from '../src/esperimenti/fughe';
import { segretiNascosti } from '../src/narrazione/guardia-segreti';
import { RADICE_REPO } from '../src/percorsi';
import { regexDaPython, type ParolaSegreta } from '../src/repertorio/segreti';
import { agisci, attendi, inizia, Prova, turno } from './aiuti/partita';

const vino: ParolaSegreta = { parola: 'il vino annacquato', sorgente: '\\bannacquat', regex: regexDaPython('\\bannacquat'), pubblica_dopo: ['nar_brocca'], fatti: [] };

describe('segreti nascosti in una riga', () => {
  it('segreta finché non esce al tavolo: per battuta pubblica, o perché il tavolo l’ha sentita', () => {
    expect(segretiNascosti('Il vino è annacquato.', [vino], null, '')).toEqual(['il vino annacquato']);
    expect(segretiNascosti('Il vino è annacquato.', [vino], { indiziRivelati: new Set(), battuteUsate: (id) => id === 'nar_brocca' }, '')).toEqual([]);
    expect(segretiNascosti('Il vino è annacquato.', [vino], null, 'Anna (azione): Il vino è annacquato?')).toEqual([]);
  });
});

describe('misura delle fughe: il privato non conta', () => {
  it('un’azione privata non rende pubblica la parola, una riga privata non è una fuga', () => {
    const n = (turno: number, azioni: unknown[], uscita: unknown[]) => ({ tipo: 'turno', turno, azioni, uscita });
    const narrazioni = [
      n(1, [{ id_pg: 'pg_anna', testo: 'Sussurro: il vino è annacquato?', privata: true }], [{ tipo: 'improvvisata', etichetta: 'png_oste', testo: 'Annacquato, sì.', privato: 'pg_anna' }]),
      n(2, [{ id_pg: 'pg_bruno', testo: 'Bevo.' }], [{ tipo: 'improvvisata', etichetta: 'png_oste', testo: 'Il vino annacquato? Sciocchezze.' }]),
    ];
    expect(misuraFughe(narrazioni, [vino], null).map((f) => f.turno)).toEqual([2]);
  });
});

// ---------------------------------------------------------------------------------------------
// Col server (mini): la parola segreta di prova, e la battuta di rifiuto dell'oste.

let prova: Prova;
afterEach(async () => prova?.chiudi());

async function partita(copione: string) {
  prova = new Prova();
  const cartella = prova.campagna('mini', {
    battute: { 'png_oste.yaml': [{ id: 'oste_rifiuto', chi: 'png_oste', tipo: 'rifiuto', quando: 'un PG insiste su ciò che l’oste non vuole dire', temi: [], testo: ['[png_oste] Il vino è vino. Bevete, o andate.'], max_usi: 1, solo_esempio: true }] },
    ritocchi: { 'repertorio/parole_segrete.yaml': (d) => (d['parole'] = [{ parola: vino.parola, regex: vino.sorgente, fatti: [], pubblica_dopo: ['nar_brocca'] }]) },
  });
  const { url } = await prova.avvia(cartella, () => copione);
  const schermo = await prova.proiettore(url);
  const tel = await prova.telefono(url, 'pg_anna');
  return { tel, s: await inizia(schermo, tel) };
}

describe('la guardia dei segreti agisce', () => {
  it('azione pubblica: la riga dell’oste che svela il vino annacquato diventa la sua deviazione', async () => {
    const { tel, s } = await partita('[png_oste] Il vino è annacquato, lo ammetto.\n[narratore] Anna, cosa fai?\n[invito] tutti');
    const dopo = await turno(tel, 'pg_anna', s, 'Chiedo all’oste del vino.');
    const detto = dopo.trascrizione.filter((v) => v.turno === 1).map((v) => v.testo).join(' ');
    expect(detto).not.toContain('annacquato');
    expect(detto).toContain('Il vino è vino. Bevete, o andate.');
    expect(prova.turni().find((r) => r['turno'] === 1)).toMatchObject({ righe_segrete_fermate: 1 });
    const n = prova.narrazioni().find((r) => r['tipo'] === 'turno' && r['turno'] === 1)!;
    expect((n['anomalie'] as Array<{ codice: string }>).map((a) => a.codice)).toContain('segreto_al_tavolo');
  }, 20_000);

  it('il giocatore l’ha detto al tavolo: la riga passa', async () => {
    const { tel, s } = await partita('[png_oste] Annacquato? Il mio vino?\n[narratore] Anna, cosa fai?\n[invito] tutti');
    const dopo = await turno(tel, 'pg_anna', s, 'Il vino è annacquato, oste?');
    expect(dopo.trascrizione.filter((v) => v.turno === 1).map((v) => v.testo).join(' ')).toContain('Annacquato? Il mio vino?');
  }, 20_000);

  it('turno con la sola azione privata: la risposta che direbbe il segreto va al telefono, non al tavolo', async () => {
    const { tel, s } = await partita('[png_oste] Annacquato, sì: due dita d’acqua per botte.\n[narratore] Anna, cosa fai?\n[invito] tutti');
    const privati: EsitoPrivato[][] = [];
    tel.on('privato:esiti', (e: EsitoPrivato[]) => privati.push(e));
    const dopo = attendi(tel, (x) => x.fase === 'finestra' && x.turno === 2);
    await agisci(tel, 'pg_anna', 'Sussurro all’oste: il vino è annacquato?', s.versione_scena, true);
    const s2 = await dopo;
    expect(s2.trascrizione.map((v) => v.testo).join(' ')).not.toContain('due dita');
    expect(privati.flat().map((e) => e.testo).join(' ')).toContain('due dita d’acqua per botte');
  }, 20_000);
});

describe('«annuncia» non arriva più al tavolo', () => {
  it('i prompt del narratore e del selettore non usano la parola (il modello la ripeteva: «Remo annuncia la scommessa»)', () => {
    for (const f of ['narratore.md', 'selettore.md']) expect(fs.readFileSync(path.join(RADICE_REPO, 'prompts', 'it', f), 'utf8')).not.toMatch(/annunc/i);
  });
});
