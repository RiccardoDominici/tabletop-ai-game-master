/**
 * Risolutore dei tiri per i set di regole non SRD (docs/regole.md, «Flusso»): come prove/risolutore.ts
 * (aiuti, poi ogni azione nell'ordine, poi la reazione del PNG; PF subito aggiornati), ma con il
 * vocabolario e la risoluzione del manuale: d20 contro CD, 2d6 a fasce con le mosse, sotto soglia.
 * L'SRD 5.2 resta su prove/risolutore.ts, identico.
 */
import type { TiroMostrato, Vantaggio } from '@tabletop-ai-gm/shared';
import { senzaReazioneFuoriTurno } from './risolutore';
import { chiave, conSegno } from '../campagna/regole-srd';
import type { Campagna, DatiYaml } from '../campagna/tipi';
import type { Logger } from '../logger';
import { ID_DIFESA, tiraCol, type EsitoTiroGenerico } from '../regole/risoluzione';
import { valoreCaratteristica } from '../regole/schede';
import type { SchedaGenerica, SistemaRegole } from '../regole/tipi';
import { voce, type Penalita } from '../regole/catalogo';
import { chiaveOggetto } from './risorse';
import { gittataDelTiro } from './gittate';
import { mostraTiroDelMaster } from './tiri-master';
import type { TiriMaster } from './modalita';
import type { FonteDadi } from './dadi';
import type { DadiDeiPg, GruppoDadi } from './dadi-tavolo';
import { combinaVantaggi, danno as tiraDanno } from './regole';
import type { StatoProve } from './stato';
import type { DecisioneRegole, EsitoAzioneProve, EsitoTurnoProve } from './tipi';
import { testo } from '../lingua';
import { datiProve } from './lingua';
import {
  conVantaggio,
  dannoMostrato,
  esitoAttacco,
  esitoProva,
  etichettaComposta,
  fattoAiuto,
  fattoAttaccoSenzaScheda,
  fattoFuggito,
  fattoGiaATerra,
  fattoNonOttiene,
  fattoImpossibile,
  fattoNessunTiro,
  fattoSenzaArbitro,
  fattoSenzaScheda,
  fraseAttaccoPng,
  fraseDanno,
  prefissoFatto,
  salute,
  tipoDanno,
} from './testi';
import type { AzioneRisolvibile } from './risolutore';
import { conEffetto, fontiAttacco, valoriAttacco, type CondizioniDi } from './condizioni';
import { modificatoriDellAttacco } from './modificatori';
import { applicaEffetti, type ContestoEffetti } from './effetti';
import { effettiSeFallisce } from '../campagna/prove-scena';
import type { EffettoTipato } from '../regole/effetti';
import { bersaglioSalvezza, type BersaglioSalvezza } from '../regole/salvezze';
import { usaPotere, usaPotereDiMostro, type ContestoPoteri } from './poteri';

/** Una prova scritta nei dati della scena, col vocabolario del set (scena → prove). */
export interface ProvaScenaRegole {
  id: string;
  quando: string;
  caratteristica: string | null;
  abilita: string | null;
  mossa: string | null;
  difficolta: string | null;
  se_fallisce: string | null;
  parole: string[];
  /** The hazard's name on the card and in the fact; null = the check's own label. */
  nome: string | null;
  /** Typed effects applied to the PC who fails (`effetti_se_fallisce`, regole/effetti.ts). */
  effetti: EffettoTipato[];
  /**
   * A situational adjustment the Preparer wrote for this check (`aggiustamento`: −20 on the slimy wall, Basic Fantasy
   * p. 8): added to a threshold roll's threshold, or to a d20 check's roll. 0 = none.
   */
  aggiustamento: number;
}

/** Le prove della scena per un set non SRD: id del set, difficoltà per id (non la CD dell'SRD). */
export function proveScenaRegole(s: SistemaRegole, c: Campagna): ProvaScenaRegole[] {
  const grezze = c.scena.dati['prove'];
  if (!Array.isArray(grezze)) return [];
  return grezze.flatMap((g) => {
    const d = g as DatiYaml;
    if (typeof d?.['id'] !== 'string') return [];
    const pick = (k: string, ammessi: Array<{ id: string }>): string | null => (typeof d[k] === 'string' && ammessi.some((x) => x.id === d[k]) ? (d[k] as string) : null);
    return [{ id: d['id'], quando: typeof d['quando'] === 'string' ? d['quando'] : '', caratteristica: pick('caratteristica', s.caratteristiche), abilita: pick('abilita', s.abilita), mossa: pick('mossa', s.mosse), difficolta: pick('difficolta', s.difficolta), se_fallisce: typeof d['se_fallisce'] === 'string' ? d['se_fallisce'] : null, parole: Array.isArray(d['parole']) ? (d['parole'] as unknown[]).filter((p): p is string => typeof p === 'string') : [], nome: typeof d['nome'] === 'string' && d['nome'].trim() ? d['nome'].trim() : null, effetti: effettiSeFallisce(d, `prove[${d['id']}]`), aggiustamento: typeof d['aggiustamento'] === 'number' && Number.isInteger(d['aggiustamento']) ? d['aggiustamento'] : 0 }];
  });
}

export interface OpzioniRisolutoreRegole {
  turno: number;
  azioni: AzioneRisolvibile[];
  decisioni: ReadonlyMap<string, DecisioneRegole | null>;
  sistema: SistemaRegole;
  schede: ReadonlyMap<string, SchedaGenerica>;
  stato: StatoProve;
  dadi: FonteDadi;
  proveScena: readonly ProvaScenaRegole[];
  nome: (id: string) => string;
  esiste: (id: string) => boolean;
  /** Condizioni attive (combattimento). Assente = nessuna. */
  condizioni?: CondizioniDi;
  /**
   * The rule set fights in turn order (individual or side initiative), and whether a fight is on now. Then an NPC does
   * not «react» outside its step: during a fight it acts in its own step; an attack that opens the fight gives the
   * attacked side surprise and initiative instead. Third e2e pass, HEAD rerun T6: Grosso, surprised (he loses round
   * one), still «reagisce» and swings at Livia before the order was rolled. Absent = reactions as before.
   */
  turni?: { regole: boolean; inCorso: boolean };
  /**
   * Manual rolls (docs/prove.md §8): the PCs' own dice (prove/dadi-tavolo.ts), for an action's test and the damage of
   * its hit. Null or absent = the Engine's dice, as always. NPC rolls never pass here.
   */
  dadiDeiPg?: DadiDeiPg | null;
  /** The Engine's typed effects (prove/effetti.ts): a failed scene check's `effetti_se_fallisce`. Absent = not applied. */
  effetti?: ContestoEffetti;
  /** What a character's traits and active effects add to one of its saves (regole/tratti.ts, prove/attivi.ts). */
  extraSalvezza?: (id: string, abilita: string) => number;
  /** What a character's traits add to a roll of one of the set's abilities, attacks included (regole/tratti.ts). */
  extraAbilita?: (id: string, abilita: string) => number;
  /** The active bonuses of a character (prove/attivi.ts): to its AC, attack rolls, damage; against melee or missiles. */
  bonusAttivi?: (id: string, a: 'difesa' | 'attacchi' | 'danni', contro: 'mischia' | 'distanza') => number;
  /**
   * The set's powers and the characters' resources (prove/poteri.ts, prove/risorse.ts): spells, items, ammunition, the
   * once-per-target sneak attack. Absent = no power can be used and nothing is counted (as before).
   */
  poteri?: Pick<ContestoPoteri, 'risorse' | 'nemici' | 'alleati' | 'immuneAttivo' | 'indossate' | 'condizioni'>;
  /**
   * What each character wears now and what its class or race restrictions forbid while worn (regole/equipaggiamento.ts,
   * penalitaIndossate): abilities blocked (a thief in metal armor), no spells. Absent = nothing blocked.
   */
  indossate?: (id: string) => Penalita & { motivi: string[] };
  /** The fight's current round (a crossbow's rate of fire), or null outside a fight. */
  round?: number | null;
  /** Missiles that miss into a melee (`combattimento.nella_mischia`): how many allies, and who is engaged with an NPC. */
  nellaMischia?: { alleati: number; ingaggiati: (png: string) => string[] } | null;
  /**
   * Whether the table sees the Game Master's rolls (campaign `regole.tiri_master`, prove/tiri-master.ts): an NPC's save
   * against a PC's power follows it. Absent = hidden. The set's secret abilities stay hidden whatever it says.
   */
  tiriMaster?: () => TiriMaster;
  log: Logger;
}

