/**
 * Lo sceneggiatore (docs/sceneggiatore.md): le battute scritte da Claude Code mentre si gioca entrano nel
 * repertorio solo se passano il controllo (forma, voci, niente cancelli né effetti, niente segreti), e
 * quella chiesta «subito» per un'azione rimasta senza battuta si dice a finestra aperta. Qui la parte di
 * Claude Code la fa la prova: scrive vivo.json e la risposta nella cartella sorvegliata.
 */
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { regexDaPython, type ParolaSegreta } from '../src/repertorio/segreti';
import { cartelle, leggiJson, scriviJson, type RichiestaSceneggiatore } from '../src/sceneggiatore/protocollo';
import { estraiYaml, nomiDeiPg, pgCheAgisce, validaBattute } from '../src/sceneggiatore/valida';
import { giaUsati, righeDellaRisposta, ticBloccati, unisciGiaUsati } from '../src/sceneggiatore/ripetizioni';
import YAML from 'yaml';
import { codaAudioFish } from '../src/sceneggiatore/audio';
import { CacheAudio } from '../src/voce/cache-audio';
import { loggerMuto } from '../src/logger';
import os from 'node:os';
import { RADICE_REPO } from '../src/percorsi';
import type { EsitoPrivato } from '@cantastorie/shared';
import { agisci, attendi, FIXTURE, inizia, Prova, turno } from './aiuti/partita';

const vino: ParolaSegreta = { parola: 'il vino annacquato', sorgente: '\\bannacquat', regex: regexDaPython('\\bannacquat'), pubblica_dopo: [], fatti: [] };
const battuta = (o: Record<string, unknown>) => ({ id: 'sc_x_1', chi: 'png_oste', tipo: 'reazione', quando: 'un PG chiede del vino', temi: ['vino'], testo: ['[png_oste] Il vino è buono, signora.'], ...o });

describe('controllo delle battute dello sceneggiatore', () => {
  const c = caricaCampagna(path.join(FIXTURE, 'mini'));
  const ctx = { campagna: c, scena: c.scena.id, presenti: new Set(['png_oste']), esistenti: new Map(), prefisso: 'sc_x_', parole: [vino], pubblico: null, detto: '' };
  const yaml = (lista: unknown[]) => `\`\`\`yaml\n${JSON.stringify({ battute: lista })}\n\`\`\``;

  it('forma imposta dal Motore: scena in corso, un solo uso, id col prefisso', () => {
    const r = validaBattute(yaml([battuta({ id: 'altro_1' })]), ctx);
    expect(r.scartate).toEqual([]);
    expect(r.accettate[0]).toMatchObject({ id: 'sc_x_1', scene: [c.scena.id], max_usi: 1, chi: 'png_oste' });
  });

  it('fuori: PNG assenti, tipi che rivelano, cancelli ed effetti, parole segrete, YAML rotto', () => {
    const r = validaBattute(
      yaml([
        battuta({ id: 'sc_x_1', chi: 'png_guardia', testo: ['[png_guardia] Fermi.'] }),
        battuta({ id: 'sc_x_2', tipo: 'confessione' }),
        battuta({ id: 'sc_x_3', richiede: { indizi_rivelati: ['i_brocca'] } }),
        battuta({ id: 'sc_x_4', testo: ['[png_oste] Il vino è annacquato, lo ammetto.'] }),
        battuta({ id: 'sc_x_5' }),
      ]),
      ctx,
    );
    expect(r.accettate.map((b) => b.id)).toEqual(['sc_x_5']);
    expect(r.scartate.map((s) => s.motivo)).toEqual([
      expect.stringMatching(/tipo non ammesso/),
      expect.stringMatching(/richiede\/effetti non ammessi/),
      expect.stringMatching(/png_guardia non è nella scena/),
      expect.stringMatching(/parole segrete: il vino annacquato/),
    ]);
    expect(validaBattute('battute: [', ctx).scartate[0]!.motivo).toMatch(/YAML non valido/);
    expect(estraiYaml('Ecco:\n```yaml\nbattute: []\n```\nfine')).toBe('battute: []');
  });
});

