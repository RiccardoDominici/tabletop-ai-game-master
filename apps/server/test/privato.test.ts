/**
 * Esiti privati (`[privato pg_x]`, docs/f0-contratti.md): il parser li riconosce; la partita li manda
 * solo al telefono di quel PG (testo, e voce solo se ascolta), mai al proiettore né alla trascrizione
 * pubblica; restano nel contesto del narratore e nell'archivio.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { AudioFrase, EsitoPrivato } from '@tabletop-ai-gm/shared';
import { ParserNarratore } from '../src/narrazione/parser';
import { agisci, emetti, inizia, Prova, turno } from './aiuti/partita';

describe('parser: riga [privato pg_x]', () => {
  const nuovo = () => new ParserNarratore({ idPng: ['png_irma'], idPg: ['pg_anna', 'pg_bruno'], alias: { anna: 'pg_anna' } });

  it('frase privata con il PG, anche da alias e a metà riga; le altre restano pubbliche', () => {
    const p = nuovo();
    const ev = [...p.aggiungi('[narratore] Anna fruga nel baule.\n[privato pg_anna] Sotto la coperta c’è una chiave. È fredda.\n'), ...p.aggiungi('[narratore] Bruno aspetta. [privato anna] La chiave ha un nastro rosso.\n[invito] tutti\n'), ...p.chiudi()];
    const frasi = ev.filter((e) => e.tipo === 'frase');
    expect(frasi.map((f) => [f.testo, f.privato ?? null])).toEqual([
      ['Anna fruga nel baule.', null],
      ['Sotto la coperta c’è una chiave.', 'pg_anna'],
      ['È fredda.', 'pg_anna'],
      ['Bruno aspetta.', null],
      ['La chiave ha un nastro rosso.', 'pg_anna'],
    ]);
  });

  it('PG sconosciuto: la riga si scarta (mai in pubblico) e resta un errore', () => {
    const p = nuovo();
    const ev = [...p.aggiungi('[privato pg_nessuno] Il segreto.\n[invito] tutti\n'), ...p.chiudi()];
    expect(ev.filter((e) => e.tipo === 'frase')).toEqual([]);
    expect(ev.some((e) => e.tipo === 'anomalia' && e.codice === 'privato_pg_sconosciuto')).toBe(true);
  });
});

let prova: Prova;
afterEach(async () => prova?.chiudi());

describe('partita: l’esito privato va solo al telefono del suo PG', () => {
  it('testo al telefono di Anna, niente al proiettore né alla trascrizione; voce solo con «Ascolta qui»', async () => {
    prova = new Prova();
    const { url, messaggi } = await prova.avvia(prova.campagna('mini'), (t) =>
      t === 1
        ? '[narratore] Bruno aspetta alla porta. Bruno, la porta cigola.\n[privato pg_anna] Sotto la coperta c’è una chiave.\n[narratore] Che fate?\n[invito] tutti'
        : t === 2
          ? '[narratore] Bruno resta alla porta. Bruno, fuori nevica.\n[privato pg_anna] La chiave ha un nastro rosso.\n[narratore] Anna, e ora?\n[invito] pg_anna'
          : '[narratore] Silenzio.\n[invito] tutti',
    );
    const schermo = await prova.proiettore(url);
    const frasiSchermo: AudioFrase[] = [];
    schermo.on('audio:frase', (f) => frasiSchermo.push(f));
    const anna = await prova.telefono(url, 'pg_anna');
    const bruno = await prova.telefono(url, 'pg_bruno');
    const esitiAnna: EsitoPrivato[][] = [];
    const esitiBruno: EsitoPrivato[][] = [];
    anna.on('privato:esiti', (e) => esitiAnna.push(e));
    bruno.on('privato:esiti', (e) => esitiBruno.push(e));
    const frasiAnna: AudioFrase[] = [];
    anna.on('audio:frase', (f) => frasiAnna.push(f));

    const s = await inizia(schermo, anna);
    // Turno 1: Anna non ascolta → testo sì, voce privata no.
    // Con «tutti» il turno aspetta ogni PG col telefono: anche Bruno agisce.
    await agisci(bruno, 'pg_bruno', 'Aspetto alla porta.', s.versione_scena);
    const s2 = await turno(anna, 'pg_anna', s, 'Frugo nel baule.', true);
    expect(esitiAnna.at(-1)?.map((e) => e.testo)).toEqual(['Sotto la coperta c’è una chiave.']);
    expect(esitiBruno.flat()).toEqual([]);
    expect(s2.trascrizione.some((v) => v.testo.includes('chiave'))).toBe(false);
    expect(frasiSchermo.some((f) => f.testo.includes('chiave') || f.solo_pg)).toBe(false);
    expect(frasiAnna.some((f) => f.solo_pg)).toBe(false);

    // Turno 2: Anna accende «Ascolta qui» → la voce privata arriva solo a lei.
    expect(await emetti((cb) => anna.emit('telefono:ascolta', { attivo: true }, cb))).toEqual({ ok: true });
    await agisci(bruno, 'pg_bruno', 'Resto alla porta.', s2.versione_scena);
    await turno(anna, 'pg_anna', s2, 'Guardo la chiave.', true);
    expect(frasiAnna.filter((f) => f.solo_pg === 'pg_anna').map((f) => f.testo)).toEqual(['La chiave ha un nastro rosso.']);
    expect(frasiSchermo.some((f) => f.solo_pg || f.testo.includes('nastro'))).toBe(false);
    expect(esitiAnna.at(-1)?.map((e) => e.testo)).toEqual(['Sotto la coperta c’è una chiave.', 'La chiave ha un nastro rosso.']);
    // Il narratore li ricorda nel contesto del turno dopo.
    expect(messaggi.at(-1)).toContain('Esiti privati già dati');
    expect(messaggi.at(-1)).toContain('pg_anna: Sotto la coperta c’è una chiave.');

    // Un telefono che sceglie il PG dopo riceve l'elenco intero.
    const anna2 = await prova.nuovo(url);
    const arrivati = new Promise<EsitoPrivato[]>((r) => anna2.on('privato:esiti', r));
    await emetti((cb) => anna2.emit('telefono:entra', cb));
    await emetti((cb) => anna2.emit('telefono:scegli_pg', { id_pg: 'pg_anna' }, cb));
    expect((await arrivati).length).toBe(2);
  }, 20_000);
});

describe('ripresa: gli esiti privati tornano dall’archivio', () => {
  it('ricostruisci raccoglie privati_turno dei turni chiusi dalla fotografia', async () => {
    const { ricostruisci } = await import('../src/sessione/tipi');
    const esito = { id: 'p1-1', turno: 1, id_pg: 'pg_anna', chi: 'narratore', nome: 'Narratore', testo: 'Una chiave.' };
    const tardi = { ...esito, id: 'p3-1', turno: 3, testo: 'Dopo la fotografia.' };
    const r = ricostruisci('s', [
      { tipo: 'privati_turno', dati: { turno: 1, esiti: [esito] }, ts: '1' },
      { tipo: 'privati_turno', dati: { turno: 3, esiti: [tardi] }, ts: '2' },
      { tipo: 'fotografia', dati: { turno: 2 }, ts: '3' },
    ] as never);
    expect(r?.privati).toEqual([esito]);
  });
});
