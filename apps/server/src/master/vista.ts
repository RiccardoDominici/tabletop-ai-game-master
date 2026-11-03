/**
 * Istantanea per il pannello del master (StatoMaster): lo stato del tavolo che vedono tutti, più
 * ciò che solo il master vede (azioni private, segni degli orologi, repertorio, note di regia).
 * Funzione pura sopra la regia e la campagna: non cambia niente.
 */
import {
  NOTE_REGIA_MAX,
  NOTE_REGIA_TURNI_MAX,
  type AudioMaster,
  type AzioneMaster,
  type BattutaMaster,
  type EventoMaster,
  type LuogoMaster,
  type OrologioMaster,
  type RepertorioMaster,
  type ScenaMaster,
  type SessioneMaster,
  type SituazioneMaster,
  type StatoMaster,
} from '@cantastorie/shared';
import type { Azione } from '../azioni/tipi';
import { STATI_VIVI } from '../azioni/tipi';
import type { CatalogoImmagini } from '../campagna/immagini';
import type { CatalogoAudio } from '../audio/catalogo';
import type { Campagna, DatiYaml } from '../campagna/tipi';
import type { StatoRepertorio } from '../repertorio/stato';
import type { Battuta } from '../repertorio/tipi';
import { nomeBreve, type Regia } from '../scena/regia';
import type { CicloSessioni } from '../sessione/ciclo';

export interface FonteVistaMaster {
  regia: Regia;
  campagna: Campagna;
  immagini?: CatalogoImmagini | undefined;
  audio?: CatalogoAudio | undefined;
  eventi: readonly EventoMaster[];
  /** Pacchetti, fine sessione e ultimo registro (assente nei test che non lo usano). */
  ciclo?: CicloSessioni | undefined;
}

/** Quante azioni già chiuse (del turno precedente) mostrare oltre a quelle vive. */
const TURNI_DI_CONTESTO = 1;

export function statoMaster(f: FonteVistaMaster): StatoMaster {
  const { regia, campagna } = f;
  const tavolo = regia.stato();
  const s = regia.repertorioAttivo;
  return {
    tavolo,
    modo: regia.infoSessione.modo,
    pausa: regia.statoPausa,
    narrazione_in_corso: regia.narrazioneInCorso,
    scene: sceneMaster(campagna, regia.scenaCorrente),
    luoghi: luoghiMaster(campagna, f.immagini),
    situazioni: situazioniMaster(regia),
    orologi: orologiMaster(regia),
    azioni: azioniMaster(regia, campagna),
    note: regia.note.elenco,
    limiti_note: { max: NOTE_REGIA_MAX, turni_max: NOTE_REGIA_TURNI_MAX },
    repertorio: s ? repertorioMaster(s, regia.turnoCorrente) : null,
    eventi: [...f.eventi],
    sessione: {
      ...sessioneMaster(regia),
      ...(f.ciclo ? f.ciclo.vista() : {}),
      telefoni: regia.dispositiviRicordati.map((t) => ({ ...t, nome: campagna.pg.find((p) => p.id === t.id_pg)?.nome ?? t.id_pg })),
    },
    ...(f.audio ? { audio: audioMaster(tavolo.scena.audio, f.audio) } : {}),
  };
}

/** Audio per il pannello: dalla scena pubblica (cosa suona) e dal catalogo (cosa si comanda). */
export function audioMaster(scena: StatoMaster['tavolo']['scena']['audio'], catalogo: CatalogoAudio): AudioMaster {
  return {
    musica: scena?.musica ?? null,
    umore: scena?.umore ? scena.umore.replace(/^umore_/, '') : null,
    umori: Object.keys(catalogo.umori()).sort(),
    effetti: catalogo.effetti(),
    ambienti: scena?.ambienti ?? [],
  };
}

/** Scene della campagna, nell'ordine di caricamento (la prima è scena.yaml). */
export function sceneMaster(c: Campagna, corrente: string): ScenaMaster[] {
  return c.scene.map((sc) => ({ id: sc.id, titolo: sc.titolo, luogo: sc.id, corrente: sc.id === corrente }));
}

/**
 * Luoghi per il proiettore: ogni scena (immagine `luogo_<id scena>`) e ogni nodo di tipo luogo
 * che non è già il nodo di una scena (immagine `luogo_<id nodo>`).
 */
