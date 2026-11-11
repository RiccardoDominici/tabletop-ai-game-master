/**
 * Caricatore del set di regole di una campagna (docs/regole.md):
 *   campagne/<id>/regole/regole.yaml  (struttura) · riassunto.md (per i giocatori) · estratti/*.md
 *
 * Senza regole.yaml: l'SRD 5.2 del codice, con riassunto e passi da assets/regole/srd-5.2/ (nella lingua dei contenuti). Con
 * `id: srd-5.2`: lo stesso, ma riassunto ed estratti della campagna se ci sono. Un file rotto non
 * ferma la sessione: errori ed avvisi vanno nel log e si torna all'SRD (gioca, ma lo dice forte).
 *
 * Licenza: un set da un manuale non libero (`licenza.libera: false`) non deve finire nel repository;
 * il caricatore scrive regole/.gitignore con `*` se manca (i manuali stessi stanno in manuali/, già
 * ignorata). Il controllo dei file tracciati è in test/regole-licenza.test.ts.
 */
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import type { TipoRisoluzione } from '@cantastorie/shared';
import { chiave } from '../campagna/regole-srd';
import { testo } from '../lingua';
import type { Logger } from '../logger';
import { leggiEstratti } from './estratti';
import { ID_SRD, estrattiSrd, riassuntoSrd, sistemaSrd } from './srd';
import type { Difficolta, Fascia, Mossa, RegoleCampagna, SistemaRegole, Voce } from './tipi';
import { combattimentoPredefinito, leggiCombattimento } from './combattimento';

export const CARTELLA_REGOLE = 'regole';
const TIPI: readonly TipoRisoluzione[] = ['d20_cd', '2d6_fasce', 'sotto_soglia'];

type D = Record<string, unknown>;
const ogg = (v: unknown): D | null => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as D) : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function voci(v: unknown, dove: string, errori: string[]): Voce[] {
  if (!Array.isArray(v)) return [];
  const out: Voce[] = [];
  for (const [i, x] of v.entries()) {
    const o = ogg(x);
    const id = str(o?.['id']);
    if (!o || !id || id !== chiave(id)) {
      errori.push(`${dove}[${i + 1}]: serve un id in snake_case senza accenti`);
      continue;
    }
    if (out.some((y) => y.id === id)) errori.push(`${dove}: id ripetuto «${id}»`);
    out.push({ id, nome: str(o['nome']) ?? id });
  }
  return out;
}

