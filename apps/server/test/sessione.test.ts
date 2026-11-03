/**
 * Persistenza della sessione: archivio SQLite (append-only, transazioni, una sessione in corso per
 * campagna), fold degli eventi (ricostruisci) e andata/ritorno dello stato di ogni pezzo: orologi
 * (anche parte_dopo), repertorio A/B (usi, indizi, menzogne, fatti), azioni simultanee (stati,
 * legami, finestra; le «chiuse» di un turno interrotto tornano ai giocatori), note di regia.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { AzionePrivata, VoceTrascrizione } from '@cantastorie/shared';
import { TavoloAzioni } from '../src/azioni/tavolo';
import { caricaCampagna } from '../src/campagna/caricatore';
import type { DatiYaml } from '../src/campagna/tipi';
import { loggerMuto } from '../src/logger';
import { NoteRegia } from '../src/master/note';
import { RADICE_REPO } from '../src/percorsi';
import { caricaRepertorio } from '../src/repertorio/caricatore';
import { StatoRepertorio } from '../src/repertorio/stato';
import { StatoOrologi } from '../src/scena/orologi';
import { ArchivioSessioni } from '../src/sessione/archivio';
import { ricostruisci, type FotografiaSessione } from '../src/sessione/tipi';
import type { Orologio } from '../src/turni/orologio';

const cartelle: string[] = [];
afterEach(() => {
  for (const c of cartelle.splice(0)) fs.rmSync(c, { recursive: true, force: true });
});
const tmp = (): string => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cantastorie-sess-'));
  cartelle.push(d);
  return d;
};
/** Andata e ritorno come nel registro (JSON). */
const json = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

const fotografia = (turno: number, extra: Partial<FotografiaSessione> = {}): FotografiaSessione => ({
  fase: 'finestra',
  turno,
  versioneScena: turno,
  scena: 'scena_locanda',
  luogo: 'scena_locanda',
  situazione: null,
  situazioniMostrate: [],
  umore: null,
  orologi: {},
  repertorio: null,
  note: { elenco: [], prossimoId: 1 },
  pausa: { richiesta: false, invitoSospeso: null },
  prossimoIdTrascrizione: 1,
  ...extra,
});
const voce = (id: number, turno: number, testo: string): VoceTrascrizione => ({ id, turno, tipo: 'narrazione', chi: 'narratore', nome: 'Narratore', testo });

describe('archivio SQLite', () => {
  it('eventi in ordine, transazione, una sola sessione in corso per campagna', () => {
    const file = path.join(tmp(), 'sessioni.sqlite');
    const a = new ArchivioSessioni(file, loggerMuto());
    expect(a.inCorso('mini', 'improvvisa')).toBeNull();
    a.crea('s1', 'mini', 'improvvisa');
    a.aggiungi('s1', [{ tipo: 'inizio', dati: { campagna: 'mini' } }]);
    a.aggiungi('s1', [{ tipo: 'trascrizione_turno', dati: { turno: 1, voci: [] } }, { tipo: 'fotografia', dati: fotografia(1) }], 1);
    expect(a.eventi('s1').map((e) => e.tipo)).toEqual(['inizio', 'trascrizione_turno', 'fotografia']);
    expect(a.inCorso('mini', 'improvvisa')).toMatchObject({ id: 's1', turno: 1, eventi: 3, stato: 'in_corso' });
    expect(a.inCorso('mini', 'repertorio')).toBeNull(); // altra modalità: altra sessione
    a.chiudi();
    // Riaperto (il server riparte): tutto c'è ancora.
    const b = new ArchivioSessioni(file, loggerMuto());
    expect(b.eventi('s1')).toHaveLength(3);
    // Una sessione nuova chiude quella in corso.
    b.crea('s2', 'mini', 'improvvisa');
    expect(b.sessione('s1')!.stato).toBe('chiusa');
    expect(b.inCorso('mini', 'improvvisa')!.id).toBe('s2');
    expect(b.chiudiInCorso('mini', '--nuova')).toBe(1);
    expect(b.inCorso('mini', 'improvvisa')).toBeNull();
    b.chiudi();
  });
});

