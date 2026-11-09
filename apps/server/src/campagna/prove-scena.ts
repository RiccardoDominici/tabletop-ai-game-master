/**
 * Prove scritte nei dati della scena (docs/prove.md, «Prove della scena»): la CD che il Preparatore
 * ha deciso per un ostacolo, un indizio non essenziale o una soluzione di un collo di bottiglia.
 * Quando un'azione corrisponde a una di queste, la CD viene da qui, non dalla scala generica.
 *
 *   scena.yaml / scene/*.yaml →
 *     prove:
 *       - id: p_serratura
 *         quando: "un PG forza la serratura del ripostiglio"   # pubblico, ≤ 15 parole: lo vede l'arbitro
 *         abilita: rapidita_di_mano      # oppure caratteristica: forza, oppure salvezza: destrezza
 *         cd: 15
 *         indizio: i_x                   # facoltativo: l'indizio (NON essenziale) che la riuscita dà
 *         se_fallisce: "scatta forte, Baldrin sente"   # facoltativo: il prezzo, per il narratore
 *
 * Un indizio essenziale non sta mai dietro un tiro (F3): una prova che lo cita è un avviso, e il
 * narratore lo dà comunque, con un prezzo, anche se il tiro fallisce.
 */
import { indiziCampagna } from './indizi';
import { comeAbilita, comeCaratteristica, type Abilita, type Caratteristica } from './regole-srd';
import type { Campagna, DatiYaml, ScenaCaricata } from './tipi';

export interface ProvaScena {
  id: string;
  /** Scena che la definisce. */
  scena: string;
  /** Situazione in cui vale, senza segreti (la vede l'arbitro). */
  quando: string;
  /** Abilità della prova (con la sua caratteristica), oppure solo la caratteristica. */
  abilita: Abilita | null;
  caratteristica: Caratteristica | null;
  /** Tiro salvezza invece di una prova. */
  salvezza: boolean;
  cd: number;
  indizio: string | null;
  /** L'indizio è essenziale: il fallimento non lo nega (lo dà con un prezzo). */
  essenziale: boolean;
  se_fallisce: string | null;
}

function leggiProva(d: DatiYaml, scena: string, essenziali: Set<string>, avvisa: (m: string) => void): ProvaScena | null {
  const id = typeof d['id'] === 'string' ? d['id'] : null;
  const dove = `${scena}: prove[${id ?? '?'}]`;
  if (!id) {
    avvisa(`${dove}: prova senza id, ignorata`);
    return null;
  }
  const quando = typeof d['quando'] === 'string' ? d['quando'].trim() : '';
  if (!quando) avvisa(`${dove}: manca «quando» (l'arbitro non saprebbe quando usarla)`);
  const cd = typeof d['cd'] === 'number' && Number.isInteger(d['cd']) ? d['cd'] : null;
  if (cd === null || cd < 1 || cd > 40) {
    avvisa(`${dove}: cd da 1 a 40, trovato «${String(d['cd'])}»: prova ignorata`);
    return null;
  }
  const salv = d['salvezza'] !== undefined ? comeCaratteristica(d['salvezza']) : null;
  const abilita = comeAbilita(d['abilita']);
  const caratteristica = salv ?? comeCaratteristica(d['caratteristica']);
  if (!abilita && !caratteristica) {
    avvisa(`${dove}: serve abilita, caratteristica o salvezza riconosciute: prova ignorata`);
    return null;
  }
  const indizio = typeof d['indizio'] === 'string' ? d['indizio'] : null;
  const essenziale = indizio !== null && essenziali.has(indizio);
  if (essenziale) avvisa(`${dove}: l'indizio ${indizio} è essenziale e non sta dietro un tiro (F3): se fallisce arriva comunque, con un prezzo`);
  return {
    id,
    scena,
    quando,
    abilita,
    caratteristica: abilita && !salv ? null : caratteristica,
    salvezza: salv !== null,
    cd,
    indizio,
    essenziale,
    se_fallisce: typeof d['se_fallisce'] === 'string' ? d['se_fallisce'] : null,
  };
}

/** Le prove di una scena (vuoto se non ne ha). */
export function proveDellaScena(c: Campagna, s: ScenaCaricata, avvisa: (m: string) => void = () => {}): ProvaScena[] {
  const grezze = s.dati['prove'];
  if (!Array.isArray(grezze)) return [];
  const essenziali = new Set<string>();
  for (const s2 of c.scene) {
    for (const i of (s2.dati['indizi'] as DatiYaml[] | undefined) ?? []) if (i?.['essenziale'] === true && typeof i['id'] === 'string') essenziali.add(i['id']);
  }
  const noti = indiziCampagna(c);
  const out: ProvaScena[] = [];
  for (const g of grezze) {
    if (g === null || typeof g !== 'object') continue;
    const p = leggiProva(g as DatiYaml, s.id, essenziali, avvisa);
    if (!p) continue;
    if (p.indizio && !noti.has(p.indizio)) avvisa(`${s.id}: prove[${p.id}] cita un indizio inesistente «${p.indizio}»`);
    if (out.some((x) => x.id === p.id)) avvisa(`${s.id}: prove[${p.id}] ripetuta, vale la prima`);
    else out.push(p);
  }
  return out;
}