/** Legge e controlla regole.yaml. Gli errori rendono il set inutilizzabile (si torna all'SRD). */
export function leggiSistema(d: D, errori: string[], avvisi: string[]): SistemaRegole | null {
  const id = str(d['id']);
  if (!id || !/^[a-z0-9][a-z0-9.-]*$/.test(id)) errori.push('id: serve un id come «pbta-2d6» (minuscole, cifre, - e .)');
  if (id === ID_SRD) return sistemaSrd();
  const r = ogg(d['risoluzione']) ?? {};
  const tipo = r['tipo'] as TipoRisoluzione;
  if (!TIPI.includes(tipo)) {
    errori.push(`risoluzione.tipo: uno tra ${TIPI.join(', ')}`);
    return null;
  }
  const caratteristiche = voci(d['caratteristiche'], 'caratteristiche', errori);
  if (!caratteristiche.length) errori.push('caratteristiche: almeno una');
  const idCar = new Set(caratteristiche.map((c) => c.id));
  const abilita = (Array.isArray(d['abilita']) ? d['abilita'] : []).flatMap((x, i) => {
    const [v] = voci([x], `abilita[${i + 1}]`, errori);
    if (!v) return [];
    const car = str(ogg(x)?.['caratteristica']);
    if (car && !idCar.has(car)) errori.push(`abilita.${v.id}: caratteristica inesistente «${car}»`);
    return [{ ...v, caratteristica: car }];
  });
  const modTipo = (ogg(d['modificatore'])?.['tipo'] ?? (tipo === 'sotto_soglia' ? 'soglia' : tipo === '2d6_fasce' ? 'diretto' : 'srd')) as SistemaRegole['modificatore'];
  if (!['srd', 'diretto', 'soglia', 'tabella'].includes(modTipo)) errori.push('modificatore.tipo: srd, diretto, soglia o tabella');
  // Tabella del manuale: punteggio → bonus, righe dal più basso («da 13: +1»).
  let tabellaModificatori: SistemaRegole['tabellaModificatori'] = null;
  if (modTipo === 'tabella') {
    const righe = ogg(d['modificatore'])?.['tabella'];
    tabellaModificatori = (Array.isArray(righe) ? righe : []).flatMap((x) => {
      const o = ogg(x);
      const da = o ? num(o['da']) : null;
      const mod = o ? num(o['mod']) : null;
      return da !== null && mod !== null && Number.isInteger(da) && Number.isInteger(mod) ? [{ da, mod }] : [];
    });
    if (!tabellaModificatori.length || tabellaModificatori.length !== (Array.isArray(righe) ? righe.length : 0)) errori.push('modificatore.tabella: righe {da, mod} con numeri interi, almeno una');
    if (tabellaModificatori.some((r, i) => i > 0 && r.da <= tabellaModificatori![i - 1]!.da)) errori.push('modificatore.tabella: «da» cresce riga dopo riga');
  }
  if ((modTipo === 'soglia') !== (tipo === 'sotto_soglia')) errori.push('modificatore.tipo «soglia» va (solo) con risoluzione sotto_soglia');

  // Risoluzione: dadi, fasce, gradi.
  const facce = tipo === '2d6_fasce' ? 6 : (num(r['dado']) ?? 20);
  if (tipo === 'sotto_soglia' && ![20, 100].includes(facce)) errori.push('risoluzione.dado: 20 o 100 per sotto_soglia');
  const fasce: Fascia[] = [];
  if (tipo === '2d6_fasce') {
    const grezze = Array.isArray(r['fasce']) ? r['fasce'] : [];
    for (const [i, x] of grezze.entries()) {
      const o = ogg(x);
      const esito = o?.['esito'];
      if (!o || (esito !== 'successo' && esito !== 'parziale' && esito !== 'fallimento')) {
        errori.push(`risoluzione.fasce[${i + 1}]: esito successo, parziale o fallimento`);
        continue;
      }
      fasce.push({ min: num(o['min']), esito, nome: str(o['nome']) ?? esito, significato: str(o['significato']) });
    }
    // Le fasce PbtA di default, coi nomi nella lingua dei contenuti (testi-prove.yaml, regole.predefiniti).
    if (!fasce.length) fasce.push({ min: 10, esito: 'successo', nome: testo('regole.predefiniti.successo_pieno'), significato: null }, { min: 7, esito: 'parziale', nome: testo('regole.predefiniti.successo_costo'), significato: null }, { min: null, esito: 'fallimento', nome: testo('regole.esito.fallimento'), significato: null });
    fasce.sort((a, b) => (b.min ?? -Infinity) - (a.min ?? -Infinity));
    if (fasce.at(-1)!.min !== null) avvisi.push('risoluzione.fasce: manca la fascia più bassa (min vuoto): sotto la minima è un fallimento');
  }
  const gradi = (Array.isArray(r['gradi']) ? r['gradi'] : []).flatMap((x) => {
    const o = ogg(x);
    const div = num(o?.['divisore']);
    return o && div && div > 1 ? [{ divisore: div, nome: str(o['nome']) ?? `1/${div}`, significato: str(o['significato']) }] : [];
  });
  gradi.sort((a, b) => b.divisore - a.divisore);

  // Difficoltà, con il valore giusto per il tipo.
  const difficolta: Difficolta[] = [];
  for (const [i, x] of (Array.isArray(d['difficolta']) ? d['difficolta'] : []).entries()) {
    const [v] = voci([x], `difficolta[${i + 1}]`, errori);
    if (!v) continue;
    const o = ogg(x)!;
    const dd: Difficolta = { ...v, valore: num(o['valore']), divisore: num(o['divisore']), modificatore: num(o['modificatore']) };
    if (tipo === 'd20_cd' && dd.valore === null) errori.push(`difficolta.${v.id}: serve valore (la CD)`);
    if (tipo === 'sotto_soglia' && dd.divisore === null) dd.divisore = 1;
    if (tipo === '2d6_fasce' && dd.modificatore === null) dd.modificatore = 0;
    difficolta.push(dd);
  }
  if (!difficolta.length) {
    if (tipo === 'd20_cd') errori.push('difficolta: almeno una, con la CD');
    else difficolta.push({ id: 'normale', nome: testo('regole.predefiniti.normale'), valore: null, divisore: tipo === 'sotto_soglia' ? 1 : null, modificatore: tipo === '2d6_fasce' ? 0 : null });
  }
  const predefinita = str(d['difficolta_predefinita']) ?? difficolta[Math.floor((difficolta.length - 1) / 2)]?.id ?? 'normale';
  if (!difficolta.some((x) => x.id === predefinita)) errori.push(`difficolta_predefinita: «${predefinita}» non è tra le difficoltà`);

  const v = ogg(d['vantaggio']) ?? {};
  const tipoV = (v['tipo'] ?? 'nessuno') as SistemaRegole['vantaggio']['tipo'];
  if (!['due_dadi', 'dado_bonus', 'bonus', 'nessuno'].includes(tipoV)) errori.push('vantaggio.tipo: due_dadi, dado_bonus, bonus o nessuno');
  if (tipoV === 'dado_bonus' && facce !== 100) errori.push('vantaggio.tipo dado_bonus solo con d100');
  const a = ogg(d['attacchi']) ?? {};
  const tipoA = a['tipo'] === 'automatico' ? 'automatico' : 'prova';
  if (a['danno_critico'] !== undefined && a['danno_critico'] !== 'doppio' && a['danno_critico'] !== 'normale') errori.push('attacchi.danno_critico: doppio o normale');
  if (a['danno_minimo'] !== undefined && !(typeof a['danno_minimo'] === 'number' && Number.isInteger(a['danno_minimo']) && a['danno_minimo'] >= 0)) errori.push('attacchi.danno_minimo: un intero da 0 in su');
  // Critico e disastro: nel d20_cd i naturali dell'SRD (20 e 1) se il set non li scrive; `null` li toglie.
  const naturale = (k: 'critico' | 'disastro', predefinito: number | null): number | null => (Object.hasOwn(r, k) ? num(r[k]) : predefinito);
  const critico = naturale('critico', tipo === 'd20_cd' ? 20 : null);
  const disastro = naturale('disastro', tipo === 'd20_cd' ? 1 : null);
  if (tipo === 'd20_cd' && critico !== null && (critico < 2 || critico > 20)) errori.push('risoluzione.critico: nel d20_cd un dado naturale da 2 a 20, o null');
  if (tipo === 'd20_cd' && disastro !== null && (disastro < 1 || disastro > 19)) errori.push('risoluzione.disastro: nel d20_cd un dado naturale da 1 a 19, o null');
  if (r['critici'] !== undefined && r['critici'] !== 'attacchi' && r['critici'] !== 'tutti') errori.push('risoluzione.critici: attacchi o tutti');
  const danni = ogg(d['danni']) ?? {};
  const soc = ogg(d['sociale']) ?? {};
  const socCar = str(soc['caratteristica']);
  const socAbil = str(soc['abilita']);
  if (socCar && !idCar.has(socCar)) errori.push(`sociale.caratteristica inesistente «${socCar}»`);
  if (socAbil && !abilita.some((x) => x.id === socAbil)) errori.push(`sociale.abilita inesistente «${socAbil}»`);

  const mosse: Mossa[] = [];
  for (const [i, x] of (Array.isArray(d['mosse']) ? d['mosse'] : []).entries()) {
    const [m] = voci([x], `mosse[${i + 1}]`, errori);
    if (!m) continue;
    const o = ogg(x)!;
    const car = str(o['caratteristica']);
    if (!car || !idCar.has(car)) errori.push(`mosse.${m.id}: caratteristica inesistente «${String(car)}»`);
    const es = ogg(o['esiti']) ?? {};
    if (!str(es['successo']) || !str(es['fallimento'])) errori.push(`mosse.${m.id}: esiti.successo e esiti.fallimento`);
    mosse.push({ ...m, quando: str(o['quando']) ?? '', caratteristica: car ?? '', esiti: { successo: str(es['successo']) ?? '', parziale: str(es['parziale']), fallimento: str(es['fallimento']) ?? '' } });
  }
  const fonte = ogg(d['fonte']) ?? {};
  const lic = ogg(d['licenza']) ?? {};
  if (typeof lic['libera'] !== 'boolean') errori.push('licenza.libera: true o false (un set da un manuale non libero resta fuori dal repository)');
  return {
    id: id ?? 'senza-id',
    nome: str(d['nome']) ?? id ?? testo('regole.predefiniti.nome'),
    srd: false,
    perNarratore: str(d['per_il_narratore']),
    fonte: { titolo: str(fonte['titolo']) ?? testo('regole.predefiniti.fonte'), autore: str(fonte['autore']), file: str(fonte['file']) },
    licenza: { nome: str(lic['nome']) ?? 'non dichiarata', libera: lic['libera'] === true, attribuzione: str(lic['attribuzione']) },
    risoluzione: { tipo, facce, numero: tipo === '2d6_fasce' ? (num(r['dadi']) ?? 2) : 1, fasce, gradi, critico, disastro, critici: r['critici'] === 'tutti' ? 'tutti' : 'attacchi' },
    caratteristiche,
    abilita,
    modificatore: modTipo,
    tabellaModificatori,
    difficolta,
    difficoltaPredefinita: predefinita,
    vantaggio: { tipo: tipoV, valore: num(v['valore']) ?? 1 },
    attacchi: {
      tipo: tipoA,
      armaturaRiduce: a['armatura_riduce'] === true,
      parzialeScambio: a['parziale'] === 'scambio',
      dannoCritico: a['danno_critico'] === 'normale' ? 'normale' : 'doppio',
      dannoMinimo: Math.max(0, num(a['danno_minimo']) ?? 0),
    },
    danni: { nome: str(danni['nome']) ?? testo('regole.predefiniti.danni'), aZero: str(danni['a_zero']) ?? testo('regole.predefiniti.a_zero') },
    condizioni: (Array.isArray(d['condizioni']) ? d['condizioni'] : []).flatMap((x) => {
      const o = ogg(x);
      const cid = str(o?.['id']);
      return o && cid ? [{ id: cid, nome: str(o['nome']) ?? cid, effetto: str(o['effetto']) ?? '' }] : [];
    }),
    sociale: { caratteristica: socCar, abilita: socAbil, nota: str(soc['nota']) },
    mosse,
    sottosistemi: (Array.isArray(d['sottosistemi']) ? d['sottosistemi'] : []).flatMap((x) => {
      const o = ogg(x);
      const sid = str(o?.['id']);
      return o && sid ? [{ id: sid, nome: str(o['nome']) ?? sid, testo: str(o['testo']) ?? '' }] : [];
    }),
    combattimento: leggiCombattimento(d['combattimento'], combattimentoPredefinito(tipo, false, [...idCar]), idCar, errori),
    paroleChiave: leggiParoleChiave(d['parole_chiave'], new Set([...idCar, ...abilita.map((a) => a.id), ...mosse.map((m) => m.id)]), errori),
  };
}

