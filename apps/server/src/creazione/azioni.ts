/**
 * What a phone may do to its draft (docs/creazione.md): each action is checked against the set's rules and the step
 * order, and refused with a reason the phone shows (an illegal race, dice off their faces, a coin short). Deterministic:
 * the dice are the player's (manual rolls) or the draft's own Engine dice (automatic), never the session's.
 */
import type { AzioneCreazione, PassoCreazione } from '@tabletop-ai-gm/shared';
import { testo } from '../lingua';
import type { FonteDadi } from '../prove/dadi';
import { costoPunti, intervalloDelMetodo, punteggioDaDadi } from '../regole/creazione';
import { rigioca, restrizioniDi, voceDi } from './acquisti';
import {
  PASSI_DI_DADI,
  classeDi,
  dipendenti,
  fatto,
  incantesimiDellaClasse,
  lingueExtra,
  metodo,
  motivoClasse,
  motivoRazza,
  passoCorrente,
  pfPerLivello,
  razzaDi,
  senzaSperanza,
  slotIniziali,
  statoPasso,
  type Bozza,
  type CtxCreazione,
} from './bozza';
import { prossimoTiro } from './tiri';

export type EsitoAzione = { ok: true } | { ok: false; errore: string };

const no = (chiave: string, valori: Record<string, string | number> = {}): EsitoAzione => ({ ok: false, errore: testo(`creazione.rifiuti.${chiave}`, valori) });
const si: EsitoAzione = { ok: true };

/** The rules of who starts a caster's book: the campaign's choice, else the set's. */
export function comeIncantesimi(ctx: CtxCreazione, b: Bozza): 'scelta' | 'master' | 'tiro' | null {
  const e = ctx.cr.incantesimi.find((x) => x.classe === b.classe);
  return e ? (ctx.opz.incantesimi ?? e.come) : null;
}

/** Applies one action of the phone; the draft changes only when the action is legal. */
export function applica(ctx: CtxCreazione, b: Bozza, a: AzioneCreazione, dadi: () => FonteDadi): EsitoAzione {
  if (b.stato === 'approvata') return no('approvata');
  const corrente = passoCorrente(ctx, b);
  const sulPasso = (p: PassoCreazione): EsitoAzione | null => (corrente === p ? null : no('non_ora', { passo: testo(`creazione.passi.${p}`), corrente: corrente ? testo(`creazione.passi.${corrente}`) : '—' }));
  let e: EsitoAzione;
  switch (a.tipo) {
    case 'inizia':
      e = si;
      break;
    case 'tira':
      e = tira(ctx, b, a.valori, dadi);
      break;
    case 'assegna':
      e = sulPasso('caratteristiche') ?? assegna(ctx, b, a.valori);
      break;
    case 'punti':
      e = sulPasso('caratteristiche') ?? puntiAcquistati(ctx, b, a.valori);
      break;
    case 'opzione':
      e = sulPasso('caratteristiche') ?? opzione(ctx, b, a.opzione, a.da, a.a);
      break;
    case 'rimedio':
      e = sulPasso('caratteristiche') ?? rimedio(ctx, b, a.rimedio);
      break;
    case 'scegli':
      e = sulPasso(a.passo) ?? scegli(ctx, b, a.passo, a.id);
      break;
    case 'compra':
    case 'vendi':
      e = sulPasso('acquisti') ?? compra(ctx, b, a.id, a.tipo === 'compra' ? a.quante : -a.quante);
      break;
    case 'incantesimi':
      e = sulPasso('incantesimi') ?? incantesimi(ctx, b, a.libro, a.preparati);
      break;
    case 'lingue':
      e = sulPasso('lingue') ?? lingue(ctx, b, a.lingue);
      break;
    case 'descrizione':
      e = sulPasso('descrizione') ?? descrizione(b, a);
      break;
    case 'conferma':
      e = sulPasso(a.passo) ?? conferma(ctx, b, a.passo);
      break;
    case 'indietro':
      e = indietro(ctx, b, a.passo);
      break;
    default:
      e = no('azione_sconosciuta');
  }
  if (e.ok) {
    avanza(ctx, b);
    if (passoCorrente(ctx, b) === 'incantesimi' && comeIncantesimi(ctx, b) === 'tiro' && !b.libro.length) tiraIncantesimi(ctx, b, dadi);
  }
  return e;
}

