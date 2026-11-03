/**
 * Registro di fine sessione (docs/strati.md, «Il ciclo tra le sessioni», passo 1): i fatti di gioco
 * estratti in modo DETERMINISTICO dall'archivio (sessioni.sqlite), senza nessun modello. È la base
 * dello stato tra una sessione e l'altra: il modello forte lo interpreta, ma ogni fatto nuovo dello
 * stato cita il turno da cui viene, quindi qui ogni voce porta il suo turno.
 *
 * Fonti (eventi della sessione, sessione/tipi.ts):
 * - `fotografia`: si confrontano le fotografie in ordine. I turni esatti vengono dallo stato stesso
 *   (orologio: `ultimoTurno` del segno; battuta: `ultimoUso`; situazione: `turno`); un indizio, una
 *   menzogna o un fatto prendono il turno della battuta usata nello stesso passaggio che li rivela.
 *   La `causa` della fotografia dice chi ha cambiato lo stato: la narrazione o un comando del master.
 * - `trascrizione_turno`: l'ultima versione di ogni turno = la trascrizione pubblica.
 * - `tavolo`: l'ultima versione di ogni azione (pubbliche e private separate; le ritirate no).
 *
 * Stesso archivio → stesso registro, byte per byte: nessuna ora di sistema, ordini fissati.
 * In modalità A (improvvisa) il Motore non tiene indizi né battute: quelle sezioni sono null e lo
 * dice un avviso, invece di inventarle.
 */
import type { NotaRegia, VoceTrascrizione } from '@cantastorie/shared';
import type { Azione } from '../azioni/tipi';
import type { Campagna, DatiYaml } from '../campagna/tipi';
import type { Repertorio } from '../repertorio/tipi';
import type { FotografiaSessione, StatoOrologioSalvato, StatoTavoloSalvato } from './tipi';

/** Versione dello schema di registro.yaml (cresce solo se cambia il significato di un campo). */
export const FORMATO_REGISTRO = 1;
/** Nome del file della trascrizione pubblica, accanto a registro.yaml. */
export const FILE_TRASCRIZIONE = 'trascrizione.yaml';

/** Tipi di battuta che segnano un momento della storia (oltre a indizi, menzogne e segni). */
const TIPI_MOMENTO: ReadonlySet<string> = new Set(['momento', 'confessione', 'finale', 'transizione']);

// ------------------------------------------------------------------ ingressi

/** Ciò che serve sapere della campagna per dare nomi e testi agli id dell'archivio. */
export interface DefinizioniRegistro {
  campagna: string;
  titolo: string;
  pg: Array<{ id: string; nome: string }>;
  png: Array<{ id: string; nome: string }>;
  scene: Array<{ id: string; titolo: string; png_presenti: string[] }>;
  orologi: Array<{ id: string; nome: string; segmenti: number; segni: string[]; al_completo: string | null; parte_dopo: string[] }>;
  /** Battute del repertorio (modalità B); vuota in modalità A. */
  battute: Map<string, { chi: string; tipo: string; rivela_indizi: string[]; menzogna_detta: string | null; fatti_noti: string[] }>;
}

/** La riga della sessione nell'archivio (sessione/archivio.ts, InfoSessione). */
export interface SessioneDaRegistrare {
  id: string;
  campagna: string;
  modo: string;
  creata: string;
  aggiornata: string;
  stato: string;
  motivo_chiusura: string | null;
  turno: number;
  /** Numero del pacchetto sessioni/<nn>/ (null = one-shot). */
  pacchetto: number | null;
}

export interface EventoDaRegistrare {
  seq: number;
  ts: string;
  tipo: string;
  turno: number | null;
  dati: unknown;
}

// ------------------------------------------------------------------ uscita

export type Causa = 'narrazione' | 'master';

