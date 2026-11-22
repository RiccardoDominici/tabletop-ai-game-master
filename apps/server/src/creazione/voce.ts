/**
 * The approved draft as a PC of the campaign (docs/creazione.md): an entry with the shape of pg.yaml's (`id`, `nome`,
 * `specie`, `classe`, `livello`, `aspetto`, `concetto`, `scheda`…), plus `creazione` — how it was built (the method,
 * every roll and who entered it), for the Game Master and the validator. The loader reads it like a pregenerated PC.
 */
import type { DatiYaml } from '../campagna/tipi';
import { chiave } from '../campagna/regole-srd';
import { rigioca } from './acquisti';
import { classeDi, livelloIniziale, metodo, moneteTirate, razzaDi, schedaGrezza, type Bozza, type CtxCreazione } from './bozza';

/** A PC id from the name, not taken by any PC of the campaign (`pg_ginestra`, then `pg_ginestra_2`…). */
export function idPgDa(nome: string, presi: ReadonlySet<string>): string {
  const base = `pg_${chiave(nome).replace(/[^a-z0-9_]/g, '').slice(0, 40) || 'nuovo'}`;
  let id = base;
  for (let n = 2; presi.has(id); n++) id = `${base}_${n}`;
  return id;
}

export function voceDelPg(ctx: CtxCreazione, b: Bozza, id: string, adesso: Date): DatiYaml & { id: string } {
  const monete = ctx.s.catalogo && moneteTirate(ctx, b) ? rigioca(ctx, b).monete : moneteTirate(ctx, b);
  const razza = razzaDi(ctx, b.razza);
  const classe = classeDi(ctx, b.classe);
  return {
    id,
    nome: b.descrizione.nome,
    ...(b.descrizione.pronomi ? { pronomi: b.descrizione.pronomi } : {}),
    ...(razza ? { specie: razza.nome } : {}),
    ...(classe ? { classe: classe.nome } : {}),
    livello: livelloIniziale(ctx),
    ...(b.descrizione.aspetto ? { aspetto: b.descrizione.aspetto } : {}),
    ...(b.descrizione.concetto ? { concetto: b.descrizione.concetto } : {}),
    creazione: {
      quando: adesso.toISOString(),
      metodo: metodo(ctx).id,
      ...(Object.keys(b.opzioniUsate).length ? { opzioni: { ...b.opzioniUsate } } : {}),
      tiri: b.tiri.map((t) => ({ passo: t.passo, per: t.per, dadi: [...t.dadi], ...(t.manuale ? {} : { motore: true }) })),
    },
    scheda: schedaGrezza(ctx, b, monete),
  };
}
