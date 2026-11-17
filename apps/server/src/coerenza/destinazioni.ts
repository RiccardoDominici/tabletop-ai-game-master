/**
 * «Go» to a place the campaign does not have (docs/coerenza.md, «After round 6»): round 6's off-the-rails game had
 * its players «go» to a mill, a ford, a cave the campaign never had, and those words counted as a real decision for the
 * stall's counter (mondo/stallo.ts), so the table never reached a stall move. A movement with a named destination none
 * of whose words the campaign or the language knows is not a commitment, and the Engine answers it with the roads
 * that really leave the scene.
 *
 * The movement and its destination are the language pack's (`stallo.moto` in lingue/<code>/motore.yaml, with a named
 * group `dove`); «known» is every word of the campaign's texts and the language's ordinary words (dettato/lingua.ts,
 * paroleComuni). Pure: text and words in, the unknown destinations out.
 */
import { normalizza } from '../azioni/regole';
import { regolaMoto } from '../mondo/stallo';

/** How long a word of the destination must be to count (shorter ones are articles, «lì», «qui»). */
const MIN_PAROLA = 4;

/**
 * The destinations the text moves to that nobody knows (their head word, the first of at least four letters, is not
 * among `noti`), in sentences that are not questions. «Vado al mulino» in a campaign with no mill → ["al mulino"]; «Andiamo
 * alla torre» with a tower → [].
 */
export function destinazioniIgnote(testo: string, noti: ReadonlySet<string>): string[] {
  const re = regolaMoto();
  if (!re) return [];
  const out: string[] = [];
  for (const frase of testo.split(/(?<=[.!?…])\s+/)) {
    if (/\?["»”]?\s*$/.test(frase.trim())) continue;
    for (const m of frase.matchAll(new RegExp(re.source, re.flags))) {
      const dove = (m.groups?.['dove'] ?? '').trim();
      const parole = normalizza(dove).replace(/[^\p{L}' ]/gu, ' ').split(/[\s']+/).filter((w) => w.length >= MIN_PAROLA);
      // The destination's head word (the first of four letters or more): «alla grotta delle fate» is a cave, whatever
      // «fate» means elsewhere in the campaign.
      if (parole.length && !noti.has(parole[0]!)) out.push(dove);
    }
  }
  return out;
}

/** The head word of a destination (the first of four letters or more, plain form): «grotta» for «grotta delle fate». */
export function testaDestinazione(dove: string): string | null {
  return normalizza(dove).replace(/[^\p{L}' ]/gu, ' ').split(/[\s']+/).find((w) => w.length >= MIN_PAROLA) ?? null;
}

/** The text without its movements to an unknown destination: what is left may still commit («prendo la chiave»). */
export function senzaDestinazioniIgnote(testo: string, noti: ReadonlySet<string>): string {
  let t = testo;
  for (const d of destinazioniIgnote(testo, noti)) {
    const re = regolaMoto();
    if (!re) break;
    t = t.replace(new RegExp(re.source, re.flags.replace('g', '')), (tutto, ...gruppi) => {
      const g = gruppi.at(-1) as Record<string, string> | undefined;
      return g?.['dove']?.trim() === d ? ' ' : tutto;
    });
  }
  return t;
}