export interface RegistroSessione {
  formato: number;
  campagna: string;
  titolo: string;
  /** Numero del pacchetto (null = one-shot). */
  sessione: number | null;
  archivio: {
    id: string;
    modo: string;
    creata: string;
    ultimo_evento: string | null;
    stato: string;
    motivo_chiusura: string | null;
    eventi: number;
    ultimo_turno: number;
  };
  trascrizione: { file: string; voci: number; turni: number };
  /** PG che avevano un telefono nella sessione (eventi `dispositivo`), in ordine di pg.yaml. */
  giocatori: string[];
  scene: Array<{ id: string; titolo: string; dal_turno: number; al_turno: number; png_presenti: string[] }>;
  luoghi: Array<{ id: string; dal_turno: number; causa: Causa | 'inizio' }>;
  situazioni: Array<{ id: string; turno: number; automatica: boolean }>;
  orologi: Array<{
    id: string;
    nome: string;
    segmenti: number;
    pieni_all_inizio: number;
    pieni_alla_fine: number;
    completo: boolean;
    al_completo: string | null;
    partito: boolean;
    /** Turno in cui è partito (orologio con parte_dopo), null se correva da subito o non è partito. */
    partito_al_turno: number | null;
    segni: Array<{ numero: number; testo: string | null; turno: number; causa: Causa }>;
    /** Segni tolti dal master (pulsante −1). */
    tolti: Array<{ numero: number; turno: number }>;
  }>;
  indizi: Array<{ id: string; turno: number; battuta: string | null }> | null;
  battute: Array<{ id: string; chi: string | null; tipo: string | null; turno: number }> | null;
  menzogne: Array<{ id: string; turno: number; battuta: string | null }> | null;
  /** Fatti del canone diventati noti ai PG durante la sessione (non quelli noti dall'inizio). */
  fatti_noti: Array<{ id: string; turno: number; battuta: string | null }> | null;
  png_incontrati: Array<{ id: string; nome: string; primo_turno: number; ultimo_turno: number; battute: number }>;
  pg: Array<{ id: string; nome: string; azioni_pubbliche: AzioneRegistrata[]; azioni_private: AzioneRegistrata[] }>;
  /** I turni in cui il Motore ha registrato un cambiamento, con le righe dette e le azioni che c'erano. */
  momenti: Array<{ turno: number; cosa: string[]; azioni: Array<{ id: string; pg: string; privata: boolean }>; righe: Array<{ chi: string; testo: string }> }>;
  note_del_master: Array<{ testo: string; creata_al_turno: number }>;
  avvisi: string[];
}

export interface AzioneRegistrata {
  id: string;
  turno: number;
  testo: string;
  /** Stato finale (risolta, superata, sospesa…); in_coda/da_confermare = non arrivata al narratore. */
  esito: string;
  motivo: string | null;
}

export interface TrascrizionePubblica {
  formato: number;
  campagna: string;
  sessione: number | null;
  archivio: string;
  voci: Array<{ turno: number; tipo: VoceTrascrizione['tipo']; chi: string; nome: string; testo: string }>;
}

export interface EstrattoRegistro {
  registro: RegistroSessione;
  trascrizione: TrascrizionePubblica;
}

// ------------------------------------------------------------------ definizioni dalla campagna