describe('ricostruisci', () => {
  it('ultima fotografia, ultima versione di ogni turno, ultimo tavolo, PG dei dispositivi', () => {
    const r = ricostruisci('s', [
      { tipo: 'inizio', dati: {} },
      { tipo: 'trascrizione_turno', dati: { turno: 0, voci: [voce(1, 0, 'Apertura.')] } },
      { tipo: 'fotografia', dati: fotografia(1) },
      { tipo: 'dispositivo', dati: { dispositivo: 'tel-a', id_pg: 'pg_anna' } },
      { tipo: 'tavolo', dati: { azioni: [], ultima: [], finestra: null, ultimoTurno: 0, versioneScena: 1, prossimoId: 1, inPausa: false } },
      { tipo: 'trascrizione_turno', dati: { turno: 1, voci: [voce(2, 1, 'Primo turno.')] } },
      { tipo: 'fotografia', dati: fotografia(2, { luogo: 'n_ponte' }) },
      { tipo: 'dispositivo', dati: { dispositivo: 'tel-a', id_pg: 'pg_bruno' } },
      // Un turno scritto senza la sua fotografia (non dovrebbe succedere) non entra.
      { tipo: 'trascrizione_turno', dati: { turno: 5, voci: [voce(9, 5, 'Fantasma.')] } },
      { tipo: 'tavolo', dati: { azioni: [], ultima: [], finestra: { turno: 2, invitati: ['pg_bruno'], invitoATutti: true, aperta: true, pronti: [] }, ultimoTurno: 1, versioneScena: 2, prossimoId: 3, inPausa: false } },
    ])!;
    expect(r.fotografia).toMatchObject({ turno: 2, luogo: 'n_ponte' });
    expect(r.trascrizione.map((v) => v.testo)).toEqual(['Apertura.', 'Primo turno.']);
    expect(r.tavolo!.finestra).toMatchObject({ turno: 2, aperta: true });
    expect(r.dispositivi.get('tel-a')).toBe('pg_bruno');
    expect(ricostruisci('vuota', [{ tipo: 'inizio', dati: {} }])).toBeNull(); // niente da riprendere
  });
});