type Attacco = SchedaGenerica['attacchi'][number];
/** Senza armi nella scheda: 1d4 a mani nude (il nome nella lingua dei contenuti, prove.yaml). */
const senzArmi = (): Attacco => ({ id: 'senz_armi', nome: datiProve().nomi.a_mani_nude, danno: { numero: 1, facce: 4, bonus: 0 }, caratteristica: null, abilita: null, tipo_danno: null, distanza: false });

function arma(s: SchedaGenerica, id: string | null): Attacco {
  if (id) {
    const k = chiave(id);
    const a = s.attacchi.find((x) => x.id === k) ?? s.attacchi.find((x) => x.id.includes(k) || k.includes(x.id));
    if (a) return a;
  }
  return s.attacchi[0] ?? senzArmi();
}

function esitoInParole(e: EsitoTiroGenerico, attacco = false): string {
  if (e.grado) return e.grado.nome.toUpperCase();
  return attacco ? esitoAttacco(e.riuscita) : esitoProva(e.riuscita);
}

export function risolviTurnoRegole(o: OpzioniRisolutoreRegole): Omit<EsitoTurnoProve, 'attesa_ms' | 'tardive' | 'combattimento' | 'negati'> {
  const s = o.sistema;
  const perAzione = new Map<string, EsitoAzioneProve>();
  const tiri: TiroMostrato[] = [];
  const ostili: Array<{ chi: string; bersaglio: string }> = [];
  const fatti: string[] = [];
  const fattiPrivati: string[] = [];
  const ids = new Set(o.azioni.map((a) => a.id));
  const aiutanti = new Map<string, string[]>();
  for (const a of o.azioni) {
    const d = o.decisioni.get(a.id);
    if (d?.tipo === 'aiuto' && d.aiuta && ids.has(d.aiuta) && d.aiuta !== a.id) aiutanti.set(d.aiuta, [...(aiutanti.get(d.aiuta) ?? []), o.nome(a.autore)]);
  }
  const { cheCosa, cartaDa, attacca, bersaglioDiSalvezza, salvezzaDelBersaglio, munizioni, aggiustamentoDi } = strumentiRegole(o);
  // The PC's own dice for one roll of an action (manual rolls), or the Engine's.
  const dadiDelPg = (a: AzioneRisolvibile, per: 'prova' | 'danno' | 'effetto', extra: Pick<GruppoDadi, 'etichetta' | 'modificatore'> = {}): FonteDadi =>
    o.dadiDeiPg?.fonte({ pg: a.autore, per, azione: a.id, privata: a.privata, ...extra }) ?? o.dadi;

  o.azioni.forEach((a, i) => {
    const d = o.decisioni.get(a.id) ?? null;
    const prefisso = prefissoFatto(i + 1, o.nome(a.autore), a.autore, a.privata);
    const esito: EsitoAzioneProve = { id_azione: a.id, autore: a.autore, decisione: null, tiri: [], fatto: '', riuscite: [], fallite: [], riuscita: null };
    const aggiungi = (t: TiroMostrato): void => {
      esito.tiri.push(t);
      tiri.push(t);
    };
    const sch = o.schede.get(a.autore) ?? null;
    const fonti: Array<{ v: Vantaggio; motivo: string; fonte?: 'arbitro' }> = [...(d?.vantaggio ? [{ v: d.vantaggio, motivo: d.motivo, fonte: 'arbitro' as const }] : []), ...(aiutanti.get(a.id) ?? []).map((n) => ({ v: 'vantaggio' as const, motivo: testo('prove.motivo.aiuta', { nome: n }) }))];
    let fatto: string;
    if (!d) fatto = fattoSenzaArbitro();
    // A dead PC is dead, not «a terra» with the set's text about what happens at zero (run of 15 November).
    else if (o.stato.fuoriGioco(a.autore) === 'morto') fatto = testo('prove.fatto.morto_autore');
    else if (o.stato.aTerra(a.autore)) fatto = testo('prove.fatto.a_terra_set', { a_zero: s.danni.aZero });
    else if (conEffetto(o.condizioni, a.autore, 'perde_turno')) fatto = testo('prove.fatto.perde_turno', { condizione: conEffetto(o.condizioni, a.autore, 'perde_turno')!.toLowerCase() });
    else if (d.tipo === 'nessuna') fatto = fattoNessunTiro();
    else if (d.tipo === 'impossibile') fatto = fattoImpossibile(d.motivo);
    else if (d.tipo === 'aiuto') {
      const aiutata = d.aiuta && ids.has(d.aiuta) && d.aiuta !== a.id ? o.azioni.find((x) => x.id === d.aiuta)! : null;
      fatto = fattoAiuto(aiutata ? o.nome(aiutata.autore) : null);
    } else if (!sch) {
      fatto = fattoSenzaScheda();
      o.log.warn({ azione: a.id, autore: a.autore }, 'prove: serve un tiro ma il PG non ha una scheda del set («sì, ma»)');
    } else if (d.tipo === 'potere') {
      // A power of the set (prove/poteri.ts): its cost, its targets, their saves, its effects; refused when spent.
      const p = d.potere ? (s.poteri ?? []).find((x) => x.id === d.potere) : undefined;
      if (!p || !o.poteri || !o.effetti) {
        fatto = fattoNessunTiro();
        o.log.warn({ azione: a.id, potere: d.potere ?? null }, 'powers: a power decision the Engine cannot use (unknown power, or no powers here): no roll');
      } else {
        const r = usaPotere(
          { sistema: s, schede: o.schede, effetti: o.effetti, salvezza: salvezzaDelBersaglio, log: o.log, ...(o.indossate ? { indossate: o.indossate } : {}), ...o.poteri },
          { autore: a.autore, potere: p, bersaglio: d.bersaglio && o.esiste(d.bersaglio) ? d.bersaglio : null, privata: a.privata, dadiAutore: dadiDelPg(a, 'danno', { etichetta: p.tabella?.colpiti ? testo('prove.scacciare.etichetta_colpiti', { potere: p.nome }) : p.nome, modificatore: 0 }), ...(p.tabella ? { dadiProva: dadiDelPg(a, 'prova'), dadiEffetto: dadiDelPg(a, 'effetto', { etichetta: testo('prove.scacciare.etichetta_danno', { potere: p.nome }), modificatore: 0 }) } : {}), dadiDelPg: (pg) => o.dadiDeiPg?.fonte({ pg, per: 'contesa', azione: a.id, privata: a.privata, etichetta: p.nome }) ?? o.dadi },
        );
        for (const t of r.tiri) aggiungi(t);
        ostili.push(...r.ostili);
        esito.riuscita = r.usato;
        (r.usato ? esito.riuscite : esito.fallite).push('potere', p.id);
        fatto = r.fatti.join(' ');
      }
    } else if (d.tipo === 'attacco') {
      const b = d.bersaglio && o.esiste(d.bersaglio) && d.bersaglio !== a.autore ? d.bersaglio : null;
      const senza = b ? munizioni(a.autore, d.arma, a.testo) : null;
      if (senza) fatto = senza;
      else if (!b || !o.schede.get(b)) fatto = fattoAttaccoSenzaScheda(b ? o.nome(b) : null);
      else if (o.stato.fuoriGioco(b) === 'fuggito') fatto = fattoFuggito(o.nome(b));
      else if (o.stato.aTerra(b)) fatto = fattoGiaATerra(o.nome(b));
      else {
        const r = attacca(a.autore, b, d.arma, fonti, a.privata, dadiDelPg(a, 'prova'), (x) => dadiDelPg(a, 'danno', x), a.testo)!;
        aggiungi(r.t);
        for (const t of r.altri ?? []) aggiungi(t);
        // A missile that misses an NPC engaged with other PCs may hit one of them (Basic Fantasy p. 55): the Game Master
        // rolls the same shot, with the shooter's bonus, against each in turn until one is hit.
        if (r.esito && !r.esito.riuscita && r.distanza && o.nellaMischia) {
          const alleati = o.nellaMischia.ingaggiati(b).filter((x) => x !== a.autore).slice(0, o.nellaMischia.alleati);
          for (const alleato of alleati) {
            const x = attacca(a.autore, alleato, d.arma, [], a.privata, o.dadi, () => o.dadi, a.testo, true);
            if (!x) continue;
            aggiungi(x.t);
            for (const t of x.altri ?? []) aggiungi(t);
            r.testo += testo('prove.fatto.nella_mischia', { nome: o.nome(alleato), dettagli: x.testo });
            o.log.info({ chi: a.autore, bersaglio: b, alleato, riuscita: x.esito?.riuscita ?? null }, 'prove: a missile that missed goes into the melee');
            if (x.esito?.riuscita) break;
          }
        }
        esito.riuscita = r.esito?.riuscita ?? null;
        if (r.esito) (r.esito.riuscita ? esito.riuscite : esito.fallite).push('attacco', r.t.etichetta);
        fatto = r.testo;
        // 2d6: con un successo parziale anche il bersaglio colpisce (lo scambio del manuale).
        if (r.esito?.grado?.id === 'parziale' && s.attacchi.parzialeScambio && !d.reazione) {
          const x = attacca(b, a.autore, null, [], a.privata);
          if (x && !o.stato.aTerra(b)) {
            aggiungi(x.t);
            for (const t of x.altri ?? []) aggiungi(t);
            fatto += testo('prove.fatto.scambio', { frase: fraseAttaccoPng(x.t), dettagli: x.testo });
          }
        }
      }
    } else {
      // prova, salvezza, contrapposta: col set sono tutte prove, con la difficoltà del manuale.
      const ps = d.prova_scena ? (o.proveScena.find((p) => p.id === d.prova_scena) ?? null) : null;
      const sociale = !!d.bersaglio?.startsWith('png_');
      const cosa = cheCosa(sch, ps ?? d, sociale);
      // An ability the worn armor forbids (Basic Fantasy's thief in metal armor, p. 187): no roll, and the table hears why.
      const bloccata = (ps ?? d).abilita && o.indossate?.(a.autore).senzaAbilita?.includes((ps ?? d).abilita!) ? (ps ?? d).abilita! : null;
      if (bloccata) {
        fatto = testo('prove.equipaggiamento.abilita_bloccata', { nome: o.nome(a.autore), abilita: s.abilita.find((x) => x.id === bloccata)?.nome ?? bloccata, cosa: o.indossate!(a.autore).motivi.join(', ').toLowerCase() });
        esito.riuscita = false;
        esito.fallite.push('prova', bloccata);
        o.log.info({ azione: a.id, autore: a.autore, abilita: bloccata }, 'gear: an ability blocked by the worn armor, no roll');
      } else if (!cosa) {
        fatto = fattoNessunTiro();
        o.log.warn({ azione: a.id, decisione: d }, 'prove: decisione senza caratteristica, abilità né mossa del set: nessun tiro');
      } else {
        // A saving throw of the manual is pinned to its own target (regole/salvezze.ts, M5): the table's number or the
        // sheet's bonus against the default, never a difficulty rung (the rules arbiter's signal words, the model, the
        // scene) nor the arbiter's or a helper's advantage. Only the conditions of the fight still count.
        const idSalvezza = cosa.salvezza && !cosa.soglia && s.risoluzione.tipo === 'd20_cd' ? ((ps ?? d).abilita ?? null) : null;
        const fisso = idSalvezza ? bersaglioDiSalvezza(sch, idSalvezza) : null;
        if (fisso) {
          const tolti = fonti.length || (ps?.difficolta ?? d.difficolta) ? { vantaggi: fonti.map((f) => f.motivo), difficolta: ps?.difficolta ?? d.difficolta } : null;
          if (tolti) o.log.info({ azione: a.id, abilita: idSalvezza, tolti }, 'saves: pinned to the save\'s own target, the difficulty and advantages dropped');
          fonti.length = 0;
        }
        const condSv = conEffetto(o.condizioni, a.autore, fisso ? 'svantaggio_salvezze' : 'svantaggio_prove');
        if (condSv) fonti.push({ v: 'svantaggio', motivo: condSv.toLowerCase() });
        const v = combinaVantaggi(fonti.map((f) => f.v));
        const sistTiro = cosa.soglia ? sistemaSoglia(s, cosa.soglia) : fisso ? sistemaSalvezza(s, fisso.contro) : s;
        // The ability's own rules (M9): a roll the Game Master makes in secret, a failure band, situational points.
        const def = s.abilita.find((x) => x.id === ((ps ?? d).abilita ?? ''));
        const segreta = def?.segreta ?? null;
        const aggiustamento = aggiustamentoDi(cosa, ps, ps?.difficolta ?? d.difficolta);
        const valore = cosa.soglia ? Math.max(0, Math.min(cosa.soglia, cosa.valore + aggiustamento)) : (fisso ? fisso.modificatore : cosa.valore) + aggiustamento;
        // A secret roll uses the Engine's dice, never the player's (no request at the table, even with manual rolls).
        const e = tiraCol(sistTiro, segreta ? o.dadi : dadiDelPg(a, 'prova'), valore, cosa.soglia ? null : fisso ? ID_SALVEZZA : (ps?.difficolta ?? d.difficolta), v, cosa.etichetta, false, !!cosa.salvezza);
        const b = d.bersaglio && o.esiste(d.bersaglio) && d.bersaglio !== a.autore ? d.bersaglio : null;
        const t = cartaDa(e, a.autore, fisso ? 'salvezza' : 'prova', cosa.etichetta, b, fonti.filter((f) => f.v === v).map((f) => f.motivo).join('; ') || null, a.privata, sistTiro);
        // Its card is the Game Master's: on the panel, never on the projector or the phones (`tiri_master` aside).
        if (segreta) t.nascosta = true;
        aggiungi(t);
        esito.riuscita = e.riuscita;
        // Prove riuscite per il cancello `richiede.prova`: anche gli id del set (mossa, abilità, caratteristica).
        (e.riuscita ? esito.riuscite : esito.fallite).push(...new Set(['prova', ...[d.abilita, d.caratteristica, d.mossa, ps?.id, ps?.mossa, ps?.abilita, ps?.caratteristica, cosa.mossa?.id, cosa.mossa?.caratteristica].filter((x): x is string => !!x)]));
        fatto = (segreta ? testo('prove.segreta.tiro') : '') + testo('prove.fatto.prova_set', { regola: e.regola, vantaggio: conVantaggio(e.vantaggio), valore: s.risoluzione.tipo === 'sotto_soglia' ? e.dado : e.totale, esito: esitoInParole(e) });
        if (aggiustamento) fatto += testo('prove.fatto.aggiustamento', { n: aggiustamento > 0 ? `+${aggiustamento}` : `−${-aggiustamento}` });
        if (segreta) o.log.info({ azione: a.id, autore: a.autore, abilita: def?.id, dado: e.dado, soglia: valore, riuscita: e.riuscita }, 'secret roll: the Game Master rolls it, the card stays on the panel');
        // A failure band (pick pockets noticed): a failed roll above n times the threshold, or the die's top face.
        const grave = cosa.soglia && !e.riuscita ? def?.soglia?.grave : null;
        if (grave && cosa.soglia && (e.dado > grave.oltreVolte * valore || (grave.colMassimo && e.dado >= cosa.soglia))) fatto += testo('prove.fatto.fallimento_grave', { nome: grave.nome });
        if (cosa.mossa) {
          const esitoMossa = e.grado?.id === 'parziale' ? (cosa.mossa.esiti.parziale ?? cosa.mossa.esiti.successo) : e.riuscita ? cosa.mossa.esiti.successo : cosa.mossa.esiti.fallimento;
          fatto += testo('prove.fatto.esito_mossa', { mossa: cosa.mossa.nome, esito: esitoMossa });
        }
        if (!e.riuscita && ps?.se_fallisce) fatto += testo('prove.fatto.prezzo', { prezzo: ps.se_fallisce });
        // The hazard of the scene check hits the PC who failed it: a fall, a trap's damage (typed effects).
        if (!e.riuscita && ps?.effetti.length && o.effetti) {
          const x = applicaEffetti({ effetti: ps.effetti, bersaglio: a.autore, autore: null, fonte: ps.nome ?? cosa.etichetta, livello: 1, privata: a.privata }, o.effetti);
          for (const t of x.tiri) aggiungi(t);
          if (x.fatti.length) fatto += ` ${x.fatti.join(' ')}`;
        }
        // Che cosa NON succede (la carta e la storia d'accordo, D2); una mossa ha già il suo esito scritto. A secret roll
        // that failed is told the way the player perceives it: nothing to notice, or it seems to have worked.
        if (!e.riuscita && segreta) fatto += testo(`prove.segreta.fallita_${segreta}`, { nome: o.nome(a.autore) });
        else if (!e.riuscita && !cosa.mossa) fatto += fattoNonOttiene(ps?.quando ?? a.testo, a.privata ? a.autore : null);
      }
    }
    // Reazione del PNG: dopo l'azione, se la condizione vale.
    const r = senzaReazioneFuoriTurno(o.turni, d?.tipo) ? null : d?.reazione;
    if (r && sch && (r.condizione === 'sempre' || (r.condizione === 'se_fallisce' && esito.riuscita === false)) && !o.stato.aTerra(r.png) && !o.stato.aTerra(a.autore)) {
      const x = attacca(r.png, a.autore, null, [], a.privata);
      if (x) {
        aggiungi(x.t);
        for (const t of x.altri ?? []) aggiungi(t);
        fatto += ` ${testo('prove.fatto.reazione', { nome: o.nome(r.png), frase: fraseAttaccoPng(x.t), dettagli: x.testo })}`;
      }
    }
    esito.decisione = null;
    esito.fatto = prefisso + fatto;
    (a.privata ? fattiPrivati : fatti).push(esito.fatto);
    perAzione.set(a.id, esito);
    o.log.info({ azione: a.id, autore: a.autore, tipo: d?.tipo ?? null, mossa: d?.mossa ?? null, tiri: esito.tiri.map((t) => ({ etichetta: t.etichetta, dadi: t.dadi, totale: t.totale, regola: t.regola, grado: t.grado?.nome ?? null })) }, 'prove: azione risolta (set del manuale)');
  });
  void conSegno;
  return { turno: o.turno, perAzione, tiri, fatti, fattiPrivati, ...(ostili.length ? { ostili } : {}) };
}