export function luoghiMaster(c: Campagna, immagini?: CatalogoImmagini): LuogoMaster[] {
  const scene = c.scene;
  const nodiDiScena = new Set(scene.map((sc) => (typeof sc.dati['nodo'] === 'string' ? (sc.dati['nodo'] as string) : '')));
  const nodi = Array.isArray(c.campagnaNarratore['nodi']) ? (c.campagnaNarratore['nodi'] as DatiYaml[]) : [];
  const luoghi: LuogoMaster[] = scene.map((sc) => ({ id: sc.id, nome: sc.titolo, tipo: 'scena', immagine: immagini?.luogo(sc.id) ?? null }));
  for (const n of nodi) {
    const id = typeof n['id'] === 'string' ? n['id'] : null;
    if (!id || n['tipo'] !== 'luogo' || nodiDiScena.has(id)) continue;
    luoghi.push({ id, nome: typeof n['nome'] === 'string' ? n['nome'] : id, tipo: 'nodo', immagine: immagini?.luogo(id) ?? null });
  }
  return luoghi;
}

/** Immagini di situazione: quale è in onda e quale rivelazione le fa comparire. */
function situazioniMaster(regia: Regia): SituazioneMaster[] {
  const inOnda = regia.situazioneInOnda;
  return regia.situazioniCollegate.map((x) => ({ id: x.id, png: x.png, nome: x.nome, url: x.url, in_onda: x.id === inOnda, dopo: x.dopo.length ? x.dopo.join(', ') : null }));
}

function orologiMaster(regia: Regia): OrologioMaster[] {
  return regia.orologiAttivi.map((o) => ({
    id: o.id,
    nome: o.nome,
    pieni: o.pieni,
    segmenti: o.segmenti,
    segni: [...o.segni],
    prossimo: o.pieni < o.segmenti ? (o.segni[o.pieni] ?? '(segno non scritto)') : null,
    dovuto: o.dovuto,
    ultimo_turno: o.ultimoTurno,
    al_completo: o.alCompleto,
    partito: o.partito,
  }));
}

/**
 * Azioni vive (qualsiasi turno) e quelle dei turni appena giocati, private comprese, in ordine di
 * turno e di invio. I legami portano il nome breve dell'altro autore.
 */
export function azioniMaster(regia: Regia, c: Campagna): AzioneMaster[] {
  const tutte = regia.azioniTutte;
  const perId = new Map(tutte.map((a) => [a.id, a]));
  const nome = (id_pg: string): string => c.pg.find((p) => p.id === id_pg)?.nome ?? id_pg;
  const breve = (idAzione: string): string => {
    const a = perId.get(idAzione);
    return a ? nomeBreve(nome(a.autore)) : idAzione;
  };
  const daTurno = regia.turnoCorrente - TURNI_DI_CONTESTO;
  const pronti = new Set(regia.stato().finestra.azioni.filter((x) => x.pronto).map((x) => x.id_pg));
  return tutte
    .filter((a: Readonly<Azione>) => STATI_VIVI.has(a.stato) || a.turno >= daTurno)
    .sort((x, y) => x.turno - y.turno || x.inviata_alle - y.inviata_alle)
    .map((a) => ({
      id: a.id,
      id_pg: a.autore,
      nome: nome(a.autore),
      testo: a.testo,
      privata: a.privata,
      stato: a.stato,
      motivo: a.motivo,
      turno: a.turno,
      inviata_alle: a.inviata_alle,
      pronto: STATI_VIVI.has(a.stato) && pronti.has(a.autore),
      dipende_da: a.dipende_da.map((id) => ({ id, nome: breve(id) })),
      conflitti: a.conflitti.map((k) => ({ id: k.con, nome: breve(k.con), esclusivo: k.esclusivo, vince: k.vince === a.id })),
      saltabile: STATI_VIVI.has(a.stato),
    }));
}

function battutaMaster(s: StatoRepertorio, b: Battuta): BattutaMaster {
  return { id: b.id, chi: b.chi, tipo: b.tipo, quando: b.quando, usi: s.usi.get(b.id) ?? 0, max_usi: b.max_usi, scena: b.scene.length ? b.scene.join(', ') : null };
}

/** Repertorio (modalità B): usate, disponibili adesso (condizioni vere, usi rimasti), quante no. */
export function repertorioMaster(s: StatoRepertorio, turno: number): RepertorioMaster {
  const selezionabili = s.repertorio.battute.filter((b) => !b.solo_esempio);
  const disponibili = new Set(s.disponibili(turno + 1).map((b) => b.id));
  return {
    usate: selezionabili.filter((b) => s.usata(b.id)).map((b) => battutaMaster(s, b)),
    disponibili: selezionabili.filter((b) => disponibili.has(b.id)).map((b) => battutaMaster(s, b)),
    non_disponibili: selezionabili.filter((b) => !disponibili.has(b.id)).length,
    indizi_rivelati: [...s.indiziRivelati],
  };
}

/** La sessione salvata, per il pannello («Riprendi»: quando e da che turno). */
function sessioneMaster(regia: Regia): SessioneMaster {
  const r = regia.infoRegistro;
  return { id: r.sessione, creata: r.creata, eventi: r.eventi, ripresa: r.ripresa, in_attesa_di_ripresa: r.inAttesaDiRipresa };
}
