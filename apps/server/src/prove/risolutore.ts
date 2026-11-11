/**
 * Risolutore dei tiri di un turno (docs/prove.md, «Flusso»): dalle decisioni dell'arbitro e dalle
 * schede ai dadi, alle carte per proiettore e telefoni e alle righe di fatto per il narratore.
 * Deterministico data la FonteDadi: con un seme fissato i test rifanno lo stesso turno.
 *
 * Ordine: le azioni nell'ordine di risoluzione del tavolo; prima si raccolgono gli «aiuto» (danno
 * vantaggio all'azione aiutata), poi ogni azione tira, e dopo di lei l'eventuale reazione del PNG.
 * I PF cambiano subito: il secondo attacco allo stesso PNG lo trova già ferito.
 *
 * Il Motore decide i numeri (CD, CA, modificatori); dell'arbitro si tiene solo ciò che torna con i
 * dati (un id inesistente, un'arma che il PG non ha, una prova della scena sconosciuta si scartano).
 */
import type { TiroMostrato, Vantaggio } from '@cantastorie/shared';
import type { Logger } from '../logger';
import {
  ABILITA_INFLUENZA,
  CARATTERISTICA_DI,
  DIFFICOLTA,
  chiave,
  nomeAbilita,
  nomeDifficolta,
  type Abilita,
  type Caratteristica,
} from '../campagna/regole-srd';
import { testo } from '../lingua';
import { datiProve, paroleProve } from './lingua';
import { bonusAttacco, bonusDanno, cdInfluenza, modAbilita, modCaratteristica, modSalvezza, passiva, type AttaccoScheda, type SchedaNumerica } from '../campagna/schede';
import type { ProvaScena } from '../campagna/prove-scena';
import type { FonteDadi } from './dadi';
import { attacco, combinaVantaggi, contesa, prova, type EsitoAttacco } from './regole';
import type { StatoProve } from './stato';
import type { DecisioneProva, EsitoAzioneProve, EsitoTurnoProve } from './tipi';
import { conEffetto, fontiAttacco, type CondizioniDi } from './condizioni';
import {
  dannoMostrato,
  etichettaProva,
  etichettaSalvezza,
  fattoAiuto,
  fattoAttaccoSenzaScheda,
  fattoFuggito,
  fattoGiaATerra,
  fattoImpossibile,
  fattoNessunTiro,
  fattoSenzaArbitro,
  fattoSenzaScheda,
  fattoTiro,
  fraseAttaccoPng,
  prefissoFatto,
  salute,
  salutePg,
} from './testi';

export type Atteggiamento = 'ostile' | 'indifferente' | 'amichevole';

export interface AzioneRisolvibile {
  id: string;
  autore: string;
  testo: string;
  privata: boolean;
}

export interface OpzioniRisolutore {
  turno: number;
  /** Azioni chiuse, in ordine di risoluzione. */
  azioni: AzioneRisolvibile[];
  /** id azione → decisione (null o assente = l'arbitro non ha deciso). */
  decisioni: ReadonlyMap<string, DecisioneProva | null>;
  schede: ReadonlyMap<string, SchedaNumerica>;
  stato: StatoProve;
  dadi: FonteDadi;
  proveScena: readonly ProvaScena[];
  nome: (id: string) => string;
  /** L'id è un PG o un PNG della campagna. */
  esiste: (id: string) => boolean;
  /** Atteggiamento del PNG verso quel PG (png.atteggiamento_pg), se la scheda lo dice. */
  atteggiamento: (png: string, pg: string) => Atteggiamento | null;
  /** Modalità A: il narratore conosce gli indizi, si può nominare quello che la prova sblocca. */
  conIndizi: boolean;
  /** Condizioni attive (combattimento): vantaggi, svantaggi, critici, turni persi. Assente = nessuna. */
  condizioni?: CondizioniDi;
  log: Logger;
}

