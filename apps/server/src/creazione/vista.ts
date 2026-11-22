/**
 * What the phone and the Game Master's panel see of a draft (docs/creazione.md): every step with its state and a
 * one-line summary, the next roll, the legal choices (the closed ones greyed with the reason), the purchase screen with
 * prices, weights, load and AC from the Engine's own inventory, the spells and languages to choose, and the problems
 * the creation check (regole/controllo-pg.ts, the same as the validator's) still finds.
 */
import type { CreazioneMaster, VistaCreazione, VoceAcquisto } from '@tabletop-ai-gm/shared';
import { testo } from '../lingua';
import { controllaPersonaggio } from '../regole/controllo-pg';
import { costoScritto, restrizioniDi, rigioca } from './acquisti';
import { comeIncantesimi, daAssegnare, rimediAmmessi } from './azioni';
import {
  bonusDi,
  classeDi,
  incantesimiDellaClasse,
  livelloIniziale,
  lingueExtra,
  metodo,
  moneteTirate,
  motivoClasse,
  motivoRazza,
  passoCorrente,
  pfPerLivello,
  puntiFerita,
  punteggi,
  razzaDi,
  schedaLetta,
  senzaSperanza,
  slotIniziali,
  statoPasso,
  type Bozza,
  type CtxCreazione,
} from './bozza';
import { prossimoTiro } from './tiri';

const formula = (f: { numero: number; facce: number; bonus: number }): string => `${f.numero}d${f.facce}${f.bonus > 0 ? `+${f.bonus}` : f.bonus < 0 ? f.bonus : ''}`;

