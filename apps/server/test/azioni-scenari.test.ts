/**
 * Scenari deterministici delle azioni simultanee (docs/azioni-concorrenti.md, «Verifica»), con
 * un arbitro finto a copione e un orologio finto: dipendenza e ritiro, catena A→B→C, conflitto
 * esclusivo con il secondo che cambia, azioni vecchie valida/dubbia/impossibile, scadenza →
 * sospesa, azione privata; in più: scrittura durante la narrazione, allungamento per chi
 * scrive, chiusura che aspetta l'arbitro in volo.
 */
import { describe, expect, it } from 'vitest';
import type { AzionePrivata } from '@cantastorie/shared';
import { TavoloAzioni, type RiepilogoChiusura } from '../src/azioni/tavolo';
import type { Arbitro, AzioneArbitro, EsitoRelazioni, Giudizio } from '../src/azioni/tipi';
import { loggerMuto } from '../src/logger';
import type { Orologio } from '../src/turni/orologio';

class OrologioFinto implements Orologio {
  t = 0;
  private timer: Array<{ a: number; cb: () => void; vivo: boolean }> = [];
  ora = () => this.t;
  adesso = () => 1_800_000_000_000 + this.t;
  dopo = (ms: number, cb: () => void) => {
    const x = { a: this.t + ms, cb, vivo: true };
    this.timer.push(x);
    return () => {
      x.vivo = false;
    };
  };
  async avanza(ms: number): Promise<void> {
    const fine = this.t + ms;
    for (;;) {
      const prossimo = this.timer.filter((x) => x.vivo && x.a <= fine).sort((a, b) => a.a - b.a)[0];
      if (!prossimo) break;
      this.t = prossimo.a;
      prossimo.vivo = false;
      prossimo.cb();
      await Promise.resolve();
      await Promise.resolve();
    }
    this.t = fine;
    await new Promise((r) => setImmediate(r));
  }
}

/** Arbitro a copione: risposte per testo dell'azione nuova / giudicata. */
class ArbitroFinto implements Arbitro {
  relazioniPer = new Map<string, (coda: AzioneArbitro[]) => Omit<EsitoRelazioni, 'fonte'>>();
  vecchiePer = new Map<string, { giudizio: Giudizio; motivo: string }>();
  cambioPer = new Map<string, boolean>();
  /** Se impostata, le relazioni restano in volo finché non la si risolve. */
  sospendi: ((risolvi: () => void) => void) | null = null;
  chiamate = 0;
  async relazioni(i: { nuova: AzioneArbitro; coda: AzioneArbitro[] }): Promise<EsitoRelazioni> {
    this.chiamate++;
    if (this.sospendi) await new Promise<void>((r) => this.sospendi!(r));
    const f = this.relazioniPer.get(i.nuova.testo);
    return { ...(f ? f(i.coda) : { dipende_da: [], conflitti: [] }), fonte: 'modello' };
  }
  async vecchie(i: { azioni: AzioneArbitro[] }) {
    return Object.fromEntries(i.azioni.map((a) => [a.id, this.vecchiePer.get(a.testo) ?? { giudizio: 'valida' as Giudizio, motivo: '' }]));
  }
  async cambio(i: { dipendenti: AzioneArbitro[]; dopo: AzioneArbitro }) {
    return Object.fromEntries(i.dipendenti.map((d) => [d.id, { toccata: this.cambioPer.get(i.dopo.testo) ?? true }]));
  }
}

const NOMI: Record<string, string> = { pg_g: 'Ginestra', pg_c: 'Corrado', pg_a: 'Assenzio', pg_t: 'Teodora' };

function crea(arbitro: Arbitro | null = new ArbitroFinto()) {
  const orologio = new OrologioFinto();
  const chiusure: RiepilogoChiusura[] = [];
  const mie = new Map<string, AzionePrivata | null>();
  const tavolo = new TavoloAzioni({
    giocatori: () => ['pg_g', 'pg_c', 'pg_a', 'pg_t'],
    nomePg: (id) => NOMI[id] ?? id,
    nomi: new Map(Object.entries(NOMI).map(([id, n]) => [n.toLowerCase(), id])),
    orologio,
    arbitro,
    contesto: () => ({ narrazione: 'La porta del ripostiglio è chiusa.', scena: 'Osteria.' }),
    log: loggerMuto(),
    onCambio: () => undefined,
    onAzione: (id, a) => mie.set(id, a),
    onChiusura: (r) => chiusure.push(r),
  });
  return { tavolo, orologio, chiusure, mie, arbitro: arbitro as ArbitroFinto };
}

