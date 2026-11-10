/**
 * Schede numeriche di PG e PNG (docs/prove.md, «Schede»): caratteristiche, competenze, tiri
 * salvezza, CA, punti ferita, attacchi. Il caricatore legge i PUNTEGGI e le competenze; tutti i
 * modificatori (di caratteristica, di abilità, di attacco, di danno, i passivi) li calcola il codice,
 * mai il file né il modello.
 *
 * Dove stanno (additivo: una campagna senza schede funziona come prima):
 *   pg.yaml → personaggi[].scheda      (il livello è quello del PG: personaggi[].livello)
 *   png/<id>.yaml → scheda             (livello o grado di sfida dentro la scheda)
 *
 * Una scheda incompleta non ferma la sessione: i campi sbagliati diventano avvisi e valori di
 * riserva (punteggio 10, CA 10 + Destrezza), e il Motore lo scrive nel log.
 */
import {
  ABILITA_INFLUENZA,
  CARATTERISTICA_DI,
  CARATTERISTICHE,
  NOME_ABILITA,
  NOME_CARATTERISTICA,
  bonusCompetenza,
  chiave,
  classeArmatura,
  comeAbilita,
  comeArmatura,
  comeCaratteristica,
  comeGradoSfida,
  leggiFormula,
  modificatore,
  type Abilita,
  type Caratteristica,
  type FormulaDadi,
} from './regole-srd';
import { testo } from '../lingua';
import type { Campagna, DatiYaml } from './tipi';

export interface AttaccoScheda {
  /** Id in snake_case dal nome («balestra_leggera»): lo usa l'arbitro per scegliere l'arma. */
  id: string;
  nome: string;
  caratteristica: Caratteristica;
  /** Competenza nell'arma: aggiunge il bonus di competenza al tiro per colpire. */
  competente: boolean;
  /** Dadi del danno, senza il modificatore (lo aggiunge il codice). */
  danno: FormulaDadi;
  tipo_danno: string | null;
  /** Arma a distanza (in mischia ha svantaggio, SRD 5.2) o da mischia. */
  distanza: boolean;
  /** Bonus magico (+1, +2…) al tiro e al danno. */
  bonus: number;
}

export interface SchedaNumerica {
  /** id_pg o id_png. */
  id: string;
  nome: string;
  di_png: boolean;
  /** Livello del PG, o grado di sfida del PNG (decide il bonus di competenza). */
  livello: number;
  punteggi: Record<Caratteristica, number>;
  competenze: Abilita[];
  /** Maestria: competenza raddoppiata in queste abilità. */
  maestrie: Abilita[];
  tiri_salvezza: Caratteristica[];
  ca: number;
  /**
   * Come è stata ricavata la CA, per il pannello e i log («Cotta di maglia + scudo»): si compone quando
   * la si legge, nella lingua dei contenuti (le schede si caricano prima che il server la imposti).
   */
  readonly ca_da: string;
  pf_massimi: number;
  attacchi: AttaccoScheda[];
  /** PNG: CD dell'azione Influenzare (SRD 5.2: 15 o il punteggio di Intelligenza, il più alto) se la scheda la fissa. */
  cd_influenza: number | null;
  /** Avvisi del caricamento (campi mancanti o sbagliati). */
  avvisi: string[];
}

// ------------------------------------------------------------------ calcoli (mai scritti a mano)

export function bonusCompetenzaDi(s: SchedaNumerica): number {
  return bonusCompetenza(s.livello);
}

export function modCaratteristica(s: SchedaNumerica, c: Caratteristica): number {
  return modificatore(s.punteggi[c]);
}

/** Modificatore di una prova con abilità: caratteristica + competenza (doppia con maestria). */
export function modAbilita(s: SchedaNumerica, a: Abilita): number {
  const pb = bonusCompetenzaDi(s);
  const comp = s.maestrie.includes(a) ? 2 * pb : s.competenze.includes(a) ? pb : 0;
  return modCaratteristica(s, CARATTERISTICA_DI[a]) + comp;
}

/** Modificatore di un tiro salvezza: caratteristica + competenza se la scheda ce l'ha. */
export function modSalvezza(s: SchedaNumerica, c: Caratteristica): number {
  return modCaratteristica(s, c) + (s.tiri_salvezza.includes(c) ? bonusCompetenzaDi(s) : 0);
}

/** Punteggio passivo (SRD 5.2): 10 + il modificatore della prova. */
export function passiva(s: SchedaNumerica, a: Abilita): number {
  return 10 + modAbilita(s, a);
}

export function bonusAttacco(s: SchedaNumerica, a: AttaccoScheda): number {
  return modCaratteristica(s, a.caratteristica) + (a.competente ? bonusCompetenzaDi(s) : 0) + a.bonus;
}