/**
 * Gli strumenti di un turno col set: che cosa si tira, le carte, il danno, gli attacchi. Esportati
 * anche per il combattimento (i turni dei PNG li tira il Motore con gli stessi attacchi).
 */
/**
 * Il set visto da un'abilità tirata a parte sotto soglia (`abilita[].soglia`): un d100 per le percentuali del
 * ladro, un d6 per le possibilità «x su 6», contro il valore della scheda, senza difficoltà né vantaggi del set.
 */
export function sistemaSoglia(s: SistemaRegole, dado: 6 | 20 | 100): SistemaRegole {
  return {
    ...s,
    risoluzione: { tipo: 'sotto_soglia', facce: dado, numero: 1, fasce: [], gradi: [], critico: null, disastro: null, critici: 'attacchi' },
    modificatore: 'soglia',
    difficolta: [{ id: '_soglia', nome: testo('regole.predefiniti.normale'), valore: null, divisore: 1, modificatore: null }],
    difficoltaPredefinita: '_soglia',
    vantaggio: { tipo: 'nessuno', valore: 0 },
  };
}

/** The id of the made-up difficulty a pinned save rolls against (regole/salvezze.ts): not a difficulty of the set. */
export const ID_SALVEZZA = '_salvezza';

/** The set seen by a pinned saving throw: one difficulty, the save's own number (the table's, or the default's). */
export function sistemaSalvezza(s: SistemaRegole, contro: number): SistemaRegole {
  return { ...s, difficolta: [{ id: ID_SALVEZZA, nome: testo('prove.salvezze.tiro_salvezza'), valore: contro, divisore: null, modificatore: null }], difficoltaPredefinita: ID_SALVEZZA };
}