/**
 * Colpo senz'armi (SRD 5.2): Forza + competenza per colpire, 1 + Forza di danno contundente. Il nome,
 * sulla carta, è quello della lingua dei contenuti (prove.yaml, nomi.colpo_senz_armi).
 */
function colpoSenzArmi(): AttaccoScheda {
  return {
    id: 'colpo_senz_armi',
    nome: datiProve().nomi.colpo_senz_armi,
    caratteristica: 'forza',
    competente: true,
    danno: { numero: 0, facce: 0, bonus: 1 },
    tipo_danno: 'contundente',
    distanza: false,
    bonus: 0,
  };
}

/** Abilità che di solito si oppone a quella del PG, se l'arbitro non la dice. */
const OPPOSTA: Partial<Record<Abilita, Abilita>> = {
  furtivita: 'percezione',
  rapidita_di_mano: 'percezione',
  inganno: 'intuizione',
  intimidire: 'intuizione',
  persuasione: 'intuizione',
  atletica: 'atletica',
  acrobazia: 'atletica',
};

interface FonteVantaggio {
  v: Vantaggio;
  motivo: string;
}

function vantaggioDa(fonti: FonteVantaggio[]): { v: Vantaggio | null; motivo: string | null } {
  const v = combinaVantaggi(fonti.map((f) => f.v));
  if (!v) return { v: null, motivo: fonti.length ? testo('prove.motivo.annullati') : null };
  const motivi = fonti.filter((f) => f.v === v && f.motivo).map((f) => f.motivo);
  return { v, motivo: motivi.length ? motivi.join('; ') : null };
}

/** L'arma scelta dall'arbitro tra quelle della scheda (per id o per nome), la prima, o a mani nude. */
export function scegliArma(s: SchedaNumerica, arma: string | null): AttaccoScheda {
  if (arma) {
    const k = chiave(arma);
    const trovata = s.attacchi.find((a) => a.id === k) ?? s.attacchi.find((a) => a.id.includes(k) || k.includes(a.id));
    if (trovata) return trovata;
    if (paroleProve().senzArmi.test(k)) return colpoSenzArmi();
  }
  return s.attacchi[0] ?? colpoSenzArmi();
}

/**
 * Ritocchi deterministici alla decisione dell'arbitro, dove i dati o l'SRD dicono altro:
 * - una prova della scena valida decide il tipo (prova o salvezza), salvo un attacco;
 * - convincere, mentire, minacciare, incantare un PNG è Influenzare (prova con la CD del PNG),
 *   anche se l'arbitro l'ha chiamata «contrapposta»;
 * - una contrapposta senza abilità né caratteristica diventa una prova di Forza (Atletica).
 */
export function normalizzaDecisione(d: DecisioneProva, prove: readonly ProvaScena[]): DecisioneProva {
  const ps = d.prova_scena ? prove.find((p) => p.id === d.prova_scena) : undefined;
  if (d.prova_scena && !ps) d = { ...d, prova_scena: null };
  if (ps && d.tipo !== 'attacco' && d.tipo !== 'aiuto' && d.tipo !== 'impossibile') {
    return { ...d, tipo: ps.salvezza ? 'salvezza' : 'prova', abilita: ps.abilita, caratteristica: ps.caratteristica };
  }
  if (d.tipo === 'contrapposta' && d.abilita && ABILITA_INFLUENZA.has(d.abilita) && d.bersaglio?.startsWith('png_')) {
    return { ...d, tipo: 'prova', abilita_bersaglio: null, difficolta: null };
  }
  if (d.tipo === 'contrapposta' && !d.abilita && !d.caratteristica) return { ...d, abilita: 'atletica' };
  return d;
}

