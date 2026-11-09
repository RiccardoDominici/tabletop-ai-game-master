/**
 * Chi è in scena, tra i PNG (richiesta 2 del 9 novembre): i ritratti sul proiettore e sul telefono.
 *
 * Regole:
 * - presente = il PNG è nella scena (`png_presenti` della scheda di scena), salvo che il master l'abbia
 *   deciso a mano (`manuale`: vale finché non cambia scena);
 * - altrove = il PNG ha già parlato nella trascrizione pubblica di questa sessione, ma ora non è in scena;
 * - un PNG mai incontrato e non presente non compare mai (niente spoiler).
 *
 * Funzioni pure: il Regia le chiama con i suoi dati (vedi `Regia.personaggiScena`).
 */
import type { PersonaggioScena, PresenzaMaster, VoceTrascrizione } from '@cantastorie/shared';
import type { PngCaricato } from '../campagna/tipi';

/** Presenza effettiva: la scena, corretta dalle decisioni manuali del master (true = in scena). */
export function presenzaEffettiva(presentiDaScena: readonly string[], manuali: ReadonlyMap<string, boolean>): Set<string> {
  const effettiva = new Set(presentiDaScena);
  for (const [id, presente] of manuali) {
    if (presente) effettiva.add(id);
    else effettiva.delete(id);
  }
  return effettiva;
}

/** Id dei PNG che hanno già parlato nella trascrizione (ogni voce il cui `chi` è un PNG). */
export function pngIncontrati(trascrizione: readonly VoceTrascrizione[], png: readonly PngCaricato[]): Set<string> {
  const ids = new Set(png.map((p) => p.id));
  const incontrati = new Set<string>();
  for (const v of trascrizione) if (ids.has(v.chi)) incontrati.add(v.chi);
  return incontrati;
}

/**
 * Vista dei PNG per il tavolo: prima i presenti, poi gli altrove (già incontrati), nell'ordine della
 * campagna. I mai incontrati e non presenti sono esclusi.
 */
export function personaggiScena(args: {
  png: readonly PngCaricato[];
  presenti: ReadonlySet<string>;
  incontrati: ReadonlySet<string>;
  ritratto: (id: string) => string | null;
}): PersonaggioScena[] {
  const vista = args.png
    .filter((p) => args.presenti.has(p.id) || args.incontrati.has(p.id))
    .map((p) => ({ id: p.id, nome: p.nome, ritratto: args.ritratto(p.id), presente: args.presenti.has(p.id) }));
  return [...vista.filter((p) => p.presente), ...vista.filter((p) => !p.presente)];
}

/** Elenco completo per il pannello del master (anche i mai incontrati). */
export function presenzeMaster(args: {
  png: readonly PngCaricato[];
  presenti: ReadonlySet<string>;
  incontrati: ReadonlySet<string>;
  manuali: ReadonlyMap<string, boolean>;
}): PresenzaMaster[] {
  return args.png.map((p) => ({
    id: p.id,
    nome: p.nome,
    presente: args.presenti.has(p.id),
    manuale: args.manuali.has(p.id),
    incontrato: args.incontrati.has(p.id),
  }));
}
