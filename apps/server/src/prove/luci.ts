/**
 * Light sources (docs/prove.md §11; docs/regole.md §2, «Tempo» and the catalog's `luce`; Basic Fantasy p. 12: a torch
 * burns 1d4+4 turns, a lantern a flask of oil in 18+1d6 turns): lighting one spends the item (a torch) or what it burns
 * (a lantern's oil), its burning time is rolled by the Engine's dice and counted on the game clock (prove/tempo.ts), and
 * it goes out by itself. A player lights or puts out a light by saying so in the action (the language pack's
 * `parole.accendere` / `parole.spegnere` and the item's name, read by code), or the Game Master does it from the panel.
 */
import { normalizza } from '../azioni/regole';
import { testo } from '../lingua';
import type { Logger } from '../logger';
import { voce, type Attrezzo } from '../regole/catalogo';
import type { SistemaRegole } from '../regole/tipi';
import { durataInSecondi } from '../regole/tempo';
import type { FonteDadi } from './dadi';
import type { Inventario } from './inventario';
import { datiProve } from './lingua';
import { senzaParlato } from './parole-testo';
import { danno as tiraDanno } from './regole';
import { chiaveOggetto, type Risorse } from './risorse';
import type { TempoDiGioco } from './tempo';

export interface ContestoLuci {
  sistema: SistemaRegole;
  risorse: Risorse;
  inventario: Inventario;
  tempo: TempoDiGioco;
  dadi: FonteDadi;
  nome: (id: string) => string;
  log: Logger;
}

export type EsitoLuce = { ok: boolean; fatto: string };

/** A catalog entry that gives light, or null. */
function sorgente(s: SistemaRegole, id: string): Attrezzo | null {
  const v = voce(s.catalogo, id);
  return v?.tipo === 'attrezzo' && v.luce ? v : null;
}

/** `chi` lights `oggetto`: spends it (or what it burns), rolls how long it lasts, starts it on the clock. */
export function accendi(c: ContestoLuci, chi: string, oggetto: string): EsitoLuce {
  const v = sorgente(c.sistema, oggetto);
  const nome = c.nome(chi);
  if (!v) return { ok: false, fatto: testo('prove.luci.non_fa_luce', { oggetto: voce(c.sistema.catalogo, oggetto)?.nome ?? oggetto }) };
  if ((c.risorse.restanti(chi, chiaveOggetto(oggetto)) ?? 0) < 1) return { ok: false, fatto: testo('prove.inventario.non_ha', { nome, oggetto: v.nome }) };
  if (c.tempo.accesa(chi, oggetto)) return { ok: false, fatto: testo('prove.luci.gia_accesa', { nome, oggetto: v.nome.toLowerCase() }) };
  const luce = v.luce!;
  const brucia = luce.consuma ?? oggetto;
  if ((c.risorse.restanti(chi, chiaveOggetto(brucia)) ?? 0) < 1) return { ok: false, fatto: testo('prove.luci.senza_combustibile', { nome, oggetto: v.nome.toLowerCase(), cosa: (voce(c.sistema.catalogo, brucia)?.nome ?? brucia).toLowerCase() }) };
  const secondi = c.sistema.tempo ? durataInSecondi(c.sistema.tempo, luce.unita, luce.durata, (f) => tiraDanno(c.dadi, f, 0, false).totale) : null;
  if (secondi === null) {
    c.log.warn({ chi, oggetto, unita: luce.unita }, 'light: the set has no clock with this unit, the light is not counted');
    return { ok: false, fatto: testo('prove.luci.senza_tempo', { oggetto: v.nome }) };
  }
  c.inventario.oggetto(chi, brucia, -1);
  c.tempo.accendi(chi, oggetto, secondi);
  c.log.info({ chi, oggetto, brucia, secondi }, 'light: lit, its burning time rolled by the Engine (hidden from the table)');
  return { ok: true, fatto: testo('prove.luci.accende', { nome, oggetto: v.nome.toLowerCase() }) };
}

/** `chi` puts out `oggetto`: what was left of it is lost. */
export function spegni(c: ContestoLuci, chi: string, oggetto: string): EsitoLuce {
  const v = sorgente(c.sistema, oggetto);
  if (!v || !c.tempo.spegni(chi, oggetto)) return { ok: false, fatto: testo('prove.luci.non_accesa', { nome: c.nome(chi), oggetto: (v?.nome ?? oggetto).toLowerCase() }) };
  c.log.info({ chi, oggetto }, 'light: put out');
  return { ok: true, fatto: testo('prove.luci.spegne', { nome: c.nome(chi), oggetto: v.nome.toLowerCase() }) };
}

const esc = (t: string): string => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const parola = (voci: readonly string[]): RegExp => new RegExp(`(?<![\\p{L}\\p{N}])(${voci.map((p) => esc(normalizza(p))).join('|')})`, 'u');

/**
 * What an action says about a light: «accendo la torcia», «spengo la lanterna». The verb from the language pack and a
 * light source the author carries (or has lit) named by a word of its catalog name. Null when it says neither.
 */
export function luceDellAzione(c: Pick<ContestoLuci, 'sistema' | 'risorse' | 'tempo'>, chi: string, testoAzione: string): { cosa: 'accendi' | 'spegni'; oggetto: string } | null {
  const p = datiProve().parole;
  if (!c.sistema.catalogo || !p.accendere?.length) return null;
  const t = normalizza(senzaParlato(testoAzione));
  const cosa = parola(p.accendere).test(t) ? 'accendi' : p.spegnere?.length && parola(p.spegnere).test(t) ? 'spegni' : null;
  if (!cosa) return null;
  for (const v of c.sistema.catalogo.voci) {
    if (v.tipo !== 'attrezzo' || !v.luce) continue;
    const ha = cosa === 'accendi' ? (c.risorse.restanti(chi, chiaveOggetto(v.id)) ?? 0) > 0 : c.tempo.accesa(chi, v.id);
    const nomi = normalizza(v.nome).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 4);
    if (ha && nomi.length && parola([nomi[0]!]).test(t)) return { cosa, oggetto: v.id };
  }
  return null;
}
