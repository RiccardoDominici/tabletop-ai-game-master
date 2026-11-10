/**
 * Compilatore del contesto di campagna per il narratore — versione F0.
 *
 * F0 passa le schede intere dei PNG (le chiamate separate per PNG arrivano in F1, E2).
 * Già ora però restano fuori le parti che il narratore non deve vedere:
 * - campagna.yaml → `preparazione` (lo toglie il caricatore);
 * - (pg.yaml → `conoscenze_private` restano, ma marcate come SEGRETE di quel PG: il prompt vieta
 *   di dirle a voce; il server le manda solo al telefono di quel giocatore, T9);
 * - i prompt per le immagini (in inglese, non servono alla narrazione).
 *
 * Gli id dei fatti del canone citati nelle schede PNG (`sa`, `non_sa`, `mente_su.verita`,
 * `crede_a_torto.contraddice`) vengono risolti nel testo: «f_x — testo del fatto».
 *
 * È un modulo a parte perché in F1 diventerà need-to-know (solo l'aspetto dei PNG presenti,
 * i segni visibili dei presagi, gli indizi della scena…). Il testo prodotto è STABILE per
 * tutta la scena (niente orari né contatori): sta in un blocco di sistema in cache.
 */
import YAML from 'yaml';
import { testo } from '../lingua';
import { ID_NARRATORE, type Campagna, type DatiYaml } from './tipi';

/**
 * Chiavi tolte ovunque nel contesto del narratore: le immagini (solo per il generatore) e i numeri
 * delle prove (`scheda` di PG e PNG, `prove` della scena): i dadi li tira il Motore, e il narratore
 * riceve l'esito come fatto (docs/prove.md). Numeri in meno nel prompt in cache, niente CD lette a voce.
 */
const CHIAVI_ESCLUSE = new Set(['prompt_immagine', 'prompt_luogo', 'stile_immagini', 'immagine', 'registro_attivita', 'scheda', 'prove']);

function senzaChiavi(valore: unknown): unknown {
  if (Array.isArray(valore)) return valore.map(senzaChiavi);
  if (valore !== null && typeof valore === 'object') {
    const out: DatiYaml = {};
    for (const [k, v] of Object.entries(valore as DatiYaml)) {
      if (CHIAVI_ESCLUSE.has(k)) continue;
      out[k] = senzaChiavi(v);
    }
    return out;
  }
  return valore;
}

/** id del fatto → testo, dal canone di campagna.yaml. */
export function mappaCanone(c: Campagna): Map<string, string> {
  const mappa = new Map<string, string>();
  const canone = c.campagnaNarratore['canone'];
  if (Array.isArray(canone)) {
    for (const f of canone as DatiYaml[]) {
      if (typeof f?.['id'] === 'string' && typeof f['testo'] === 'string') mappa.set(f['id'], f['testo']);
    }
  }
  return mappa;
}

/** Sostituisce ogni stringa che è esattamente un id del canone con «id — testo». */
export function risolviFatti(valore: unknown, canone: Map<string, string>): unknown {
  if (typeof valore === 'string') {
    const t = canone.get(valore.trim());
    return t ? `${valore.trim()} — ${t}` : valore;
  }
  if (Array.isArray(valore)) return valore.map((v) => risolviFatti(v, canone));
  if (valore !== null && typeof valore === 'object') {
    const out: DatiYaml = {};
    for (const [k, v] of Object.entries(valore as DatiYaml)) out[k] = risolviFatti(v, canone);
    return out;
  }
  return valore;
}

/** YAML leggibile: niente righe spezzate, chiavi nell'ordine del file (deterministico). */
function yaml(dati: unknown): string {
  return YAML.stringify(senzaChiavi(dati), { lineWidth: 0, minContentWidth: 0 }).trimEnd();
}

/** Una parte del contesto, con un nome (per misurarne i token e per il debug). */
export interface SezioneContesto {
  nome: string;
  testo: string;
}

/**
 * Le sezioni del contesto, nell'ordine del contratto: stile, campagna, scena, png, pg, etichette.
 * Titoli e frasi vengono dal pacchetto della lingua dei contenuti (`contesto` e `contesto.campagna`),
 * letti a ogni compilazione; i `nome` delle sezioni sono id per il conteggio dei token, non testo.
 */
export function sezioniContestoCampagna(c: Campagna): SezioneContesto[] {
  const sezioni: SezioneContesto[] = [];
  const canone = mappaCanone(c);
  sezioni.push({ nome: 'intestazione', testo: testo('contesto.campagna.intestazione', { titolo: c.titolo, id: c.id }) });
  sezioni.push({ nome: 'stile.yaml', testo: [testo('contesto.carta_stile'), yaml(c.stile)].join('\n\n') });

  const { id: _id, ...campagna } = c.campagnaNarratore;
  if (Object.keys(campagna).length) {
    sezioni.push({ nome: 'campagna.yaml', testo: [testo('contesto.campagna.titolo_campagna'), yaml(campagna)].join('\n\n') });
  }

  sezioni.push({ nome: 'scena.yaml', testo: [testo('contesto.scena', { titolo: c.scena.titolo }), yaml(c.scena.dati)].join('\n\n') });

  sezioni.push({ nome: 'png (titolo)', testo: testo('contesto.campagna.titolo_png') });
  for (const p of c.png) {
    const presenza = testo(c.scena.png_presenti.includes(p.id) ? 'contesto.presente' : 'contesto.assente');
    sezioni.push({ nome: `png/${p.id}.yaml`, testo: [testo('contesto.png', { nome: p.nome, id: p.id, presenza }), yaml(risolviFatti(p.dati, canone))].join('\n\n') });
  }

  const pg: string[] = [testo('contesto.titolo_pg')];
  if (c.situazioneComune) pg.push(testo('contesto.situazione_comune', { testo: c.situazioneComune }));
  for (const p of c.pg) {
    pg.push(testo('contesto.pg', { nome: p.nome, id: p.id }), yaml(p.pubblico));
    if (p.privato.length) {
      // `conoscenze_private` è il nome del campo: resta tale in ogni lingua.
      pg.push(testo('contesto.campagna.conoscenze_private', { id: p.id }), yaml(risolviFatti(p.privato, canone)));
    }
  }
  sezioni.push({ nome: 'pg.yaml', testo: pg.join('\n\n') });

  sezioni.push({
    nome: 'etichette',
    testo: [
      testo('contesto.titolo_etichette'),
      [
        `- [${ID_NARRATORE}]`,
        ...c.png.map((p) => `- [${p.id}] ${p.nome}`),
        testo('contesto.campagna.etichetta_orologio'),
        testo('contesto.etichetta_invito', { pg: c.pg.map((p) => p.id).join(', ') }),
      ].join('\n'),
    ].join('\n\n'),
  });
  return sezioni;
}

/** Blocco di contesto della campagna (sistema, in cache). */
export function compilaContestoCampagna(c: Campagna): string {
  return sezioniContestoCampagna(c)
    .map((s) => s.testo)
    .join('\n\n') + '\n';
}
