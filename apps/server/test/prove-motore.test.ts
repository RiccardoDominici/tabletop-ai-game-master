/**
 * Motore delle prove con un arbitro finto (docs/prove.md, «Verifica»): dalle decisioni ai tiri,
 * alle carte e ai fatti per il narratore, sulla campagna di prova con le schede. Deterministico:
 * dadi a copione, orologio finto.
 *
 * Casi: Persuasione verso un PNG amichevole (vantaggio dall'atteggiamento, CD dall'Intelligenza),
 * prova della scena (CD dai dati, prezzo del fallimento), attacco con danno e PNG a terra, reazione
 * del PNG, aiuto, contrapposta contro il passivo, impossibile e banale senza tiro, PG senza scheda
 * («sì, ma»), arbitro assente o lento, decisioni preparate all'invio e rifatte se l'azione cambia.
 */
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { caricaSchede } from '../src/campagna/schede';
import { proveDellaScena } from '../src/campagna/prove-scena';
import { loggerMuto } from '../src/logger';
import { DadiACopione, DadiCrittografici } from '../src/prove/dadi';
import { MotoreProve, dadiAttivi, type AzionePerProve, type ContestoProve } from '../src/prove/motore';
import type { ArbitroProve, DecisioneProva, IngressoArbitroProve } from '../src/prove/tipi';
import type { Orologio } from '../src/turni/orologio';

const CARTELLA = path.join(import.meta.dirname, 'fixtures', 'campagne', 'prove');
const campagna = caricaCampagna(CARTELLA);
const schede = caricaSchede(campagna);

/** Decisione completa con i default (tutto vuoto) e i campi del caso. */
function dec(id: string, d: Partial<DecisioneProva>): DecisioneProva {
  return { id, tipo: 'nessuna', caratteristica: null, abilita: null, bersaglio: null, arma: null, prova_scena: null, difficolta: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null, ...d };
}

class OrologioFinto implements Orologio {
  t = 0;
  private timer: Array<{ a: number; cb: () => void; vivo: boolean }> = [];
  ora = () => this.t;
  adesso = () => 1_800_000_000_000 + this.t;
  dopo = (ms: number, cb: () => void) => {
    const x = { a: this.t + ms, cb, vivo: true };
    this.timer.push(x);
    return () => (x.vivo = false);
  };
  avanza(ms: number): void {
    this.t += ms;
    for (const x of this.timer) if (x.vivo && x.a <= this.t) (x.vivo = false), x.cb();
  }
}

/** Arbitro a copione: per testo dell'azione; registra ogni chiamata. */
class ArbitroFinto implements ArbitroProve {
  chiamate: IngressoArbitroProve[] = [];
  constructor(private readonly regole: Record<string, Partial<DecisioneProva>>, private readonly ritardo?: Promise<void>) {}
  async classifica(i: IngressoArbitroProve): Promise<Record<string, DecisioneProva>> {
    this.chiamate.push(i);
    if (this.ritardo) await this.ritardo;
    return Object.fromEntries(i.azioni.map((a) => [a.id, dec(a.id, this.regole[a.testo] ?? {})]));
  }
}

function motore(o: { arbitro?: ArbitroProve | null; dadi?: number[]; orologio?: OrologioFinto; versione?: () => number; schede?: typeof schede }) {
  const orologio = o.orologio ?? new OrologioFinto();
  const contesto = (): ContestoProve => ({
    campagna,
    scenaPubblica: 'Il guado del Vallone.',
    narrazione: 'Ruggero sbarra il ponte.',
    versione: o.versione?.() ?? 1,
    pgAlTavolo: ['pg_ida', 'pg_corrado', 'pg_teo'],
    nome: (id) => campagna.pg.find((p) => p.id === id)?.nome ?? campagna.png.find((p) => p.id === id)?.nome ?? id,
  });
  const s = o.schede ?? schede;
  return new MotoreProve({
    schede: s,
    arbitro: o.arbitro === undefined ? null : o.arbitro,
    log: loggerMuto(),
    orologio,
    attivo: dadiAttivi(campagna, s).attivo,
    conIndizi: true,
    contesto,
    ...(o.dadi ? { dadi: new DadiACopione(o.dadi) } : {}),
  });
}

const azione = (id: string, autore: string, testo: string, privata = false, revisione = 1): AzionePerProve => ({ id, autore, testo, privata, revisione });