/**
 * The Game Master's roll for a caster's starting spells (`come: tiro`, Basic Fantasy p. 8: «the GM may roll for the
 * spell»): the Engine draws them among the class's spells of the allowed level, with the draft's own dice. The player
 * then prepares today's from the book.
 */
export function tiraIncantesimi(ctx: CtxCreazione, b: Bozza, dadi: () => FonteDadi): void {
  const e = ctx.cr.incantesimi.find((x) => x.classe === b.classe);
  if (!e) return;
  const scelte = incantesimiDellaClasse(ctx, e.classe).filter((x) => x.livello <= e.livello && !e.fissi.includes(x.id));
  const d = dadi();
  const presi: string[] = [];
  while (presi.length < Math.min(e.aScelta, scelte.length)) {
    const resto = scelte.filter((x) => !presi.includes(x.id));
    presi.push(resto[d.tira(Math.max(2, resto.length)) - 1]?.id ?? resto[0]!.id);
  }
  b.contatore = d.contatore;
  b.libro = [...e.fissi, ...presi];
  b.tiri.push({ passo: 'incantesimi', per: testo('creazione.tiri.incantesimi'), dadi: [], manuale: false });
}

/** The next roll of the draft: the player's dice (manual) or the draft's own Engine dice. */
function tira(ctx: CtxCreazione, b: Bozza, valori: number[] | null, dadi: () => FonteDadi): EsitoAzione {
  const t = prossimoTiro(ctx, b);
  if (!t) return no('niente_da_tirare');
  let tirati: number[];
  if (ctx.manuale) {
    if (!Array.isArray(valori)) return no('servono_i_dadi', { numero: t.numero, facce: t.facce });
    if (valori.length !== t.numero || !valori.every((v) => Number.isInteger(v) && v >= 1 && v <= t.facce)) return no('dadi_sbagliati', { numero: t.numero, facce: t.facce });
    tirati = [...valori];
  } else {
    if (valori !== null) return no('tira_il_motore');
    const d = dadi();
    tirati = Array.from({ length: t.numero }, () => d.tira(t.facce));
    b.contatore = d.contatore;
  }
  b.tiri.push({ passo: t.passo, per: t.per, dadi: tirati, manuale: ctx.manuale });
  if (t.passo === 'caratteristiche') {
    const m = metodo(ctx);
    if (m.tipo !== 'dadi') return no('niente_da_tirare');
    b.tiriCaratteristiche.push({ caratteristica: t.caratteristica, dadi: tirati, punteggio: punteggioDaDadi(m, tirati) });
    // In order: the last die sets the scores; to assign: the player places them next.
    if (m.ordine === 'fisso' && b.tiriCaratteristiche.length === ctx.s.caratteristiche.length) {
      b.base = Object.fromEntries(b.tiriCaratteristiche.map((x) => [x.caratteristica!, x.punteggio]));
      b.baseGrezza = { ...b.base };
    }
  } else if (t.passo === 'punti_ferita') {
    b.dadiPf[t.indice] = tirati;
  } else if (t.passo === 'monete') {
    b.dadiMonete = tirati;
  }
  return si;
}

/** The values still to place: the dice rolled to assign, or a fixed array (null when there is nothing to place). */
export function daAssegnare(ctx: CtxCreazione, b: Bozza): number[] | null {
  const m = metodo(ctx);
  if (b.base) return null;
  if (m.tipo === 'schiera') return [...m.valori];
  if (m.tipo === 'dadi' && m.ordine === 'libero' && b.tiriCaratteristiche.length === ctx.s.caratteristiche.length) return b.tiriCaratteristiche.map((x) => x.punteggio);
  return null;
}

const ordinati = (v: readonly number[]): string => [...v].sort((x, y) => x - y).join(',');

