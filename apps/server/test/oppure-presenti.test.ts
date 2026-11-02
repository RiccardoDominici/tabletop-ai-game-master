/**
 * Proposte per il Motore (docs/repertorio.md): `richiede.oppure` (base E almeno un'alternativa, con i
 * cancelli dell'alternativa scelta), chiavi sconosciute rifiutate (ignorate aprirebbero il cancello),
 * `scena` come lista, e solo i PNG presenti nella scena in corso con battute in catalogo.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { RADICE_REPO } from '../src/percorsi';
import { caricaRepertorio, ErroreRepertorio } from '../src/repertorio/caricatore';
import { StatoRepertorio, haCancelloAzione, rispondeA } from '../src/repertorio/stato';
import { StatoOrologi } from '../src/scena/orologi';

const MINI = path.join(import.meta.dirname, 'fixtures', 'campagne', 'mini');
const cartelle: string[] = [];
afterEach(() => {
  for (const c of cartelle.splice(0)) fs.rmSync(c, { recursive: true, force: true });
});

/** Repertorio di prova sulla campagna mini, da righe YAML di battute. */
function repertorioDi(battute: string[], altreScene: string[] = []) {
  const c = caricaCampagna(MINI);
  for (const id of altreScene) c.scene.push({ ...c.scena, id, png_presenti: [] });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rep-oppure-'));
  cartelle.push(dir);
  fs.writeFileSync(path.join(dir, 'png_oste.yaml'), ['battute:', ...battute].join('\n'));
  return { c, rep: caricaRepertorio(c, undefined, dir) };
}

const CONFESSA =
  '  - {id: oste_cede, chi: png_oste, tipo: confessione, quando: "un PG insiste sul vino", temi: [vino], testo: ["[png_oste] Va bene, ci metto l\'acqua."], ' +
  'richiede: {battute_non_usate: [oste_altro], oppure: [{privata: true}, {indizi_rivelati: [i_brocca]}]}}';
const ALTRO = '  - {id: oste_altro, chi: png_oste, tipo: reazione, quando: "altro", testo: ["[png_oste] Altro."]}';

describe('richiede.oppure', () => {
  it('il caricatore legge le alternative', () => {
    const { rep } = repertorioDi([CONFESSA, ALTRO]);
    const b = rep.perId.get('oste_cede')!;
    expect(b.richiede.oppure).toMatchObject([{ privata: true, indizi_rivelati: [] }, { privata: null, indizi_rivelati: ['i_brocca'] }]);
    expect(b.richiede.battute_non_usate).toEqual(['oste_altro']);
    expect(rispondeA(b, { autore: 'pg_anna', privata: true })).toBe(true); // senza stato: una delle due
    expect(haCancelloAzione(b)).toBe(false); // la seconda alternativa non ha cancelli
  });

  it('un’azione privata, oppure un’azione pubblica dopo l’indizio; e sempre la base', () => {
    const { c, rep } = repertorioDi([CONFESSA, ALTRO]);
    const s = new StatoRepertorio(rep, c, new StatoOrologi(c));
    const b = rep.perId.get('oste_cede')!;
    const cat = (privata: boolean) =>
      s.catalogo({ turno: 1, azioni: [{ autore: 'pg_anna', testo: 'Insisto sul vino.', privata }], stallo: false, segnoDovuto: false, nomiPng: new Map(), parole: [] }).battute.map((x) => x.id);
    // Prima dell'indizio è aperta solo l'alternativa privata.
    expect(s.motivoIndisponibile(b)).toBeNull();
    expect(s.serveAzione(b)).toBe(true);
    expect(cat(true)).toContain('oste_cede');
    expect(cat(false)).not.toContain('oste_cede');
    // Dopo l'indizio anche un'azione pubblica.
    s.indiziRivelati.add('i_brocca');
    expect(s.serveAzione(b)).toBe(false);
    expect(s.rispondeA(b, { autore: 'pg_anna', privata: false })).toBe(true);
    expect(cat(false)).toContain('oste_cede');
    // La base vale sempre: uscita oste_altro, nessuna alternativa basta.
    expect(s.usa('oste_altro', 1, false).ok).toBe(true);
    expect(s.motivoIndisponibile(b)).toMatch(/battuta non usata oste_altro/);
  });

  it('chiavi sconosciute, oppure annidati o con un solo blocco: errori, non cancelli aperti', () => {
    const errori = (riga: string): string[] => {
      try {
        repertorioDi([riga, ALTRO]);
        return [];
      } catch (e) {
        return (e as ErroreRepertorio).errori;
      }
    };
    const base = '  - {id: oste_x, chi: png_oste, tipo: reazione, quando: "q", testo: ["[png_oste] X."], richiede: ';
    expect(errori(`${base}{solo_se_stanotte: true}}`)).toEqual([expect.stringMatching(/chiave non prevista «solo_se_stanotte»/)]);
    expect(errori(`${base}{oppure: [{privata: true}, {oppure: [{privata: true}, {privata: false}]}]}}`)).toEqual([expect.stringMatching(/niente oppure annidati/)]);
    expect(errori(`${base}{oppure: [{privata: true}]}}`)).toEqual([expect.stringMatching(/almeno due blocchi/)]);
    expect(errori(`${base}{oppure: [{privata: true}, {indizi_rivelati: [i_inventato]}]}}`)).toEqual([expect.stringMatching(/indizio inesistente «i_inventato»/)]);
  });
});