export function bonusDanno(s: SchedaNumerica, a: AttaccoScheda): number {
  return modCaratteristica(s, a.caratteristica) + a.bonus;
}

/** CD per influenzare un PNG (SRD 5.2): quella della scheda, oppure 15 o l'Intelligenza se più alta. */
export function cdInfluenza(s: SchedaNumerica | null): number {
  if (!s) return 15;
  return s.cd_influenza ?? Math.max(15, s.punteggi.intelligenza);
}

export { ABILITA_INFLUENZA, NOME_ABILITA, NOME_CARATTERISTICA };

// ------------------------------------------------------------------ caricamento

function oggetto(v: unknown): DatiYaml | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as DatiYaml) : null;
}

function interoPositivo(v: unknown): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : null;
}

function listaDi<T>(v: unknown, converti: (x: unknown) => T | null, dove: string, avvisi: string[]): T[] {
  if (v === undefined || v === null) return [];
  const elenco = Array.isArray(v) ? v : [v];
  const out: T[] = [];
  for (const x of elenco) {
    const c = converti(x);
    if (c === null) avvisi.push(`${dove}: «${String(x)}» non riconosciuto`);
    else if (!out.includes(c)) out.push(c);
  }
  return out;
}

function leggiPunteggi(v: unknown, dove: string, avvisi: string[]): Record<Caratteristica, number> {
  const out = Object.fromEntries(CARATTERISTICHE.map((c) => [c, 10])) as Record<Caratteristica, number>;
  const o = oggetto(v);
  if (!o) {
    avvisi.push(`${dove}: mancano le caratteristiche (tutte a 10)`);
    return out;
  }
  const viste = new Set<Caratteristica>();
  for (const [k, val] of Object.entries(o)) {
    const c = comeCaratteristica(k);
    if (!c) {
      avvisi.push(`${dove}: caratteristica sconosciuta «${k}»`);
      continue;
    }
    if (typeof val !== 'number' || !Number.isInteger(val) || val < 1 || val > 30) {
      avvisi.push(`${dove}.${k}: punteggio da 1 a 30, trovato «${String(val)}» (resta 10)`);
      continue;
    }
    out[c] = val;
    viste.add(c);
  }
  for (const c of CARATTERISTICHE) if (!viste.has(c)) avvisi.push(`${dove}: manca ${c} (vale 10)`);
  return out;
}

function leggiAttacco(v: unknown, dove: string, avvisi: string[]): AttaccoScheda | null {
  const o = oggetto(v);
  const nome = typeof o?.['nome'] === 'string' ? o['nome'].trim() : '';
  if (!o || !nome) {
    avvisi.push(`${dove}: attacco senza nome, ignorato`);
    return null;
  }
  const distanza = o['distanza'] === true || o['gittata'] === 'distanza';
  const car = comeCaratteristica(o['caratteristica']) ?? (distanza ? 'destrezza' : 'forza');
  if (o['caratteristica'] !== undefined && !comeCaratteristica(o['caratteristica'])) avvisi.push(`${dove}: caratteristica «${String(o['caratteristica'])}» non riconosciuta (uso ${car})`);
  const danno = leggiFormula(o['danno']);
  if (!danno) avvisi.push(`${dove}: danno «${String(o['danno'])}» non è una formula come 1d8 (uso 1d4)`);
  const bonus = typeof o['bonus'] === 'number' && Number.isInteger(o['bonus']) ? o['bonus'] : 0;
  return {
    id: chiave(nome),
    nome,
    caratteristica: car,
    competente: o['competente'] !== false,
    danno: danno ?? { numero: 1, facce: 4, bonus: 0 },
    tipo_danno: typeof o['tipo_danno'] === 'string' ? o['tipo_danno'] : null,
    distanza,
    bonus,
  };
}

/**
 * Una scheda numerica da `scheda:` (PG o PNG). `livelloPg` è il livello del PG (personaggi[].livello);
 * per un PNG valgono `scheda.gs` (grado di sfida) o `scheda.livello`.
 */
