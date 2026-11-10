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
import { estraiYaml, validaBattute } from '../src/sceneggiatore/valida';
import { attendi, FIXTURE, inizia, Prova, turno } from './aiuti/partita';

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
});