describe('andata e ritorno dello stato', () => {
  const MINI = path.join(import.meta.dirname, 'fixtures', 'campagne', 'mini');

  it('orologi, anche quelli che aspettano (parte_dopo)', () => {
    const c = caricaCampagna(MINI);
    const conAttesa = { ...c, campagnaNarratore: { ...c.campagnaNarratore, orologi: (c.campagnaNarratore['orologi'] as DatiYaml[]).map((o) => (o['id'] === 'o_fuori' ? { ...o, parte_dopo: ['nar_brocca'] } : o)) } };
    const a = new StatoOrologi(conAttesa);
    a.avanza('o_temporale', 3, false);
    const b = new StatoOrologi(conAttesa);
    b.importa(json(a.esporta()));
    expect(b.esporta()).toEqual(a.esporta());
    expect(b.esporta()['o_temporale']).toEqual({ pieni: 1, ultimoTurno: 3, partito: true });
    expect(b.esporta()['o_fuori']!.partito).toBe(false);
    b.importa({ o_inesistente: { pieni: 3, ultimoTurno: 1, partito: true } }); // campagna cambiata: ignorato
  });

  const VERA = path.join(RADICE_REPO, 'campagne', 'prova-f0');
  it.skipIf(!fs.existsSync(path.join(VERA, 'repertorio')))('repertorio (modo B): usi, anti-ripetizione, indizi, menzogne, fatti', () => {
    const c = caricaCampagna(VERA);
    const rep = caricaRepertorio(c);
    const orologi = new StatoOrologi(c);
    const a = new StatoRepertorio(rep, c, orologi);
    const bugia = rep.battute.find((b) => b.effetti.menzogna_detta === 'ott_segale')!;
    expect(a.usa(bugia.id, 1, false).ok).toBe(true);
    expect(a.usa('nar_volto_candela', 2, false).ok).toBe(true);
    const salvato = json(a.esporta());
    const b = new StatoRepertorio(rep, c, new StatoOrologi(c));
    b.importa(salvato);
    expect(b.esporta()).toEqual(a.esporta());
    expect([...b.menzogneDette]).toEqual(['ott_segale']);
    expect(b.indiziRivelati.has('i_cicatrice')).toBe(true);
    expect(b.fattiScoperti).toEqual(a.fattiScoperti);
    // Stessa disponibilità (anti-ripetizione e strade già percorse comprese).
    expect(b.disponibili(3).map((x) => x.id)).toEqual(a.disponibili(3).map((x) => x.id));
    expect(b.motivoIndisponibile(rep.perId.get('nar_volto_uscita')!)).toMatch(/altro modo/);
  });

  it('note di regia', () => {
    const a = new NoteRegia();
    a.aggiungi('Frasi corte.', 5, 1);
    a.aggiungi('Ottavia sospettosa.', 2, 1);
    a.consumaTurno();
    const b = new NoteRegia();
    b.importa(json(a.esporta()));
    expect(b.elenco).toEqual(a.elenco);
    expect(b.aggiungi('Terza.', 3, 2)).toMatchObject({ ok: true, nota: { id: 'n3' } }); // niente id ripetuti
  });

  it('azioni simultanee: stati, legami, finestra; le chiuse di un turno interrotto tornano ai giocatori', () => {
    const orologio: Orologio = { ora: () => 0, adesso: () => 1_800_000_000_000, dopo: () => () => undefined };
    const nuovo = (mie: Map<string, AzionePrivata | null>) =>
      new TavoloAzioni({
        giocatori: () => ['pg_g', 'pg_c', 'pg_a'],
        nomePg: (id) => ({ pg_g: 'Ginestra', pg_c: 'Corrado', pg_a: 'Assenzio' })[id] ?? id,
        nomi: new Map([['ginestra', 'pg_g'], ['corrado', 'pg_c']]),
        orologio,
        arbitro: null,
        contesto: () => ({ narrazione: '', scena: '' }),
        log: loggerMuto(),
        stalloMs: 0,
        onCambio: () => undefined,
        onAzione: (id, a) => mie.set(id, a),
        onChiusura: () => undefined,
      });
    const mieA = new Map<string, AzionePrivata | null>();
    const a = nuovo(mieA);
    a.apri(1, ['pg_g', 'pg_c', 'pg_a'], 1, true);
    a.invia('pg_g', 'vado avanti verso la grata', 1);
    a.invia('pg_c', "anch'io", 1); // dipende da Ginestra (regola)
    a.invia('pg_a', 'guardo il forestiero, in segreto', 1, true);
    a.pronto('pg_g', true);
    a.ritira('pg_g'); // Corrado → da confermare
    expect(mieA.get('pg_c')!.stato).toBe('da_confermare');

    // 1. Finestra aperta al momento dello spegnimento: tutto torna com'era, finestra da riaprire.
    const salvato = json(a.esporta());
    const mieB = new Map<string, AzionePrivata | null>();
    const b = nuovo(mieB);
    const { finestra, interrotte } = b.importa(salvato, 'interrotta');
    expect(interrotte).toEqual([]);
    expect(finestra).toMatchObject({ turno: 1, aperta: true, invitati: ['pg_g', 'pg_c', 'pg_a'] });
    expect(b.aperta).toBe(false); // niente timer finché la regia non la riapre
    expect(mieB.get('pg_c')).toMatchObject({ stato: 'da_confermare', testo: "anch'io", richiesta: { tipo: 'dipendenza' } });
    expect(mieB.get('pg_a')).toMatchObject({ stato: 'in_coda', privata: true });
    expect(b.azione('a2')!.dipende_da).toEqual(['a1']);
    b.riapri(finestra!, 1, false);
    expect(b.aperta).toBe(true);
    expect(b.finestraPubblica().azioni.find((x) => x.id_pg === 'pg_a')).toMatchObject({ scritta: true });
    b.invia('pg_g', 'nuova azione', 1);
    expect(b.azioneDi('pg_g')!.id).toBe('a4'); // niente id ripetuti

    // 2. Spento a metà narrazione: le azioni chiuse tornano ai giocatori come «superate».
    a.conferma('pg_c');
    a.chiudiOra();
    expect(a.azioneDi('pg_c')!.stato).toBe('chiusa');
    const mieC = new Map<string, AzionePrivata | null>();
    const c = nuovo(mieC);
    const r = c.importa(json(a.esporta()), 'Il server è ripartito: rimanda la tua azione.');
    expect(r.interrotte.sort()).toEqual(['a2', 'a3']);
    expect(mieC.get('pg_c')).toMatchObject({ stato: 'superata', motivo: 'Il server è ripartito: rimanda la tua azione.', testo: "anch'io" });
    expect(r.finestra).toMatchObject({ aperta: false });
  });
});
