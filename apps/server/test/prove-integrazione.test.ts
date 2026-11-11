/**
 * Prove e dadi col server intero (docs/prove.md, «Verifica»): campagna di prova con le schede,
 * selettore a copione, arbitro delle prove finto e dadi a copione. Un turno con una Persuasione
 * (carta sul proiettore e sul telefono, fatto nel messaggio del selettore, battuta col cancello
 * `richiede.prova` nel catalogo solo dopo la riuscita), un'azione privata (la carta solo sul suo
 * telefono), un attacco con la reazione del PNG (PF del PG nello stato), e i PF dopo un riavvio.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { AzionePrivata, StatoTavolo } from '@tabletop-ai-gm/shared';
import { DadiACopione } from '../src/prove/dadi';
import type { ArbitroProve, DecisioneProva, IngressoArbitroProve } from '../src/prove/tipi';
import { Prova, agisci, attendi, emetti, inizia, type Client } from './aiuti/partita';

const vuota = (id: string): DecisioneProva => ({ id, tipo: 'nessuna', caratteristica: null, abilita: null, bersaglio: null, arma: null, prova_scena: null, difficolta: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null });

/** Arbitro finto: la decisione dipende da parole del testo dell'azione. */
class ArbitroParole implements ArbitroProve {
  chiamate = 0;
  async classifica(i: IngressoArbitroProve): Promise<Record<string, DecisioneProva>> {
    this.chiamate++;
    const out: Record<string, DecisioneProva> = {};
    for (const a of i.azioni) {
      const d = vuota(a.id);
      if (/convinco/i.test(a.testo)) Object.assign(d, { tipo: 'prova', abilita: 'persuasione', bersaglio: 'png_bertoldo' });
      else if (/lucchetto/i.test(a.testo)) Object.assign(d, { tipo: 'prova', abilita: 'rapidita_di_mano', prova_scena: 'p_cassetta' });
      else if (/spada/i.test(a.testo)) Object.assign(d, { tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'spada_lunga', reazione: { png: 'png_ruggero', condizione: 'sempre' } });
      out[a.id] = d;
    }
    return out;
  }
}

/** L'ultima `azione:mia` ricevuta da un telefono. */
function ultimaMia(t: Client): { ultima: AzionePrivata | null } {
  const r = { ultima: null as AzionePrivata | null };
  t.on('azione:mia', (a) => (r.ultima = a));
  return r;
}

const COPIONE = (turno: number): string => (turno === 0 ? '[narratore] Il fiume rumoreggia.\n[invito] tutti' : '[narratore] Il vento porta odore di fango.\n[invito] tutti');