describe('schede e prove della campagna di prova', () => {
  it('carica le schede di 3 PG e 2 PNG senza avvisi, e le prove della scena', () => {
    expect([...schede.keys()].sort()).toEqual(['pg_corrado', 'pg_ida', 'pg_teo', 'png_bertoldo', 'png_ruggero']);
    for (const s of schede.values()) expect(s.avvisi, s.id).toEqual([]);
    expect(schede.get('png_ruggero')).toMatchObject({ ca: 13, pf_massimi: 11, livello: 0.5 });
    expect(proveDellaScena(campagna, campagna.scena).map((p) => [p.id, p.cd])).toEqual([['p_guado', 12], ['p_cassetta', 15]]);
    expect(dadiAttivi(campagna, schede).attivo).toBe(true);
  });

  it('senza schede o con regole.dadi: false i dadi sono spenti', () => {
    expect(dadiAttivi(campagna, new Map()).attivo).toBe(false);
    const senza = { ...campagna, campagnaNarratore: { ...campagna.campagnaNarratore, regole: { dadi: false } } };
    expect(dadiAttivi(senza, schede)).toMatchObject({ attivo: false, motivo: expect.stringMatching(/senza dadi/) });
  });
});

describe('un turno di tiri', () => {
  it('Persuasione verso Bertoldo amichevole: vantaggio, CD 15 (15 o Intelligenza 11), riuscita', async () => {
    const arbitro = new ArbitroFinto({ 'Convinco Bertoldo a farci passare gratis': { tipo: 'prova', abilita: 'persuasione', bersaglio: 'png_bertoldo' } });
    const m = motore({ arbitro, dadi: [4, 13] });
    const r = await m.risolvi(3, [azione('a1', 'pg_ida', 'Convinco Bertoldo a farci passare gratis')]);
    const [t] = r.tiri;
    expect(t).toMatchObject({
      chi: 'pg_ida',
      tipo: 'prova',
      etichetta: 'Persuasione (Carisma)',
      dadi: [4, 13],
      dado: 13,
      vantaggio: 'vantaggio',
      motivo_vantaggio: 'Bertoldo è ben disposto',
      modificatore: 3 + 2,
      totale: 18,
      contro: { tipo: 'CD', valore: 15, descrizione: 'influenzare Bertoldo' },
      riuscita: true,
      privata: false,
    });
    expect(r.fatti[0]).toBe('[1] Ida Ferraro: Persuasione (Carisma) verso Bertoldo (con vantaggio: Bertoldo è ben disposto): 18 contro CD 15 → RIUSCITA.');
    expect(r.perAzione.get('a1')?.riuscite).toEqual(['prova', 'persuasione']);
    // Decisa alla chiusura: l'azione non era stata preparata all'invio.
    expect(r.tardive).toEqual(['a1']);
  });

  it('prova della scena: CD dai dati, il prezzo del fallimento va al narratore', async () => {
    const arbitro = new ArbitroFinto({ 'Attraverso il guado con la corda': { tipo: 'prova', abilita: 'atletica', prova_scena: 'p_guado', difficolta: 'difficile' } });
    const r = await motore({ arbitro, dadi: [5] }).risolvi(2, [azione('a1', 'pg_corrado', 'Attraverso il guado con la corda')]);
    expect(r.tiri[0]).toMatchObject({ contro: { valore: 12 }, modificatore: 5, totale: 10, riuscita: false });
    expect(r.fatti[0]).toMatch(/10 contro CD 12 → FALLITA\. Prezzo del fallimento: la corrente lo trascina/);
    // Che cosa NON succede, detto al narratore (D2), e la prova fallita per il cancello del repertorio.
    expect(r.fatti[0]).toMatch(/Ciò che voleva NON succede \(«[^»]+»\): non raccontarlo come riuscito/);
    expect(r.perAzione.get('a1')?.fallite).toContain('p_guado');
  });

  it('attacco con la balestra: danno, PF del PNG, a terra; il secondo attacco lo trova a terra', async () => {
    const arbitro = new ArbitroFinto({
      'Tiro un dardo a Ruggero': { tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'balestra_leggera' },
      'Colpisco Ruggero col pugnale': { tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'pugnale' },
    });
    // d20 = 20 (critico): 2d8 = 6 + 4, +2 di Destrezza = 12 ≥ 11 PF.
    const m = motore({ arbitro, dadi: [20, 6, 4] });
    const r = await m.risolvi(4, [azione('a1', 'pg_corrado', 'Tiro un dardo a Ruggero'), azione('a2', 'pg_teo', 'Colpisco Ruggero col pugnale')]);
    expect(r.tiri).toHaveLength(1);
    expect(r.tiri[0]).toMatchObject({ tipo: 'attacco', etichetta: 'Balestra leggera', critico: true, riuscita: true, contro: { tipo: 'CA', valore: 13 }, a_terra: true });
    // nome_tipo: il tipo come lo mostrano telefono e proiettore, nella lingua dei contenuti.
    expect(r.tiri[0]!.danno).toEqual({ formula: '2d8+2', dadi: [6, 4], bonus: 2, totale: 12, tipo: 'perforante', nome_tipo: 'perforanti' });
    expect(m.stato.puntiFerita('png_ruggero')).toEqual({ attuali: 0, massimi: 11 });
    expect(r.fatti[0]).toMatch(/COLPITO \(colpo critico\), 12 danni perforanti; Ruggero lo sgherro è A TERRA/);
    expect(r.fatti[1]).toMatch(/Ruggero lo sgherro è già a terra: nessun tiro/);
  });

  it('reazione del PNG ferito: attacca chi l\'ha colpito, PF del PG scendono', async () => {
    const arbitro = new ArbitroFinto({ 'Colpisco Ruggero con la spada': { tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'spada_lunga', reazione: { png: 'png_ruggero', condizione: 'sempre' } } });
    // Corrado: d20 10 + 5 = 15 ≥ 13, danno 1d8 = 3 + 3 → Ruggero 11 → 5. Ruggero: d20 15 + 4 = 19 ≥ 15 (giaco + Des 2), 1d6 = 4 + 2 → Corrado 12 → 6.
    const m = motore({ arbitro, dadi: [10, 3, 15, 4] });
    const r = await m.risolvi(5, [azione('a1', 'pg_corrado', 'Colpisco Ruggero con la spada')]);
    expect(r.tiri.map((t) => [t.chi, t.etichetta, t.totale, t.contro.valore, t.riuscita, t.danno?.totale])).toEqual([
      ['pg_corrado', 'Spada lunga', 15, 13, true, 6],
      ['png_ruggero', 'Mazza ferrata', 19, 15, true, 6],
    ]);
    expect(m.stato.puntiFerita('pg_corrado')).toEqual({ attuali: 6, massimi: 12 });
    // Prima la frase esplicita del colpo del PNG, poi i dettagli del tiro.
    expect(r.fatti[0]).toMatch(/Poi Ruggero lo sgherro reagisce\. Ruggero lo sgherro colpisce Corrado Lanzi: 6 danni \(raccontalo in una frase sua\)\. Dettagli: attacco con Mazza ferrata a Corrado Lanzi: 19 contro CA 15 → COLPITO, 6 danni contundenti; Corrado Lanzi ha 6 punti ferita su 12\./);
  });

  it('aiuto: l\'azione aiutata ha vantaggio, chi aiuta non tira; svantaggio dell\'arbitro e aiuto si annullano', async () => {
    const arbitro = new ArbitroFinto({
      'Apro il lucchetto della cassetta': { tipo: 'prova', abilita: 'rapidita_di_mano', prova_scena: 'p_cassetta', vantaggio: 'svantaggio', motivo: 'Bertoldo guarda' },
      'Distraggo Bertoldo con una canzone per aiutare Teo': { tipo: 'aiuto', aiuta: 'a1' },
    });
    const r = await motore({ arbitro, dadi: [9] }).risolvi(6, [azione('a1', 'pg_teo', 'Apro il lucchetto della cassetta', true), azione('a2', 'pg_ida', 'Distraggo Bertoldo con una canzone per aiutare Teo')]);
    // Teo: Destrezza +3, maestria in Rapidità di mano (2 × 2) = +7.
    expect(r.tiri).toHaveLength(1);
    expect(r.tiri[0]).toMatchObject({ dadi: [9], vantaggio: null, modificatore: 7, totale: 16, riuscita: true, privata: true, contro: { valore: 15 } });
    expect(r.fatti[0]).toMatch(/^\[1\] Teo \(azione PRIVATA/);
    expect(r.fatti[0]).toMatch(/Trova ciò che cercava \(indizio i_lettera\)/);
    expect(r.fatti[1]).toBe("[2] Ida Ferraro: aiuta Teo: nessun tiro, l'altro ha vantaggio.");
    expect(r.perAzione.get('a1')?.riuscite).toContain('p_cassetta');
  });

  it('contrapposta: Furtività contro la Percezione passiva di Bertoldo (10 + 1 + 2)', async () => {
    const arbitro = new ArbitroFinto({ 'Passo dietro Bertoldo senza farmi vedere': { tipo: 'contrapposta', abilita: 'furtivita', bersaglio: 'png_bertoldo', abilita_bersaglio: 'percezione' } });
    const r = await motore({ arbitro, dadi: [3] }).risolvi(7, [azione('a1', 'pg_teo', 'Passo dietro Bertoldo senza farmi vedere')]);
    expect(r.tiri[0]).toMatchObject({ tipo: 'contrapposta', etichetta: 'Furtività (Destrezza)', totale: 10, contro: { valore: 13, descrizione: 'Percezione passiva di Bertoldo' }, riuscita: false });
  });

  it('banale e impossibile: nessun tiro, un fatto per il narratore', async () => {
    const arbitro = new ArbitroFinto({
      'Saluto Bertoldo': { tipo: 'nessuna' },
      'Volo sopra il fiume': { tipo: 'impossibile', motivo: 'Corrado non ha ali.' },
    });
    const r = await motore({ arbitro, dadi: [10] }).risolvi(8, [azione('a1', 'pg_ida', 'Saluto Bertoldo'), azione('a2', 'pg_corrado', 'Volo sopra il fiume')]);
    expect(r.tiri).toEqual([]);
    expect(r.fatti).toEqual([
      '[1] Ida Ferraro: nessun tiro: l’azione riesce se è possibile.',
      '[2] Corrado Lanzi: impossibile così, nessun tiro (Corrado non ha ali): non riesce come scritta; dillo dentro la finzione, con un «sì, ma» se c\'è una strada vicina.',
    ]);
  });

  it('PG senza scheda in una campagna con le schede: nessun tiro, «sì, ma»', async () => {
    const senzaTeo = new Map([...schede].filter(([id]) => id !== 'pg_teo'));
    const arbitro = new ArbitroFinto({ 'Scasso la cassetta': { tipo: 'prova', abilita: 'rapidita_di_mano' } });
    const r = await motore({ arbitro, schede: senzaTeo, dadi: [10] }).risolvi(9, [azione('a1', 'pg_teo', 'Scasso la cassetta')]);
    expect(r.tiri).toEqual([]);
    expect(r.fatti[0]).toMatch(/manca la scheda: nessun tiro, risolvi con un «sì, ma»/);
  });

  it('senza arbitro (narratore a copione): la riserva a regole decide, e il dado si tira lo stesso', async () => {
    const r = await motore({ arbitro: null, dadi: [4] }).risolvi(1, [azione('a1', 'pg_ida', 'Convinco Bertoldo'), azione('a2', 'pg_corrado', 'Tiro un dardo di balestra a Ruggero'), azione('a3', 'pg_teo', 'Mi guardo intorno')]);
    expect(r.tiri.map((t) => [t.chi, t.etichetta])).toEqual(expect.arrayContaining([['pg_ida', 'Persuasione (Carisma)'], ['pg_corrado', 'Balestra leggera']]));
    expect(r.fatti.find((f) => f.includes('Teo'))).toMatch(/nessun tiro/);
    expect(r.fatti.join(' ')).not.toMatch(/arbitro non disponibile/);
  });
});

describe('decisioni preparate all\'invio', () => {
  it('pronte alla chiusura: nessuna attesa, nessuna chiamata in più; un\'azione cambiata si rifà', async () => {
    const arbitro = new ArbitroFinto({ 'Convinco Bertoldo': { tipo: 'prova', abilita: 'persuasione', bersaglio: 'png_bertoldo' }, 'Pago e passo': { tipo: 'nessuna' } });
    const m = motore({ arbitro, dadi: [12, 12] });
    m.preclassifica([azione('a1', 'pg_ida', 'Convinco Bertoldo')]);
    m.preclassifica([azione('a1', 'pg_ida', 'Convinco Bertoldo')]); // stessa revisione: niente doppioni
    await Promise.resolve();
    expect(arbitro.chiamate).toHaveLength(1);
    m.preclassifica([azione('a1', 'pg_ida', 'Pago e passo', false, 2)]);
    expect(arbitro.chiamate).toHaveLength(2);
    const r = await m.risolvi(2, [azione('a1', 'pg_ida', 'Pago e passo', false, 2)]);
    expect(arbitro.chiamate).toHaveLength(2);
    expect(r.tardive).toEqual([]);
    expect(r.tiri).toEqual([]);
  });

  it('una narrazione rende vecchia la decisione: alla chiusura si rifà', async () => {
    let versione = 1;
    const arbitro = new ArbitroFinto({ 'Convinco Bertoldo': { tipo: 'prova', abilita: 'persuasione', bersaglio: 'png_bertoldo' } });
    const m = motore({ arbitro, dadi: [12, 12], versione: () => versione });
    m.preclassifica([azione('a1', 'pg_ida', 'Convinco Bertoldo')]);
    versione = 2;
    const r = await m.risolvi(2, [azione('a1', 'pg_ida', 'Convinco Bertoldo')]);
    expect(arbitro.chiamate).toHaveLength(2);
    expect(r.tardive).toEqual(['a1']);
  });

  it('arbitro troppo lento: allo scadere decide la riserva a regole (mai bloccati)', async () => {
    const orologio = new OrologioFinto();
    let sblocca!: () => void;
    const arbitro = new ArbitroFinto({ 'Convinco Bertoldo': { tipo: 'prova', abilita: 'persuasione' } }, new Promise<void>((r) => (sblocca = r)));
    const m = motore({ arbitro, dadi: [12], orologio });
    const p = m.risolvi(2, [azione('a1', 'pg_ida', 'Convinco Bertoldo')]);
    await Promise.resolve();
    orologio.avanza(4000);
    const r = await p;
    // Allo scadere decide la riserva a regole: «convinco» + Bertoldo → Persuasione.
    expect(r.tiri.map((t) => t.etichetta)).toEqual(['Persuasione (Carisma)']);
    sblocca();
  });

  it('all\'arbitro: personaggi con armi e atteggiamenti, prove della scena, niente azioni private degli altri', async () => {
    const arbitro = new ArbitroFinto({});
    const m = motore({ arbitro, dadi: [10] });
    m.preclassifica([azione('a1', 'pg_ida', 'Canto')], [azione('a2', 'pg_teo', 'Rubo la cassetta', true), azione('a3', 'pg_corrado', 'Guardo il ponte')]);
    const i = arbitro.chiamate[0]!;
    expect(i.personaggi).toMatch(/pg_corrado = Corrado Lanzi · armi: balestra_leggera \(a distanza\), spada_lunga/);
    expect(i.personaggi).toMatch(/png_bertoldo = Bertoldo · verso i PG: pg_ida amichevole, pg_corrado indifferente, pg_teo ostile/);
    expect(i.proveScena).toMatch(/p_cassetta · un PG apre di nascosto il lucchetto della cassetta del pedaggio · Rapidità di mano/);
    expect(i.altre.map((a) => a.id)).toEqual(['a3']);
  });
});

describe('riproducibilità e ripresa', () => {
  it('stesso seme, stessi tiri; il seme e il contatore si salvano e si riprendono', async () => {
    const regole = { 'Tiro a Ruggero': { tipo: 'attacco' as const, bersaglio: 'png_ruggero', arma: 'balestra_leggera' } };
    const seme = '0f1e2d3c4b5a69788796a5b4c3d2e1f0';
    const giro = async () => {
      const m = new MotoreProve({
        schede,
        arbitro: new ArbitroFinto(regole),
        log: loggerMuto(),
        orologio: new OrologioFinto(),
        attivo: true,
        conIndizi: false,
        contesto: () => ({ campagna, scenaPubblica: '', narrazione: '', versione: 1, pgAlTavolo: ['pg_corrado'], nome: (id) => id }),
        seme,
      });
      const r = await m.risolvi(1, [azione('a1', 'pg_corrado', 'Tiro a Ruggero')]);
      return { m, r };
    };
    const a = await giro();
    const b = await giro();
    expect(b.r.tiri.map((t) => [t.dadi, t.danno?.dadi])).toEqual(a.r.tiri.map((t) => [t.dadi, t.danno?.dadi]));
    const salvato = a.m.esporta();
    expect(salvato.seme).toBe(seme);
    // Il contatore conta tutti i dadi (anche l'iniziativa dello scontro che l'attacco ha aperto).
    expect(salvato.contatore).toBeGreaterThan(new DadiCrittografici(seme).contatore);
    const ripreso = motore({ arbitro: null });
    ripreso.importa(salvato);
    expect(ripreso.seme).toBe(seme);
    expect(ripreso.esporta().contatore).toBe(salvato.contatore);
    expect(ripreso.inCombattimento).toBe(a.m.inCombattimento);
    expect(ripreso.stato.puntiFerita('png_ruggero')).toEqual(a.m.stato.puntiFerita('png_ruggero'));
    expect(ripreso.tiriPubblici().map((t) => t.id)).toEqual(a.r.tiri.map((t) => t.id));
  });
});
