/**
 * Risolutore dei tiri per i set di regole non SRD (docs/regole.md, «Flusso»): come prove/risolutore.ts
 * (aiuti, poi ogni azione nell'ordine, poi la reazione del PNG; PF subito aggiornati), ma con il
 * vocabolario e la risoluzione del manuale: d20 contro CD, 2d6 a fasce con le mosse, sotto soglia.
 * L'SRD 5.2 resta su prove/risolutore.ts, identico.
 */
import type { TiroMostrato, Vantaggio } from '@cantastorie/shared';
import { chiave, conSegno } from '../campagna/regole-srd';
import type { Campagna, DatiYaml } from '../campagna/tipi';
import type { Logger } from '../logger';
import { tiraCol, type EsitoTiroGenerico } from '../regole/risoluzione';
import { valoreCaratteristica } from '../regole/schede';
import type { SchedaGenerica, SistemaRegole } from '../regole/tipi';
import type { FonteDadi } from './dadi';
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
  fattoGiaATerra,
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
import { conEffetto, fontiAttacco, type CondizioniDi } from './condizioni';

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
}

/** Le prove della scena per un set non SRD: id del set, difficoltà per id (non la CD dell'SRD). */
export function proveScenaRegole(s: SistemaRegole, c: Campagna): ProvaScenaRegole[] {
  const grezze = c.scena.dati['prove'];
  if (!Array.isArray(grezze)) return [];
  return grezze.flatMap((g) => {
    const d = g as DatiYaml;
    if (typeof d?.['id'] !== 'string') return [];
    const pick = (k: string, ammessi: Array<{ id: string }>): string | null => (typeof d[k] === 'string' && ammessi.some((x) => x.id === d[k]) ? (d[k] as string) : null);
    return [{ id: d['id'], quando: typeof d['quando'] === 'string' ? d['quando'] : '', caratteristica: pick('caratteristica', s.caratteristiche), abilita: pick('abilita', s.abilita), mossa: pick('mossa', s.mosse), difficolta: pick('difficolta', s.difficolta), se_fallisce: typeof d['se_fallisce'] === 'string' ? d['se_fallisce'] : null, parole: Array.isArray(d['parole']) ? (d['parole'] as unknown[]).filter((p): p is string => typeof p === 'string') : [] }];
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

export function risolviTurnoRegole(o: OpzioniRisolutoreRegole): Omit<EsitoTurnoProve, 'attesa_ms' | 'tardive' | 'combattimento'> {
  const s = o.sistema;
  const perAzione = new Map<string, EsitoAzioneProve>();
  const tiri: TiroMostrato[] = [];
  const fatti: string[] = [];
  const ids = new Set(o.azioni.map((a) => a.id));
  const aiutanti = new Map<string, string[]>();
  for (const a of o.azioni) {
    const d = o.decisioni.get(a.id);
    if (d?.tipo === 'aiuto' && d.aiuta && ids.has(d.aiuta) && d.aiuta !== a.id) aiutanti.set(d.aiuta, [...(aiutanti.get(d.aiuta) ?? []), o.nome(a.autore)]);
  }
  const { cheCosa, cartaDa, attacca } = strumentiRegole(o);

  o.azioni.forEach((a, i) => {
    const d = o.decisioni.get(a.id) ?? null;
    const prefisso = prefissoFatto(i + 1, o.nome(a.autore), a.autore, a.privata);
    const esito: EsitoAzioneProve = { id_azione: a.id, autore: a.autore, decisione: null, tiri: [], fatto: '', riuscite: [], riuscita: null };
    const aggiungi = (t: TiroMostrato): void => {
      esito.tiri.push(t);
      tiri.push(t);
    };
    const sch = o.schede.get(a.autore) ?? null;
    const fonti: Array<{ v: Vantaggio; motivo: string }> = [...(d?.vantaggio ? [{ v: d.vantaggio, motivo: d.motivo }] : []), ...(aiutanti.get(a.id) ?? []).map((n) => ({ v: 'vantaggio' as const, motivo: testo('prove.motivo.aiuta', { nome: n }) }))];
    let fatto: string;
    if (!d) fatto = fattoSenzaArbitro();
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
    } else if (d.tipo === 'attacco') {
      const b = d.bersaglio && o.esiste(d.bersaglio) && d.bersaglio !== a.autore ? d.bersaglio : null;
      if (!b || !o.schede.get(b)) fatto = fattoAttaccoSenzaScheda(b ? o.nome(b) : null);
      else if (o.stato.aTerra(b)) fatto = fattoGiaATerra(o.nome(b));
      else {
        const r = attacca(a.autore, b, d.arma, fonti, a.privata)!;
        aggiungi(r.t);
        esito.riuscita = r.esito?.riuscita ?? null;
        if (r.esito?.riuscita) esito.riuscite.push('attacco', r.t.etichetta);
        fatto = r.testo;
        // 2d6: con un successo parziale anche il bersaglio colpisce (lo scambio del manuale).
        if (r.esito?.grado?.id === 'parziale' && s.attacchi.parzialeScambio && !d.reazione) {
          const x = attacca(b, a.autore, null, [], a.privata);
          if (x && !o.stato.aTerra(b)) {
            aggiungi(x.t);
            fatto += testo('prove.fatto.scambio', { frase: fraseAttaccoPng(x.t), dettagli: x.testo });
          }
        }
      }
    } else {
      // prova, salvezza, contrapposta: col set sono tutte prove, con la difficoltà del manuale.
      const ps = d.prova_scena ? (o.proveScena.find((p) => p.id === d.prova_scena) ?? null) : null;
      const sociale = !!d.bersaglio?.startsWith('png_');
      const cosa = cheCosa(sch, ps ?? d, sociale);
      if (!cosa) {
        fatto = fattoNessunTiro();
        o.log.warn({ azione: a.id, decisione: d }, 'prove: decisione senza caratteristica, abilità né mossa del set: nessun tiro');
      } else {
        const condSv = conEffetto(o.condizioni, a.autore, 'svantaggio_prove');
        if (condSv) fonti.push({ v: 'svantaggio', motivo: condSv.toLowerCase() });
        const v = combinaVantaggi(fonti.map((f) => f.v));
        const e = tiraCol(s, o.dadi, cosa.valore, ps?.difficolta ?? d.difficolta, v, cosa.etichetta);
        const b = d.bersaglio && o.esiste(d.bersaglio) && d.bersaglio !== a.autore ? d.bersaglio : null;
        aggiungi(cartaDa(e, a.autore, 'prova', cosa.etichetta, b, fonti.filter((f) => f.v === v).map((f) => f.motivo).join('; ') || null, a.privata));
        esito.riuscita = e.riuscita;
        // Prove riuscite per il cancello `richiede.prova`: anche gli id del set (mossa, abilità, caratteristica).
        if (e.riuscita) esito.riuscite.push(...new Set(['prova', ...[d.abilita, d.caratteristica, d.mossa, ps?.id, ps?.mossa, ps?.abilita, ps?.caratteristica, cosa.mossa?.id, cosa.mossa?.caratteristica].filter((x): x is string => !!x)]));
        fatto = testo('prove.fatto.prova_set', { regola: e.regola, vantaggio: conVantaggio(e.vantaggio), valore: s.risoluzione.tipo === 'sotto_soglia' ? e.dado : e.totale, esito: esitoInParole(e) });
        if (cosa.mossa) {
          const esitoMossa = e.grado?.id === 'parziale' ? (cosa.mossa.esiti.parziale ?? cosa.mossa.esiti.successo) : e.riuscita ? cosa.mossa.esiti.successo : cosa.mossa.esiti.fallimento;
          fatto += testo('prove.fatto.esito_mossa', { mossa: cosa.mossa.nome, esito: esitoMossa });
        }
        if (!e.riuscita && ps?.se_fallisce) fatto += testo('prove.fatto.prezzo', { prezzo: ps.se_fallisce });
      }
    }
    // Reazione del PNG: dopo l'azione, se la condizione vale.
    const r = d?.reazione;
    if (r && sch && (r.condizione === 'sempre' || (r.condizione === 'se_fallisce' && esito.riuscita === false)) && !o.stato.aTerra(r.png) && !o.stato.aTerra(a.autore)) {
      const x = attacca(r.png, a.autore, null, [], a.privata);
      if (x) {
        aggiungi(x.t);
        fatto += ` ${testo('prove.fatto.reazione', { nome: o.nome(r.png), frase: fraseAttaccoPng(x.t), dettagli: x.testo })}`;
      }
    }
    esito.decisione = null;
    esito.fatto = prefisso + fatto;
    fatti.push(esito.fatto);
    perAzione.set(a.id, esito);
    o.log.info({ azione: a.id, autore: a.autore, tipo: d?.tipo ?? null, mossa: d?.mossa ?? null, tiri: esito.tiri.map((t) => ({ etichetta: t.etichetta, dadi: t.dadi, totale: t.totale, regola: t.regola, grado: t.grado?.nome ?? null })) }, 'prove: azione risolta (set del manuale)');
  });
  void conSegno;
  return { turno: o.turno, perAzione, tiri, fatti };
}

/**
 * Gli strumenti di un turno col set: che cosa si tira, le carte, il danno, gli attacchi. Esportati
 * anche per il combattimento (i turni dei PNG li tira il Motore con gli stessi attacchi).
 */
export function strumentiRegole(o: Omit<OpzioniRisolutoreRegole, 'azioni' | 'decisioni'>) {
  const s = o.sistema;
  const nomeCar = (id: string): string => s.caratteristiche.find((c) => c.id === id)?.nome ?? id;
  const nomeAbil = (id: string): string => s.abilita.find((x) => x.id === id)?.nome ?? id;

  /** Il numero da tirare (modificatore o soglia) e come si chiama, da mossa, abilità o caratteristica. */
  function cheCosa(sch: SchedaGenerica, d: { caratteristica: string | null; abilita: string | null; mossa: string | null }, sociale: boolean): { valore: number; etichetta: string; mossa: SistemaRegole['mosse'][number] | null } | null {
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
      if (s.modificatore === 'soglia') {
        const v = sch.abilita[abil] ?? (carAbil ? sch.caratteristiche[carAbil] : undefined) ?? 0;
        return { valore: v, etichetta: nomeAbil(abil), mossa: null };
      }
      const base = carAbil ? valoreCaratteristica(s, sch, carAbil) : 0;
      return { valore: base + (sch.abilita[abil] ?? 0), etichetta: carAbil ? etichettaComposta(nomeAbil(abil), nomeCar(carAbil)) : nomeAbil(abil), mossa: null };
    }
    if (car) return { valore: valoreCaratteristica(s, sch, car), etichetta: nomeCar(car), mossa: null };
    return null;
  }

  const carta = (base: Omit<TiroMostrato, 'id' | 'turno'>): TiroMostrato => ({ id: o.stato.nuovoIdTiro(), turno: o.turno, ...base });
  const cartaDa = (e: EsitoTiroGenerico, chi: string, tipo: TiroMostrato['tipo'], etichetta: string, bersaglio: string | null, motivo: string | null, privata: boolean): TiroMostrato =>
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
      risoluzione: s.risoluzione.tipo,
      facce: e.facce,
      grado: e.grado,
      regola: e.regola,
    });

  /** Danno di un attacco riuscito al bersaglio (armatura se il set la conta): testo per il narratore. */
  function colpisci(t: TiroMostrato, attaccante: Attacco, bersaglio: SchedaGenerica, critico: boolean): string {
    const d = tiraDanno(o.dadi, attaccante.danno, 0, critico);
    const ridotto = s.attacchi.armaturaRiduce ? Math.max(0, d.totale - bersaglio.armatura) : d.totale;
    const r = o.stato.danneggia(bersaglio.id, ridotto);
    t.danno = dannoMostrato({ formula: d.formula, dadi: d.dadi, bonus: d.bonus, totale: ridotto, tipo: attaccante.tipo_danno });
    const pf = o.stato.puntiFerita(bersaglio.id)!;
    t.a_terra = pf.attuali <= 0;
    const danni = s.danni.nome.toLowerCase();
    const stato = bersaglio.di_png ? salute(pf.attuali, pf.massimi) : pf.attuali <= 0 ? testo('prove.salute.set_a_terra', { danni, a_zero: s.danni.aZero }) : testo('prove.salute.set', { attuali: pf.attuali, danni, massimi: pf.massimi });
    const armatura = s.attacchi.armaturaRiduce && bersaglio.armatura ? testo('prove.fatto.armatura', { armatura: bersaglio.armatura }) : '';
    void r;
    return testo('prove.fatto.danno_set', { danno: fraseDanno(ridotto, attaccante.tipo_danno ? tipoDanno(attaccante.tipo_danno) : null), armatura, nome: o.nome(bersaglio.id), stato });
  }

  /** Un attacco col set (prova o automatico); null se mancano le schede. */
  function attacca(chi: string, bersaglio: string, idArma: string | null, fontiDate: Array<{ v: Vantaggio; motivo: string }>, privata: boolean): { t: TiroMostrato; testo: string; esito: EsitoTiroGenerico | null } | null {
    const sa = o.schede.get(chi);
    const sb = o.schede.get(bersaglio);
    if (!sa || !sb) return null;
    const a = arma(sa, idArma);
    if (s.attacchi.tipo === 'automatico') {
      const regola = testo('prove.regola.automatico', { arma: a.nome, dadi: `${a.danno.numero}d${a.danno.facce}`, armatura: s.attacchi.armaturaRiduce ? testo('prove.regola.meno_armatura') : '' });
      const e: EsitoTiroGenerico = { dadi: [], facce: a.danno.facce || 6, dado: 0, modificatore: 0, totale: 0, contro: { tipo: 'soglia', valore: 0, descrizione: testo('prove.cd.colpisce_sempre') }, riuscita: true, grado: { id: 'successo', nome: testo('prove.regola.colpisce') }, vantaggio: null, regola };
      const t = cartaDa(e, chi, 'attacco', a.nome, bersaglio, null, privata);
      const danno = colpisci(t, a, sb, false);
      t.totale = t.danno?.totale ?? 0;
      return { t, testo: testo('prove.fatto.attacco_automatico', { arma: a.nome, bersaglio: o.nome(bersaglio), regola: e.regola, danno }), esito: e };
    }
    const cosa = cheCosa(sa, { caratteristica: a.caratteristica, abilita: a.abilita, mossa: null }, false) ?? { valore: 0, etichetta: a.nome, mossa: null };
    const fonti = [...fontiDate, ...fontiAttacco(o.condizioni, chi, bersaglio)];
    const v = combinaVantaggi(fonti.map((f) => f.v));
    // d20 contro la difesa del bersaglio; gli altri tipi con la loro risoluzione (fasce, soglia).
    const sist = s.risoluzione.tipo === 'd20_cd' && sb.difesa !== null ? { ...s, difficolta: [{ id: '_difesa', nome: testo('prove.cd.difesa_di', { nome: o.nome(bersaglio) }), valore: sb.difesa, divisore: null, modificatore: null }] } : s;
    const e = tiraCol(sist, o.dadi, cosa.valore, sist === s ? null : '_difesa', v, `${a.nome}, ${cosa.etichetta}`);
    const t = cartaDa(e, chi, 'attacco', a.nome, bersaglio, fonti.filter((f) => f.v === v).map((f) => f.motivo).join('; ') || null, privata);
    if (!e.riuscita) return { t, testo: testo('prove.fatto.attacco_set', { arma: a.nome, bersaglio: o.nome(bersaglio), regola: e.regola, esito: esitoInParole(e, true) }), esito: e };
    const danno = colpisci(t, a, sb, e.grado?.id === 'critico' || !!conEffetto(o.condizioni, bersaglio, 'critico_contro'));
    return { t, testo: testo('prove.fatto.attacco_set_colpito', { arma: a.nome, bersaglio: o.nome(bersaglio), regola: e.regola, esito: esitoInParole(e, true), danno }), esito: e };
  }
  return { cheCosa, cartaDa, colpisci, attacca };
}