/** Places values on the characteristics: the rolled or fixed ones, or (the full shuffle) the current scores. */
function assegna(ctx: CtxCreazione, b: Bozza, valori: Record<string, number>): EsitoAzione {
  const ids = ctx.s.caratteristiche.map((c) => c.id);
  if (!valori || typeof valori !== 'object' || ids.some((k) => !Number.isInteger(valori[k])) || Object.keys(valori).some((k) => !ids.includes(k))) return no('assegna_tutte');
  const nuovi = ids.map((k) => valori[k]!);
  const libere = daAssegnare(ctx, b);
  if (libere) {
    if (ordinati(libere) !== ordinati(nuovi)) return no('assegna_valori', { valori: libere.join(', ') });
    b.base = Object.fromEntries(ids.map((k) => [k, valori[k]!]));
    b.baseGrezza = { ...b.base };
    return si;
  }
  // The full shuffle, a Game Master's option: the same scores, placed anew.
  const riordino = ctx.cr.opzioni.find((o) => o.tipo === 'riordino' && ctx.opz.opzioni.includes(o.id));
  if (!b.base || !riordino) return no('opzione_non_ammessa');
  if (ordinati(Object.values(b.base)) !== ordinati(nuovi)) return no('assegna_valori', { valori: Object.values(b.base).join(', ') });
  b.base = Object.fromEntries(ids.map((k) => [k, valori[k]!]));
  b.opzioniUsate[riordino.id] = (b.opzioniUsate[riordino.id] ?? 0) + 1;
  return si;
}

/** A point buy (the SRD's 27 points): every score priced, the total within the points. */
function puntiAcquistati(ctx: CtxCreazione, b: Bozza, valori: Record<string, number>): EsitoAzione {
  const m = metodo(ctx);
  if (m.tipo !== 'punti') return no('metodo_diverso');
  const ids = ctx.s.caratteristiche.map((c) => c.id);
  if (!valori || ids.some((k) => !Number.isInteger(valori[k]))) return no('assegna_tutte');
  const costo = costoPunti(m, ids.map((k) => valori[k]!));
  if (costo === null) return no('punti_fuori', { min: m.costi[0]!.valore, max: m.costi.at(-1)!.valore });
  if (costo > m.punti) return no('punti_troppi', { costo, punti: m.punti });
  b.base = Object.fromEntries(ids.map((k) => [k, valori[k]!]));
  b.baseGrezza = { ...b.base };
  return si;
}

/** The Game Master's options the campaign allows (Basic Fantasy p. 186): point swapping, swapping two scores. */
function opzione(ctx: CtxCreazione, b: Bozza, id: string, da: string, a: string): EsitoAzione {
  const o = ctx.cr.opzioni.find((x) => x.id === id);
  if (!o || !ctx.opz.opzioni.includes(id)) return no('opzione_non_ammessa');
  if (!b.base) return no('prima_i_punteggi');
  if (!(da in b.base) || !(a in b.base) || da === a) return no('opzione_caratteristiche');
  const massimo = ctx.cr.massimo ?? intervalloDelMetodo(metodo(ctx)).max;
  if (o.tipo === 'punti') {
    if (b.base[da]! - o.togli < o.minimo) return no('opzione_minimo', { caratteristica: nome(ctx, da), minimo: o.minimo });
    if (b.base[a]! + o.aggiungi > massimo) return no('opzione_massimo', { caratteristica: nome(ctx, a), massimo });
    b.base[da]! -= o.togli;
    b.base[a]! += o.aggiungi;
  } else if (o.tipo === 'scambio') {
    if ((b.opzioniUsate[id] ?? 0) >= o.volte) return no('opzione_esaurita', { volte: o.volte });
    [b.base[da], b.base[a]] = [b.base[a]!, b.base[da]!];
  } else return no('opzione_con_assegna');
  b.opzioniUsate[id] = (b.opzioniUsate[id] ?? 0) + 1;
  return si;
}