export function vistaBozza(ctx: CtxCreazione, b: Bozza): VistaCreazione {
  const m = metodo(ctx);
  const p = punteggi(ctx, b);
  const acq = ctx.s.catalogo && moneteTirate(ctx, b) ? rigioca(ctx, b) : null;
  const sch = acq?.sch ?? null;
  const pf = puntiFerita(ctx, b);
  const livelli = pfPerLivello(ctx, b);
  const prossimo = prossimoTiro(ctx, b);
  const nomeDi = (id: string) => (ctx.s.lingue ?? []).find((l) => l.id === id)?.nome ?? id;
  const e = ctx.cr.incantesimi.find((x) => x.classe === b.classe);
  const slot = slotIniziali(ctx, b);
  const v: VistaCreazione = {
    id: b.id,
    stato: b.stato,
    id_pg: b.idPg,
    manuale: ctx.manuale,
    livello: livelloIniziale(ctx),
    passi: ctx.cr.passi.map((x) => ({ id: x, nome: testo(`creazione.passi.${x}`), stato: statoPasso(b, x), riassunto: riassunto(ctx, b, x) })),
    corrente: passoCorrente(ctx, b),
    da_tirare: prossimo ? { numero: prossimo.numero, facce: prossimo.facce, bonus: prossimo.bonus, per: prossimo.per } : null,
    caratteristiche: {
      metodo: { id: m.id, nome: m.nome, tipo: m.tipo, ordine: m.tipo === 'dadi' ? m.ordine : 'libero' },
      nomi: ctx.s.caratteristiche.map((c) => ({ id: c.id, nome: c.nome })),
      tiri: b.tiriCaratteristiche.map((x) => ({ ...x })),
      da_assegnare: daAssegnare(ctx, b),
      punti: m.tipo === 'punti' ? { totale: m.punti, costi: m.costi } : null,
      punteggi: p,
      bonus: p ? Object.fromEntries(Object.entries(p).map(([k, n]) => [k, bonusDi(ctx, n)])) : null,
      opzioni: ctx.cr.opzioni
        .filter((o) => ctx.opz.opzioni.includes(o.id))
        .map((o) => ({ id: o.id, nome: o.nome, tipo: o.tipo, restanti: o.tipo === 'scambio' ? Math.max(0, o.volte - (b.opzioniUsate[o.id] ?? 0)) : null })),
      senza_speranza: senzaSperanza(ctx, b) && rimediAmmessi(ctx).length ? rimediAmmessi(ctx) : null,
    },
    razze: (ctx.s.razze ?? []).map((r) => {
      const motivo = b.base ? motivoRazza(ctx, b, r) : null;
      return { id: r.id, nome: r.nome, ammessa: !motivo, motivo: motivo ? testo('creazione.motivi.requisito', motivo) : null };
    }),
    classi: (ctx.s.classi ?? []).map((c) => {
      const motivo = b.base ? motivoClasse(ctx, b, c) : null;
      return {
        id: c.id,
        nome: c.nome,
        ammessa: !motivo,
        motivo: !motivo ? null : motivo.tipo === 'razza' ? testo('creazione.motivi.razza', { razza: motivo.razza }) : testo('creazione.motivi.requisito', motivo),
      };
    }),
    razza: b.razza,
    classe: b.classe,
    punti_ferita: {
      dado: livelli[0]?.dado ? formula(livelli[0].dado) : null,
      bonus: livelli[0]?.bonus ?? 0,
      minimo: livelli[0]?.minimo ?? 1,
      massimo: (ctx.opz.puntiFerita ?? ctx.cr.puntiFerita) === 'massimo',
      livelli: livelli.map((x, i) => ({ livello: x.livello, dadi: x.tira ? (b.dadiPf[i] ?? null) : x.dado ? [x.dado.facce] : null, totale: pf.livelli[i] ?? null })),
      totale: pf.totale,
    },
    monete: {
      formula: ctx.cr.monete ? `${formula(ctx.cr.monete.dadi)} × ${ctx.cr.monete.per} ${ctx.cr.monete.moneta}` : null,
      dadi: b.dadiMonete,
      totale: moneteTirate(ctx, b)?.[ctx.cr.monete?.moneta ?? ''] ?? null,
      moneta: ctx.cr.monete?.moneta ?? null,
    },
    acquisti:
      acq && sch
        ? {
            voci: (ctx.s.catalogo?.voci ?? [])
              .filter((x) => x.costo !== null)
              .map((x): VoceAcquisto => ({
                id: x.id,
                nome: x.nome,
                tipo: x.tipo,
                costo: costoScritto(ctx, x),
                confezione: x.confezione,
                peso: Math.round((x.peso / x.confezione) * 100) / 100,
                quante: b.acquisti.filter((a) => a.id === x.id).reduce((n, a) => n + a.quante, 0),
                ...restrizioniDi(ctx, b, x),
              })),
            monete: (ctx.s.monete?.tagli ?? []).filter((t) => (acq.monete[t.id] ?? 0) > 0).map((t) => ({ id: t.id, nome: t.nome, quante: acq.monete[t.id]! })),
            peso: acq.inventario.peso(sch.id),
            carico: acq.inventario.carico(sch.id),
            unita: ctx.s.carico?.unita ?? null,
            unita_movimento: ctx.s.movimento?.unita ?? null,
            difesa: sch.difesa,
            attacchi: sch.attacchi.map((a) => `${a.nome} ${formula(a.danno)}`),
          }
        : null,
    incantesimi:
      b.classe && (e || slot.some((n) => n > 0))
        ? {
            come: comeIncantesimi(ctx, b) ?? 'scelta',
            fissi: (e?.fissi ?? []).map((id) => ({ id, nome: (ctx.s.poteri ?? []).find((x) => x.id === id)?.nome ?? id })),
            a_scelta: e?.aScelta ?? 0,
            scelte: incantesimiDellaClasse(ctx, b.classe).filter((x) => (e ? x.livello <= e.livello && !e.fissi.includes(x.id) : x.livello <= slot.length)),
            libro: [...b.libro],
            slot,
            preparati: [...b.preparati],
          }
        : null,
    lingue: (ctx.s.lingue ?? []).length
      ? {
          proprie: (razzaDi(ctx, b.razza)?.lingue ?? []).map((id) => ({ id, nome: nomeDi(id) })),
          extra: lingueExtra(ctx, b),
          scelte: (ctx.s.lingue ?? []).filter((l) => !(razzaDi(ctx, b.razza)?.lingue ?? []).includes(l.id)).map((l) => ({ id: l.id, nome: l.nome })),
          lingue: [...b.lingue],
        }
      : null,
    descrizione: { ...b.descrizione },
    problemi: [],
  };
  // The creation check on the finished draft: the same function the validator mirrors (it never runs half-way, where
  // a missing class or book would be no news).
  if (b.stato !== 'in_corso') {
    const finita = sch ?? schedaLetta(ctx, b, moneteTirate(ctx, b));
    v.problemi = controllaPersonaggio(ctx.s, finita, { creato: true, livello: livelloIniziale(ctx), puntiFerita: ctx.opz.puntiFerita ?? ctx.cr.puntiFerita }).map((x) => ({
      codice: x.codice,
      grave: x.grave,
      testo: testo(`creazione.problemi.${x.codice}`, x.dettagli),
    }));
  }
  return v;
}

