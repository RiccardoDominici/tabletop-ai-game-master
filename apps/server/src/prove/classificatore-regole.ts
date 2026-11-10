/**
 * Classificatore delle prove a regole, senza modello (docs/prove.md, «Senza modello»): la riserva
 * `regole` di `arbitro_prove`. Serve quando il modello non c'è (narratore a copione, config `regole`),
 * è troppo lento alla chiusura (un modello locale da 3–10 s a chiamata) o fallisce: invece di «nessun
 * tiro» si tira lo stesso, con regole semplici e deterministiche sul testo dell'azione.
 *
 * - verbo d'attacco + un PNG con la scheda nominato → attacco (arma nominata, se no la prima);
 * - una prova della scena il cui `quando` ha almeno due radici in comune con l'azione → quella prova;
 * - convincere, mentire, minacciare + un PNG nominato → la prova sociale (o la mossa del set);
 * - nascondersi, arrampicarsi, scassinare, cercare… → l'abilità corrispondente (o la mossa del set
 *   il cui `quando` le somiglia di più);
 * - tutto il resto → nessun tiro.
 * Più grezzo del modello (niente vantaggi, niente «impossibile»), ma il dado lo tira il Motore.
 */
import { normalizza } from '../azioni/regole';
import { comeAbilita, type Abilita } from '../campagna/regole-srd';
import type { Campagna } from '../campagna/tipi';
import { radici } from '../narrazione/privato';
import { nomiDeiPng, pngNominati } from '../repertorio/pertinenza';
import type { SistemaRegole } from '../regole/tipi';
import type { DecisioneProva, DecisioneRegole } from './tipi';

/** Famiglie di verbi → abilità SRD (gli id si traducono nel set se serve). */
const FAMIGLIE: Array<{ re: RegExp; abilita: Abilita; sociale?: boolean }> = [
  { re: /\b(convinc|persuad|prometto|supplic|tratto|contratt|implor)/, abilita: 'persuasione', sociale: true },
  { re: /\b(mento|mentire|inganno|ingannar|fingo|bluff|raggir)/, abilita: 'inganno', sociale: true },
  { re: /\b(minacci|intimid|spavent)/, abilita: 'intimidire', sociale: true },
  { re: /\b(di nascosto|senza farmi (vedere|sentire|notare)|mi nascondo|nasconder|sgattaiol|furtiv|in silenzio)/, abilita: 'furtivita' },
  { re: /\b(scassin|forzo la serratura|apro il lucchetto|lucchetto|grimaldell|borsegg|sfilo|rubo)/, abilita: 'rapidita_di_mano' },
  { re: /\b(arrampic|scalo|salto|nuoto|guad|attravers\w* il fiume|sollev|spingo|sfond)/, abilita: 'atletica' },
  { re: /\b(cerco|frugo|perquis|esamin|ispezion|indag)/, abilita: 'indagare' },
  { re: /\b(ascolto|osservo|scruto|guardo bene|tengo d'occhio)/, abilita: 'percezione' },
  { re: /\b(curo|fascio|medic|ferita)/, abilita: 'medicina' },
];

const ATTACCO = /\b(colpisc|attacc|ferisc|accoltell|trafigg|sparo|scocc|tiro (un|una|il|la) (dardo|freccia|colpo|pugno|sasso|coltello)|pugno|calcio|mi (lancio|getto) (contro|addosso)|affondo|fendent)/;

export interface IngressoClassificatore {
  campagna: Campagna;
  /** Il set non SRD, o null per l'SRD 5.2. */
  sistema: SistemaRegole | null;
  /** Armi di un personaggio (id), per l'attacco. */
  armi: (id: string) => string[];
  /** Ha una scheda (si può attaccare / tirare). */
  haScheda: (id: string) => boolean;
  /** Prove della scena: id e `quando`. */
  proveScena: Array<{ id: string; quando: string }>;
}

function vuota(id: string): DecisioneProva & { mossa: string | null } {
  return { id, tipo: 'nessuna', caratteristica: null, abilita: null, bersaglio: null, arma: null, prova_scena: null, difficolta: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null, mossa: null };
}

/** Quante radici del testo stanno in `quando`. */
function somiglianza(testo: string, quando: string): number {
  const a = radici(testo);
  return [...radici(quando)].filter((r) => a.has(r)).length;
}

export function classificaARegole(az: { id: string; testo: string; autore: string }, i: IngressoClassificatore): DecisioneProva | DecisioneRegole {
  const d = vuota(az.id);
  const t = normalizza(az.testo);
  const nominati = [...pngNominati(az.testo, nomiDeiPng(i.campagna))].filter((id) => id !== az.autore);
  const png = nominati.find((id) => i.haScheda(id)) ?? null;
  const s = i.sistema;

  if (ATTACCO.test(t) && png) {
    const armi = i.armi(az.autore);
    const arma = armi.find((a) => a.split('_').some((p) => p.length > 3 && t.includes(p))) ?? null;
    return { ...d, tipo: 'attacco', bersaglio: png, arma } as DecisioneProva;
  }
  const ps = i.proveScena.map((p) => ({ p, n: somiglianza(az.testo, p.quando) })).filter((x) => x.n >= 2).sort((a, b) => b.n - a.n)[0];
  if (ps) return { ...d, tipo: 'prova', prova_scena: ps.p.id } as DecisioneProva;
  const fam = FAMIGLIE.find((f) => f.re.test(t));
  if (!fam) return d as DecisioneProva;
  if (fam.sociale && !png) return d as DecisioneProva; // parlare a nessuno in particolare: niente tiro
  if (!s) return { ...d, tipo: 'prova', abilita: fam.abilita, bersaglio: png } as DecisioneProva;
  // Set non SRD: la mossa il cui `quando` somiglia di più; se no l'abilità o la prova sociale del set.
  const mossa = s.mosse.map((m) => ({ m, n: somiglianza(az.testo, `${m.nome} ${m.quando}`) })).filter((x) => x.n >= 1).sort((a, b) => b.n - a.n)[0]?.m;
  if (mossa) return { ...d, tipo: 'prova', mossa: mossa.id, bersaglio: png } as DecisioneRegole;
  const abil = s.abilita.find((a) => a.id === fam.abilita || comeAbilita(a.nome) === fam.abilita)?.id ?? (fam.sociale ? s.sociale.abilita : null);
  const car = !abil && fam.sociale ? s.sociale.caratteristica : null;
  if (!abil && !car) return d as DecisioneRegole;
  return { ...d, tipo: 'prova', abilita: abil, caratteristica: car, bersaglio: png } as DecisioneRegole;
}
