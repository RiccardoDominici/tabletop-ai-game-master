/**
 * Prima parte dell'arbitro: regole istantanee, senza modello. Riconoscono le dipendenze
 * esplicite («anch'io», «lo seguo», «insieme a Ginestra», «aiuto Corrado», «copro Teodora»; in inglese
 * «me too», «I follow Corrado»…) quando c'è una sola azione candidata (quella del PG nominato, o l'unica
 * pubblica in coda). Tutto il resto (conflitti, casi ambigui, nomi citati senza legame) va al modello.
 *
 * Le formule sono della lingua dei contenuti: lingue/<codice>/motore.yaml, sezione `collegamenti`.
 */
import { campoOggetti, campoRegex, campoTesto, regole, type Sezione } from '../lingua/motore';
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

interface RegoleCollegamenti {
  /** Formule che, da sole, si riferiscono all'azione di qualcun altro: [id della formula, espressione]. */
  formuleSenzaNome: Array<[string, RegExp]>;
  /** Verbi che legano a un PG nominato: «seguo X», «insieme a X», «aiuto X», «copro X»… (un gruppo). */
  legameConNome: string;
  /** Fra il verbo di legame e il nome («(a |ad )?» in italiano). */
  primaDelNome: string;
}

function compila(s: Sezione): RegoleCollegamenti {
  return {
    formuleSenzaNome: campoOggetti(s, 'formule_senza_nome').flatMap((f): Array<[string, RegExp]> => {
      const re = campoRegex(f, 'regex');
      return re ? [[campoTesto(f, 'nome'), re]] : [];
    }),
    legameConNome: campoTesto(s, 'legame_con_nome'),
    primaDelNome: campoTesto(s, 'prima_del_nome'),
  };
}

const collegamenti = (): RegoleCollegamenti => regole('collegamenti', compila);

export function relazioniDaRegole(nuova: AzioneArbitro, coda: readonly AzioneArbitro[], nomi: ReadonlyMap<string, string>): EsitoRegole {
  const t = normalizza(nuova.testo);
  // Candidati: azioni PUBBLICHE degli altri (da un'azione privata altrui non si può dipendere).
  const candidati = coda.filter((a) => a.autore !== nuova.autore && !a.privata);
  const perAutore = new Map(candidati.map((a) => [a.autore, a]));
  const r = collegamenti();

  // 1. Verbo di legame + nome di un PG: dipendenza dall'azione di quel PG, se ce l'ha.
  for (const [alias, idPg] of nomi) {
    if (idPg === nuova.autore) continue;
    const re = new RegExp(`\\b${r.legameConNome} ${r.primaDelNome}${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    if (re.test(t)) {
      const bersaglio = perAutore.get(idPg);
      return bersaglio ? { dipende_da: [bersaglio.id], certo: true, formula: 'legame_con_nome' } : { dipende_da: [], certo: false, formula: 'legame_con_nome' };
    }
  }
  // 2. Formula senza nome: certa solo con un'unica azione candidata, e solo se apre l'azione o
  //    l'azione è brevissima («anch'io», «anche io vado»): in mezzo a una frase è spesso un
  //    paragone («ho fame anche io, ma vado nel retro») e lo decide il modello.
  for (const [nome, re] of r.formuleSenzaNome) {
    const m = re.exec(t);
    if (m) {
      const inApertura = m.index <= 2 || t.split(' ').length <= 5;
      if (!inApertura) return { dipende_da: [], certo: false, formula: nome };
      // «anch'io … come Corrado»: un nome citato restringe i candidati.
      const nominati = [...nomi].filter(([alias, id]) => id !== nuova.autore && new RegExp(`\\b${alias}\\b`).test(t)).map(([, id]) => id);
      const scelti = nominati.length ? candidati.filter((a) => nominati.includes(a.autore)) : candidati;
      if (scelti.length === 1) return { dipende_da: [scelti[0]!.id], certo: true, formula: nome };
      return { dipende_da: [], certo: false, formula: nome };
    }
  }
  return { dipende_da: [], certo: false, formula: null };
}