export function leggiScheda(id: string, nome: string, di_png: boolean, grezza: unknown, livelloPg: unknown): SchedaNumerica | null {
  const s = oggetto(grezza);
  if (!s) return null;
  const avvisi: string[] = [];
  const dove = `${id}.scheda`;
  const punteggi = leggiPunteggi(s['caratteristiche'], `${dove}.caratteristiche`, avvisi);
  const livello = di_png
    ? (comeGradoSfida(s['gs']) ?? comeGradoSfida(s['grado_sfida']) ?? interoPositivo(s['livello']) ?? 1)
    : (interoPositivo(livelloPg) ?? interoPositivo(s['livello']) ?? 1);
  const competenze = listaDi(s['competenze'], comeAbilita, `${dove}.competenze`, avvisi);
  const maestrie = listaDi(s['maestrie'], comeAbilita, `${dove}.maestrie`, avvisi);
  const tiri_salvezza = listaDi(s['tiri_salvezza'], comeCaratteristica, `${dove}.tiri_salvezza`, avvisi);
  // CA: dall'armatura (calcolata) oppure scritta; senza nessuna delle due, 10 + Destrezza.
  const modDes = modificatore(punteggi.destrezza);
  const arm = oggetto(s['armatura']);
  const tipoArmatura = arm ? arm['tipo'] : s['armatura'];
  const armatura = tipoArmatura !== undefined && tipoArmatura !== null && tipoArmatura !== 'nessuna' ? comeArmatura(tipoArmatura) : null;
  if (tipoArmatura !== undefined && tipoArmatura !== null && tipoArmatura !== 'nessuna' && !armatura) avvisi.push(`${dove}.armatura: «${String(tipoArmatura)}» non è un'armatura dell'SRD`);
  const scudo = arm?.['scudo'] === true || s['scudo'] === true;
  const caScritta = interoPositivo(s['ca']);
  let ca: number;
  // La descrizione della CA (ca_da) si compone a ogni lettura: il nome dell'armatura e le parole
  // «senza armatura», «+ scudo» sono della lingua dei contenuti, che al caricamento può non essere
  // ancora quella giusta.
  let descriviCa: () => string;
  if (armatura || scudo || caScritta === null) {
    ca = classeArmatura(modDes, armatura, scudo);
    descriviCa = () => {
      const base = armatura ? armatura.nome : testo('schede.senza_armatura');
      return scudo ? testo('schede.con_scudo', { armatura: base }) : base;
    };
    if (caScritta !== null && caScritta !== ca) avvisi.push(`${dove}: ca ${caScritta} diversa da quella calcolata dall'armatura (${ca}): vale la calcolata`);
  } else {
    ca = caScritta;
    descriviCa = () => testo('schede.ca_scritta');
  }
  const pf = interoPositivo(s['pf']) ?? interoPositivo(s['pf_massimi']);
  if (pf === null) avvisi.push(`${dove}: mancano i punti ferita (pf), uso 1`);
  const attacchi = (Array.isArray(s['attacchi']) ? s['attacchi'] : []).map((a, i) => leggiAttacco(a, `${dove}.attacchi[${i + 1}]`, avvisi)).filter((a): a is AttaccoScheda => a !== null);
  const influenza = oggetto(s['influenza']);
  const cd_influenza = interoPositivo(influenza?.['cd']) ?? interoPositivo(s['cd_influenza']);
  return {
    id,
    nome,
    di_png,
    livello,
    punteggi,
    competenze,
    maestrie,
    tiri_salvezza,
    ca,
    get ca_da(): string {
      return descriviCa();
    },
    pf_massimi: pf ?? 1,
    attacchi,
    cd_influenza,
    avvisi,
  };
}

/** Le schede della campagna (PG e PNG che ne hanno una), id → scheda. Gli avvisi vanno a `avvisa`. */
export function caricaSchede(c: Pick<Campagna, 'pg' | 'png'>, avvisa: (msg: string) => void = () => {}): Map<string, SchedaNumerica> {
  const out = new Map<string, SchedaNumerica>();
  for (const p of c.pg) {
    const s = leggiScheda(p.id, p.nome, false, p.pubblico['scheda'], p.pubblico['livello']);
    if (s) out.set(p.id, s);
  }
  for (const p of c.png) {
    const s = leggiScheda(p.id, p.nome, true, p.dati['scheda'], null);
    if (s) out.set(p.id, s);
  }
  for (const s of out.values()) for (const a of s.avvisi) avvisa(`scheda ${a}`);
  return out;
}

/** Riga leggibile delle competenze («Persuasione +5, Intuizione +3»), per l'arbitro e il pannello. */
export function riassuntoScheda(s: SchedaNumerica): string {
  const abil = s.competenze.map((a) => `${NOME_ABILITA[a]} ${modAbilita(s, a) >= 0 ? '+' : ''}${modAbilita(s, a)}`).join(', ');
  const att = s.attacchi.map((a) => `${a.nome}${a.distanza ? ' (a distanza)' : ''}`).join(', ');
  return [`CA ${s.ca}`, `PF ${s.pf_massimi}`, abil ? `competenze: ${abil}` : '', att ? `attacchi: ${att}` : ''].filter(Boolean).join(' · ');
}

/** Caratteristica come la mostra la carta. */
export function nomeCaratteristica(c: Caratteristica): string {
  return NOME_CARATTERISTICA[c];
}

export { ABILITA, CARATTERISTICHE, comeAbilita, comeCaratteristica } from './regole-srd';
export type { Abilita, Caratteristica } from './regole-srd';
