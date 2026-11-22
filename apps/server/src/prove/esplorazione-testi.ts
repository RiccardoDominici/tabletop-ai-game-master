/**
 * What the table, the narrator and the panel see of an exploration roll (prove/esplorazione.ts): the Game Master's cards
 * (hidden unless `regole.tiri_master` shows them), the encounter's fact for the narrator, and the panel's line about the
 * next check. Pure: the rolls and names in, cards and words out.
 */
import type { TiroMostrato } from '@tabletop-ai-gm/shared';
import { testo } from '../lingua';
import type { IncontroUscito, TiroEsplorazione } from './esplorazione';
import { mostraTiroDelMaster } from './tiri-master';
import type { TiriMaster } from './modalita';

/** The Game Master's cards of the exploration rolls: hidden unless the campaign shows the Game Master's rolls. */
export function carteEsplorazione(tiri: readonly TiroEsplorazione[], o: { turno: number; nuovoId: () => string; modo: TiriMaster; ambiente: string }): TiroMostrato[] {
  return tiri.map((t) => {
    const p = t.cosa === 'controllo' || t.cosa === 'sorpresa' ? t.totale / t.facce : 0;
    const carta: TiroMostrato = {
      id: o.nuovoId(),
      turno: o.turno,
      chi: 'master',
      nome: testo('prove.esplorazione.chi'),
      di_png: true,
      tipo: 'prova',
      etichetta: testo(`prove.esplorazione.etichetta.${t.cosa}`, { ambiente: o.ambiente }),
      dadi: t.dadi,
      dado: t.dadi.reduce((a, b) => a + b, 0),
      vantaggio: null,
      motivo_vantaggio: null,
      modificatore: t.totale - t.dadi.reduce((a, b) => a + b, 0),
      totale: t.totale,
      contro: { tipo: 'soglia', valore: 0, descrizione: null },
      bersaglio: null,
      riuscita: t.riuscito ?? true,
      critico: false,
      fallimento_critico: false,
      danno: null,
      a_terra: false,
      privata: false,
      avversario: null,
      facce: t.facce,
      contro_nascosto: true,
      del_master: true,
    };
    // A check is shown only when the campaign shows the Game Master's rolls (`a_volte`: by its odds).
    if (!mostraTiroDelMaster(o.modo, { visibile: false, p }).mostra) carta.nascosta = true;
    return carta;
  });
}

/**
 * The encounter's fact for the narrator: who arrives and how many (the bestiary's name), a group the Game Master builds,
 * or an encounter without a table; when it happened if the advance was long (a night, a journey); the surprise in
 * advance (unaware creatures the party may avoid, or an ambush laid).
 */
export function fattoIncontro(i: IncontroUscito, o: { nomeMostro: (id: string) => string; quando: string | null }): string {
  const parti: string[] = [];
  if (i.mostro) parti.push(testo(i.quanti > 1 ? 'prove.esplorazione.incontro_molti' : 'prove.esplorazione.incontro_uno', { nome: o.nomeMostro(i.mostro).toLowerCase(), quanti: i.quanti }));
  else if (i.gruppo) parti.push(testo('prove.esplorazione.incontro_gruppo', { gruppo: i.gruppo, quanti: i.quanti > 1 ? ` (${i.quanti})` : '' }));
  else parti.push(testo('prove.esplorazione.incontro_vuoto'));
  if (o.quando) parti.push(testo('prove.esplorazione.quando', { quando: o.quando }));
  if (i.sorpresi === true) parti.push(testo('prove.esplorazione.sorpresi'));
  if (i.sorpresi === false) parti.push(testo(i.imboscata ? 'prove.esplorazione.imboscata' : 'prove.esplorazione.non_sorpresi'));
  return parti.join(' ');
}
