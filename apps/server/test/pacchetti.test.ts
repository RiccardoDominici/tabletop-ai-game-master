/**
 * Pacchetti di sessione (docs/strati.md, D2): campagna/pacchetti.ts e il caricatore.
 * - una one-shot si carica come prima (nessun pacchetto);
 * - una campagna a più sessioni (fixture «arco») = livello di campagna + il pacchetto scelto:
 *   scene, PNG della sola sessione, riassunto, parte di sessione unita a campagna.yaml,
 *   pieni_all_inizio dei fronti, repertorio del pacchetto e parole segrete dei due livelli;
 * - gli errori che devono fermare l'avvio;
 * - i cataloghi di immagini e audio dai due livelli (il pacchetto sostituisce a parità di id);
 * - la scelta del pacchetto all'avvio dall'archivio (sessione/scelta-pacchetto.ts).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CatalogoAudio } from '../src/audio/catalogo';
import { caricaCampagna, ErroreCampagna, idCampagna } from '../src/campagna/caricatore';
import { CatalogoImmagini } from '../src/campagna/immagini';
import { elencoPacchetti } from '../src/campagna/pacchetti';
import { caricaRepertorio } from '../src/repertorio/caricatore';
import { caricaParoleSegreteCampagna } from '../src/repertorio/segreti';
import { StatoOrologi } from '../src/scena/orologi';
import type { InfoSessione } from '../src/sessione/archivio';
import { ErroreScelta, scegliPacchetto } from '../src/sessione/scelta-pacchetto';

const FIXTURE = path.join(import.meta.dirname, 'fixtures', 'campagne');
const ARCO = path.join(FIXTURE, 'arco');
const MINI = path.join(FIXTURE, 'mini');

const cartelle: string[] = [];
afterEach(() => {
  for (const c of cartelle.splice(0)) fs.rmSync(c, { recursive: true, force: true });
});
/** Copia di «arco» da guastare in un punto. */
function copia(): string {
  const d = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cantastorie-arco-')), 'arco');
  fs.cpSync(ARCO, d, { recursive: true });
  cartelle.push(path.dirname(d));
  return d;
}
const scrivi = (file: string, testo: string): void => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, testo);
};

describe('one-shot', () => {
  it('senza sessioni/ si carica come sempre, senza pacchetto', () => {
    const c = caricaCampagna(MINI);
    expect(c.pacchetto).toBeNull();
    expect(elencoPacchetti(MINI)).toEqual([]);
    expect(c.cartellaRepertorio).toBe(path.join(MINI, 'repertorio'));
    expect(c.cartelleSegreti).toEqual([path.join(MINI, 'repertorio')]);
    expect(c.scena.apertura[0]).toBe('Piove da tre giorni sulla valle.');
    expect(c.campagnaNarratore['sessione']).toBeDefined(); // nella one-shot resta com'era
    // Il numero di pacchetto chiesto a una one-shot non conta.
    expect(caricaCampagna(MINI, undefined, { pacchetto: 3 }).pacchetto).toBeNull();
  });
});