/** No class is open: roll again, or flip every score (ribalta − score; «all of them, not just the bad ones», p. 187). */
function rimedio(ctx: CtxCreazione, b: Bozza, r: 'ritira' | 'ribalta'): EsitoAzione {
  const ammessi = rimediAmmessi(ctx);
  if (!senzaSperanza(ctx, b)) return no('non_senza_speranza');
  if (!ammessi.includes(r)) return no('rimedio_non_ammesso');
  if (r === 'ritira') {
    b.tiriCaratteristiche = [];
    b.base = null;
    b.baseGrezza = null;
    b.opzioniUsate = {};
  } else {
    const n = ctx.cr.senzaSperanza!.ribalta;
    b.base = Object.fromEntries(Object.entries(b.base!).map(([k, v]) => [k, n - v]));
    b.baseGrezza = { ...b.base };
  }
  return si;
}

/** The remedies the campaign allows a hopeless character (its list, else the set's). */
export function rimediAmmessi(ctx: CtxCreazione): Array<'ritira' | 'ribalta'> {
  const delSet = ctx.cr.senzaSperanza?.rimedi ?? [];
  return ctx.opz.rimedi ? delSet.filter((r) => ctx.opz.rimedi!.includes(r)) : delSet;
}

/** A race or a class: refused, with its reason, when the scores or the race close it. */
function scegli(ctx: CtxCreazione, b: Bozza, passo: 'razza' | 'classe', id: string): EsitoAzione {
  if (passo === 'razza') {
    const r = razzaDi(ctx, id);
    if (!r) return no('razza_sconosciuta');
    const m = motivoRazza(ctx, b, r);
    if (m) return no('razza_requisito', { razza: r.nome, ...m });
    b.razza = id;
  } else {
    const c = classeDi(ctx, id);
    if (!c) return no('classe_sconosciuta');
    const m = motivoClasse(ctx, b, c);
    if (m?.tipo === 'razza') return no('classe_razza', { classe: c.nome, razza: m.razza });
    if (m) return no('classe_requisito', { classe: c.nome, caratteristica: m.caratteristica, valore: m.valore, limite: m.limite });
    b.classe = id;
  }
  b.passi[passo] = 'fatto';
  return si;
}

/** Buys (n > 0) or gives back (n < 0) catalog items: forbidden ones refused, the coins must suffice. */
function compra(ctx: CtxCreazione, b: Bozza, id: string, n: number): EsitoAzione {
  const v = voceDi(ctx, id);
  if (!v) return no('oggetto_sconosciuto');
  if (!Number.isInteger(n) || n === 0 || Math.abs(n) > 100) return no('quante');
  if (n > 0) {
    const r = restrizioniDi(ctx, b, v);
    if (r.vietato) return no('oggetto_vietato', { oggetto: v.nome, motivo: r.vietato });
    if (v.costo === null) return no('senza_prezzo', { oggetto: v.nome });
    const prova = [...b.acquisti, { id, quante: n }];
    if (rigioca(ctx, b, prova).nonPagato !== null) return no('monete_non_bastano', { oggetto: v.nome });
    b.acquisti = prova;
    return si;
  }
  // Giving back: the last purchases of that item first; the replay returns exactly what they cost.
  let resto = -n;
  const ha = b.acquisti.filter((x) => x.id === id).reduce((s, x) => s + x.quante, 0);
  if (ha < resto) return no('non_ce_l_hai', { oggetto: v.nome });
  const lista = [...b.acquisti];
  for (let i = lista.length - 1; i >= 0 && resto > 0; i--) {
    if (lista[i]!.id !== id) continue;
    const togli = Math.min(resto, lista[i]!.quante);
    lista[i] = { id, quante: lista[i]!.quante - togli };
    resto -= togli;
  }
  b.acquisti = lista.filter((x) => x.quante > 0);
  return si;
}