/** The panel's view: the phone's plus the device's first characters and the rolls entered. */
export function vistaMaster(ctx: CtxCreazione, b: Bozza): CreazioneMaster {
  return { ...vistaBozza(ctx, b), telefono: b.dispositivo.slice(0, 6), tiri_inseriti: b.tiri.map((t) => ({ per: t.per, dadi: [...t.dadi], manuale: t.manuale })) };
}

/** One line per step for the phone's list and the panel (null while nothing is decided). */
function riassunto(ctx: CtxCreazione, b: Bozza, passo: VistaCreazione['passi'][number]['id']): string | null {
  switch (passo) {
    case 'caratteristiche': {
      const p = punteggi(ctx, b);
      return p ? ctx.s.caratteristiche.map((c) => `${c.nome} ${p[c.id]}`).join(', ') : b.tiriCaratteristiche.length ? testo('creazione.riassunti.tiri', { n: b.tiriCaratteristiche.length, di: ctx.s.caratteristiche.length }) : null;
    }
    case 'razza':
      return razzaDi(ctx, b.razza)?.nome ?? null;
    case 'classe':
      return classeDi(ctx, b.classe)?.nome ?? null;
    case 'punti_ferita': {
      const t = puntiFerita(ctx, b).totale;
      return t === null ? null : testo('creazione.riassunti.pf', { pf: t });
    }
    case 'monete': {
      const m = moneteTirate(ctx, b);
      return m ? Object.entries(m).map(([k, n]) => `${n} ${k}`).join(', ') : null;
    }
    case 'acquisti': {
      if (!b.acquisti.length) return null;
      const r = rigioca(ctx, b);
      const nomi = b.acquisti.map((a) => `${(ctx.s.catalogo?.voci ?? []).find((v) => v.id === a.id)?.nome ?? a.id}${a.quante > 1 ? ` ×${a.quante}` : ''}`);
      const resto = Object.entries(r.monete).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`).join(', ') || '0';
      return testo('creazione.riassunti.acquisti', { oggetti: nomi.join(', '), resto, difesa: r.sch.difesa ?? '—' });
    }
    case 'incantesimi': {
      const nome = (id: string) => (ctx.s.poteri ?? []).find((x) => x.id === id)?.nome ?? id;
      if (!b.libro.length && !b.preparati.length) return null;
      return testo('creazione.riassunti.incantesimi', { libro: b.libro.map(nome).join(', ') || '—', preparati: b.preparati.map(nome).join(', ') || '—' });
    }
    case 'lingue':
      return b.lingue.length ? b.lingue.map((id) => (ctx.s.lingue ?? []).find((l) => l.id === id)?.nome ?? id).join(', ') : null;
    case 'descrizione':
      return b.descrizione.nome || null;
  }
}
