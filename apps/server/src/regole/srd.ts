/**
 * Il set di regole predefinito: l'SRD 5.2, prodotto dal codice (campagna/regole-srd.ts), quando la
 * campagna non ha regole/regole.yaml o il suo id è `srd-5.2`. Le prove le risolve prove/risolutore.ts
 * come sempre; il set serve a riassunto, passi del manuale e a scrivere regole.yaml per la campagna
 * (strumenti/regole-srd.ts).
 *
 * Nomi, testi, attribuzione, riassunto e passi sono nella lingua dei contenuti (docs/lingue.md): nomi e
 * testi da lingue/<codice>/prove.yaml, riassunto e passi da assets/regole/srd-5.2/ (italiano) o dalla
 * sua sottocartella <codice>/ (le altre lingue). Si leggono quando si costruisce il set, all'avvio.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ABILITA, CARATTERISTICA_DI, CARATTERISTICHE, DIFFICOLTA, nomeAbilita, nomeCaratteristica, nomeDifficolta, type Difficolta } from '../campagna/regole-srd';
import { LINGUA_RIFERIMENTO, linguaAttiva, type Lingua } from '../lingua';
import { RADICE_REPO } from '../percorsi';
import { datiProve } from '../prove/lingua';
import type { SistemaRegole } from './tipi';
import { combattimentoSrd } from './combattimento';
import { leggiEstratti } from './estratti';

export const ID_SRD = 'srd-5.2';
/** Riassunto e passi dell'SRD 5.2 (CC-BY-4.0), nel repository: qui l'italiano, in <codice>/ le altre lingue. */
export const CARTELLA_SRD = path.join(RADICE_REPO, 'assets', 'regole', ID_SRD);

/** La cartella del riassunto e dei passi dell'SRD in una lingua. */
export function cartellaSrd(lingua: Lingua = linguaAttiva()): string {
  return lingua === LINGUA_RIFERIMENTO ? CARTELLA_SRD : path.join(CARTELLA_SRD, lingua);
}

/** L'attribuzione CC-BY-4.0 dell'SRD 5.2, nella lingua dei contenuti (obbligatoria nei crediti). */
export function attribuzioneSrd(): string {
  return datiProve().srd.attribuzione;
}

export function sistemaSrd(): SistemaRegole {
  const srd = datiProve().srd;
  return {
    id: ID_SRD,
    nome: 'SRD 5.2 (D&D 5e)',
    srd: true,
    perNarratore: null,
    fonte: { titolo: 'System Reference Document 5.2', autore: 'Wizards of the Coast', file: null },
    licenza: { nome: 'CC-BY-4.0', libera: true, attribuzione: attribuzioneSrd() },
    risoluzione: { tipo: 'd20_cd', facce: 20, numero: 1, fasce: [], gradi: [], critico: 20, disastro: 1, critici: 'attacchi' },
    caratteristiche: CARATTERISTICHE.map((c) => ({ id: c, nome: nomeCaratteristica(c) })),
    abilita: ABILITA.map((a) => ({ id: a, nome: nomeAbilita(a), caratteristica: CARATTERISTICA_DI[a] })),
    modificatore: 'srd',
    difficolta: Object.entries(DIFFICOLTA).map(([id, valore]) => ({ id, nome: nomeDifficolta(id as Difficolta), valore, divisore: null, modificatore: null })),
    difficoltaPredefinita: 'media',
    vantaggio: { tipo: 'due_dadi', valore: 0 },
    attacchi: { tipo: 'prova', armaturaRiduce: false, parzialeScambio: false, dannoCritico: 'doppio', dannoMinimo: 0 },
    danni: { nome: srd.danni.nome, aZero: srd.danni.a_zero },
    condizioni: [],
    sociale: { caratteristica: 'carisma', abilita: 'persuasione', nota: srd.sociale },
    mosse: [],
    sottosistemi: [],
    combattimento: combattimentoSrd(),
    // L'SRD ha la sua tabella per lingua (lingue/<codice>/prove.yaml, parole.abilita: prove/parole-chiave.ts).
    paroleChiave: {},
  };
}

/** regole.yaml dell'SRD 5.2, com'è nel codice (per una campagna che vuole il file esplicito). */
export function yamlSrd(): Record<string, unknown> {
  const s = sistemaSrd();
  return {
    id: s.id,
    nome: s.nome,
    fonte: { titolo: s.fonte.titolo, autore: s.fonte.autore },
    licenza: { nome: s.licenza.nome, libera: true, attribuzione: s.licenza.attribuzione },
    risoluzione: { tipo: 'd20_cd', dado: 20 },
    caratteristiche: s.caratteristiche,
    abilita: s.abilita,
    modificatore: { tipo: 'srd' },
    difficolta: s.difficolta.map((d) => ({ id: d.id, nome: d.nome, valore: d.valore })),
    difficolta_predefinita: s.difficoltaPredefinita,
    vantaggio: { tipo: 'due_dadi' },
    attacchi: { tipo: 'prova', difesa: 'ca' },
    danni: { nome: s.danni.nome, a_zero: s.danni.aZero },
    sociale: { caratteristica: 'carisma', abilita: 'persuasione', nota: s.sociale.nota },
  };
}

/** Riassunto dell'SRD per i giocatori (assets/regole/srd-5.2/[<codice>/]riassunto.md), nella lingua dei contenuti. */
export function riassuntoSrd(): string {
  const f = path.join(cartellaSrd(), 'riassunto.md');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
}

/** I passi dell'SRD (assets/regole/srd-5.2/[<codice>/]estratti/), nella lingua dei contenuti. */
export function estrattiSrd(): ReturnType<typeof leggiEstratti> {
  return leggiEstratti(path.join(cartellaSrd(), 'estratti'));
}
