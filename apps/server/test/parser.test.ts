/**
 * Parser del narratore: protocollo a righe etichettate, con confini di chunk arbitrari.
 */
import { describe, expect, it } from 'vitest';
import { ParserNarratore, type EventoNarratore } from '../src/narrazione/parser';

const OPZIONI = {
  idPng: ['png_baldrin', 'png_ottavia'],
  idPg: ['pg_ginestra', 'pg_corrado', 'pg_assenzio'],
  alias: { baldrin: 'png_baldrin', ottavia: 'png_ottavia', ginestra: 'pg_ginestra', corrado: 'pg_corrado' },
};

function esegui(testo: string, tagli: number[]): EventoNarratore[] {
  const p = new ParserNarratore(OPZIONI);
  const out: EventoNarratore[] = [];
  let prec = 0;
  for (const t of [...tagli, testo.length]) {
    out.push(...p.aggiungi(testo.slice(prec, t)));
    prec = t;
  }
  out.push(...p.chiudi());
  return out;
}

function tutteLeSuddivisioni(testo: string): EventoNarratore[][] {
  const risultati = [esegui(testo, []), esegui(testo, Array.from({ length: testo.length }, (_, i) => i))];
  let seme = 7;
  for (let k = 0; k < 30; k++) {
    const tagli: number[] = [];
    for (let i = 1; i < testo.length; i++) {
      seme = (seme * 1103515245 + 12345) & 0x7fffffff;
      if (seme % 5 === 0) tagli.push(i);
    }
    risultati.push(esegui(testo, tagli));
  }
  return risultati;
}

const frasi = (ev: EventoNarratore[]) =>
  ev.filter((e) => e.tipo === 'frase').map((e) => (e.tipo === 'frase' ? [e.etichetta, e.testo, e.segmento] : []));
const anomalie = (ev: EventoNarratore[]) => ev.filter((e) => e.tipo === 'anomalia').map((e) => (e.tipo === 'anomalia' ? e.codice : ''));
const invito = (ev: EventoNarratore[]) => ev.find((e) => e.tipo === 'invito');