const attendi = () => new Promise((r) => setImmediate(r));

describe('azioni simultanee — scenari', () => {
  it('dipendenza + ritiro: «anch’io» (regola) diventa da confermare con un avviso chiaro', async () => {
    const { tavolo, mie } = crea();
    tavolo.apri(1, ['pg_g', 'pg_c'], 1, true);
    tavolo.invia('pg_g', 'vado avanti verso la grata', 1);
    tavolo.invia('pg_c', "anch'io", 1);
    await attendi();
    expect(tavolo.azione('a2')!.dipende_da).toEqual(['a1']);
    expect(tavolo.alTavolo().find((x) => x.id === 'a2')!.dipende_da).toEqual(['Ginestra']);
    tavolo.ritira('pg_g');
    const c = mie.get('pg_c')!;
    expect(c.stato).toBe('da_confermare');
    expect(c.richiesta).toMatchObject({ tipo: 'dipendenza', conferma: 'Confermo' });
    expect(c.richiesta!.testo).toBe("Ginestra ha ritirato «vado avanti verso la grata». La tua «anch'io» dipendeva da quella. Confermi, cambi o ritiri?");
    expect(tavolo.conferma('pg_c')).toEqual({ ok: true });
    expect(mie.get('pg_c')!.stato).toBe('in_coda');
  });

  it('catena A→B→C: il ritiro di A avvisa B e C (C con il tramite), una volta sola', async () => {
    const { tavolo, mie } = crea();
    tavolo.apri(1, ['pg_g', 'pg_c', 'pg_a'], 1, true);
    tavolo.invia('pg_g', 'apro la porta', 1);
    tavolo.invia('pg_c', 'seguo Ginestra', 1);
    tavolo.invia('pg_a', 'resto dietro a Corrado', 1);
    await attendi();
    expect(tavolo.azione('a3')!.dipende_da).toEqual(['a2']);
    tavolo.ritira('pg_g');
    expect(mie.get('pg_c')!.stato).toBe('da_confermare');
    expect(mie.get('pg_a')!.stato).toBe('da_confermare');
    expect(mie.get('pg_a')!.richiesta!.testo).toContain('seguiva Corrado, che dipendeva da quella');
    // B cambia: C è già da confermare per la stessa catena? no: la radice ora è B → nuovo avviso.
    const prima = mie.get('pg_a')!.richiesta!.testo;
    tavolo.conferma('pg_c');
    expect(mie.get('pg_a')!.richiesta!.testo).toBe(prima);
  });

  it('cambio che non tocca il dipendente: nessun avviso; cambio che lo tocca: avviso', async () => {
    const { tavolo, mie, arbitro } = crea();
    tavolo.apri(1, ['pg_g', 'pg_c'], 1, true);
    tavolo.invia('pg_g', 'vado verso il forno', 1);
    tavolo.invia('pg_c', 'la seguo', 1);
    await attendi();
    arbitro.cambioPer.set('vado verso il forno, piano', false);
    tavolo.invia('pg_g', 'vado verso il forno, piano', 1);
    await attendi();
    expect(mie.get('pg_c')!.stato).toBe('in_coda');
    arbitro.cambioPer.set('esco in piazza', true);
    tavolo.invia('pg_g', 'esco in piazza', 1);
    await attendi();
    expect(mie.get('pg_c')!.stato).toBe('da_confermare');
    expect(mie.get('pg_c')!.richiesta!.testo).toContain('Ginestra ha cambiato «vado verso il forno, piano» in «esco in piazza»');
  });

  it('conflitto esclusivo: il secondo lo sa subito; se cambia, il conflitto sparisce', async () => {
    const { tavolo, mie, arbitro, orologio } = crea();
    arbitro.relazioniPer.set('prendo io la chiave dal collo del nano', (coda) => ({ dipende_da: [], conflitti: [{ con: coda[0]!.id, esclusivo: true }] }));
    tavolo.apri(1, ['pg_g', 'pg_c'], 1, true);
    tavolo.invia('pg_c', 'prendo la chiave a Baldrin', 1);
    await orologio.avanza(1500);
    tavolo.invia('pg_g', 'prendo io la chiave dal collo del nano', 1);
    await attendi();
    const g = mie.get('pg_g')!;
    expect(g.stato).toBe('da_confermare');
    expect(g.richiesta).toMatchObject({ tipo: 'conflitto', conferma: 'Tengo' });
    expect(g.richiesta!.testo).toBe('Corrado ha già scritto «prendo la chiave a Baldrin». Vuoi cambiare azione?');
    expect(g.richiesta!.testo).not.toMatch(/conflitto/i);
    expect(mie.get('pg_c')!.stato).toBe('in_coda');
    tavolo.invia('pg_g', 'tengo d’occhio la porta', 1);
    await attendi();
    expect(mie.get('pg_g')!.stato).toBe('in_coda');
    expect(tavolo.azione('a2')!.conflitti).toEqual([]);
  });

  it('conflitto tenuto: il narratore riceve l’ordine; dopo la narrazione il perdente può risultare superato', async () => {
    const { tavolo, mie, arbitro, orologio, chiusure } = crea();
    arbitro.relazioniPer.set('prendo io la chiave', (coda) => ({ dipende_da: [], conflitti: [{ con: coda[0]!.id, esclusivo: true }] }));
    arbitro.vecchiePer.set('prendo io la chiave', { giudizio: 'impossibile', motivo: 'La chiave l’ha già presa Corrado.' });
    tavolo.apri(1, ['pg_g', 'pg_c'], 1, true);
    tavolo.invia('pg_c', 'prendo la chiave', 1);
    await orologio.avanza(2000);
    tavolo.invia('pg_g', 'prendo io la chiave', 1);
    await attendi();
    tavolo.conferma('pg_g'); // «Tengo»
    tavolo.pronto('pg_g', true);
    tavolo.pronto('pg_c', true);
    await attendi();
    expect(chiusure[0]!.azioni.map((a) => a.autore)).toEqual(['pg_c', 'pg_g']);
    expect(mie.get('pg_g')!.stato).toBe('chiusa');
    await tavolo.dopoNarrazione(1, 2);
    expect(mie.get('pg_c')!.stato).toBe('risolta');
    expect(mie.get('pg_g')).toMatchObject({ stato: 'superata', testo: 'prendo io la chiave', motivo: 'La chiave l’ha già presa Corrado. Puoi riscrivere la tua azione.' });
  });

  it('pareggio entro 1 s: vince a rotazione tra le finestre, non sempre lo stesso posto', async () => {
    const { tavolo, arbitro, mie } = crea();
    arbitro.relazioniPer.set('la chiave è mia', (coda) => ({ dipende_da: [], conflitti: [{ con: coda[0]!.id, esclusivo: true }] }));
    const vincitori: string[] = [];
    for (let turno = 1; turno <= 2; turno++) {
      tavolo.apri(turno, ['pg_g', 'pg_c'], turno, true);
      tavolo.invia('pg_c', 'prendo la chiave', turno); // stesso istante: pareggio
      tavolo.invia('pg_g', 'la chiave è mia', turno);
      await attendi();
      const c = tavolo.azione(mie.get('pg_c')!.id)!;
      vincitori.push(tavolo.azione(c.conflitti[0]!.vince)!.autore);
      tavolo.conferma('pg_g');
      tavolo.conferma('pg_c');
      tavolo.pronto('pg_g', true);
      tavolo.pronto('pg_c', true);
      await attendi();
      await tavolo.dopoNarrazione(turno, turno + 1);
    }
    expect(vincitori).toEqual(['pg_g', 'pg_c']); // ordine pg_g, pg_c, …: prima pg_g, poi tocca a pg_c
  });

  it('azioni vecchie: valida resta, dubbia chiede conferma, impossibile è superata (testo conservato)', async () => {
    const { tavolo, mie, arbitro } = crea();
    arbitro.vecchiePer.set('guardo il cane', { giudizio: 'valida', motivo: '' });
    arbitro.vecchiePer.set('entro nella stanza', { giudizio: 'dubbia', motivo: 'La porta si è chiusa.' });
    arbitro.vecchiePer.set('parlo con Ottavia', { giudizio: 'impossibile', motivo: 'Ottavia è uscita in piazza.' });
    // Finestra 1 chiusa: le azioni scritte ora vanno alla finestra 2 (il narratore parla).
    tavolo.apri(1, ['pg_t'], 1, true);
    tavolo.pronto('pg_t', true);
    await attendi();
    expect(tavolo.aperta).toBe(false);
    tavolo.invia('pg_g', 'guardo il cane', 1);
    tavolo.invia('pg_c', 'entro nella stanza', 1);
    tavolo.invia('pg_a', 'parlo con Ottavia', 1);
    expect(mie.get('pg_g')).toMatchObject({ turno: 2, stato: 'in_coda' });
    expect(tavolo.alTavolo().map((x) => x.id_pg)).toEqual(['pg_g', 'pg_c', 'pg_a']);
    await tavolo.dopoNarrazione(1, 2);
    tavolo.apri(2, ['pg_g', 'pg_c', 'pg_a'], 2, true);
    expect(mie.get('pg_g')!.stato).toBe('in_coda');
    expect(mie.get('pg_c')).toMatchObject({ stato: 'da_confermare', richiesta: { tipo: 'vecchia' } });
    expect(mie.get('pg_c')!.richiesta!.testo).toBe('Nel frattempo: la porta si è chiusa. Confermi «entro nella stanza»?');
    expect(mie.get('pg_a')).toMatchObject({ stato: 'superata', testo: 'parlo con Ottavia', motivo: 'Ottavia è uscita in piazza. Puoi riscrivere la tua azione.' });
  });

  it('scadenza: la finestra si allunga al massimo di 8 s, poi la da confermare diventa sospesa', async () => {
    const { tavolo, mie, arbitro, orologio, chiusure } = crea();
    arbitro.relazioniPer.set('prendo io il pane', (coda) => ({ dipende_da: [], conflitti: [{ con: coda[0]!.id, esclusivo: true }] }));
    tavolo.apri(1, ['pg_g', 'pg_c'], 1, true);
    tavolo.invia('pg_c', 'prendo il pane', 1);
    await orologio.avanza(1500);
    tavolo.invia('pg_g', 'prendo io il pane', 1);
    await attendi();
    expect(mie.get('pg_g')!.stato).toBe('da_confermare');
    await orologio.avanza(8500); // 10 s dalla prima azione: chiusura dovuta, ma c'è una scelta aperta
    expect(tavolo.aperta).toBe(true);
    expect(mie.get('pg_g')!.richiesta!.scadenza_ms).toBe(1_800_000_000_000 + 10_000 + 8_000);
    await orologio.avanza(7900);
    expect(tavolo.aperta).toBe(true);
    await orologio.avanza(200);
    expect(tavolo.aperta).toBe(false);
    expect(chiusure[0]!.sospese.map((a) => a.autore)).toEqual(['pg_g']);
    expect(mie.get('pg_g')).toMatchObject({ stato: 'sospesa', testo: 'prendo io il pane' });
    expect(mie.get('pg_g')!.motivo).toMatch(/fuori da questo turno/);
  });

  it('chi sta scrivendo allunga la chiusura (ultimi 3 s), senza superare gli 8 s', async () => {
    const { tavolo, orologio } = crea();
    tavolo.apri(1, ['pg_g', 'pg_c'], 1, true);
    tavolo.invia('pg_g', 'ascolto la tosse', 1);
    await orologio.avanza(9000);
    tavolo.scrivo('pg_c');
    await orologio.avanza(1500); // 10,5 s: dovuta, ma Corrado scrive da 1,5 s
    expect(tavolo.aperta).toBe(true);
    await orologio.avanza(1600); // 3,1 s dall'ultimo tasto
    expect(tavolo.aperta).toBe(false);
  });

  it('azione privata: non è al tavolo, nessuno può dipenderne, chi perde non ne legge il contenuto', async () => {
    const { tavolo, mie, arbitro } = crea();
    arbitro.relazioniPer.set('prendo la borsa del forestiero', (coda) => ({ dipende_da: [coda[0]!.id], conflitti: [{ con: coda[0]!.id, esclusivo: true }] }));
    tavolo.apri(1, ['pg_a', 'pg_t'], 1, true);
    tavolo.invia('pg_a', 'di nascosto infilo la borsa sotto il mantello', 1, true);
    tavolo.invia('pg_t', 'prendo la borsa del forestiero', 1);
    await attendi();
    expect(tavolo.alTavolo().map((x) => x.id_pg)).toEqual(['pg_t']);
    expect(tavolo.azione('a2')!.dipende_da).toEqual([]); // l'arbitro sbaglia, il Motore no
    const t = mie.get('pg_t')!;
    expect(t.stato).toBe('da_confermare');
    expect(t.richiesta!.testo).toBe('Qualcun altro ci è arrivato prima. Vuoi cambiare azione?');
    expect(JSON.stringify(t)).not.toContain('mantello');
  });

  it('corsa: la radice viene ritirata mentre l’arbitro decide → l’autore è avvisato lo stesso', async () => {
    const arbitro = new ArbitroFinto();
    let sblocca: (() => void) | null = null;
    arbitro.sospendi = (r) => {
      sblocca = r;
    };
    arbitro.relazioniPer.set('la seguo', (coda) => ({ dipende_da: [coda.find((x) => x.autore === 'pg_g')!.id], conflitti: [] }));
    const { tavolo, mie } = crea(arbitro);
    tavolo.apri(1, ['pg_g', 'pg_c', 'pg_a'], 1, true);
    tavolo.invia('pg_a', 'guardo il cane', 1);
    tavolo.invia('pg_g', 'vado verso la porta', 1);
    tavolo.invia('pg_c', 'la seguo', 1); // due candidati: decide il modello (in volo)
    tavolo.ritira('pg_g');
    expect(mie.get('pg_c')!.stato).toBe('in_coda');
    sblocca!();
    await attendi();
    await attendi();
    expect(mie.get('pg_c')).toMatchObject({ stato: 'da_confermare', richiesta: { tipo: 'dipendenza' } });
    expect(mie.get('pg_c')!.richiesta!.testo).toContain('Ginestra ha ritirato «vado verso la porta»');
  });

  it('chiusura atomica: aspetta per poco l’arbitro in volo, e gli invii nel frattempo vanno alla finestra dopo', async () => {
    const arbitro = new ArbitroFinto();
    let sblocca: (() => void) | null = null;
    arbitro.sospendi = (r) => {
      sblocca = r;
    };
    arbitro.relazioniPer.set('mi metto davanti alla porta', (coda) => ({ dipende_da: [], conflitti: [{ con: coda[0]!.id, esclusivo: false }] }));
    const { tavolo, chiusure, mie, orologio } = crea(arbitro);
    tavolo.apri(1, ['pg_g', 'pg_c'], 1, true);
    tavolo.invia('pg_g', 'apro la porta', 1);
    tavolo.invia('pg_c', 'mi metto davanti alla porta', 1);
    tavolo.pronto('pg_g', true);
    tavolo.pronto('pg_c', true);
    await attendi();
    expect(chiusure).toHaveLength(0); // in attesa dell'arbitro (max 1,2 s)
    expect(tavolo.invia('pg_a', 'arrivo di corsa', 1)).toEqual({ ok: true });
    expect(mie.get('pg_a')!.turno).toBe(2);
    sblocca!();
    await orologio.avanza(10);
    expect(chiusure).toHaveLength(1);
    expect(chiusure[0]!.azioni.map((a) => a.autore)).toEqual(['pg_g', 'pg_c']);
    expect(chiusure[0]!.azioni[1]!.conflitti).toMatchObject([{ esclusivo: false }]);
  });

  it('senza arbitro (solo regole): le regole bastano per «seguo X»; niente chiamate per un’azione sola', async () => {
    const arbitro = new ArbitroFinto();
    const { tavolo } = crea(arbitro);
    tavolo.apri(1, ['pg_g', 'pg_c'], 1, true);
    tavolo.invia('pg_g', 'apro la porta', 1);
    tavolo.invia('pg_c', 'seguo ginestra', 1);
    await attendi();
    expect(arbitro.chiamate).toBe(0);
    expect(tavolo.azione('a2')!.dipende_da).toEqual(['a1']);
  });
});