describe('scena come lista', () => {
  it('una battuta vale in ognuna delle sue scene, e solo lì', () => {
    const { c, rep } = repertorioDi(
      ['  - {id: nar_due, chi: narratore, tipo: momento, quando: "q", testo: ["[narratore] Due."], scena: [scena_locanda, scena_altra]}'],
      ['scena_altra', 'scena_terza'],
    );
    const b = rep.perId.get('nar_due')!;
    expect(b.scene).toEqual(['scena_locanda', 'scena_altra']);
    const s = new StatoRepertorio(rep, c, new StatoOrologi(c));
    expect(s.motivoIndisponibile(b)).toBeNull();
    s.impostaScena(c.scene.find((x) => x.id === 'scena_altra')!);
    expect(s.motivoIndisponibile(b)).toBeNull();
    s.impostaScena(c.scene.find((x) => x.id === 'scena_terza')!);
    expect(s.motivoIndisponibile(b)).toBe('battuta della scena scena_locanda, scena_altra');
  });
  it('una scena inesistente nella lista è un errore', () => {
    expect(() => repertorioDi(['  - {id: oste_due, chi: png_oste, tipo: momento, quando: "q", testo: ["[png_oste] Due."], scena: [scena_locanda, scena_inventata]}'])).toThrow(/scena inesistente «scena_inventata»/);
  });
});

const PONTE = path.join(RADICE_REPO, 'campagne', 'ponte-lanterne');
describe.skipIf(!fs.existsSync(path.join(PONTE, 'repertorio')))('PNG presenti (ponte-lanterne)', () => {
  const c = caricaCampagna(PONTE);
  const rep = caricaRepertorio(c);
  const scena = (id: string) => c.scene.find((s) => s.id === id)!;

  it('nel Borgo Basso (solo Rosa) le battute di Vischi non sono disponibili; sul ponte sì', () => {
    const s = new StatoRepertorio(rep, c, new StatoOrologi(c));
    const vischi = rep.battute.filter((b) => b.chi === 'png_vischi' && !b.solo_esempio && b.scene.length === 0);
    expect(vischi.length).toBeGreaterThan(0);
    expect(vischi.some((b) => s.motivoIndisponibile(b) === null)).toBe(true); // sul ponte c'è
    s.impostaScena(scena('scena_borgo_basso'));
    for (const b of vischi) expect(s.motivoIndisponibile(b)).toBe('png_vischi non è in questa scena');
    expect(s.disponibili().every((b) => b.chi === 'narratore' || b.chi === 'png_rosa')).toBe(true);
  });

  it('il catalogo non elenca un PNG assente anche se l’azione lo nomina', () => {
    const s = new StatoRepertorio(rep, c, new StatoOrologi(c));
    s.impostaScena(scena('scena_borgo_basso'));
    const { battute } = s.catalogo({ turno: 1, azioni: [{ autore: 'pg_dalia', testo: 'Parlo con Vischi, il mercante, della barca.', privata: false }], stallo: false, segnoDovuto: false, nomiPng: new Map([['png_vischi', ['vischi', 'mercante']]]), parole: [] });
    expect(battute.some((b) => b.chi === 'png_vischi')).toBe(false);
  });
});