/** The starting book and today's prepared spells, by the set's rules for the class. */
function incantesimi(ctx: CtxCreazione, b: Bozza, libro: string[], preparati: string[]): EsitoAzione {
  if (!Array.isArray(libro) || !Array.isArray(preparati)) return no('incantesimi_forma');
  const classe = b.classe!;
  const della = new Map(incantesimiDellaClasse(ctx, classe).map((x) => [x.id, x]));
  const e = ctx.cr.incantesimi.find((x) => x.classe === classe);
  const come = comeIncantesimi(ctx, b);
  if (e) {
    // The book: the fixed spells and exactly `a_scelta` more, of the class's list and at most the entry's level.
    if (come !== 'scelta' && [...libro].sort().join() !== [...b.libro].sort().join()) return no('libro_del_master');
    for (const f of e.fissi) if (!libro.includes(f)) return no('libro_fissi', { incantesimo: della.get(f)?.nome ?? f });
    const altri = [...new Set(libro.filter((x) => !e.fissi.includes(x)))];
    for (const x of altri) {
      const s = della.get(x);
      if (!s) return no('incantesimo_non_della_classe', { incantesimo: x });
      if (s.livello > e.livello) return no('incantesimo_livello', { incantesimo: s.nome, livello: s.livello, massimo: e.livello });
    }
    if (altri.length !== e.aScelta) return no('libro_quanti', { quanti: e.aScelta });
  } else if (libro.length) return no('senza_libro');
  // Today's spells (vanciana): from the book (or the class's list without one), no more than the slots of each level.
  const slot = slotIniziali(ctx, b);
  const fonte = e ? new Set(libro) : new Set(della.keys());
  const perLivello = new Map<number, number>();
  for (const x of preparati) {
    if (!fonte.has(x)) return no('preparato_fuori', { incantesimo: della.get(x)?.nome ?? x });
    const lv = della.get(x)!.livello;
    perLivello.set(lv, (perLivello.get(lv) ?? 0) + 1);
  }
  for (const [lv, k] of perLivello) if (k > (slot[lv - 1] ?? 0)) return no('preparati_troppi', { livello: lv, slot: slot[lv - 1] ?? 0 });
  b.libro = e ? [...e.fissi, ...libro.filter((x) => !e.fissi.includes(x))].filter((x, i, l) => l.indexOf(x) === i) : [];
  b.preparati = ctx.s.magia?.preparazione === 'slot' ? [] : [...preparati];
  b.passi.incantesimi = 'fatto';
  return si;
}

/** The race's languages and up to the bonus more (open slots allowed). */
function lingue(ctx: CtxCreazione, b: Bozza, scelte: string[]): EsitoAzione {
  if (!Array.isArray(scelte)) return no('lingue_forma');
  const proprie = razzaDi(ctx, b.razza)?.lingue ?? [];
  const note = new Set((ctx.s.lingue ?? []).map((l) => l.id));
  for (const x of scelte) if (!note.has(x)) return no('lingua_sconosciuta', { lingua: x });
  const extra = [...new Set(scelte.filter((x) => !proprie.includes(x)))];
  const ammesse = lingueExtra(ctx, b);
  if (extra.length > ammesse) return no('lingue_troppe', { ammesse });
  b.lingue = [...proprie, ...extra];
  b.passi.lingue = 'fatto';
  return si;
}

const LIMITI = { nome: 60, aspetto: 400, concetto: 400, pronomi: 20 };
const pulito = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** The name (required) and the words the player writes about the PC. */
function descrizione(b: Bozza, a: Extract<AzioneCreazione, { tipo: 'descrizione' }>): EsitoAzione {
  const nome = pulito(a.nome, LIMITI.nome);
  if (!nome) return no('nome_mancante');
  b.descrizione = { nome, aspetto: pulito(a.aspetto, LIMITI.aspetto), concetto: pulito(a.concetto, LIMITI.concetto), pronomi: pulito(a.pronomi, LIMITI.pronomi) };
  b.passi.descrizione = 'fatto';
  return si;
}

/** Closes a step that waits for the player's word: the scores (after the options), the purchases. */
function conferma(ctx: CtxCreazione, b: Bozza, passo: PassoCreazione): EsitoAzione {
  if (passo === 'caratteristiche') {
    if (!b.base) return no('prima_i_punteggi');
    if (senzaSperanza(ctx, b)) return no('senza_speranza');
  } else if (passo === 'acquisti') {
    if (rigioca(ctx, b).nonPagato !== null) return no('monete_non_bastano', { oggetto: '' });
  } else if (passo === 'lingue') {
    return lingue(ctx, b, b.lingue.length ? b.lingue : (razzaDi(ctx, b.razza)?.lingue ?? []));
  } else return no('conferma_non_serve');
  b.passi[passo] = 'fatto';
  return si;
}

