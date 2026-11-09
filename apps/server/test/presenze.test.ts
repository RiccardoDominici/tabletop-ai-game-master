/**
 * Chi è in scena tra i PNG (richiesta 2 del 9 novembre): i ritratti sul proiettore e sul telefono.
 * Parti pure (presenze.ts) e il tavolo intero: scena con un solo PNG presente, il PNG che parla
 * diventa «altrove» quando esce di scena, il master decide a mano; un PNG mai incontrato non compare.
 */
import { describe, expect, it, afterEach } from 'vitest';
import type { VoceTrascrizione } from '@cantastorie/shared';
import { personaggiScena, pngIncontrati, presenzaEffettiva, presenzeMaster } from '../src/scena/presenze';
import { Prova, inizia, turno } from './aiuti/partita';

const PNG = [
  { id: 'png_oste', nome: 'Oste Bruno', voce_id: 'v', dati: {} },
  { id: 'png_guardia', nome: 'Guardia Lia', voce_id: 'v', dati: {} },
  { id: 'png_fabbro', nome: 'Fabbro Ugo', voce_id: 'v', dati: {} },
];
const ritratto = (id: string) => (id === 'png_oste' ? `/r/${id}.jpg` : null);
const voce = (chi: string): VoceTrascrizione => ({ id: 1, turno: 1, tipo: 'battuta', chi, nome: chi, testo: 'ciao' });

describe('presenze: parti pure', () => {
  it('presenza = scena, corretta dalle decisioni del master (true aggiunge, false toglie)', () => {
    expect([...presenzaEffettiva(['png_oste'], new Map())]).toEqual(['png_oste']);
    expect([...presenzaEffettiva(['png_oste'], new Map([['png_guardia', true], ['png_oste', false]]))]).toEqual(['png_guardia']);
  });

  it('già incontrati = chi ha parlato nella trascrizione; i PNG sconosciuti e il narratore no', () => {
    const inc = pngIncontrati([voce('png_oste'), voce('narratore'), voce('pg_anna'), voce('png_inventato')], PNG);
    expect([...inc]).toEqual(['png_oste']);
  });

  it('vista: presenti prima, poi altrove (già incontrati); mai incontrati e non presenti esclusi', () => {
    const vista = personaggiScena({ png: PNG, presenti: new Set(['png_guardia']), incontrati: new Set(['png_oste']), ritratto });
    expect(vista).toEqual([
      { id: 'png_guardia', nome: 'Guardia Lia', ritratto: null, presente: true },
      { id: 'png_oste', nome: 'Oste Bruno', ritratto: '/r/png_oste.jpg', presente: false },
    ]);
    expect(vista.some((p) => p.id === 'png_fabbro')).toBe(false);
  });

  it('PNG nascosto: non compare finché non ha parlato o non è rivelato; il pannello lo mostra sempre', () => {
    const NASCOSTO = PNG.map((p) => (p.id === 'png_guardia' ? { ...p, nascosto: true } : p));
    const senzaParlare = personaggiScena({ png: NASCOSTO, presenti: new Set(['png_guardia']), incontrati: new Set(), ritratto });
    expect(senzaParlare).toEqual([]);
    const rivelato = personaggiScena({ png: NASCOSTO, presenti: new Set(['png_guardia']), incontrati: new Set(), rivelati: new Set(['png_guardia']), ritratto });
    expect(rivelato).toEqual([{ id: 'png_guardia', nome: 'Guardia Lia', ritratto: null, presente: true }]);
    const dopoAverParlato = personaggiScena({ png: NASCOSTO, presenti: new Set(['png_guardia']), incontrati: new Set(['png_guardia']), ritratto });
    expect(dopoAverParlato.map((p) => p.id)).toEqual(['png_guardia']);
    const m = presenzeMaster({ png: NASCOSTO, presenti: new Set(['png_guardia']), incontrati: new Set(), manuali: new Map() });
    expect(m.find((p) => p.id === 'png_guardia')).toMatchObject({ nascosto: true, rivelato: false });
  });

  it('scena vuota e nessuno incontrato: lista vuota (nessuno spoiler)', () => {
    expect(personaggiScena({ png: PNG, presenti: new Set(), incontrati: new Set(), ritratto })).toEqual([]);
  });

  it('pannello: tutti i PNG, con la presenza e se è stata decisa a mano', () => {
    const m = presenzeMaster({ png: PNG, presenti: new Set(['png_oste']), incontrati: new Set(), manuali: new Map([['png_oste', true]]) });
    expect(m.map((p) => [p.id, p.presente, p.manuale, p.incontrato])).toEqual([
      ['png_oste', true, true, false],
      ['png_guardia', false, false, false],
      ['png_fabbro', false, false, false],
    ]);
  });
});