export function risolviTurno(o: OpzioniRisolutore): Omit<EsitoTurnoProve, 'attesa_ms' | 'tardive' | 'combattimento'> {
  const perAzione = new Map<string, EsitoAzioneProve>();
  const tiri: TiroMostrato[] = [];
  const fatti: string[] = [];
  const idAzioni = new Set(o.azioni.map((a) => a.id));
  const nomePg = (id: string): string => o.nome(id);

  // 1. Aiuti: l'azione aiutata (dello stesso turno, di un altro PG) ha vantaggio.
  const aiutanti = new Map<string, string[]>();
  for (const a of o.azioni) {
    const d = o.decisioni.get(a.id);
    if (d?.tipo !== 'aiuto' || !d.aiuta || !idAzioni.has(d.aiuta) || d.aiuta === a.id) continue;
    aiutanti.set(d.aiuta, [...(aiutanti.get(d.aiuta) ?? []), nomePg(a.autore)]);
  }

  const carta = (base: Omit<TiroMostrato, 'id' | 'turno'>): TiroMostrato => ({ id: o.stato.nuovoIdTiro(), turno: o.turno, ...base });

  o.azioni.forEach((a, i) => {
    const grezza = o.decisioni.get(a.id) ?? null;
    const d = grezza ? normalizzaDecisione(grezza, o.proveScena) : null;
    if (grezza && d && (d.tipo !== grezza.tipo || d.abilita !== grezza.abilita)) o.log.info({ azione: a.id, da: [grezza.tipo, grezza.abilita], a: [d.tipo, d.abilita] }, 'prove: decisione ritoccata dal Motore');
    const prefisso = prefissoFatto(i + 1, nomePg(a.autore), a.autore, a.privata);
    const esito: EsitoAzioneProve = { id_azione: a.id, autore: a.autore, decisione: d, tiri: [], fatto: '', riuscite: [], riuscita: null };
    const aggiungi = (t: TiroMostrato): void => {
      esito.tiri.push(t);
      tiri.push(t);
    };
    const log = o.log.child({ azione: a.id, autore: a.autore });
    const scheda = o.schede.get(a.autore) ?? null;
    const fontiAiuto: FonteVantaggio[] = (aiutanti.get(a.id) ?? []).map((n) => ({ v: 'vantaggio', motivo: testo('prove.motivo.aiuta', { nome: n }) }));
    const fonteArbitro: FonteVantaggio[] = d?.vantaggio ? [{ v: d.vantaggio, motivo: d.motivo }] : [];

    let fatto: string;
    if (!d) {
      fatto = fattoSenzaArbitro();
      log.warn('prove: nessuna decisione dell\'arbitro, nessun tiro');
    } else if (o.stato.aTerra(a.autore)) {
      fatto = testo('prove.fatto.a_terra_autore');
    } else if (conEffetto(o.condizioni, a.autore, 'perde_turno')) {
      fatto = testo('prove.fatto.perde_turno', { condizione: conEffetto(o.condizioni, a.autore, 'perde_turno')!.toLowerCase() });
    } else if (d.tipo === 'nessuna') {
      fatto = fattoNessunTiro();
    } else if (d.tipo === 'impossibile') {
      fatto = fattoImpossibile(d.motivo);
    } else if (d.tipo === 'aiuto') {
      const aiutata = d.aiuta && idAzioni.has(d.aiuta) && d.aiuta !== a.id ? o.azioni.find((x) => x.id === d.aiuta)! : null;
      fatto = fattoAiuto(aiutata ? nomePg(aiutata.autore) : null);
    } else if (!scheda) {
      fatto = fattoSenzaScheda();
      log.warn({ tipo: d.tipo }, 'prove: serve un tiro ma il PG non ha una scheda numerica («sì, ma»)');
    } else if (d.tipo === 'attacco') {
      fatto = risolviAttacco(o, a, d, scheda, [...fonteArbitro, ...fontiAiuto], aggiungi, esito, log);
    } else if (d.tipo === 'contrapposta') {
      fatto = risolviContrapposta(o, a, d, scheda, [...fonteArbitro, ...fontiAiuto], aggiungi, esito, log);
    } else {
      fatto = risolviProva(o, a, d, scheda, fonteArbitro, fontiAiuto, aggiungi, esito, log);
    }

    // Reazione del PNG: dopo l'azione, se la condizione vale e chi reagisce è in piedi.
    const r = d?.reazione;
    if (r && (r.condizione === 'sempre' || (r.condizione === 'se_fallisce' && esito.riuscita === false))) {
      const extra = reazione(o, a, r.png, aggiungi, log);
      if (extra) fatto += ` ${extra}`;
    }
    esito.fatto = prefisso + fatto;
    fatti.push(esito.fatto);
    perAzione.set(a.id, esito);
    log.info(
      { tipo: d?.tipo ?? null, tiri: esito.tiri.map((t) => ({ id: t.id, etichetta: t.etichetta, dadi: t.dadi, mod: t.modificatore, totale: t.totale, contro: t.contro.valore, riuscita: t.riuscita, danno: t.danno?.totale ?? null })), riuscita: esito.riuscita },
      'prove: azione risolta',
    );
  });

  function risolviProva(
    o: OpzioniRisolutore,
    a: AzioneRisolvibile,
    d: DecisioneProva,
    s: SchedaNumerica,
    fontiArbitro: FonteVantaggio[],
    fontiAiuto: FonteVantaggio[],
    aggiungi: (t: TiroMostrato) => void,
    esito: EsitoAzioneProve,
    log: Logger,
  ): string {
    const ps = d.prova_scena ? (o.proveScena.find((p) => p.id === d.prova_scena) ?? null) : null;
    if (d.prova_scena && !ps) log.warn({ prova_scena: d.prova_scena }, 'prove: prova della scena sconosciuta, si usa la scala');
    const salvezza = ps ? ps.salvezza : d.tipo === 'salvezza';
    let abil: Abilita | null = ps ? ps.abilita : d.abilita;
    let car: Caratteristica | null = ps ? ps.caratteristica : d.caratteristica;
    if (salvezza) {
      car = car ?? (abil ? CARATTERISTICA_DI[abil] : 'destrezza');
      abil = null; // i tiri salvezza non usano abilità
    }
    if (!abil && !car) {
      log.warn('prove: prova senza abilità né caratteristica, nessun tiro');
      return fattoNessunTiro();
    }
    const bersaglio = d.bersaglio && o.esiste(d.bersaglio) && d.bersaglio !== a.autore ? d.bersaglio : null;
    const fonti = [...fontiArbitro, ...fontiAiuto];
    const condSv = conEffetto(o.condizioni, a.autore, salvezza ? 'svantaggio_salvezze' : 'svantaggio_prove');
    if (condSv) fonti.push({ v: 'svantaggio', motivo: condSv.toLowerCase() });
    // Paralizzato, stordito, privo di sensi (SRD 5.2): i TS di Forza e Destrezza falliscono da soli.
    const autoFallita = salvezza && (car === 'forza' || car === 'destrezza') ? conEffetto(o.condizioni, a.autore, 'fallisce_salvezze_forza_destrezza') : null;
    let cd: number;
    let descrizione: string | null;
    if (ps) {
      cd = ps.cd;
      descrizione = null;
    } else if (!salvezza && abil && ABILITA_INFLUENZA.has(abil) && bersaglio?.startsWith('png_')) {
      // Influenzare (SRD 5.2): CD 15 o l'Intelligenza del PNG; amichevole vantaggio, ostile svantaggio.
      cd = cdInfluenza(o.schede.get(bersaglio) ?? null);
      descrizione = testo('prove.cd.influenzare', { nome: o.nome(bersaglio) });
      const att = o.atteggiamento(bersaglio, a.autore);
      if (att === 'amichevole') fonti.push({ v: 'vantaggio', motivo: testo('prove.motivo.ben_disposto', { nome: o.nome(bersaglio) }) });
      if (att === 'ostile') fonti.push({ v: 'svantaggio', motivo: testo('prove.motivo.ostile', { nome: o.nome(bersaglio) }) });
    } else {
      const diff = d.difficolta ?? 'media';
      cd = DIFFICOLTA[diff];
      descrizione = nomeDifficolta(diff);
    }
    const { v, motivo } = vantaggioDa(fonti);
    const mod = salvezza ? modSalvezza(s, car!) : abil ? modAbilita(s, abil) : modCaratteristica(s, car!);
    const e = prova(o.dadi, mod, cd, v);
    if (autoFallita) e.riuscita = false;
    const t = carta({
      chi: a.autore,
      nome: o.nome(a.autore),
      di_png: false,
      tipo: salvezza ? 'salvezza' : 'prova',
      etichetta: salvezza ? etichettaSalvezza(car!) : etichettaProva(abil, car),
      dadi: e.dadi,
      dado: e.dado,
      vantaggio: e.vantaggio,
      motivo_vantaggio: e.vantaggio ? motivo : null,
      modificatore: mod,
      totale: e.totale,
      contro: { tipo: 'CD', valore: cd, descrizione },
      bersaglio: bersaglio ? { id: bersaglio, nome: o.nome(bersaglio) } : null,
      riuscita: e.riuscita,
      critico: false,
      fallimento_critico: false,
      danno: null,
      a_terra: false,
      privata: a.privata,
      avversario: null,
    });
    aggiungi(t);
    esito.riuscita = e.riuscita;
    if (e.riuscita) esito.riuscite.push(...[salvezza ? 'salvezza' : 'prova', abil, car, ps?.id].filter((x): x is string => !!x));
    let f = fattoTiro(t, null);
    if (autoFallita) f += testo('prove.fatto.fallisce_da_solo', { condizione: autoFallita.toLowerCase() });
    if (ps?.se_fallisce && !e.riuscita) f += testo('prove.fatto.prezzo', { prezzo: ps.se_fallisce });
    if (ps?.essenziale && !e.riuscita) f += testo('prove.fatto.essenziale');
    if (ps?.indizio && e.riuscita && o.conIndizi && !ps.essenziale) f += testo('prove.fatto.trova_indizio', { indizio: ps.indizio });
    if (ps?.indizio && !e.riuscita && !ps.essenziale) f += testo('prove.fatto.non_trova');
    return f;
  }

  function risolviAttacco(
    o: OpzioniRisolutore,
    a: AzioneRisolvibile,
    d: DecisioneProva,
    s: SchedaNumerica,
    fonti: FonteVantaggio[],
    aggiungi: (t: TiroMostrato) => void,
    esito: EsitoAzioneProve,
    log: Logger,
  ): string {
    const id = d.bersaglio && o.esiste(d.bersaglio) && d.bersaglio !== a.autore ? d.bersaglio : null;
    const ts = id ? (o.schede.get(id) ?? null) : null;
    if (!id || !ts) {
      log.warn({ bersaglio: d.bersaglio }, 'prove: attacco a un bersaglio senza scheda («sì, ma»)');
      return fattoAttaccoSenzaScheda(id ? o.nome(id) : null);
    }
    // Chi è fuggito non è più qui: niente tiro, e niente secondo scontro (e2e finale, bug C3).
    if (o.stato.fuoriGioco(id) === 'fuggito') return fattoFuggito(o.nome(id));
    if (o.stato.aTerra(id)) return fattoGiaATerra(o.nome(id));
    const arma = scegliArma(s, d.arma);
    if (d.arma && arma.id !== chiave(d.arma)) log.info({ arma: d.arma, usata: arma.id }, 'prove: arma dell\'arbitro ricondotta alla scheda');
    const { v, motivo } = vantaggioDa([...fonti, ...fontiAttacco(o.condizioni, a.autore, id)]);
    const e = attacco(o.dadi, bonusAttacco(s, arma), ts.ca, v, arma.danno, bonusDanno(s, arma), !!conEffetto(o.condizioni, id, 'critico_contro'));
    const { t, saluteTesto } = cartaAttacco(o, a.autore, id, arma, e, v ? motivo : null, a.privata);
    aggiungi(t);
    esito.riuscita = e.riuscita;
    if (e.riuscita) esito.riuscite.push('attacco', arma.id);
    return fattoTiro(t, saluteTesto);
  }

  function risolviContrapposta(
    o: OpzioniRisolutore,
    a: AzioneRisolvibile,
    d: DecisioneProva,
    s: SchedaNumerica,
    fonti: FonteVantaggio[],
    aggiungi: (t: TiroMostrato) => void,
    esito: EsitoAzioneProve,
    log: Logger,
  ): string {
    const abil = d.abilita ?? (d.caratteristica ? null : 'atletica');
    const car = abil ? CARATTERISTICA_DI[abil] : d.caratteristica!;
    const mod = abil ? modAbilita(s, abil) : modCaratteristica(s, car);
    const id = d.bersaglio && o.esiste(d.bersaglio) && d.bersaglio !== a.autore ? d.bersaglio : null;
    const abilB: Abilita = d.abilita_bersaglio ?? (abil ? (OPPOSTA[abil] ?? 'percezione') : 'percezione');
    const ts = id ? (o.schede.get(id) ?? null) : null;
    const { v, motivo } = vantaggioDa(fonti);
    const base = {
      chi: a.autore,
      nome: o.nome(a.autore),
      di_png: false,
      tipo: 'contrapposta' as const,
      etichetta: etichettaProva(abil, car),
      vantaggio: v,
      motivo_vantaggio: v ? motivo : null,
      modificatore: mod,
      bersaglio: id ? { id, nome: o.nome(id) } : null,
      critico: false,
      fallimento_critico: false,
      danno: null,
      a_terra: false,
      privata: a.privata,
    };
    // Contro un altro PG con la scheda: tirano tutti e due.
    if (id && ts && !ts.di_png) {
      const modB = modAbilita(ts, abilB);
      const c = contesa(o.dadi, mod, v, modB, null);
      const t = carta({
        ...base,
        dadi: c.a.dadi,
        dado: c.a.dado,
        totale: c.a.totale,
        contro: { tipo: 'CD', valore: c.b.totale, descrizione: testo('prove.cd.tiro_di', { nome: o.nome(id) }) },
        riuscita: c.vince === 'a',
        avversario: { nome: o.nome(id), etichetta: etichettaProva(abilB, null), dadi: c.b.dadi, dado: c.b.dado, modificatore: modB, totale: c.b.totale },
      });
      aggiungi(t);
      esito.riuscita = c.vince === 'a';
      if (esito.riuscita) esito.riuscite.push('prova', 'contrapposta', ...(abil ? [abil] : []), car);
      return fattoTiro(t, null);
    }
    // Contro un PNG: il suo punteggio passivo (10 + modificatore) fa da CD.
    if (id && !ts) log.warn({ bersaglio: id }, 'prove: contrapposta contro un PNG senza scheda, passivo 10');
    const cd = ts ? passiva(ts, abilB) : 10;
    const e = prova(o.dadi, mod, cd, v);
    const t = carta({
      ...base,
      dadi: e.dadi,
      dado: e.dado,
      totale: e.totale,
      contro: { tipo: 'CD', valore: cd, descrizione: id ? testo('prove.cd.passiva_di', { abilita: nomeAbilita(abilB), nome: o.nome(id) }) : testo('prove.cd.passiva', { abilita: nomeAbilita(abilB) }) },
      riuscita: e.riuscita,
      avversario: null,
    });
    aggiungi(t);
    esito.riuscita = e.riuscita;
    if (e.riuscita) esito.riuscite.push('prova', 'contrapposta', ...(abil ? [abil] : []), car);
    return fattoTiro(t, null);
  }

  return { turno: o.turno, perAzione, tiri, fatti };
}

