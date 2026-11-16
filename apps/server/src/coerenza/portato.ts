/**
 * The carried subject for the rules, when the yes/no judge is late (docs/coerenza.md, «After round 3»). The judge asks
 * the sentence right after a «si» with the same mentions (a carried subject: «Quello cade contro il muro»); when that
 * answer misses its deadline the shadow rules decide, and they carry a subject pronoun only. Round 3's T15 heard «Il
 * colpo lo coglie di fianco e lo stende sulle pietre» right after the one late answer: an object pronoun after a new
 * thing-subject, invisible to them.
 *
 * Here the rules carry the subject the way the judge's question does: a sentence right after one judged a violation
 * that names nobody of its own and refers back to a third person (it opens with no subject of its own, «Non si rialza.»,
 * «Parla piano…»; a subject pronoun, «… e lui si affloscia»; or an object pronoun right after a subject noun, «Il colpo
 * lo coglie», «il fiato gli esce») is about the same one, and gets what a «si» would: dropped, its line said already. A question
 * or a sentence in the first or second person («Che fai?», «Tu aspetti…») is not. Words: lingue/<code>/motore.yaml,
 * section `portato`, with the out-of-play guard's articles and prepositions. Pure logic.
 */
import { normalizza } from '../azioni/regole';
import { campoElenco, regole } from '../lingua/motore';
import { doveNomina, paroleDi } from '../narrazione/guardia-esiti';
import { continuaIlSoggetto, paroleDellaFrase } from '../narrazione/guardia-fuori';

const parole = (): { clitici: ReadonlySet<string>; oggetti: ReadonlySet<string>; pronomi: ReadonlySet<string>; nonSoggetti: ReadonlySet<string> } =>
  regole('portato', (s) => ({
    clitici: new Set(campoElenco(s, 'clitici').map(normalizza)),
    oggetti: new Set(campoElenco(s, 'oggetti').map(normalizza)),
    pronomi: new Set(campoElenco(s, 'pronomi').map(normalizza)),
    nonSoggetti: new Set(campoElenco(s, 'non_soggetti').map(normalizza)),
  }));

/**
 * Whether `frase`, right after a sentence judged a violation, continues its subject. `nomi`: how the narration names
 * every character (PCs too): a sentence that names one has a subject of its own.
 */
export function continuaDopo(frase: string, nomi: ReadonlyArray<readonly string[]>): boolean {
  if (frase.trim().endsWith('?')) return false;
  const w = paroleDi(frase);
  if (!w.length || nomi.some((n) => doveNomina(w, n) >= 0)) return false;
  const p = parole();
  if (p.nonSoggetti.has(w[0]!)) return false;
  if (continuaIlSoggetto(frase)) return true;
  const { apertura, articoli, preposizioni } = paroleDellaFrase();
  // A third-person subject pronoun («…, e lui si affloscia»), an object pronoun that is never an article (`oggetti`:
  // English «him»), or a clitic right after a subject noun with its article («il colpo lo coglie», «la voce gli
  // trema»): after a verb the same words are articles («stringe la corda»), after a conjunction too («e lo scudo»).
  return w.some((x, i) => {
    if (i === 0) return false;
    const prima = w[i - 1]!;
    if (articoli.has(prima) || preposizioni.has(prima)) return false;
    if (p.pronomi.has(x) || p.oggetti.has(x)) return true;
    return p.clitici.has(x) && i >= 2 && articoli.has(w[i - 2]!) && !apertura.has(prima) && !p.clitici.has(prima);
  });
}