function testo(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/** Nomi e testi dalla campagna caricata (e dal repertorio in modalità B). */
export function definizioniRegistro(c: Campagna, repertorio?: Repertorio): DefinizioniRegistro {
  const orologi = Array.isArray(c.campagnaNarratore['orologi']) ? (c.campagnaNarratore['orologi'] as DatiYaml[]) : [];
  return {
    campagna: c.id,
    titolo: c.titolo,
    pg: c.pg.map((p) => ({ id: p.id, nome: p.nome })),
    png: c.png.map((p) => ({ id: p.id, nome: p.nome })),
    scene: c.scene.map((s) => ({ id: s.id, titolo: s.titolo, png_presenti: [...s.png_presenti] })),
    orologi: orologi
      .filter((d) => testo(d?.['id']))
      .map((d) => {
        const segni = Array.isArray(d['segni']) ? (d['segni'] as unknown[]).map((s) => String(s)) : [];
        return {
          id: testo(d['id'])!,
          nome: testo(d['nome']) ?? testo(d['id'])!,
          segmenti: typeof d['segmenti'] === 'number' ? (d['segmenti'] as number) : segni.length,
          segni,
          al_completo: testo(d['al_completo']),
          parte_dopo: Array.isArray(d['parte_dopo']) ? (d['parte_dopo'] as unknown[]).filter((x): x is string => typeof x === 'string') : [],
        };
      }),
    battute: new Map(
      (repertorio?.battute ?? []).map((b) => [
        b.id,
        { chi: b.chi, tipo: b.tipo, rivela_indizi: [...b.effetti.rivela_indizi], menzogna_detta: b.effetti.menzogna_detta, fatti_noti: [...b.effetti.fatti_noti] },
      ]),
    ),
  };
}

// ------------------------------------------------------------------ estrazione

const causaDi = (f: { causa?: unknown }): Causa => (typeof f.causa === 'string' && f.causa.startsWith('master:') ? 'master' : 'narrazione');

/** Ordine stabile: turno, poi id. */
const perTurnoEId = <T extends { turno: number; id: string }>(a: T, b: T): number => a.turno - b.turno || a.id.localeCompare(b.id);

/**
 * Estrae registro e trascrizione pubblica dagli eventi di UNA sessione dell'archivio. Puro: stessi
 * eventi e stesse definizioni → stesso risultato.
 */
export function estraiRegistro(s: SessioneDaRegistrare, eventi: readonly EventoDaRegistrare[], def: DefinizioniRegistro): EstrattoRegistro {
  const avvisi: string[] = [];
  const nomePng = new Map(def.png.map((p) => [p.id, p.nome]));
  const idPg = new Set(def.pg.map((p) => p.id));
  const scenaDef = new Map(def.scene.map((x) => [x.id, x]));
  const orologioDef = new Map(def.orologi.map((o) => [o.id, o]));

  // --- Fold degli eventi: fotografie in ordine, ultima versione dei turni e delle azioni.
  const fotografie: Array<FotografiaSessione & { causa?: string }> = [];
  const turni = new Map<number, VoceTrascrizione[]>();
  const azioni = new Map<string, Azione>();
  const telefoni = new Map<string, string>();
  let ultimoEvento: string | null = null;
  for (const e of eventi) {
    ultimoEvento = e.ts;
    const d = e.dati as Record<string, unknown> | null;
    if (!d || typeof d !== 'object') continue;
    if (e.tipo === 'fotografia') fotografie.push(d as unknown as FotografiaSessione & { causa?: string });
    else if (e.tipo === 'trascrizione_turno' && typeof d['turno'] === 'number' && Array.isArray(d['voci'])) turni.set(d['turno'], d['voci'] as VoceTrascrizione[]);
    else if (e.tipo === 'tavolo') {
      for (const a of (d as unknown as StatoTavoloSalvato).azioni ?? []) if (a && typeof a.id === 'string') azioni.set(a.id, a);
    } else if (e.tipo === 'dispositivo' && typeof d['dispositivo'] === 'string' && typeof d['id_pg'] === 'string') telefoni.set(d['dispositivo'], d['id_pg']);
  }
  if (fotografie.length === 0) avvisi.push('Nessuna fotografia nell’archivio: la sessione non è mai partita davvero.');
  const modoB = fotografie.some((f) => f.repertorio !== null && f.repertorio !== undefined);
  if (!modoB) avvisi.push('Modalità A (improvvisa) o repertorio assente: il Motore non tiene indizi, battute, menzogne e fatti noti; quelle sezioni sono vuote (null).');

  // --- Trascrizione pubblica: i turni in ordine, le voci nell'ordine in cui sono state dette.
  const voci = [...turni.entries()].sort(([a], [b]) => a - b).flatMap(([, v]) => v);

  // --- Scene, luoghi, situazioni, orologi, repertorio: confronto tra fotografie consecutive.
  const scene: RegistroSessione['scene'] = [];
  const luoghi: RegistroSessione['luoghi'] = [];
  const situazioni: RegistroSessione['situazioni'] = [];
  const battute: NonNullable<RegistroSessione['battute']> = [];
  const indizi: NonNullable<RegistroSessione['indizi']> = [];
  const menzogne: NonNullable<RegistroSessione['menzogne']> = [];
  const fattiNoti: NonNullable<RegistroSessione['fatti_noti']> = [];
  const segniPer = new Map<string, RegistroSessione['orologi'][number]['segni']>();
  const toltiPer = new Map<string, RegistroSessione['orologi'][number]['tolti']>();
  const partitoAl = new Map<string, number>();
  const inizioOrologi = new Map<string, StatoOrologioSalvato>();
  const cambiDiScena: Array<{ turno: number; id: string }> = [];

  let prec: (FotografiaSessione & { causa?: string }) | null = null;
  for (const f of fotografie) {
    const causa = causaDi(f);
    if (!prec) {
      scene.push({ id: f.scena, titolo: scenaDef.get(f.scena)?.titolo ?? f.scena, dal_turno: f.turno, al_turno: f.turno, png_presenti: [...(scenaDef.get(f.scena)?.png_presenti ?? [])] });
      luoghi.push({ id: f.luogo, dal_turno: f.turno, causa: 'inizio' });
      for (const [id, o] of Object.entries(f.orologi ?? {})) inizioOrologi.set(id, { ...o });
    } else {
      if (f.scena !== prec.scena) {
        scene.push({ id: f.scena, titolo: scenaDef.get(f.scena)?.titolo ?? f.scena, dal_turno: f.turno, al_turno: f.turno, png_presenti: [...(scenaDef.get(f.scena)?.png_presenti ?? [])] });
        cambiDiScena.push({ turno: f.turno, id: f.scena });
      }
      if (f.luogo !== prec.luogo) luoghi.push({ id: f.luogo, dal_turno: f.turno, causa });
    }
    const corrente = scene[scene.length - 1]!;
    corrente.al_turno = Math.max(corrente.al_turno, f.turno);

    // Situazione: una nuova (id o turno diversi) è una situazione mostrata.
    const sit = f.situazione;
    if (sit && (!prec?.situazione || prec.situazione.id !== sit.id || prec.situazione.turno !== sit.turno)) {
      situazioni.push({ id: sit.id, turno: sit.turno, automatica: sit.auto === true });
    }

    // Repertorio (modalità B): usi delle battute, poi gli effetti attribuiti alla battuta che li porta.
    const usateQui: Array<{ id: string; turno: number }> = [];
    if (f.repertorio) {
      const usiPrima = new Map(prec?.repertorio?.usi ?? []);
      const ultimo = new Map(f.repertorio.ultimoUso ?? []);
      for (const [id, n] of [...(f.repertorio.usi ?? [])].sort(([a], [b]) => a.localeCompare(b))) {
        const nuovi = n - (usiPrima.get(id) ?? 0);
        const turno = ultimo.get(id) ?? f.turno;
        const b = def.battute.get(id);
        for (let i = 0; i < nuovi; i++) {
          battute.push({ id, chi: b?.chi ?? null, tipo: b?.tipo ?? null, turno });
          usateQui.push({ id, turno });
        }
      }
      const origine = (pred: (b: NonNullable<ReturnType<typeof def.battute.get>>) => boolean): { battuta: string | null; turno: number } => {
        const u = usateQui.find((x) => {
          const b = def.battute.get(x.id);
          return b ? pred(b) : false;
        });
        return u ? { battuta: u.id, turno: u.turno } : { battuta: null, turno: f.turno };
      };
      const prima = new Set(prec?.repertorio?.indizi ?? []);
      for (const id of f.repertorio.indizi ?? []) if (!prima.has(id)) indizi.push({ id, ...origine((b) => b.rivela_indizi.includes(id)) });
      const mPrima = new Set(prec?.repertorio?.menzogne ?? []);
      for (const id of f.repertorio.menzogne ?? []) if (!mPrima.has(id)) menzogne.push({ id, ...origine((b) => b.menzogna_detta === id) });
      // I fatti noti della PRIMA fotografia sono quelli del canone (noto_ai_pg): non sono fatti della sessione.
      if (prec) {
        const fPrima = new Set(prec.repertorio?.fattiNoti ?? []);
        for (const id of f.repertorio.fattiNoti ?? []) if (!fPrima.has(id)) fattiNoti.push({ id, ...origine((b) => b.fatti_noti.includes(id)) });
      }
    }

    // Orologi: ogni segno in più è un segno mostrato (al turno del segno), ogni segno in meno è tolto.
    if (prec) {
      for (const [id, o] of Object.entries(f.orologi ?? {})) {
        const p = prec.orologi?.[id];
        if (!p) continue;
        const d = orologioDef.get(id);
        if (o.pieni > p.pieni) {
          const lista = segniPer.get(id) ?? [];
          for (let n = p.pieni + 1; n <= o.pieni; n++) lista.push({ numero: n, testo: d?.segni[n - 1] ?? null, turno: o.ultimoTurno ?? f.turno, causa });
          segniPer.set(id, lista);
        } else if (o.pieni < p.pieni) {
          const lista = toltiPer.get(id) ?? [];
          for (let n = p.pieni; n > o.pieni; n--) lista.push({ numero: n, turno: f.turno });
          toltiPer.set(id, lista);
        }
        if (o.partito && !p.partito && !partitoAl.has(id)) {
          // Parte quando esce una battuta o un indizio di parte_dopo: il turno di quella battuta.
          const via = d?.parte_dopo ?? [];
          const u = usateQui.find((x) => via.includes(x.id) || (def.battute.get(x.id)?.rivela_indizi ?? []).some((i) => via.includes(i)));
          partitoAl.set(id, u?.turno ?? f.turno);
        }
      }
    }
    prec = f;
  }

  const ultima = fotografie[fotografie.length - 1] ?? null;
  const orologi: RegistroSessione['orologi'] = [];
  const idOrologi = [...new Set([...def.orologi.map((o) => o.id), ...Object.keys(ultima?.orologi ?? {})])];
  for (const id of idOrologi) {
    const d = orologioDef.get(id);
    const fine = ultima?.orologi?.[id];
    const inizio = inizioOrologi.get(id);
    if (!fine && !inizio) continue; // definito ma mai visto nell'archivio (campagna cambiata dopo)
    const segmenti = d?.segmenti ?? 0;
    const pieniFine = fine?.pieni ?? inizio?.pieni ?? 0;
    orologi.push({
      id,
      nome: d?.nome ?? id,
      segmenti,
      pieni_all_inizio: inizio?.pieni ?? 0,
      pieni_alla_fine: pieniFine,
      completo: segmenti > 0 && pieniFine >= segmenti,
      al_completo: d?.al_completo ?? null,
      partito: fine?.partito ?? inizio?.partito ?? false,
      partito_al_turno: partitoAl.get(id) ?? null,
      segni: segniPer.get(id) ?? [],
      tolti: toltiPer.get(id) ?? [],
    });
  }

  // --- PNG incontrati: chi ha parlato nella trascrizione pubblica.
  const incontri = new Map<string, { id: string; nome: string; primo_turno: number; ultimo_turno: number; battute: number }>();
  for (const v of voci) {
    if (v.tipo !== 'battuta' || v.chi === 'narratore' || v.chi === 'sistema' || idPg.has(v.chi)) continue;
    const x = incontri.get(v.chi) ?? { id: v.chi, nome: nomePng.get(v.chi) ?? v.nome, primo_turno: v.turno, ultimo_turno: v.turno, battute: 0 };
    x.primo_turno = Math.min(x.primo_turno, v.turno);
    x.ultimo_turno = Math.max(x.ultimo_turno, v.turno);
    x.battute += 1;
    incontri.set(v.chi, x);
  }
  const pngIncontrati = [...incontri.values()].sort((a, b) => a.primo_turno - b.primo_turno || a.id.localeCompare(b.id));

  // --- Azioni dei PG: l'ultima versione di ognuna, le ritirate no; pubbliche e private separate.
  const registrate = [...azioni.values()].filter((a) => a.stato !== 'ritirata').sort((a, b) => a.turno - b.turno || a.inviata_alle - b.inviata_alle || a.id.localeCompare(b.id));
  const idAutori = [...def.pg.map((p) => p.id), ...[...new Set(registrate.map((a) => a.autore))].filter((x) => !idPg.has(x)).sort()];
  const pg: RegistroSessione['pg'] = idAutori.map((id) => {
    const mie = registrate.filter((a) => a.autore === id).map((a) => ({ a, r: { id: a.id, turno: a.turno, testo: a.testo, esito: a.stato, motivo: a.motivo ?? null } }));
    return {
      id,
      nome: def.pg.find((p) => p.id === id)?.nome ?? id,
      azioni_pubbliche: mie.filter((x) => !x.a.privata).map((x) => x.r),
      azioni_private: mie.filter((x) => x.a.privata).map((x) => x.r),
    };
  });

  // --- Momenti: i turni con un cambiamento registrato, le righe dette in quel turno e le azioni.
  const cosaPer = new Map<number, string[]>();
  const segna = (turno: number, cosa: string): void => {
    cosaPer.set(turno, [...(cosaPer.get(turno) ?? []), cosa]);
  };
  for (const c of cambiDiScena) segna(c.turno, `scena: ${c.id}`);
  for (const o of orologi) for (const sg of o.segni) segna(sg.turno, `orologio ${o.id}: segno ${sg.numero}/${o.segmenti}${sg.causa === 'master' ? ' (master)' : ''}`);
  for (const o of orologi) if (o.partito_al_turno !== null) segna(o.partito_al_turno, `orologio ${o.id}: parte`);
  for (const i of indizi) segna(i.turno, `indizio: ${i.id}`);
  for (const m of menzogne) segna(m.turno, `menzogna: ${m.id}`);
  for (const b of battute) if (b.tipo && TIPI_MOMENTO.has(b.tipo)) segna(b.turno, `${b.tipo}: ${b.id}`);
  for (const sit of situazioni) segna(sit.turno, `situazione: ${sit.id}`);
  const momenti: RegistroSessione['momenti'] = [...cosaPer.entries()]
    .sort(([a], [b]) => a - b)
    .map(([turno, cosa]) => ({
      turno,
      cosa,
      azioni: registrate.filter((a) => a.turno === turno).map((a) => ({ id: a.id, pg: a.autore, privata: a.privata })),
      righe: voci.filter((v) => v.turno === turno && (v.tipo === 'narrazione' || v.tipo === 'battuta')).map((v) => ({ chi: v.chi, testo: v.testo })),
    }));

  const note = ((ultima?.note?.elenco ?? []) as NotaRegia[]).map((n) => ({ testo: n.testo, creata_al_turno: n.creata_al_turno }));

  const registro: RegistroSessione = {
    formato: FORMATO_REGISTRO,
    campagna: def.campagna,
    titolo: def.titolo,
    sessione: s.pacchetto,
    archivio: {
      id: s.id,
      modo: s.modo,
      creata: s.creata,
      ultimo_evento: ultimoEvento,
      stato: s.stato,
      motivo_chiusura: s.motivo_chiusura,
      eventi: eventi.length,
      ultimo_turno: ultima?.turno ?? s.turno,
    },
    trascrizione: { file: FILE_TRASCRIZIONE, voci: voci.length, turni: turni.size },
    giocatori: (() => {
      const conTelefono = new Set(telefoni.values());
      return [...def.pg.map((p) => p.id).filter((id) => conTelefono.has(id)), ...[...conTelefono].filter((id) => !idPg.has(id)).sort()];
    })(),
    scene,
    luoghi,
    situazioni: situazioni.sort((a, b) => a.turno - b.turno || a.id.localeCompare(b.id)),
    orologi,
    indizi: modoB ? indizi.sort(perTurnoEId) : null,
    battute: modoB ? battute.sort(perTurnoEId) : null,
    menzogne: modoB ? menzogne.sort(perTurnoEId) : null,
    fatti_noti: modoB ? fattiNoti.sort(perTurnoEId) : null,
    png_incontrati: pngIncontrati,
    pg,
    momenti,
    note_del_master: note,
    avvisi,
  };
  const trascrizione: TrascrizionePubblica = {
    formato: FORMATO_REGISTRO,
    campagna: def.campagna,
    sessione: s.pacchetto,
    archivio: s.id,
    voci: voci.map((v) => ({ turno: v.turno, tipo: v.tipo, chi: v.chi, nome: v.nome, testo: v.testo })),
  };
  return { registro, trascrizione };
}