/** Una carta nuova col prossimo id del turno. */
function nuovaCarta(o: Omit<OpzioniRisolutore, 'azioni' | 'decisioni'>, base: Omit<TiroMostrato, 'id' | 'turno'>): TiroMostrato {
  return { id: o.stato.nuovoIdTiro(), turno: o.turno, ...base };
}

export function cartaAttacco(
  o: Omit<OpzioniRisolutore, 'azioni' | 'decisioni'>,
  chi: string,
  bersaglio: string,
  arma: AttaccoScheda,
  e: EsitoAttacco,
  motivo: string | null,
  privata: boolean,
): { t: TiroMostrato; saluteTesto: string | null } {
  const ts = o.schede.get(bersaglio)!;
  const applicato = e.danno ? o.stato.danneggia(bersaglio, e.danno.totale) : null;
  const pf = o.stato.puntiFerita(bersaglio);
  const saluteTesto = applicato && pf ? (ts.di_png ? salute(pf.attuali, pf.massimi) : salutePg(pf.attuali, pf.massimi)) : null;
  const t = nuovaCarta(o, {
    chi,
    nome: o.nome(chi),
    di_png: o.schede.get(chi)?.di_png ?? chi.startsWith('png_'),
    tipo: 'attacco',
    etichetta: arma.nome,
    dadi: e.dadi,
    dado: e.dado,
    vantaggio: e.vantaggio,
    motivo_vantaggio: e.vantaggio ? motivo : null,
    modificatore: e.modificatore,
    totale: e.totale,
    contro: { tipo: 'CA', valore: ts.ca, descrizione: testo('prove.cd.ca_di', { nome: o.nome(bersaglio) }) },
    bersaglio: { id: bersaglio, nome: o.nome(bersaglio) },
    riuscita: e.riuscita,
    critico: e.critico,
    fallimento_critico: e.fallimento_critico,
    danno: e.danno ? dannoMostrato({ formula: e.danno.formula, dadi: e.danno.dadi, bonus: e.danno.bonus, totale: e.danno.totale, tipo: arma.tipo_danno }) : null,
    a_terra: !!pf && pf.attuali <= 0,
    privata,
    avversario: null,
  });
  return { t, saluteTesto };
}