/**
 * The player redoes a step: refused when the Game Master approved it, and when a step already rolled reads it (the
 * hit points read the class: changing the class after them would roll them again; that is the Game Master's undo).
 */
function indietro(ctx: CtxCreazione, b: Bozza, passo: PassoCreazione): EsitoAzione {
  if (!ctx.cr.passi.includes(passo) || !fatto(b, passo)) return no('passo_non_fatto');
  if (statoPasso(b, passo) === 'approvato') return no('passo_approvato');
  if (PASSI_DI_DADI.has(passo) && passo !== 'caratteristiche') return no('dadi_del_master');
  const tirati = dipendenti(ctx, passo).filter((q) => PASSI_DI_DADI.has(q) && fatto(b, q));
  if (tirati.length) return no('dadi_dopo', { passo: testo(`creazione.passi.${tirati[0]}`) });
  annullaPasso(ctx, b, passo, false);
  return si;
}

/**
 * Undoes a step and every step that reads it. `master`: the Game Master's undo also throws away the dice (a reroll); a
 * player's undo of the scores keeps the dice and only takes back the options and the placing.
 */
export function annullaPasso(ctx: CtxCreazione, b: Bozza, passo: PassoCreazione, master: boolean): void {
  for (const p of [passo, ...dipendenti(ctx, passo)]) {
    delete b.passi[p];
    azzera(ctx, b, p, master || p !== passo);
  }
  b.stato = 'in_corso';
}

function azzera(ctx: CtxCreazione, b: Bozza, p: PassoCreazione, anche_dadi: boolean): void {
  switch (p) {
    case 'caratteristiche':
      if (anche_dadi) {
        b.tiriCaratteristiche = [];
        b.base = null;
        b.baseGrezza = null;
      } else {
        // Back to the scores as rolled or placed: the options and a shuffle are undone, the dice stay.
        const m = metodo(ctx);
        b.base = b.baseGrezza ? { ...b.baseGrezza } : null;
        if (m.tipo !== 'dadi' || m.ordine === 'libero') {
          b.base = null;
          b.baseGrezza = null;
        }
      }
      b.opzioniUsate = {};
      break;
    case 'razza':
      b.razza = null;
      break;
    case 'classe':
      b.classe = null;
      break;
    case 'punti_ferita':
      b.dadiPf = [];
      break;
    case 'monete':
      b.dadiMonete = null;
      break;
    case 'acquisti':
      b.acquisti = [];
      break;
    case 'incantesimi':
      b.libro = [];
      b.preparati = [];
      break;
    case 'lingue':
      b.lingue = [];
      break;
    case 'descrizione':
      break;
  }
}

/**
 * Closes the steps that have nothing left to choose: the hit points and the money once rolled, the spells of a class
 * that has none at the starting level; the Engine rolls a caster's starting spell when the set says `tiro`. Then the
 * draft is `pronta` when every step is done.
 */
export function avanza(ctx: CtxCreazione, b: Bozza): void {
  for (let giro = 0; giro < ctx.cr.passi.length; giro++) {
    const p = passoCorrente(ctx, b);
    if (!p) break;
    if (p === 'punti_ferita' && pfPerLivello(ctx, b).every((x, i) => !x.tira || b.dadiPf[i])) b.passi[p] = 'fatto';
    else if (p === 'monete' && (b.dadiMonete || !ctx.cr.monete)) b.passi[p] = 'fatto';
    else if (p === 'incantesimi' && !ctx.cr.incantesimi.some((x) => x.classe === b.classe) && !slotIniziali(ctx, b).some((n) => n > 0)) b.passi[p] = 'fatto';
    else if (p === 'lingue' && !(ctx.s.lingue ?? []).length) b.passi[p] = 'fatto';
    else if (p === 'acquisti' && !ctx.s.catalogo) b.passi[p] = 'fatto';
    else break;
  }
  b.stato = passoCorrente(ctx, b) === null ? 'pronta' : 'in_corso';
}

const nome = (ctx: CtxCreazione, id: string): string => ctx.s.caratteristiche.find((c) => c.id === id)?.nome ?? id;