describe('ripetizioni e tic, corpo dei PG, audio delle battute nuove', () => {
  const nozze = caricaCampagna(path.join(RADICE_REPO, 'campagne', 'nozze-neve'));
  const v = (turno: number, tipo: 'narrazione' | 'battuta', chi: string, testo: string) => ({ id: Math.random(), turno, tipo, chi, nome: chi, testo }) as never;

  it('«il pugno di Gunda resta chiuso» decide per lei; la bottiglia di Remo no', () => {
    const nomi = nomiDeiPg(nozze);
    expect(pgCheAgisce("Il pugno di Gunda è grosso come una forma piccola, e non si apre.", nomi)).not.toBeNull();
    expect(pgCheAgisce('Nella sala nessuno parla, e le mani di Remo tremano.', nomi)).not.toBeNull();
    expect(pgCheAgisce('La bottiglia di Remo è vuota da un pezzo.', nomi)).toBeNull();
  });

  it('attacchi e immagini degli ultimi turni; il tic uscito nelle ultime due righe di un PNG è bloccato', () => {
    const voci = [
      v(1, 'narrazione', 'narratore', 'Sulla tavolata dei Morlacchi qualcuno batte i boccali, a tempo.'),
      v(3, 'battuta', 'png_ettore', "Eh? Parla dall'orecchio buono, eh."),
      v(4, 'narrazione', 'narratore', 'Ettore batte il bastone due volte, e la sala si volta.'),
    ];
    const g = giaUsati(voci, 4);
    expect(g.attacchi).toEqual(expect.arrayContaining(['Sulla tavolata dei Morlacchi', 'Ettore batte il bastone']));
    expect(g.immagini).toEqual(expect.arrayContaining(['Sulla tavolata dei Morlacchi qualcuno batte i boccali']));
    const bloccati = ticBloccati(voci, nozze.png);
    expect([...bloccati.keys()]).toEqual(['png_ettore']);
    const ctx = { campagna: nozze, scena: 'scena_casera', presenti: new Set(['png_ettore']), esistenti: new Map(), prefisso: 'sc_t_', parole: [], pubblico: null, detto: '', ticBloccati: bloccati };
    const tic = { id: 'sc_t_1', chi: 'png_ettore', tipo: 'reazione', quando: 'un PG parla a Ettore', temi: ['ettore'], testo: ["[png_ettore] Parla dall'orecchio buono, eh. La neve è neve."] };
    expect(validaBattute(JSON.stringify({ battute: [tic] }), ctx).scartate[0]!.motivo).toMatch(/tic di png_ettore troppo vicino/);
  });

  it('le righe in volo entrano nei «già usati»: la seconda risposta dello stesso turno sa cosa ha scritto la prima', () => {
    const yaml = YAML.parse('battute:\n  - testo:\n      - "[narratore] Dietro il tavolo alto, i tre gradini aspettano nel buio fresco."\n');
    const righe = righeDellaRisposta(yaml);
    expect(righe).toEqual(['Dietro il tavolo alto, i tre gradini aspettano nel buio fresco.']);
    const g = unisciGiaUsati({ attacchi: ['Sulla tavolata dei Morlacchi'], immagini: [], tic: { png_ettore: ['x'] } }, righe);
    expect(g.attacchi).toEqual(['Sulla tavolata dei Morlacchi', 'Dietro il tavolo alto']);
    expect(g.immagini).toEqual(['Dietro il tavolo alto']);
    expect(g.tic).toEqual({ png_ettore: ['x'] });
    expect(unisciGiaUsati(undefined, []).attacchi).toEqual([]);
  });

  it('le battute nuove: la voce drama-3 va in cache in sottofondo, una volta sola', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sceneggiatore-audio-'));
    const cache = new CacheAudio(dir);
    let sintesi = 0;
    const motore = { sintetizza: async () => (sintesi++, { sampleRate: 24000, pezzi: (async function* () { yield new Uint8Array(4800); })() }) } as never;
    const coda = codaAudioFish({ campagna: nozze, pronuncia: (t) => t, cache, motore, voci: new Map(), log: loggerMuto(), attesaMs: 1 });
    const b = { id: 'sc_a_1', chi: 'narratore', tipo: 'reazione', quando: 'x', temi: ['x'], testo: [{ etichetta: 'narratore', testo: 'La neve batte sui vetri.' }], varianti: [] } as never;
    await coda([b]);
    expect(sintesi).toBe(1);
    await coda([b]);
    expect(sintesi).toBe(1); // già in cache
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('i PG sono dei giocatori: niente righe che decidono per loro', () => {
  const nozze = caricaCampagna(path.join(RADICE_REPO, 'campagne', 'nozze-neve'));
  const nomi = nomiDeiPg(nozze);
  it('un PG soggetto di un verbo è una decisione al suo posto; vocativo, complemento e genitivo di una cosa no', () => {
    expect(pgCheAgisce('Gunda apre il pugno con calma, davanti a tutta la tavolata.', nomi)).toBe('Gunda apre il pugno con calma, davanti a tutta la tavolata.');
    expect(pgCheAgisce('La fisarmonica tace. Poi Remo si alza dal tavolo.', nomi)).toBe('Poi Remo si alza dal tavolo.');
    expect(pgCheAgisce('Gunda, la tavolata aspetta il tuo pugno.', nomi)).toBeNull();
    expect(pgCheAgisce('La sala guarda Gunda, e nessuno ride.', nomi)).toBeNull();
    expect(pgCheAgisce('Il boccale di Gunda resta sul tavolo.', nomi)).toBeNull();
  });

  it('l’esempio del playtest esce dal controllo; con un’azione privata la battuta risponde solo in privato', () => {
    const ctx = { campagna: nozze, scena: 'scena_casera', presenti: new Set(['png_gaspare', 'png_ettore', 'png_adelina']), esistenti: new Map(), prefisso: 'sc_g_', parole: [], pubblico: null, detto: '' };
    const gunda = { id: 'sc_g_1', chi: 'narratore', tipo: 'reazione', quando: 'un PG chiede a un altro di aprire il pugno', temi: ['pugno'], testo: ['[narratore] Gunda apre il pugno con calma, davanti a tutta la tavolata.', '[narratore] Il palmo è vuoto, pulito.'] };
    expect(validaBattute(JSON.stringify({ battute: [gunda] }), ctx).scartate[0]!.motivo).toMatch(/decide per un PG: «Gunda apre il pugno/);
    const sala = { ...gunda, testo: ['[narratore] La tavolata si sporge a guardare quel pugno chiuso.'] };
    const r = validaBattute(JSON.stringify({ battute: [sala] }), { ...ctx, privata: true });
    expect(r.accettate[0]!.richiede.privata).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------

let prova: Prova;
afterEach(async () => prova?.chiudi());

describe('lo sceneggiatore al tavolo', () => {
  it('un’azione senza battuta: richiesta «subito», risposta controllata, battuta detta a finestra aperta e nel repertorio', async () => {
    prova = new Prova();
    const radice = path.join(prova.cartella, 'sceneggiatore');
    const c = cartelle(radice);
    scriviJson(c.vivo, { ts: Date.now(), pid: 0, modello: 'prova' });
    const { url } = await prova.avvia(prova.campagna('mini'), () => '[narratore] Anna aspetta una risposta.\n[invito] tutti', {}, { sceneggiatore: { radice, tettoMs: 30_000 } });
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    const m = await prova.master(url);
    const s = await inizia(schermo, tel);
    await turno(tel, 'pg_anna', s, 'Chiedo all’oste da dove viene questo vino.');

    // Le richieste: una «subito» per Anna, una «prossime».
    const richieste = fs.readdirSync(c.richieste).map((f) => leggiJson<RichiestaSceneggiatore>(path.join(c.richieste, f))!);
    const subito = richieste.find((r) => r.tipo === 'subito')!;
    expect(subito).toMatchObject({ turno: 1, azione: { id_pg: 'pg_anna', testo: 'Chiedo all’oste da dove viene questo vino.' }, scena: { png_presenti: ['png_oste', 'png_guardia'] } });
    expect(richieste.some((r) => r.tipo === 'prossime')).toBe(true);

    // «Claude Code» risponde: la battuta si dice a finestra aperta.
    const detta = attendi(tel, (x) => x.trascrizione.some((v) => v.testo === 'Viene dalle botti di mio nonno, signora.'), 8000);
    scriviJson(path.join(c.risposte, `${subito.id}.json`), {
      id: subito.id,
      esito: 'ok',
      ms: 1200,
      yaml: `battute:\n  - id: ${subito.prefisso}1\n    chi: png_oste\n    tipo: reazione\n    quando: "un PG chiede all'oste da dove viene il vino"\n    temi: [vino, botti]\n    testo:\n      - "[png_oste] Viene dalle botti di mio nonno, signora."\n`,
    });
    const dopo = await detta;
    expect(dopo.fase).toBe('finestra');
    const riga = prova.narrazioni().find((r) => r['tipo'] === 'sceneggiatore' && r['tipo_richiesta'] === 'subito')!;
    expect(riga).toMatchObject({ consegnata: true, per_pg: 'pg_anna', esito: 'ok' });
    expect((await m.stato()).repertorio!.usate.map((b) => b.id)).toContain(`${subito.prefisso}1`);
  }, 30_000);

  it('un’azione privata senza battuta: la risposta dello sceneggiatore va solo al telefono del PG', async () => {
    prova = new Prova();
    const radice = path.join(prova.cartella, 'sceneggiatore');
    const c = cartelle(radice);
    scriviJson(c.vivo, { ts: Date.now(), pid: 0, modello: 'prova' });
    const { url } = await prova.avvia(prova.campagna('mini'), () => '[invito] tutti', {}, { sceneggiatore: { radice, tettoMs: 30_000 } });
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    const privati: EsitoPrivato[][] = [];
    tel.on('privato:esiti', (e: EsitoPrivato[]) => privati.push(e));
    const s = await inizia(schermo, tel);
    const dopo = attendi(tel, (x) => x.fase === 'finestra' && x.turno === 2);
    await agisci(tel, 'pg_anna', 'Sussurro all’oste: chi ha bevuto dalla brocca?', s.versione_scena, true);
    await dopo;
    const subito = fs.readdirSync(c.richieste).map((f) => leggiJson<RichiestaSceneggiatore>(path.join(c.richieste, f))!).find((r) => r.tipo === 'subito')!;
    expect(subito.azione).toMatchObject({ id_pg: 'pg_anna', privata: true });
    scriviJson(path.join(c.risposte, `${subito.id}.json`), {
      id: subito.id,
      esito: 'ok',
      ms: 900,
      yaml: `battute:\n  - chi: png_oste\n    tipo: reazione\n    quando: "in privato, un PG chiede all'oste della brocca"\n    temi: [brocca]\n    testo:\n      - "[png_oste] A voce bassa: la brocca l'ho riempita io, stamattina."\n`,
    });
    const fine = Date.now() + 8000;
    while (!privati.flat().some((e) => e.testo.includes('riempita io')) && Date.now() < fine) await new Promise((r) => setTimeout(r, 100));
    expect(privati.flat().map((e) => e.testo).join(' ')).toContain('la brocca l\'ho riempita io');
    const stato = await new Promise<{ trascrizione: Array<{ testo: string }> }>((r) => tel.emit('stato:richiedi', r as never));
    expect(stato.trascrizione.map((v) => v.testo).join(' ')).not.toContain('riempita io');
    expect(prova.narrazioni().find((r) => r['tipo'] === 'sceneggiatore' && r['tipo_richiesta'] === 'subito')).toMatchObject({ consegnata: true, privata: true });
  }, 30_000);
});