/** Il PNG reagisce attaccando l'autore dell'azione (se ha una scheda ed è in piedi). */
function reazione(o: OpzioniRisolutore, a: AzioneRisolvibile, png: string, aggiungi: (t: TiroMostrato) => void, log: Logger): string | null {
  const ps = o.schede.get(png);
  const bs = o.schede.get(a.autore);
  if (!ps || !ps.di_png || !bs) {
    log.info({ png }, 'prove: reazione senza schede, nessun tiro');
    return null;
  }
  if (o.stato.aTerra(png) || o.stato.aTerra(a.autore)) return null;
  const r = attaccoPngSrd(o, png, a.autore, a.privata);
  if (!r) return null;
  aggiungi(r.t);
  return testo('prove.fatto.reazione', { nome: o.nome(png), frase: fraseAttaccoPng(r.t), dettagli: r.testo });
}

/**
 * Un PNG attacca un PG (reazione, o il suo turno in combattimento): prima arma della scheda, contro
 * la CA del PG, con le condizioni di tutti e due. null se mancano le schede o uno dei due è a terra.
 */
export function attaccoPngSrd(o: Omit<OpzioniRisolutore, 'azioni' | 'decisioni'>, png: string, bersaglio: string, privata = false, idArma: string | null = null): { t: TiroMostrato; testo: string } | null {
  const ps = o.schede.get(png);
  const bs = o.schede.get(bersaglio);
  if (!ps || !bs || o.stato.aTerra(png) || o.stato.aTerra(bersaglio)) return null;
  const arma = scegliArma(ps, idArma);
  const { v, motivo } = vantaggioDa(fontiAttacco(o.condizioni, png, bersaglio));
  const e = attacco(o.dadi, bonusAttacco(ps, arma), bs.ca, v, arma.danno, bonusDanno(ps, arma), !!conEffetto(o.condizioni, bersaglio, 'critico_contro'));
  const { t, saluteTesto } = cartaAttacco(o, png, bersaglio, arma, e, v ? motivo : null, privata);
  return { t, testo: fattoTiro(t, saluteTesto) };
}