describe('ParserNarratore', () => {
  it('uscita regolare: frasi con voce, invito finale, nessuna anomalia — a ogni suddivisione', () => {
    const testo =
      '[narratore] Il forno crepita. Baldrin alza il martello.\n' +
      '[png_baldrin] Fermi lì. Nessuno tocca la porta.\n' +
      '[narratore] Ginestra, il cane ti guarda. Che fai?\n' +
      '[invito] pg_ginestra, pg_corrado\n';
    for (const ev of tutteLeSuddivisioni(testo)) {
      expect(frasi(ev)).toEqual([
        ['narratore', 'Il forno crepita.', 0],
        ['narratore', 'Baldrin alza il martello.', 0],
        ['png_baldrin', 'Fermi lì.', 1],
        ['png_baldrin', 'Nessuno tocca la porta.', 1],
        ['narratore', 'Ginestra, il cane ti guarda.', 2],
        ['narratore', 'Che fai?', 2],
      ]);
      expect(invito(ev)).toMatchObject({ invitati: ['pg_ginestra', 'pg_corrado'] });
      expect(anomalie(ev)).toEqual([]);
    }
  });

  it('emette la prima frase prima della fine della riga (streaming vero)', () => {
    const p = new ParserNarratore(OPZIONI);
    expect(p.aggiungi('[narr')).toEqual([]);
    expect(p.aggiungi('atore] La porta cigola.')).toEqual([]);
    const ev = p.aggiungi(' Poi');
    expect(frasi(ev)).toEqual([['narratore', 'La porta cigola.', 0]]);
  });

  it('etichetta sconosciuta → narratore + anomalia', () => {
    for (const ev of tutteLeSuddivisioni('[png_gualtiero] Vi ho visti.\n[invito] tutti')) {
      expect(frasi(ev)).toEqual([['narratore', 'Vi ho visti.', 0]]);
      expect(anomalie(ev)).toEqual(['etichetta_sconosciuta']);
      expect(invito(ev)).toMatchObject({ invitati: 'tutti' });
    }
  });

  it('alias di un PNG (nome) → id + anomalia', () => {
    const ev = esegui('[Ottavia] Mangiate, figlioli.\n[invito] tutti', []);
    expect(frasi(ev)).toEqual([['png_ottavia', 'Mangiate, figlioli.', 0]]);
    expect(anomalie(ev)).toEqual(['etichetta_alias']);
  });

  it('riga senza etichetta → accodata al segmento precedente', () => {
    for (const ev of tutteLeSuddivisioni('[png_baldrin] Fermi.\nNessuno passa.\n[invito] pg_corrado')) {
      expect(frasi(ev)).toEqual([
        ['png_baldrin', 'Fermi.', 0],
        ['png_baldrin', 'Nessuno passa.', 0],
      ]);
      expect(anomalie(ev)).toEqual(['riga_senza_etichetta']);
    }
  });

  it('prima riga senza etichetta → narratore', () => {
    const ev = esegui('La neve cade.\n[invito] tutti', []);
    expect(frasi(ev)).toEqual([['narratore', 'La neve cade.', 0]]);
  });

  it('invito mancante → anomalia alla chiusura', () => {
    const ev = esegui('[narratore] Silenzio.', []);
    expect(frasi(ev)).toEqual([['narratore', 'Silenzio.', 0]]);
    expect(anomalie(ev)).toEqual(['invito_mancante']);
    expect(invito(ev)).toBeUndefined();
  });

  it('invito con nomi, «e», punto finale e id sconosciuti', () => {
    const ev = esegui('[narratore] Ok.\n[invito] Ginestra e pg_corrado, pg_nessuno.', []);
    expect(invito(ev)).toMatchObject({ invitati: ['pg_ginestra', 'pg_corrado'] });
    expect(anomalie(ev)).toEqual(['invito_id_sconosciuto']);
  });

  it('invito vuoto o solo id ignoti → tutti', () => {
    expect(invito(esegui('[narratore] Ok.\n[invito]', []))).toMatchObject({ invitati: 'tutti' });
    expect(invito(esegui('[narratore] Ok.\n[invito] pg_x', []))).toMatchObject({ invitati: 'tutti' });
  });

  it('etichetta nota a metà riga apre un nuovo segmento', () => {
    for (const ev of tutteLeSuddivisioni('[narratore] Il nano si alza. [png_baldrin] Fuori di qui.\n[invito] tutti')) {
      expect(frasi(ev)).toEqual([
        ['narratore', 'Il nano si alza.', 0],
        ['png_baldrin', 'Fuori di qui.', 1],
      ]);
      expect(anomalie(ev)).toEqual(['etichetta_in_linea']);
    }
  });

  it('parentesi quadre qualsiasi a metà frase restano testo', () => {
    const ev = esegui('[narratore] Sul muro c’è scritto [via] in rosso.\n[invito] tutti', []);
    expect(frasi(ev)).toEqual([['narratore', 'Sul muro c’è scritto [via] in rosso.', 0]]);
    expect(anomalie(ev)).toEqual([]);
  });

  it('CRLF, righe vuote e spazi iniziali', () => {
    const ev = esegui('\r\n  [narratore]   Piove.\r\n\r\n[invito] pg_assenzio\r\n', []);
    expect(frasi(ev)).toEqual([['narratore', 'Piove.', 0]]);
    expect(invito(ev)).toMatchObject({ invitati: ['pg_assenzio'] });
    expect(anomalie(ev)).toEqual([]);
  });

  it('toglie markdown e, nelle battute, le virgolette', () => {
    const ev = esegui('[narratore] **Il forno** crepita.\n[png_ottavia] «Mangiate, figlioli.»\n[invito] tutti', []);
    expect(frasi(ev)).toEqual([
      ['narratore', 'Il forno crepita.', 0],
      ['png_ottavia', 'Mangiate, figlioli.', 1],
    ]);
  });

  it('testo dopo l’invito: letto ma segnalato', () => {
    const ev = esegui('[narratore] Uno.\n[invito] tutti\n[narratore] Due.', []);
    expect(frasi(ev).map((f) => f[1])).toEqual(['Uno.', 'Due.']);
    expect(anomalie(ev)).toEqual(['testo_dopo_invito']);
  });
});
