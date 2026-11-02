/**
 * Compilatore del contesto di campagna per il narratore — versione F0.
 *
 * F0 passa le schede intere dei PNG (le chiamate separate per PNG arrivano in F1, E2).
 * Già ora però restano fuori le parti che il narratore non deve vedere:
 * - campagna.yaml → `preparazione` (lo toglie il caricatore);
 * - pg.yaml → `conoscenze_private` (solo sul telefono del giocatore, T9);
 * - i prompt per le immagini (in inglese, non servono alla narrazione).
 *
 * È un modulo a parte perché in F1 diventerà need-to-know (solo l'aspetto dei PNG presenti,
 * i segni visibili dei presagi, gli indizi della scena…). Il testo prodotto è STABILE per
 * tutta la scena (niente orari né contatori): sta in un blocco di sistema in cache.
 */
import YAML from 'yaml';
import { ID_NARRATORE, type Campagna, type DatiYaml } from './tipi';

/** Chiavi tolte ovunque nel contesto del narratore (immagini: solo per il generatore). */
const CHIAVI_ESCLUSE = new Set(['prompt_immagine', 'prompt_luogo', 'stile_immagini', 'immagine', 'registro_attivita']);

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

/** YAML leggibile: niente righe spezzate, chiavi nell'ordine del file (deterministico). */
function yaml(dati: unknown): string {
  return YAML.stringify(senzaChiavi(dati), { lineWidth: 0, minContentWidth: 0 }).trimEnd();
}

/** Blocco di contesto della campagna (sistema, in cache). */
export function compilaContestoCampagna(c: Campagna): string {
  const parti: string[] = [];
  parti.push(`# Campagna «${c.titolo}» (id ${c.id})`);

  parti.push('## Carta di stile', yaml(c.stile));

  const { id: _id, ...campagna } = c.campagnaNarratore;
  if (Object.keys(campagna).length) parti.push('## Campagna: canone, orologi, rivelazioni, nodi, sessione', yaml(campagna));

  parti.push(`## Scena corrente: ${c.scena.titolo}`, yaml(c.scena.dati));

  parti.push('## PNG (schede complete)');
  for (const p of c.png) {
    const presente = c.scena.png_presenti.includes(p.id) ? 'presente in scena' : 'non in scena';
    parti.push(`### ${p.nome} — etichetta [${p.id}], ${presente}`, yaml(p.dati));
  }

  parti.push('## Personaggi giocanti');
  if (c.situazioneComune) parti.push(`Situazione comune: ${c.situazioneComune}`);
  for (const p of c.pg) parti.push(`### ${p.nome} — id ${p.id}`, yaml(p.pubblico));

  parti.push(
    '## Etichette valide in questa scena',
    [
      `- [${ID_NARRATORE}]`,
      ...c.png.map((p) => `- [${p.id}] ${p.nome}`),
      `- [invito] seguito da id di PG separati da virgola (${c.pg.map((p) => p.id).join(', ')}) oppure tutti`,
    ].join('\n'),
  );
  return parti.join('\n\n') + '\n';
}