describe('presenze: il tavolo', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('scena → ritratti; il PNG che ha parlato diventa altrove; il master lo decide a mano', async () => {
    prova = new Prova();
    // Nella scena c'è solo l'oste: la guardia (mai incontrata) non compare.
    const cartella = prova.campagna('mini', { ritocchi: { 'scena.yaml': (d) => (d['png_presenti'] = ['png_oste']) } });
    const { url } = await prova.avvia(cartella, () => '[png_oste] Benvenuta: siediti.\n[invito] tutti');
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    const s0 = await inizia(schermo, tel);
    expect(s0.scena.personaggi).toEqual([{ id: 'png_oste', nome: 'Oste Bruno', ritratto: null, presente: true }]);

    const s1 = await turno(tel, 'pg_anna', s0, 'Entro e saluto.');
    expect(s1.scena.personaggi?.map((p) => [p.id, p.presente])).toEqual([['png_oste', true]]);

    const master = await prova.master(url);
    // Il master mette la guardia in scena a mano: compare, presente.
    expect(await master.comanda({ tipo: 'presenza', id_png: 'png_guardia', presente: true })).toEqual({ ok: true });
    const dopoGuardia = await master.stato();
    expect(dopoGuardia.tavolo.scena.personaggi?.map((p) => [p.id, p.presente])).toEqual([
      ['png_guardia', true],
      ['png_oste', true],
    ]);
    expect(dopoGuardia.presenze?.find((p) => p.id === 'png_guardia')).toMatchObject({ presente: true, manuale: true, incontrato: false });

    // L'oste (già incontrato) esce di scena: resta visibile come «altrove».
    expect(await master.comanda({ tipo: 'presenza', id_png: 'png_oste', presente: false })).toEqual({ ok: true });
    const altrove = (await master.stato()).tavolo.scena.personaggi;
    expect(altrove?.map((p) => [p.id, p.presente])).toEqual([
      ['png_guardia', true],
      ['png_oste', false],
    ]);

    // Torna quanto dice la scena, e un PNG sconosciuto si rifiuta.
    expect(await master.comanda({ tipo: 'presenza', id_png: 'png_guardia', presente: null })).toEqual({ ok: true });
    expect((await master.stato()).tavolo.scena.personaggi?.map((p) => p.id)).toEqual(['png_oste']);
    expect(await master.comanda({ tipo: 'presenza', id_png: 'png_nessuno', presente: true })).toMatchObject({ ok: false });
  }, 30_000);

  it('nascosto: il PNG presente per il Motore compare solo quando parla; il master lo rivela a mano', async () => {
    prova = new Prova();
    const cartella = prova.campagna('mini', { ritocchi: { 'png/png_guardia.yaml': (d) => (d['nascosto'] = true) } });
    const { url } = await prova.avvia(cartella, () => '[png_oste] Benvenuta: siediti.\n[invito] tutti');
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    const s0 = await inizia(schermo, tel);
    // La guardia è in scena (la scheda lo dice) ma è nascosta: non compare, l'oste sì.
    expect(s0.scena.personaggi?.map((p) => p.id)).toEqual(['png_oste']);

    const master = await prova.master(url);
    expect(await master.comanda({ tipo: 'rivela', id_png: 'png_guardia' })).toEqual({ ok: true });
    // Ordine della campagna (png_guardia prima di png_oste): entrambi presenti.
    expect((await master.stato()).tavolo.scena.personaggi?.map((p) => [p.id, p.presente])).toEqual([
      ['png_guardia', true],
      ['png_oste', true],
    ]);
    // Rivelare un PNG che non è nascosto si rifiuta.
    expect(await master.comanda({ tipo: 'rivela', id_png: 'png_oste' })).toMatchObject({ ok: false });
  }, 30_000);
});
