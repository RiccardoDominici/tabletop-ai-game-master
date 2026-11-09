/**
 * Il ritmo degli orologi è del Motore, orologio per orologio (playtest di nozze-neve, conclusioni §2):
 * o_tramonto arrivava a 8/8 al T14 (indagine) e al T11 (caotico), prima della scena del Sasso, mentre
 * o_lite e o_zio restavano a 0. Due cause nel codice: il «segno dovuto» valeva per tutti gli orologi
 * insieme (bastava un orologio dovuto qualsiasi perché il catalogo e il Motore facessero uscire un segno
 * del tramonto), e il tetto di un segno per risposta valeva per tutti (il tramonto affamava gli altri).
 *
 * Qui: le regole di StatoOrologi (minimo e massimo per orologio, turni attivi che si accumulano tra le
 * visite, due orologi al massimo per risposta, `orologi_in_scena`, registro), poi la partita dell'indagine
 * rigiocata dal server vero con un selettore «avido» (usa ogni segno che vede, senza «> pg», come Haiku
 * nel playtest) e gli stessi cambi di scena.
 */
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { conScena } from '../src/campagna/tipi';
import { RADICE_REPO } from '../src/percorsi';
import { StatoOrologi } from '../src/scena/orologi';
import { attendi, inizia, Prova, turno } from './aiuti/partita';

const NOZZE = path.join(RADICE_REPO, 'campagne', 'nozze-neve');

/** Le scene di nozze-neve, come le cambia il master. */
function scene() {
  const c = caricaCampagna(NOZZE);
  const s = (id: string) => conScena(c, id).scena;
  return { c, casera: s('scena_casera'), casa: s('scena_casa_bonfanti'), sasso: s('scena_sasso') };
}