describe('campagna a più sessioni', () => {
  it('sessione 01 (la prima, se non si dice altro)', () => {
    expect(elencoPacchetti(ARCO).map((p) => [p.numero, p.etichetta])).toEqual([
      [1, '01'],
      [2, '02'],
    ]);
    expect(idCampagna(ARCO)).toBe('arco');
    const c = caricaCampagna(ARCO);
    expect(c.pacchetto).toMatchObject({ numero: 1, etichetta: '01', titolo: 'La locanda' });
    expect(c.titolo).toBe("L'arco della prova");
    expect(c.scene.map((s) => s.id)).toEqual(['scena_locanda']);
    expect(c.scena.apertura[0]).toBe('Piove da tre giorni sulla valle.');
    expect(c.png.map((p) => p.id)).toEqual(['png_oste', 'png_guardia']); // ricorrente + della sessione
    expect(c.campagnaNarratore['sessione']).toBeUndefined();
    expect(c.campagnaNarratore['titolo']).toBeUndefined();
    expect(c.cartellaRepertorio).toBe(path.join(ARCO, 'sessioni', '01', 'repertorio'));
    expect(caricaRepertorio(c).battute.map((b) => b.id)).toContain('oste_confessa');
    // Il pacchetto ha il suo parole_segrete.yaml: SOSTITUISCE quello della campagna (non si unisce).
    expect(c.cartelleSegreti).toEqual([path.join(ARCO, 'sessioni', '01', 'repertorio')]);
    expect(caricaParoleSegreteCampagna(c).map((p) => p.parola)).toEqual(['ANNACQUATO_SEGRETO']);
    expect(c.avvisi).toEqual([]);
  });

  it('sessione 02: scene in ordine, riassunto, PNG nuovi, canone e orologi uniti, fronte che riparte', () => {
    const c = caricaCampagna(ARCO, undefined, { pacchetto: 2 });
    expect(c.pacchetto).toMatchObject({ numero: 2, etichetta: '02', titolo: 'Il guado', cartella: path.join(ARCO, 'sessioni', '02') });
    expect(c.scene.map((s) => s.id)).toEqual(['scena_guado', 'scena_mulino']);
    expect(c.scena.apertura).toEqual(["Nella sessione precedente l'oste ha confessato.", 'Ora il fiume sale.', 'Il guado è gonfio di pioggia.', 'Il barcaiolo vi fa cenno: che fate?']);
    expect(c.scene[1]!.apertura).toEqual(['Il mulino è buio e la ruota è ferma.']); // il riassunto solo nella prima
    expect(c.png.map((p) => p.id)).toEqual(['png_oste', 'png_barcaiolo']); // la guardia era solo della 01
    const canone = (c.campagnaNarratore['canone'] as Array<{ id: string }>).map((f) => f.id);
    expect(canone).toEqual(['f_pioggia', 'f_oste_ladro', 'f_corda_tagliata']);
    const orologi = c.campagnaNarratore['orologi'] as Array<{ id: string; pieni_all_inizio?: number }>;
    expect(orologi.map((o) => [o.id, o.pieni_all_inizio ?? 0])).toEqual([
      ['o_temporale', 1],
      ['o_piena', 0],
    ]);
    for (const k of ['riassunto_iniziale', 'scene', 'pieni_all_inizio', 'preparazione', 'titolo']) expect(c.campagnaNarratore[k]).toBeUndefined();
    const stato = new StatoOrologi(c);
    expect(stato.esporta()['o_temporale']!.pieni).toBe(1);
    expect(caricaRepertorio(c).battute.map((b) => b.id).sort()).toEqual(['barc_saluto', 'nar_corda', 'nar_piena']);
    // Senza parole_segrete.yaml nel pacchetto valgono quelle della campagna.
    expect(caricaParoleSegreteCampagna(c).map((p) => p.parola)).toEqual(['IL_CATTIVO_E_IL_LOCANDIERE']);
    // Il campagna.yaml originale non è stato toccato dall'unione.
    expect((caricaCampagna(ARCO).campagnaNarratore['orologi'] as Array<{ pieni_all_inizio: number }>)[0]!.pieni_all_inizio).toBe(0);
  });

  it('scena.yaml nella radice di una campagna a pacchetti: non vale, con un avviso', () => {
    const d = copia();
    fs.copyFileSync(path.join(MINI, 'scena.yaml'), path.join(d, 'scena.yaml'));
    const c = caricaCampagna(d, undefined, { pacchetto: 2 });
    expect(c.scene.map((s) => s.id)).toEqual(['scena_guado', 'scena_mulino']);
    expect(c.avvisi.join(' ')).toMatch(/scena\.yaml e scene\/ della campagna non valgono/);
  });

  it('una scena non elencata va in fondo, con un avviso; cartelle che non sono pacchetti si ignorano', () => {
    const d = copia();
    scrivi(path.join(d, 'sessioni', '02', 'scene', 'scena_argine.yaml'), 'id: scena_argine\nnome: "L\'argine"\napertura: "L\'argine trema."\n');
    scrivi(path.join(d, 'sessioni', 'bozze', 'sessione.yaml'), 'titolo: x\n');
    fs.mkdirSync(path.join(d, 'sessioni', '07')); // senza sessione.yaml
    expect(elencoPacchetti(d).map((p) => p.etichetta)).toEqual(['01', '02']);
    const c = caricaCampagna(d, undefined, { pacchetto: 2 });
    expect(c.scene.map((s) => s.id)).toEqual(['scena_guado', 'scena_mulino', 'scena_argine']);
    expect(c.avvisi.join(' ')).toMatch(/scena_argine.*non è nell'elenco/);
  });

  it.each([
    ['canone con un id già nella campagna', (d: string) =>
      fs.writeFileSync(path.join(d, 'sessioni', '02', 'sessione.yaml'), fs.readFileSync(path.join(d, 'sessioni', '02', 'sessione.yaml'), 'utf8').replace('f_corda_tagliata', 'f_pioggia')), /canone ripete l'id «f_pioggia»/],
    ['pieni_all_inizio di un orologio che non c\'è', (d: string) =>
      fs.writeFileSync(path.join(d, 'sessioni', '02', 'sessione.yaml'), fs.readFileSync(path.join(d, 'sessioni', '02', 'sessione.yaml'), 'utf8').replace('{o_temporale: 1}', '{o_nessuno: 1}')), /pieni_all_inizio cita l'orologio «o_nessuno»/],
    ['scene cita una scena senza file', (d: string) =>
      fs.writeFileSync(path.join(d, 'sessioni', '02', 'sessione.yaml'), fs.readFileSync(path.join(d, 'sessioni', '02', 'sessione.yaml'), 'utf8').replace('scena_mulino]', 'scena_mulino, scena_fantasma]')), /scena_fantasma/],
    ['due cartelle con lo stesso numero', (d: string) => fs.cpSync(path.join(d, 'sessioni', '02'), path.join(d, 'sessioni', '002'), { recursive: true }), /stesso numero di sessione/],
  ])('errore: %s', (_nome, guasta, messaggio) => {
    const d = copia();
    guasta(d);
    expect(() => caricaCampagna(d, undefined, { pacchetto: 2 })).toThrow(ErroreCampagna);
    expect(() => caricaCampagna(d, undefined, { pacchetto: 2 })).toThrow(messaggio);
  });

  it('una scheda del pacchetto con l\'id di un PNG ricorrente lo sostituisce intera, solo in quella sessione', () => {
    const d = copia();
    scrivi(path.join(d, 'sessioni', '02', 'png', 'png_oste.yaml'), 'id: png_oste\nnome: "Oste Bruno, bagnato"\nsa: [f_pioggia, f_oste_ladro, f_corda_tagliata]\nvoce:\n  tts: {voce_id: vincent}\n');
    const c2 = caricaCampagna(d, undefined, { pacchetto: 2 });
    const oste = c2.png.find((p) => p.id === 'png_oste')!;
    expect(c2.png.map((p) => p.id)).toEqual(['png_oste', 'png_barcaiolo']); // stesso posto, niente doppioni
    expect(oste.nome).toBe('Oste Bruno, bagnato');
    expect(oste.dati['sa']).toEqual(['f_pioggia', 'f_oste_ladro', 'f_corda_tagliata']);
    expect(oste.dati['pronuncia']).toBeUndefined(); // scheda intera, non unita campo per campo
    expect(caricaCampagna(d, undefined, { pacchetto: 1 }).png.find((p) => p.id === 'png_oste')!.nome).toBe('Oste Bruno');
  });

  it('errore: una sessione che non c\'è', () => {
    expect(() => caricaCampagna(ARCO, undefined, { pacchetto: 9 })).toThrow(/non c'è la sessione 9 \(ci sono: 01, 02\)/);
  });
});

describe('risorse dai due livelli', () => {
  it('immagini: quelle della campagna più le nuove; il pacchetto sostituisce a parità di id', () => {
    const solo = new CatalogoImmagini(path.join(ARCO, 'immagini'));
    expect(solo.ritratto('png_oste')).toBe('/api/immagini/ritratto_png_oste.jpg');
    const c = new CatalogoImmagini([path.join(ARCO, 'immagini'), path.join(ARCO, 'sessioni', '02', 'immagini')]);
    expect(c.numero).toBe(3);
    expect(c.ritratto('png_oste')).toBe('/api/immagini/ritratto_png_oste_bagnato.jpg');
    expect(c.ritratto('png_barcaiolo')).toBe('/api/immagini/ritratto_png_barcaiolo.jpg');
    expect(c.luogo('scena_locanda')).toBe('/api/immagini/luogo_scena_locanda.jpg'); // dalla campagna
    expect(c.percorso('ritratto_png_oste_bagnato.jpg')).toBe(path.join(ARCO, 'sessioni', '02', 'immagini', 'ritratto_png_oste_bagnato.jpg'));
    expect(c.percorso('luogo_scena_locanda.jpg')).toBe(path.join(ARCO, 'immagini', 'luogo_scena_locanda.jpg'));
    expect(c.percorso('ritratto_png_oste.jpg')).toBeNull(); // sostituito: non si serve più
  });

  it('audio: idem, e un nome di file già usato da un\'altra cartella si scarta', () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'cantastorie-audio-'));
    cartelle.push(base);
    const a = path.join(base, 'campagna');
    const b = path.join(base, 'pacchetto');
    for (const [d, file] of [[a, 'luogo_x.m4a'], [a, 'tema.m4a'], [b, 'luogo_x_piena.m4a'], [b, 'tema.m4a']] as const) scrivi(path.join(d, file), 'audio');
    scrivi(path.join(a, 'manifest.json'), JSON.stringify({ brani: [{ id: 'luogo_x', file: 'luogo_x.m4a' }], temi: [{ id: 'tema_png_oste', file: 'tema.m4a' }], crediti: ['A'] }));
    scrivi(path.join(b, 'manifest.json'), JSON.stringify({ brani: [{ id: 'luogo_x', file: 'luogo_x_piena.m4a' }], temi: [{ id: 'tema_png_teo', file: 'tema.m4a' }], crediti: ['B'] }));
    const c = new CatalogoAudio([a, b]);
    expect(c.musicaLuogo('x')).toBe('luogo_x');
    expect(c.pubblico().tracce['luogo_x']!.url).toBe('/api/audio/luogo_x_piena.m4a'); // quella del pacchetto
    expect(c.percorso('luogo_x.m4a')).toBeNull();
    expect(c.tema('png_oste')).toBe('tema_png_oste');
    expect(c.tema('png_teo')).toBeNull(); // stesso nome di file di un'altra cartella: scartata
    expect(c.percorso('tema.m4a')).toBe(path.join(a, 'tema.m4a'));
    expect(c.pubblico().crediti).toEqual(['A', 'B']);
  });
});

describe('scelta del pacchetto all\'avvio', () => {
  const P = elencoPacchetti(ARCO);
  const s = (id: string, pacchetto: number | null, stato: 'in_corso' | 'chiusa', motivo: string | null, modo = 'repertorio'): InfoSessione => ({
    id,
    campagna: 'arco',
    modo,
    creata: id,
    aggiornata: id,
    stato,
    turno: 3,
    eventi: 10,
    motivo_chiusura: motivo,
    pacchetto,
  });

  it.each([
    ['nessuna sessione: la prima', [], null, { numero: 1, motivo: 'prima' }],
    ['richiesta esplicita', [s('a', 1, 'in_corso', null)], 2, { numero: 2, motivo: 'richiesto' }],
    ['sessione in corso: si riprende quella', [s('b', 2, 'in_corso', null), s('a', 1, 'chiusa', 'fine sessione')], null, { numero: 2, motivo: 'ripresa' }],
    ['in corso ma in un\'altra modalità: conta l\'ultima', [s('b', 1, 'in_corso', null, 'improvvisa')], null, { numero: 1, motivo: 'ultima giocata' }],
    ['dopo «Fine sessione»: il pacchetto dopo', [s('a', 1, 'chiusa', 'fine sessione')], null, { numero: 2, motivo: 'dopo la fine' }],
    ['chiusa in un altro modo (--nuova): lo stesso', [s('a', 1, 'chiusa', 'avvio con --nuova')], null, { numero: 1, motivo: 'ultima giocata' }],
    ['sessioni di prima dei pacchetti (pacchetto null) non contano', [s('v', null, 'chiusa', 'fine sessione')], null, { numero: 1, motivo: 'prima' }],
  ] as const)('%s', (_nome, sessioni, richiesto, atteso) => {
    expect(scegliPacchetto(P, sessioni as unknown as InfoSessione[], 'repertorio', richiesto)).toMatchObject({ ...atteso, avviso: null });
  });

  it('finita l\'ultima: si rigioca quella, con l\'avviso', () => {
    const r = scegliPacchetto(P, [s('b', 2, 'chiusa', 'fine sessione')], 'repertorio', null);
    expect(r).toMatchObject({ numero: 2, motivo: 'ultima giocata' });
    expect(r.avviso).toMatch(/la seguente non c'è ancora/);
  });

  it('one-shot e numero che non c\'è', () => {
    expect(scegliPacchetto([], [], 'repertorio', 3)).toEqual({ numero: null, motivo: 'one-shot', avviso: null });
    expect(() => scegliPacchetto(P, [], 'repertorio', 5)).toThrow(ErroreScelta);
  });
});