export function strumentiRegole(o: Omit<OpzioniRisolutoreRegole, 'azioni' | 'decisioni'>) {
  const s = o.sistema;
  const nomeCar = (id: string): string => s.caratteristiche.find((c) => c.id === id)?.nome ?? id;
  const nomeAbil = (id: string): string => s.abilita.find((x) => x.id === id)?.nome ?? id;

  /** Il numero da tirare (modificatore o soglia) e come si chiama, da mossa, abilità o caratteristica. */
  function cheCosa(sch: SchedaGenerica, d: { caratteristica: string | null; abilita: string | null; mossa: string | null }, sociale: boolean): { valore: number; etichetta: string; mossa: SistemaRegole['mosse'][number] | null; soglia?: 6 | 20 | 100; salvezza?: boolean } | null {
    const mossa = d.mossa ? (s.mosse.find((m) => m.id === d.mossa) ?? null) : null;
    if (mossa) return { valore: valoreCaratteristica(s, sch, mossa.caratteristica), etichetta: `${nomeCar(mossa.caratteristica)}, ${mossa.nome}`, mossa };
    let abil = d.abilita && s.abilita.some((x) => x.id === d.abilita) ? d.abilita : null;
    let car = d.caratteristica && s.caratteristiche.some((x) => x.id === d.caratteristica) ? d.caratteristica : null;
    if (!abil && !car && sociale) {
      abil = s.sociale.abilita;
      car = s.sociale.caratteristica;
    }
    if (abil) {
      const carAbil = s.abilita.find((x) => x.id === abil)?.caratteristica ?? null;
      // Abilità tirata a parte sotto la soglia della scheda (percentuale, «x su 6»), se la scheda o il set la dà.
      const so = s.abilita.find((x) => x.id === abil)?.soglia ?? null;
      const valoreSoglia = so ? (sch.abilita[abil] ?? so.predefinita) : null;
      if (so && valoreSoglia !== null) return { valore: valoreSoglia, etichetta: nomeAbil(abil), mossa: null, soglia: so.dado };
      if (s.modificatore === 'soglia') {
        const v = sch.abilita[abil] ?? (carAbil ? sch.caratteristiche[carAbil] : undefined) ?? 0;
        return { valore: v, etichetta: nomeAbil(abil), mossa: null };
      }
      const base = carAbil ? valoreCaratteristica(s, sch, carAbil) : 0;
      // A saving throw of the manual (`salvezza: true`): its natural d20s may count (`risoluzione.critici`).
      const salvezza = s.abilita.find((x) => x.id === abil)?.salvezza ? { salvezza: true } : {};
      // A race or class trait to this ability (the halfling's +1 with missiles); a save takes its traits by column.
      const tratto = salvezza.salvezza ? 0 : (o.extraAbilita?.(sch.id, abil) ?? 0);
      return { valore: base + (sch.abilita[abil] ?? 0) + tratto, etichetta: carAbil ? etichettaComposta(nomeAbil(abil), nomeCar(carAbil)) : nomeAbil(abil), mossa: null, ...salvezza };
    }
    if (car) return { valore: valoreCaratteristica(s, sch, car), etichetta: nomeCar(car), mossa: null };
    return null;
  }

  /**
   * The situational points of a check (M9): the scene check's `aggiustamento`, and for a d100 threshold the difficulty
   * rung's `percentuale` (the arbiter's «difficile» on a slimy wall: −20). 0 = none.
   */
  function aggiustamentoDi(cosa: { soglia?: 6 | 20 | 100 }, ps: ProvaScenaRegole | null, difficolta: string | null): number {
    const rung = cosa.soglia === 100 && difficolta ? (s.difficolta.find((x) => x.id === difficolta)?.percentuale ?? 0) : 0;
    return (ps?.aggiustamento ?? 0) + rung;
  }

  /** A sheet's save with the set's save ability: its number to reach and its bonus (traits and active effects added). */
  function bersaglioDiSalvezza(sch: SchedaGenerica, abilita: string): BersaglioSalvezza | null {
    return bersaglioSalvezza(s, sch, abilita, o.extraSalvezza?.(sch.id, abilita) ?? 0);
  }

  /**
   * A target's own saving throw against a power (M5, target-side saves): `chi` rolls the set's save ability `abilita`
   * against its own number, with `modificatore` added (a power that gives a penalty or a bonus to the save). An NPC
   * rolls with the Engine's dice and its card is the Game Master's (`nascosta`); a PC rolls its own (`dadi`, manual
   * rolls). Null when `chi` has no sheet or the ability is not a save of the set.
   */
  function salvezzaDelBersaglio(chi: string, abilita: string, modificatore: number, dadi: FonteDadi, privata: boolean): { e: EsitoTiroGenerico; t: TiroMostrato } | null {
    const sch = o.schede.get(chi);
    const b = sch ? bersaglioDiSalvezza(sch, abilita) : null;
    if (!sch || !b) return null;
    const fonti = conEffetto(o.condizioni, chi, 'svantaggio_salvezze');
    const v = fonti ? ('svantaggio' as const) : null;
    const sist = sistemaSalvezza(s, b.contro);
    const etichetta = nomeAbil(abilita);
    const e = tiraCol(sist, dadi, b.modificatore + modificatore, ID_SALVEZZA, v, etichetta, false, true);
    const t = cartaDa(e, chi, 'salvezza', etichetta, null, fonti ? fonti.toLowerCase() : null, privata, sist);
    // An NPC's save is the Game Master's roll: hidden, or shown by the campaign's `tiri_master` (visibili; a_volte when
    // the odds are close), like the world's rolls (prove/tiri-master.ts).
    if (chi.startsWith('png_')) t.nascosta = !mostraTiroDelMaster(o.tiriMaster?.() ?? 'nascosti', { visibile: false, dado: 20, almeno: Math.max(1, b.contro - (b.modificatore + modificatore)) }).mostra;
    o.log.info({ chi, abilita, dadi: e.dadi, modificatore: e.modificatore, contro: b.contro, fonte: b.fonte, riuscita: e.riuscita }, 'saves: a target rolls its own save');
    return { e, t };
  }

  const carta = (base: Omit<TiroMostrato, 'id' | 'turno'>): TiroMostrato => ({ id: o.stato.nuovoIdTiro(), turno: o.turno, ...base });
  const cartaDa = (e: EsitoTiroGenerico, chi: string, tipo: TiroMostrato['tipo'], etichetta: string, bersaglio: string | null, motivo: string | null, privata: boolean, sist: SistemaRegole = s): TiroMostrato =>
    carta({
      chi,
      nome: o.nome(chi),
      di_png: chi.startsWith('png_'),
      tipo,
      etichetta,
      dadi: e.dadi,
      dado: e.dado,
      vantaggio: e.vantaggio,
      motivo_vantaggio: e.vantaggio ? motivo : null,
      modificatore: e.modificatore,
      ...(e.modificatoreDifficolta ? { modificatore_difficolta: e.modificatoreDifficolta } : {}),
      totale: e.totale,
      contro: e.contro,
      bersaglio: bersaglio ? { id: bersaglio, nome: o.nome(bersaglio) } : null,
      riuscita: e.riuscita,
      critico: e.grado?.id === 'critico',
      fallimento_critico: e.grado?.id === 'disastro',
      danno: null,
      a_terra: false,
      privata,
      avversario: null,
      risoluzione: sist.risoluzione.tipo,
      facce: e.facce,
      grado: e.grado,
      regola: e.regola,
    });

  /**
   * Danno di un attacco riuscito al bersaglio (armatura se il set la conta): testo per il narratore. `dadiDanno`: the
   * attacking PC's own dice for the damage (manual rolls); an NPC's damage is the Engine's.
   */
  function colpisci(t: TiroMostrato, attaccante: Attacco, bersaglio: SchedaGenerica, critico: boolean, dadiDanno: FonteDadi = o.dadi, doppio = false, nonFerisce: string | null = null): string {
    // Il critico raddoppia i dadi del danno solo se il set lo dice (SRD sì); il danno minimo è del set (Basic Fantasy: 1).
    const d = tiraDanno(dadiDanno, attaccante.danno, 0, critico && s.attacchi.dannoCritico === 'doppio');
    // A situational modifier with `danno: doppio` (Basic Fantasy's charge, p. 52): the damage of the hit is doubled.
    // An active bonus to damage (prove/attivi.ts) adds to the hit.
    const base = (doppio ? d.totale * 2 : d.totale) + (o.bonusAttivi?.(t.chi, 'danni', attaccante.distanza ? 'distanza' : 'mischia') ?? 0);
    const minimo = Math.max(s.attacchi.dannoMinimo, s.attacchi.armaturaRiduce ? Math.max(0, base - bersaglio.armatura) : base);
    // After the minimum: a weapon that cannot hurt this creature (P6-03) deals nothing, a resistance halves or stops it.
    const resiste = attaccante.tipo_danno ? (bersaglio.resistenze?.[attaccante.tipo_danno] ?? null) : null;
    const ridotto = nonFerisce ? 0 : resiste === 'immune' ? 0 : resiste === 'meta' ? Math.floor(minimo / 2) : minimo;
    const r = o.stato.danneggia(bersaglio.id, ridotto);
    // A condition that ends on injury (sleep) ends with this hit.
    const svegli = ridotto > 0 ? (o.effetti?.attivi?.ferito(bersaglio.id) ?? []) : [];
    t.danno = dannoMostrato({ formula: d.formula, dadi: d.dadi, bonus: d.bonus, totale: ridotto, tipo: attaccante.tipo_danno });
    const pf = o.stato.puntiFerita(bersaglio.id)!;
    t.a_terra = pf.attuali <= 0;
    const danni = s.danni.nome.toLowerCase();
    const stato = bersaglio.di_png ? salute(pf.attuali, pf.massimi) : pf.attuali <= 0 ? testo('prove.salute.set_a_terra', { danni, a_zero: s.danni.aZero }) : testo('prove.salute.set', { attuali: pf.attuali, danni, massimi: pf.massimi });
    const armatura = s.attacchi.armaturaRiduce && bersaglio.armatura ? testo('prove.fatto.armatura', { armatura: bersaglio.armatura }) : '';
    void r;
    const sveglio = svegli.map((c) => ` ${testo('prove.effetti.svegliato', { nome: o.nome(bersaglio.id), condizione: c.toLowerCase() })}`).join('');
    const perche = nonFerisce ? testo('prove.mostri.non_ferisce', { arma: attaccante.nome, nome: o.nome(bersaglio.id), solo: nonFerisce }) : resiste ? testo(`prove.mostri.resiste_${resiste}`, { nome: o.nome(bersaglio.id), tipo: tipoDanno(attaccante.tipo_danno!) }) : '';
    return perche + testo('prove.fatto.danno_set', { danno: fraseDanno(ridotto, attaccante.tipo_danno ? tipoDanno(attaccante.tipo_danno) : null), armatura, nome: o.nome(bersaglio.id), stato }) + sveglio;
  }

  /**
   * What a weapon is (argento, magica…): the line's own `proprieta`, its catalog weapon's, the ammunition shot. Null
   * when the target can be hurt by anything; else the kinds that hurt it said in words, when this weapon is none of them.
   */
  function nonFerisceCon(a: Attacco, sb: SchedaGenerica, munizione: string | undefined): string | null {
    const solo = sb.colpitoSoloDa;
    if (!solo?.length) return null;
    const di = (id: string | undefined): string[] => (id ? (voce(s.catalogo, id)?.proprieta ?? []) : []);
    const ha = new Set([...(a.proprieta ?? []), ...di(a.arma), ...di(munizione)]);
    if (solo.some((k) => ha.has(k))) return null;
    o.log.info({ arma: a.id, bersaglio: sb.id, solo, ha: [...ha] }, 'monsters: a weapon that cannot hurt this creature, the hit deals nothing');
    return solo.join(testo('prove.mostri.o'));
  }

  /**
   * The powers a hit applies to its target (`colpendo` of the line: a ghoul's paralysis, a snake's poison): each with the
   * target's own save (a PC's dice with manual rolls, asked in the step), the effects at the attacker's hit dice.
   */
  function colpendo(a: Attacco, chi: string, bersaglio: string, privata: boolean): { tiri: TiroMostrato[]; fatti: string[] } {
    const out = { tiri: [] as TiroMostrato[], fatti: [] as string[] };
    if (!a.colpendo?.length || !o.effetti || o.stato.fuoriGioco(bersaglio) === 'morto') return out;
    const sa = o.schede.get(chi);
    for (const id of a.colpendo) {
      const p = (s.poteri ?? []).find((x) => x.id === id);
      if (!p) continue;
      const x = usaPotereDiMostro(
        { schede: o.schede, effetti: o.effetti, salvezza: salvezzaDelBersaglio, ...(o.poteri?.immuneAttivo ? { immuneAttivo: o.poteri.immuneAttivo } : {}), log: o.log },
        { autore: chi, potere: p, bersagli: [bersaglio], livello: sa?.dadiVita ?? sa?.livello ?? 1, privata, dadiDelPg: (pg) => o.dadiDeiPg?.fonte({ pg, per: 'salvezza', azione: null, privata, etichetta: p.nome }) ?? o.dadi },
      );
      out.tiri.push(...x.tiri);
      out.fatti.push(...x.fatti);
    }
    return out;
  }

  /**
   * Un attacco col set (prova o automatico); null se mancano le schede. `dadiTiro`: the dice of the attack roll, and
   * `dadiDanno` those of its damage, given the weapon (a PC's own at the table, manual rolls); absent = the Engine's.
   */
  function attacca(
    chi: string,
    bersaglio: string,
    idArma: string | null,
    fontiDate: Array<{ v: Vantaggio; motivo: string; fonte?: 'arbitro' }>,
    privata: boolean,
    dadiTiro: FonteDadi = o.dadi,
    dadiDanno?: (x: Pick<GruppoDadi, 'etichetta' | 'modificatore'>) => FonteDadi,
    /** The PC's action: the set's situational modifiers read it (from behind, a charge, range). Absent = none (NPCs). */
    azione?: string,
    /** The same shot rolled again at someone else (a missile that misses into a melee): nothing spent or marked again. */
    gratis = false,
  ): { t: TiroMostrato; testo: string; esito: EsitoTiroGenerico | null; altri?: TiroMostrato[]; distanza?: boolean } | null {
    const sa = o.schede.get(chi);
    const sb = o.schede.get(bersaglio);
    if (!sa || !sb) return null;
    let a = arma(sa, idArma);
    // Ammunition (`consuma`): one per attack, tracked by the Engine (prove/risorse.ts); the caller refuses at 0.
    if (!gratis && a.consuma && o.poteri?.risorse.restanti(chi, a.consuma) !== null) o.poteri?.risorse.spendi(chi, a.consuma);
    // Catalog ammunition (M2): one of the first kind the bearer still has; a shot takes that ammunition's damage when
    // the manual gives one (a sling stone 1d3), with the line's own bonus (the sling's Strength).
    const munizione = a.munizioni && o.poteri ? a.munizioni.find((m) => (o.poteri!.risorse.restanti(chi, chiaveOggetto(m)) ?? 0) > 0) : undefined;
    if (munizione && !gratis) {
      o.poteri!.risorse.spendi(chi, chiaveOggetto(munizione));
      const m = voce(s.catalogo, munizione);
      if (m?.tipo === 'munizione' && m.danno) a = { ...a, danno: { numero: m.danno.numero, facce: m.danno.facce, bonus: a.danno.bonus + m.danno.bonus } };
      o.log.info({ chi, arma: a.id, munizione, restanti: o.poteri!.risorse.restanti(chi, chiaveOggetto(munizione)) }, 'inventory: a shot spends one of its ammunition');
    }
    // Rate of fire (a crossbow): the round of this shot, so the next one waits.
    // A shot that opens the fight comes before its first round (the Engine's round 1 starts with the order rolled).
    if (!gratis && a.ricarica && a.ricarica > 1) o.poteri?.risorse.segnaTiro(chi, a.id, o.round ?? 0);
    // An ability usable once per target per fight (Basic Fantasy's sneak attack): spent on this target, the attack
    // falls back to the ability's `ripiego` (an ordinary melee attack), without its double damage.
    let nota = '';
    const speciale = a.abilita ? s.abilita.find((x) => x.id === a.abilita) : undefined;
    if (speciale?.unaVoltaPerBersaglio && o.poteri && !gratis) {
      if (o.poteri.risorse.giaUsato(chi, speciale.id, bersaglio)) {
        nota = testo('prove.poteri.una_volta', { abilita: speciale.nome, bersaglio: o.nome(bersaglio) });
        o.log.info({ chi, bersaglio, abilita: speciale.id, ripiego: speciale.ripiego ?? null }, 'resources: once-per-target ability already used on this target, an ordinary attack');
        a = { ...a, abilita: speciale.ripiego ?? null, caratteristica: speciale.ripiego ? null : speciale.caratteristica };
      } else o.poteri.risorse.segnaUsato(chi, speciale.id, bersaglio);
    }
    // The worn armor forbids the special ability (a thief in metal armor cannot sneak attack, p. 187): an ordinary attack.
    const blocchi = o.indossate?.(chi);
    if (speciale && blocchi?.senzaAbilita?.includes(speciale.id) && !nota) {
      nota = testo('prove.equipaggiamento.speciale_bloccato', { abilita: speciale.nome, cosa: blocchi.motivi.join(', ').toLowerCase() });
      o.log.info({ chi, abilita: speciale.id }, 'gear: the special attack is blocked by the worn armor, an ordinary attack');
      a = { ...a, abilita: speciale.ripiego ?? null, caratteristica: speciale.ripiego ? null : speciale.caratteristica };
    }
    const doppioAbilita = !nota && speciale?.danno === 'doppio';
    const danno = dadiDanno?.({ etichetta: testo('prove.richiesta.etichetta_danno', { arma: a.nome }), modificatore: a.danno.bonus }) ?? o.dadi;
    // Automatico per il set, o per quest'arma (il dardo incantato colpisce sempre).
    if (s.attacchi.tipo === 'automatico' || a.automatico) {
      const regola = testo('prove.regola.automatico', { arma: a.nome, dadi: `${a.danno.numero}d${a.danno.facce}`, armatura: s.attacchi.armaturaRiduce ? testo('prove.regola.meno_armatura') : '' });
      const e: EsitoTiroGenerico = { dadi: [], facce: a.danno.facce || 6, dado: 0, modificatore: 0, totale: 0, contro: { tipo: 'soglia', valore: 0, descrizione: testo('prove.cd.colpisce_sempre') }, riuscita: true, grado: { id: 'successo', nome: testo('prove.regola.colpisce') }, vantaggio: null, regola };
      const t = cartaDa(e, chi, 'attacco', a.nome, bersaglio, null, privata);
      t.automatico = true;
      const fatto = colpisci(t, a, sb, false, danno);
      t.totale = t.danno?.totale ?? 0;
      return { t, testo: testo('prove.fatto.attacco_automatico', { arma: a.nome, bersaglio: o.nome(bersaglio), regola: e.regola, danno: fatto }), esito: e };
    }
    const cosa = cheCosa(sa, { caratteristica: a.caratteristica, abilita: a.abilita, mossa: null }, false) ?? { valore: 0, etichetta: a.nome, mossa: null };
    // The set's situational modifiers (A17): summed into the roll, said in the rule; they replace the arbiter's own
    // advantage for the same action (never ±2 twice for one situation); the help of another PC and conditions stay.
    const situazioni = azione ? modificatoriDellAttacco(s, azione, a) : [];
    // The range band of a missile or thrown line (catalogo.gittate): by the distance said, the band's words, or the
    // set's default; a shot beyond the long limit never gets here (munizioni refuses it).
    const banda = a.gittate && s.catalogo?.gittate ? gittataDelTiro(s.catalogo.gittate, a.gittate, azione ?? '') : null;
    const gittata = banda && !banda.fuori ? banda : null;
    if (gittata) o.log.info({ chi, arma: a.id, fascia: gittata.fascia.id, da: gittata.da, distanza: gittata.distanza }, 'range: the band of the shot');
    const date = situazioni.length ? fontiDate.filter((f) => f.fonte !== 'arbitro') : fontiDate;
    if (situazioni.length) o.log.info({ chi, bersaglio, arma: a.id, modificatori: situazioni.map((m) => `${m.id} ${m.bonus}`), senza_vantaggio_arbitro: date.length !== fontiDate.length }, 'prove: situational modifiers of the set');
    const fonti = [...date, ...fontiAttacco(o.condizioni, chi, bersaglio)];
    // The numbers of the conditions (blinded −4 to hit and +4 to be hit, invisible −4, cover): on the roll, said on the card.
    const valori = valoriAttacco(o.condizioni, chi, bersaglio);
    const v = combinaVantaggi(fonti.map((f) => f.v));
    // d20 contro la difesa del bersaglio; gli altri tipi con la loro risoluzione (fasce, soglia).
    // The target's active AC bonus (Shield: +3 against melee, +6 against missiles) and the attacker's attack bonus.
    const contro = a.distanza ? 'distanza' : 'mischia';
    const difesa = sb.difesa !== null ? sb.difesa + (o.bonusAttivi?.(bersaglio, 'difesa', contro) ?? 0) : null;
    const sist = s.risoluzione.tipo === 'd20_cd' && difesa !== null ? { ...s, difficolta: [{ id: ID_DIFESA, nome: testo('prove.cd.difesa_di', { nome: o.nome(bersaglio) }), valore: difesa, divisore: null, modificatore: null }] } : s;
    // Etichetta una volta sola: senza una mossa né un’abilità la «cosa» è l’arma stessa.
    const etichetta = cosa.etichetta === a.nome ? a.nome : `${a.nome}, ${cosa.etichetta}`;
    // A class or race restriction's penalty with this weapon (Basic Fantasy: a magic-user's sword, −5, p. 187).
    const extra = situazioni.reduce((x, m) => x + m.bonus, 0) + valori.reduce((x, v) => x + v.valore, 0) + (o.bonusAttivi?.(chi, 'attacchi', contro) ?? 0) + (a.penalita ?? 0) + (gittata?.fascia.bonus ?? 0);
    const e = tiraCol(sist, dadiTiro, cosa.valore + extra, sist === s ? null : ID_DIFESA, v, etichetta, true);
    // A target that is always hit (asleep: Basic Fantasy p. 36) is hit whatever the die.
    const sempre = conEffetto(o.condizioni, bersaglio, 'colpito_automaticamente');
    if (sempre && !e.riuscita) {
      e.riuscita = true;
      e.grado = { id: 'successo', nome: testo('prove.regola.colpisce') };
      e.regola += testo('prove.attivi.sempre_colpito', { condizione: sempre.toLowerCase() });
    }
    if (situazioni.length) e.regola += testo('prove.regola.situazioni', { elenco: situazioni.map((m) => `${m.nome} ${m.bonus > 0 ? '+' : '−'}${Math.abs(m.bonus)}`).join(', ') });
    if (valori.length) e.regola += testo('prove.regola.condizioni', { elenco: valori.map((v) => `${v.nome} ${v.valore > 0 ? '+' : '−'}${Math.abs(v.valore)}`).join(', ') });
    if (valori.length) o.log.info({ chi, bersaglio, condizioni: valori }, 'prove: the numbers of the conditions on an attack');
    if (gittata) e.regola += testo(gittata.da === 'predefinita' ? 'prove.equipaggiamento.gittata_predefinita' : 'prove.equipaggiamento.gittata', { fascia: gittata.fascia.nome, bonus: gittata.fascia.bonus ? ` ${gittata.fascia.bonus > 0 ? '+' : '−'}${Math.abs(gittata.fascia.bonus)}` : '', distanza: gittata.distanza !== null ? ` ${gittata.distanza} ${s.catalogo!.gittate!.unita}` : '' });
    if (a.penalita) e.regola += testo('prove.equipaggiamento.penalita_arma', { valore: `−${Math.abs(a.penalita)}`, arma: a.nome });
    e.regola += nota;
    // An edged weapon in a cleric's hand (p. 187): the day's spells are gone.
    if (a.perdeIncantesimi && o.poteri?.risorse.dimenticaIncantesimi(chi)) {
      e.regola += testo('prove.equipaggiamento.perde_incantesimi', { nome: o.nome(chi), arma: a.nome });
      o.log.info({ chi, arma: a.id }, 'gear: a weapon forbidden to the class, the spells of the day are lost');
    }
    const t = cartaDa(e, chi, 'attacco', a.nome, bersaglio, fonti.filter((f) => f.v === v).map((f) => f.motivo).join('; ') || null, privata);
    if (a.distanza) t.a_distanza = true;
    if (!e.riuscita) return { t, testo: testo('prove.fatto.attacco_set', { arma: a.nome, bersaglio: o.nome(bersaglio), regola: e.regola, esito: esitoInParole(e, true) }), esito: e, distanza: a.distanza };
    const nonFerisce = nonFerisceCon(a, sb, munizione);
    const fatto = colpisci(t, a, sb, e.grado?.id === 'critico' || !!conEffetto(o.condizioni, bersaglio, 'critico_contro'), danno, situazioni.some((m) => m.danno === 'doppio') || doppioAbilita, nonFerisce);
    // A hit that hurt applies the line's riders (a ghoul's paralysis): the target saves, then the effects.
    const rider = nonFerisce ? { tiri: [], fatti: [] } : colpendo(a, chi, bersaglio, privata);
    const piu = rider.fatti.length ? ` ${rider.fatti.join(' ')}` : '';
    return { t, testo: testo('prove.fatto.attacco_set_colpito', { arma: a.nome, bersaglio: o.nome(bersaglio), regola: e.regola, esito: esitoInParole(e, true), danno: fatto }) + piu, esito: e, distanza: a.distanza, ...(rider.tiri.length ? { altri: rider.tiri } : {}) };
  }
  /**
   * An attack's ammunition (`attacchi[].consuma`): the line that refuses it when the counter is at 0, or null (it can
   * shoot: no ammunition needed, not tracked, or some left).
   */
  function munizioni(chi: string, idArma: string | null, azione?: string): string | null {
    const sch = o.schede.get(chi);
    const a = sch ? arma(sch, idArma) : null;
    // Catalog ammunition, the range limit, the rate of fire (M2).
    if (a?.munizioni?.length && o.poteri && !a.munizioni.some((m) => (o.poteri!.risorse.restanti(chi, chiaveOggetto(m)) ?? 0) > 0)) {
      o.log.info({ chi, arma: a.id, munizioni: a.munizioni }, 'inventory: out of ammunition, no attack');
      return testo('prove.poteri.senza_munizioni', { nome: o.nome(chi), risorsa: (voce(s.catalogo, a.munizioni[0]!)?.nome ?? a.munizioni[0]!).toLowerCase(), arma: a.nome });
    }
    const banda = a?.gittate && s.catalogo?.gittate ? gittataDelTiro(s.catalogo.gittate, a.gittate, azione ?? '') : null;
    if (a && banda?.fuori) {
      o.log.info({ chi, arma: a.id, distanza: banda.distanza, massimo: banda.massimo }, 'range: beyond the long range, no attack');
      return testo('prove.equipaggiamento.fuori_gittata', { nome: o.nome(chi), arma: a.nome, distanza: banda.distanza, massimo: banda.massimo, unita: s.catalogo!.gittate!.unita });
    }
    const ultimo = a?.ricarica && a.ricarica > 1 && o.round != null && o.poteri ? o.poteri.risorse.ultimoTiro(chi, a.id) : null;
    if (a && ultimo !== null && o.round! - ultimo < a.ricarica!) {
      o.log.info({ chi, arma: a.id, ultimo, round: o.round, ricarica: a.ricarica }, 'range: the weapon is reloading, no attack');
      return testo('prove.equipaggiamento.ricarica', { nome: o.nome(chi), arma: a.nome, n: a.ricarica! });
    }
    if (!a?.consuma || !o.poteri) return null;
    const n = o.poteri.risorse.restanti(chi, a.consuma);
    if (n === null || n > 0) return null;
    o.log.info({ chi, arma: a.id, risorsa: a.consuma }, 'resources: out of ammunition, no attack');
    return testo('prove.poteri.senza_munizioni', { nome: o.nome(chi), risorsa: (s.risorse ?? []).find((r) => r.id === a.consuma)?.nome.toLowerCase() ?? a.consuma, arma: a.nome });
  }
  return { cheCosa, cartaDa, colpisci, attacca, bersaglioDiSalvezza, salvezzaDelBersaglio, munizioni, aggiustamentoDi };
}