describe('StatoOrologi: il ritmo di ciascun orologio', () => {
  it('il dovuto è per orologio: il tramonto (6) e la lite (3) maturano ognuno coi propri turni', () => {
    const { c } = scene();
    const o = new StatoOrologi(c);
    const t = o.trova('o_tramonto')!;
    const l = o.trova('o_lite')!;
    expect(o.dovuti(2).map((x) => x.id)).toEqual([]);
    expect(o.dovuti(3).map((x) => x.id)).toEqual(['o_lite']);
    expect(o.dovuto(t, 5)).toBe(false);
    expect(o.dovuti(6).map((x) => x.id)).toEqual(['o_tramonto', 'o_lite']);
    // Il segno della lite non tocca il tramonto (e viceversa).
    expect(o.avanza('o_lite', 3, { inRisposta: new Set(), ritmo: true }).ok).toBe(true);
    expect(o.dovuto(l, 5)).toBe(false);
    expect(o.dovuto(l, 6)).toBe(true);
    expect(o.dovuto(t, 6)).toBe(true);
  });

  it('entrare in una scena non rende dovuto un orologio; i turni attivi delle visite precedenti si sommano', () => {
    const { c, casa, casera } = scene();
    const o = new StatoOrologi(c);
    const zio = o.trova('o_zio')!; // almeno ogni 2, solo a casa Bonfanti
    o.impostaScena(casa, 4); // apertura al turno 4: prima risposta a casa al turno 5
    expect(o.dovuto(zio, 5)).toBe(false); // un solo turno attivo
    o.impostaScena(casera, 6); // a casa è passato solo il turno 5
    expect(zio.turniAccumulati).toBe(1);
    o.impostaScena(casa, 8);
    expect(o.turniAttivi(zio, 9)).toBe(2);
    expect(o.dovuto(zio, 9)).toBe(true); // 1 (turno 5) + 1 (turno 9)
    // Il tramonto è attivo ovunque: i cambi di scena non lo toccano e non lo rendono dovuto.
    expect(o.trova('o_tramonto')!.attivoDal).toBe(0);
  });

  it('ritmo massimo: niente segni in turni consecutivi, salvo il master; un segno per orologio e due orologi per risposta', () => {
    const { c } = scene();
    const o = new StatoOrologi(c);
    expect(o.avanza('o_tramonto', 6, { ritmo: true }).ok).toBe(true);
    expect(o.avanza('o_tramonto', 7, { ritmo: true })).toMatchObject({ ok: false, motivo: expect.stringMatching(/al massimo un segno ogni 2 turni/) });
    expect(o.dovuto(o.trova('o_tramonto')!, 7)).toBe(false);
    expect(o.avanza('o_tramonto', 7, {}).ok).toBe(true); // il master scavalca
    const inRisposta = new Set<string>(['o_tramonto']);
    expect(o.avanza('o_tramonto', 9, { inRisposta })).toMatchObject({ ok: false, motivo: expect.stringMatching(/già uscito in questa risposta/) });
    expect(o.avanza('o_lite', 9, { inRisposta }).ok).toBe(true);
    inRisposta.add('o_lite');
    expect(o.avanza('o_zio', 9, { inRisposta })).toMatchObject({ ok: false }); // o_zio non è attivo in casera, e comunque già due
  });

  it('orologi_in_scena: al Sasso il tramonto sale a sei e corre a un segno ogni due risposte', () => {
    const { c, sasso } = scene();
    const o = new StatoOrologi(c);
    o.avanza('o_tramonto', 6, {});
    expect(o.impostaScena(sasso, 15)).toEqual([{ id: 'o_tramonto', da: 1, a: 6 }]);
    const t = o.trova('o_tramonto')!;
    expect(t).toMatchObject({ pieni: 6, ultimoTurno: 15, almenoOgniScena: 2 });
    expect(o.dovuto(t, 16)).toBe(false);
    expect(o.dovuto(t, 17)).toBe(true);
    // Già sopra sei: nessun salto.
    expect(o.impostaScena(sasso, 20)).toEqual([]);
  });

  it('registro: lo stato del ritmo fa andata e ritorno', () => {
    const { c, casa, casera } = scene();
    const a = new StatoOrologi(c);
    a.avanza('o_lite', 3, {});
    a.impostaScena(casa, 4);
    a.impostaScena(casera, 6);
    a.impostaScena(casa, 8);
    const salvato = JSON.parse(JSON.stringify(a.esporta())) as ReturnType<StatoOrologi['esporta']>;
    expect(salvato['o_zio']).toMatchObject({ attivoDal: 8, turniAccumulati: 1 });
    const b = new StatoOrologi(c);
    b.impostaScena(casa, 0);
    b.importa(salvato);
    expect(b.esporta()).toEqual(a.esporta());
    expect(b.dovuto(b.trova('o_zio')!, 9)).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------
// La partita dell'indagine rigiocata dal server: stessi cambi di scena (turni del server 4, 6, 8,
// 11, 15), un selettore che usa ogni segno del catalogo senza «> pg».

let prova: Prova;
afterEach(async () => prova?.chiudi());

/** Le battute di segno nel catalogo del messaggio del turno (riga `- id · chi · segno_orologio · quando`). */
function segniInCatalogo(messaggio: string): string[] {
  return [...messaggio.matchAll(/^- (\S+) · \S+ · segno_orologio · /gm)].map((m) => m[1]!);
}

describe('nozze-neve, indagine rigiocata col selettore avido', () => {
  it('il tramonto non è a 8/8 prima del Sasso, la lite e lo zio si muovono, al Sasso arriva il finale', async () => {
    prova = new Prova();
    const cartella = path.join(prova.cartella, 'nozze-neve');
    fs.cpSync(NOZZE, cartella, { recursive: true, filter: (f) => !f.includes(`${path.sep}immagini`) && !f.includes(`${path.sep}audio${path.sep}`) });
    const { url } = await prova.avvia(cartella, (_t, messaggio) => [...segniInCatalogo(messaggio).map((id) => `[usa] ${id}`), '[narratore] Ida, il pomeriggio va avanti.', '[invito] tutti'].join('\n'));
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_ida');
    const m = await prova.master(url);
    const cambi: Record<number, string> = { 4: 'scena_casa_bonfanti', 6: 'scena_casera', 8: 'scena_casa_bonfanti', 11: 'scena_casera', 15: 'scena_sasso' };
    let s = await inizia(schermo, tel);
    while (s.fase === 'finestra' && s.turno <= 20) {
      const a = cambi[s.turno];
      if (a) {
        const t0 = s.turno;
        const dopo = attendi(tel, (x) => x.fase === 'finestra' && x.turno === t0 + 1);
        expect(await m.comanda({ tipo: 'scena', scena: a })).toEqual({ ok: true });
        s = await dopo;
        continue;
      }
      s = await turno(tel, 'pg_ida', s, 'Ida aspetta e guarda il cielo.');
    }
    expect(s.fase).toBe('pausa'); // il finale ha chiuso la scena

    const narrati = prova.narrazioni().filter((r) => r['tipo'] === 'turno');
    const statoAl = (n: number) => (narrati.find((r) => r['turno'] === n)?.['stato_orologi'] ?? {}) as Record<string, string>;
    const pieni = (v: string | undefined) => (v ? Number(v.split('/')[0]) : 0);
    // Il tramonto: nel playtest 8/8 al T14 in casera; qui due segni (T7, T13), poi il salto a sei al Sasso.
    expect(pieni(statoAl(14)['o_tramonto'])).toBeLessThan(6);
    expect(pieni(statoAl(16)['o_tramonto'])).toBe(6);
    // La lite e lo zio: nel playtest 0/6 e 0/4.
    expect(Math.max(...narrati.map((r) => pieni((r['stato_orologi'] as Record<string, string>)['o_lite'])))).toBeGreaterThanOrEqual(2);
    expect(Math.max(...narrati.map((r) => pieni((r['stato_orologi'] as Record<string, string>)['o_zio'])))).toBeGreaterThanOrEqual(1);
    // Mai un segno dello stesso orologio in due turni di fila, mai più di due orologi in una risposta.
    const segniPerTurno = narrati.map((r) => ({
      turno: r['turno'] as number,
      orologi: ((r['uscita'] as Array<{ tipo: string; id: string }>) ?? []).filter((u) => u.tipo === 'usa' && /^nar_(sole|lite|zio)_/.test(u.id)).map((u) => u.id.split('_')[1]!),
    }));
    for (const x of segniPerTurno) expect(new Set(x.orologi).size).toBe(x.orologi.length);
    for (const x of segniPerTurno) expect(x.orologi.length).toBeLessThanOrEqual(2);
    const turniTramonto = segniPerTurno.filter((x) => x.orologi.includes('sole')).map((x) => x.turno);
    for (let i = 1; i < turniTramonto.length; i++) expect(turniTramonto[i]! - turniTramonto[i - 1]!).toBeGreaterThanOrEqual(2);
    // Il finale lo dice il Motore a orologio pieno, al Sasso.
    const conFinale = prova.turni().find((r) => r['finale']);
    expect(conFinale).toMatchObject({ finale: 'fin_tramonto' });
    expect(conFinale!['turno']).toBeGreaterThan(15);
  }, 90_000);
});