describe('prove e dadi col server intero', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('Persuasione: carta, fatto nel messaggio, battuta col cancello; privata solo sul suo telefono', async () => {
    prova = new Prova();
    const cartella = prova.campagna('prove');
    const arbitro = new ArbitroParole();
    // Ida (Carisma +3, competente +2) con vantaggio (Bertoldo amichevole): 4 e 13 → 13 + 5 = 18 ≥ 15.
    // Teo (Rapidità di mano con maestria, +7): 6 → 13 < 15.
    const { url, messaggi } = await prova.avvia(cartella, COPIONE, {}, { arbitroProve: arbitro, dadi: new DadiACopione([4, 13, 6]) });
    const schermo = await prova.proiettore(url);
    const ida = await prova.telefono(url, 'pg_ida');
    const teo = await prova.telefono(url, 'pg_teo');
    const miaIda = ultimaMia(ida);
    const miaTeo = ultimaMia(teo);
    const s1 = await inizia(schermo, ida);
    expect(s1.dadi).toBe(true);
    expect(s1.pg.find((p) => p.id === 'pg_ida')?.pf).toEqual({ attuali: 9, massimi: 9 });

    const conTiri = attendi(schermo, (x) => (x.tiri?.length ?? 0) > 0);
    await agisci(ida, 'pg_ida', 'Convinco Bertoldo a dirmi chi paga lo sgherro', s1.versione_scena);
    await agisci(teo, 'pg_teo', 'Intanto apro piano il lucchetto della cassetta', s1.versione_scena, true);
    const st: StatoTavolo = await conTiri;
    // Sul proiettore solo la carta pubblica.
    expect(st.tiri).toHaveLength(1);
    expect(st.tiri![0]).toMatchObject({ chi: 'pg_ida', etichetta: 'Persuasione (Carisma)', dadi: [4, 13], dado: 13, vantaggio: 'vantaggio', modificatore: 5, totale: 18, contro: { tipo: 'CD', valore: 15 }, riuscita: true, privata: false });

    // Il turno finisce: la finestra del turno dopo.
    await attendi(ida, (x) => x.fase === 'finestra' && x.turno === 2);
    // Il messaggio del selettore ha gli esiti e, dopo la riuscita, la confessione col cancello.
    const m = messaggi.at(-1)!;
    expect(m).toContain('## Esiti dei tiri');
    expect(m).toContain('Ida Ferraro: Persuasione (Carisma) verso Bertoldo (con vantaggio: Bertoldo è ben disposto): 18 contro CD 15 → RIUSCITA.');
    expect(m).toMatch(/Teo \(azione PRIVATA[^\n]*Rapidità di mano \(Destrezza\): 13 contro CD 15 → FALLITA\. Prezzo del fallimento: il lucchetto scatta rumoroso\./);
    expect(m).toContain('bertoldo_confessa');
    // Ogni telefono ha la sua carta; quella privata di Teo solo sul suo.
    expect(miaIda.ultima?.tiri?.map((t) => t.etichetta)).toEqual(['Persuasione (Carisma)']);
    expect(miaTeo.ultima?.tiri?.[0]).toMatchObject({ privata: true, totale: 13, riuscita: false });
    // Decise all'invio: nessuna chiamata in più alla chiusura.
    expect(arbitro.chiamate).toBe(2);
  });

  it('attacco con la reazione del PNG: i PF del PG scendono, e restano dopo un riavvio', async () => {
    prova = new Prova();
    const cartella = prova.campagna('prove');
    // Corrado: 10 + 5 = 15 ≥ CA 13, spada 1d8 = 3 + 3 = 6 (Ruggero 11 → 5). Ruggero: 15 + 4 = 19 ≥ CA 15, mazza 4 + 2 = 6 (Corrado 12 → 6).
    const env = { TAGM_SESSIONI: `${prova.cartella}/sessioni.sqlite` };
    const { url, s } = await prova.avvia(cartella, COPIONE, env, { arbitroProve: new ArbitroParole(), dadi: new DadiACopione([10, 3, 15, 4]) });
    const schermo = await prova.proiettore(url);
    const corrado = await prova.telefono(url, 'pg_corrado');
    const s1 = await inizia(schermo, corrado);
    await agisci(corrado, 'pg_corrado', 'Colpisco Ruggero con la spada', s1.versione_scena);
    const dopo = await attendi(corrado, (x) => x.fase === 'finestra' && x.turno === 2);
    expect(dopo.tiri?.map((t) => [t.chi, t.etichetta, t.riuscita, t.danno?.totale])).toEqual([
      ['pg_corrado', 'Spada lunga', true, 6],
      ['png_ruggero', 'Mazza ferrata', true, 6],
    ]);
    expect(dopo.pg.find((p) => p.id === 'pg_corrado')?.pf).toEqual({ attuali: 6, massimi: 12 });

    // Riavvio a metà partita: la sessione si riprende con i PF di prima.
    await s.chiudi();
    const { url: url2 } = await prova.avvia(cartella, COPIONE, env, { arbitroProve: new ArbitroParole() });
    const t2 = prova.nuovo(url2);
    const st2 = await emetti<StatoTavolo>((cb) => t2.emit('telefono:entra', cb));
    expect(st2.pg.find((p) => p.id === 'pg_corrado')?.pf).toEqual({ attuali: 6, massimi: 12 });
    expect(st2.tiri?.map((t) => t.etichetta)).toEqual(['Spada lunga', 'Mazza ferrata']);
  });

  it('campagna senza schede: niente dadi, niente campi nuovi nello stato, niente sezione nel messaggio', async () => {
    prova = new Prova();
    const cartella = prova.campagna('mini');
    const { url, messaggi } = await prova.avvia(cartella, (t) => (t === 0 ? '[narratore] Fumo.\n[invito] tutti' : '[narratore] Il fuoco crepita.\n[invito] tutti'), {}, { arbitroProve: new ArbitroParole() });
    const schermo = await prova.proiettore(url);
    const anna = await prova.telefono(url, 'pg_anna');
    const s1 = await inizia(schermo, anna);
    expect(s1.dadi).toBeUndefined();
    expect(s1.tiri).toBeUndefined();
    expect(s1.pg[0]!.pf).toBeUndefined();
    await agisci(anna, 'pg_anna', 'Convinco l’oste a offrirci da bere', s1.versione_scena);
    await attendi(anna, (x) => x.fase === 'finestra' && x.turno === 2);
    expect(messaggi.at(-1)).not.toContain('Esiti dei tiri');
  });
});