/** `parole_chiave: {id: [parole]}`: gli id devono essere abilità, mosse o caratteristiche del set. */
function leggiParoleChiave(v: unknown, ids: ReadonlySet<string>, errori: string[]): Record<string, string[]> {
  const o = ogg(v);
  if (!o) return {};
  const out: Record<string, string[]> = {};
  for (const [id, parole] of Object.entries(o)) {
    if (!ids.has(id)) errori.push(`parole_chiave.${id}: non è un'abilità, una mossa o una caratteristica del set`);
    else if (!Array.isArray(parole) || !parole.every((p) => typeof p === 'string')) errori.push(`parole_chiave.${id}: una lista di parole`);
    else out[id] = parole as string[];
  }
  return out;
}

/** Il set della campagna (o l'SRD), con riassunto e passi. Non lancia: torna all'SRD con un errore nel log. */
export function caricaRegole(cartellaCampagna: string, log?: Logger): RegoleCampagna {
  const cartella = path.join(cartellaCampagna, CARTELLA_REGOLE);
  const file = path.join(cartella, 'regole.yaml');
  const avvisi: string[] = [];
  const srdBase = (motivo: string): RegoleCampagna => {
    log?.info({ motivo }, 'regole: SRD 5.2');
    return { sistema: sistemaSrd(), riassunto: riassuntoSrd(), estratti: estrattiSrd(), cartella: null, avvisi };
  };
  if (!fs.existsSync(file)) return srdBase('nessun regole/regole.yaml');
  let dati: D;
  try {
    dati = ogg(YAML.parse(fs.readFileSync(file, 'utf8'))) ?? {};
  } catch (err) {
    log?.error({ file, err: (err as Error).message }, 'regole: YAML non valido, si gioca con l’SRD 5.2');
    return srdBase('regole.yaml non valido');
  }
  const errori: string[] = [];
  const sistema = leggiSistema(dati, errori, avvisi);
  if (!sistema || errori.length) {
    log?.error({ file, errori }, 'regole: set non valido, si gioca con l’SRD 5.2');
    return srdBase('set non valido');
  }
  // Un set da un manuale non libero non va nel repository: regole/.gitignore lo tiene fuori.
  if (!sistema.licenza.libera) {
    const gi = path.join(cartella, '.gitignore');
    if (!fs.existsSync(gi)) {
      fs.writeFileSync(gi, '# Set ricavato da un manuale non libero (docs/regole.md): resta solo su questo computer.\n*\n');
      log?.warn({ cartella }, 'regole: licenza non libera, scritto regole/.gitignore');
    }
  }
  const avvisa = (m: string): void => void avvisi.push(m);
  const fileRiassunto = path.join(cartella, 'riassunto.md');
  const riassunto = fs.existsSync(fileRiassunto) ? fs.readFileSync(fileRiassunto, 'utf8') : sistema.srd ? riassuntoSrd() : '';
  if (!riassunto) avvisi.push('riassunto.md mancante: la scheda «Regole» del telefono resta vuota');
  const cartellaEstratti = path.join(cartella, 'estratti');
  const estratti = fs.existsSync(cartellaEstratti) ? leggiEstratti(cartellaEstratti, avvisa) : sistema.srd ? estrattiSrd() : [];
  for (const a of avvisi) log?.warn({ avviso: a }, 'regole: avviso');
  log?.info({ id: sistema.id, risoluzione: sistema.risoluzione.tipo, caratteristiche: sistema.caratteristiche.length, mosse: sistema.mosse.length, estratti: estratti.length, licenza: sistema.licenza.nome }, 'regole: set della campagna');
  return { sistema, riassunto, estratti, cartella, avvisi };
}
