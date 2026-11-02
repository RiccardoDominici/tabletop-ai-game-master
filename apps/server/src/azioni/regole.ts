/**
 * Prima parte dell'arbitro: regole istantanee, senza modello. Riconoscono le dipendenze
 * esplicite («anch'io», «lo seguo», «insieme a Ginestra», «aiuto Corrado», «copro Teodora»…)
 * quando c'è una sola azione candidata (quella del PG nominato, o l'unica pubblica in coda).
 * Tutto il resto (conflitti, casi ambigui, nomi citati senza legame) va al modello.
 */
import type { AzioneArbitro } from './tipi';

export interface EsitoRegole {
  dipende_da: string[];
  /** Dipendenza certa: si può fare a meno del modello. */
  certo: boolean;
  /** Il testo contiene una formula di dipendenza (anche se il bersaglio è ambiguo). */
  formula: string | null;
}

/** Toglie accenti e apostrofi tipografici, minuscolo: «Anch’io» → «anch'io». */
export function normalizza(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[’`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Formule che, da sole, si riferiscono all'azione di qualcun altro. */
const FORMULE_SENZA_NOME: Array<[string, RegExp]> = [
  ['anch_io', /\b(anch'? ?io|anche io|anchio|pure io|idem|io pure|stessa cosa|faccio lo stesso|faccio come (lui|lei|loro))\b/],
  ['seguo_pronome', /\b(lo|la|li|le) (seguo|seguiamo|accompagno|copro|aiuto)\b|\b(vado|resto|sto|vengo) con (lui|lei|loro)\b|\b(dietro|accanto) a (lui|lei)\b|\bgli (do|dò) (una )?mano\b|\ble (do|dò) (una )?mano\b/],
];

/** Verbi che legano a un PG nominato: «seguo X», «insieme a X», «aiuto X», «copro X»… */
const LEGAME_CON_NOME = '(seguo|seguiamo|vado con|vengo con|resto con|sto con|insieme a|insieme con|assieme a|accompagno|aiuto|do una mano a|do man forte a|copro|proteggo|sostengo|vado dietro a|resto dietro a|sto dietro a|dietro a|faccio come|come fa)';

export function relazioniDaRegole(nuova: AzioneArbitro, coda: readonly AzioneArbitro[], nomi: ReadonlyMap<string, string>): EsitoRegole {
  const t = normalizza(nuova.testo);
  // Candidati: azioni PUBBLICHE degli altri (da un'azione privata altrui non si può dipendere).
  const candidati = coda.filter((a) => a.autore !== nuova.autore && !a.privata);
  const perAutore = new Map(candidati.map((a) => [a.autore, a]));

  // 1. Verbo di legame + nome di un PG: dipendenza dall'azione di quel PG, se ce l'ha.
  for (const [alias, idPg] of nomi) {
    if (idPg === nuova.autore) continue;
    const re = new RegExp(`\\b${LEGAME_CON_NOME} (a |ad )?${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    if (re.test(t)) {
      const bersaglio = perAutore.get(idPg);
      return bersaglio ? { dipende_da: [bersaglio.id], certo: true, formula: 'legame_con_nome' } : { dipende_da: [], certo: false, formula: 'legame_con_nome' };
    }
  }
  // 2. Formula senza nome: certa solo con un'unica azione candidata.
  for (const [nome, re] of FORMULE_SENZA_NOME) {
    if (re.test(t)) {
      // «anch'io … come Corrado»: un nome citato restringe i candidati.
      const nominati = [...nomi].filter(([alias, id]) => id !== nuova.autore && new RegExp(`\\b${alias}\\b`).test(t)).map(([, id]) => id);
      const scelti = nominati.length ? candidati.filter((a) => nominati.includes(a.autore)) : candidati;
      if (scelti.length === 1) return { dipende_da: [scelti[0]!.id], certo: true, formula: nome };
      return { dipende_da: [], certo: false, formula: nome };
    }
  }
  return { dipende_da: [], certo: false, formula: null };
}
