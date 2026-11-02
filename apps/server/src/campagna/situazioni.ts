/**
 * Immagini di situazione e rivelazioni (docs: skill del Preparatore, «immagini», regola 4): un
 * tratto nascosto (la cicatrice sotto il cappuccio) sta in una situazione del PNG, «da mostrare
 * dopo la rivelazione». Qui si decide QUALE rivelazione la fa comparire:
 *   1. esplicito: `aspetto.situazioni[].dopo` nella scheda del PNG (id di un indizio o di una
 *      battuta, o una lista), o lo stesso campo copiato nel manifest da strumenti/immagini;
 *   2. altrimenti, per somiglianza: un indizio il cui nodo è quel PNG e il cui `come_si_trova`
 *      contiene una parola significativa dell'id della situazione («senza_cappuccio» →
 *      «Se Sebastiano abbassa il cappuccio…» → i_cicatrice).
 * Le situazioni automatiche «<png>_in_<luogo>» non hanno rivelazione: solo a comando del master.
 * Il pannello mostra il collegamento trovato, così il master lo vede e può sempre fare a mano.
 */
import { normalizza } from '../azioni/regole';
import type { VoceSituazione } from './immagini';
import { indiziCampagna } from './indizi';
import { nomeBreve } from './nomi';
import type { Campagna, DatiYaml } from './tipi';

export interface SituazioneCollegata extends VoceSituazione {
  /** Etichetta per il pannello («Sebastiano: senza cappuccio»). */
  nome: string;
  /** Id di indizi o battute: quando uno di questi esce, la situazione va sul proiettore. */
  dopo: string[];
}

/** Parole troppo comuni per collegare una situazione a un indizio. */
const VUOTE = new Set(['senza', 'sotto', 'sopra', 'dentro', 'fuori', 'davanti', 'dietro', 'mentre', 'quando', 'ancora', 'nella', 'nello', 'della', 'dello', 'notte', 'giorno']);
/** Lunghezza della radice confrontata (cappuccio → «cappuc»: prende anche cappucci, cappuccio). */
const RADICE = 6;

function lista(v: unknown): string[] {
  if (typeof v === 'string' && v.trim()) return [v.trim()];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()) : [];
}

/** `dopo` dichiarato nella scheda per quella situazione, se c'è. */
function doppoEsplicito(c: Campagna, png: string | null, situazione: string): string[] {
  const p = c.png.find((x) => x.id === png);
  const voci = ((p?.dati['aspetto'] as DatiYaml | undefined)?.['situazioni'] as DatiYaml[] | undefined) ?? [];
  return lista(voci.find((v) => v?.['id'] === situazione)?.['dopo']);
}

/** Indizi del PNG il cui `come_si_trova` contiene una parola significativa della situazione. */
function doppoPerSomiglianza(c: Campagna, png: string | null, situazione: string): string[] {
  if (!png) return [];
  const radici = situazione
    .split('_')
    .map((p) => normalizza(p))
    .filter((p) => p.length >= RADICE && !VUOTE.has(p))
    .map((p) => p.slice(0, RADICE));
  if (radici.length === 0) return [];
  const out: string[] = [];
  for (const ind of indiziCampagna(c).values()) {
    if (ind.nodo !== png) continue;
    const testo = normalizza(ind.come_si_trova);
    if (radici.some((r) => new RegExp(`(?<![\\p{L}])${r}`, 'u').test(testo))) out.push(ind.id);
  }
  return out;
}

/** Collega ogni immagine di situazione alla rivelazione che la fa comparire (vedi sopra). */
export function collegaSituazioni(c: Campagna, voci: readonly VoceSituazione[]): SituazioneCollegata[] {
  return voci.map((v) => {
    const png = c.png.find((p) => p.id === v.png);
    const chi = png ? nomeBreve(png.nome) : (v.png ?? 'situazione');
    const inLuogo = v.situazione.startsWith('in_');
    const nome = inLuogo ? `${chi} in ${v.situazione.slice(3).replace(/_/g, ' ')}` : `${chi}: ${v.situazione.replace(/_/g, ' ')}`;
    if (inLuogo) return { ...v, nome, dopo: [] };
    // Prima la scheda, poi il manifest (stessa fonte, copiata dallo strumento immagini), infine la somiglianza.
    const esplicito = doppoEsplicito(c, v.png, v.situazione);
    const dalManifest = v.dopo ?? [];
    return { ...v, nome, dopo: esplicito.length ? esplicito : dalManifest.length ? dalManifest : doppoPerSomiglianza(c, v.png, v.situazione) };
  });
}
