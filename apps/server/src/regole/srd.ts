/**
 * Il set di regole predefinito: l'SRD 5.2, prodotto dal codice (campagna/regole-srd.ts), quando la
 * campagna non ha regole/regole.yaml o il suo id è `srd-5.2`. Le prove le risolve prove/risolutore.ts
 * come sempre; il set serve a riassunto, passi del manuale e a scrivere regole.yaml per la campagna
 * (strumenti/regole-srd.ts).
 */
import fs from 'node:fs';
import path from 'node:path';
import { ABILITA, CARATTERISTICA_DI, CARATTERISTICHE, DIFFICOLTA, NOME_ABILITA, NOME_CARATTERISTICA, NOME_DIFFICOLTA } from '../campagna/regole-srd';
import { RADICE_REPO } from '../percorsi';
import type { SistemaRegole } from './tipi';
import { combattimentoSrd } from './combattimento';

export const ID_SRD = 'srd-5.2';
/** Riassunto e passi dell'SRD 5.2 (CC-BY-4.0), nel repository. */
export const CARTELLA_SRD = path.join(RADICE_REPO, 'assets', 'regole', ID_SRD);

export const ATTRIBUZIONE_SRD =
  'Questo lavoro include materiale dal System Reference Document 5.2 («SRD 5.2») di Wizards of the Coast LLC, https://www.dndbeyond.com/srd, con licenza Creative Commons Attribution 4.0 International.';

export function sistemaSrd(): SistemaRegole {
  return {
    id: ID_SRD,
    nome: 'SRD 5.2 (D&D 5e)',
    srd: true,
    perNarratore: null,
    fonte: { titolo: 'System Reference Document 5.2', autore: 'Wizards of the Coast', file: null },
    licenza: { nome: 'CC-BY-4.0', libera: true, attribuzione: ATTRIBUZIONE_SRD },
    risoluzione: { tipo: 'd20_cd', facce: 20, numero: 1, fasce: [], gradi: [], critico: null, disastro: null },
    caratteristiche: CARATTERISTICHE.map((c) => ({ id: c, nome: NOME_CARATTERISTICA[c] })),
    abilita: ABILITA.map((a) => ({ id: a, nome: NOME_ABILITA[a], caratteristica: CARATTERISTICA_DI[a] })),
    modificatore: 'srd',
    difficolta: Object.entries(DIFFICOLTA).map(([id, valore]) => ({ id, nome: NOME_DIFFICOLTA[id as keyof typeof DIFFICOLTA], valore, divisore: null, modificatore: null })),
    difficoltaPredefinita: 'media',
    vantaggio: { tipo: 'due_dadi', valore: 0 },
    attacchi: { tipo: 'prova', armaturaRiduce: false, parzialeScambio: false },
    danni: { nome: 'Punti ferita', aZero: 'Il PNG è fuori combattimento; il PG perde i sensi e fa i tiri salvezza contro la morte.' },
    condizioni: [],
    sociale: { caratteristica: 'carisma', abilita: 'persuasione', nota: 'Influenzare: CD 15 o l’Intelligenza del PNG; amichevole vantaggio, ostile svantaggio.' },
    mosse: [],
    sottosistemi: [],
    combattimento: combattimentoSrd(),
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

/** Riassunto dell'SRD per i giocatori (assets/regole/srd-5.2/riassunto.md). */
export function riassuntoSrd(): string {
  const f = path.join(CARTELLA_SRD, 'riassunto.md');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
}
