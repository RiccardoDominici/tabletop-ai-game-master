/**
 * Valutazione dell'arbitro sulle azioni (apps/server/test/arbitro/casi.yaml, casi scritti a mano):
 * solo regole contro regole + Haiku, sugli insiemi «sviluppo» e «riserva» (la riserva non si usa
 * per ritoccare il prompt).
 *
 *   npx tsx apps/server/src/strumenti/valuta-arbitro.ts [--insieme sviluppo|riserva|tutti] [--etichetta nome]
 *
 * Misure: precisione e richiamo delle dipendenze e dei conflitti esclusivi; tasso di falsi allarmi
 * (casi senza collegamenti attesi in cui si predice una dipendenza o un conflitto esclusivo, cioè
 * un avviso o un collegamento sbagliato); accuratezza dei giudizi sulle azioni vecchie e sui
 * cambi; latenza p50/p90 e costo delle chiamate a Haiku. La pipeline replica quella del Motore:
 * regole prima, modello solo se le regole non sono certe e c'è altro in coda; le dipendenze da
 * azioni private altrui si scartano.
 */
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { caricaCampagna } from '../campagna/caricatore';
import { caricaConfig } from '../config';
import { creaClientAnthropic } from '../llm/haiku';
import { creaLogger } from '../logger';
import { RADICE_REPO } from '../percorsi';
import { caricaParoleSegrete } from '../repertorio/segreti';
import { ArbitroHaiku, type MisuraChiamata } from '../azioni/arbitro-haiku';
import { riassuntoPubblico } from '../azioni/contesto';
import { normalizza, relazioniDaRegole } from '../azioni/regole';
import type { AzioneArbitro, Giudizio } from '../azioni/tipi';

interface AzioneCaso {
  id: string;
  autore: string;
  testo: string;
  privata?: boolean;
}
interface Caso {
  id: string;
  tipo: 'relazioni' | 'vecchie' | 'cambio';
  insieme: 'sviluppo' | 'riserva';
  nota?: string;
  narrazione: string;
  coda?: AzioneCaso[];
  nuova?: AzioneCaso;
  vecchie?: AzioneCaso[];
  prima?: AzioneCaso;
  dopo?: AzioneCaso;
  dipendente?: AzioneCaso;
  atteso: {
    dipende_da?: string[];
    conflitti?: Array<{ con: string; esclusivo: boolean }>;
    giudizi?: Record<string, Giudizio>;
    toccata?: boolean;
  };
}

interface Predizione {
  dipende_da: string[];
  conflitti: Array<{ con: string; esclusivo: boolean }>;
  giudizi?: Record<string, Giudizio>;
  toccata?: boolean;
  chiamata: boolean;
}

function percentile(xs: number[], p: number): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]!;
}

async function main(): Promise<void> {
  const arg = (n: string) => {
    const i = process.argv.indexOf(n);
    return i >= 0 ? process.argv[i + 1] : undefined;
  };
  const insieme = arg('--insieme') ?? 'tutti';
  const etichetta = arg('--etichetta') ?? `valutazione-${insieme}`;
  const config = caricaConfig();
  const log = creaLogger({ livello: 'warn', cartellaLog: config.cartellaLog, nomeFile: 'arbitro.jsonl' });
  const campagna = caricaCampagna(config.cartellaCampagna);
  const scena = riassuntoPubblico(campagna, caricaParoleSegrete(path.join(campagna.cartella, 'repertorio')));
  const nomePg = (id: string) => campagna.pg.find((p) => p.id === id)?.nome ?? id;
  const nomi = new Map<string, string>();
  for (const [alias, id] of Object.entries(campagna.alias)) if (campagna.pg.some((p) => p.id === id)) nomi.set(alias, id);

  const misure: MisuraChiamata[] = [];
  let client: ReturnType<typeof creaClientAnthropic> | null = null;
  const arbitro = new ArbitroHaiku(() => (client ??= creaClientAnthropic(config.llm.fileChiave, log)), { modello: config.llm.modello, log, onMisura: (m) => misure.push(m) });

  const tutti = (YAML.parse(fs.readFileSync(path.join(RADICE_REPO, 'apps', 'server', 'test', 'arbitro', 'casi.yaml'), 'utf8')) as { casi: Caso[] }).casi;
  const casi = tutti.filter((c) => insieme === 'tutti' || c.insieme === insieme);
  const verso = (a: AzioneCaso): AzioneArbitro => ({ id: a.id, autore: a.autore, nome: nomePg(a.autore), testo: a.testo, privata: !!a.privata });

  const dettagli: Array<Record<string, unknown>> = [];
  for (const c of casi) {
    const ctx = { narrazione: c.narrazione, scena };
    let regole: Predizione;
    let combinato: Predizione;
    if (c.tipo === 'relazioni') {
      const nuova = verso(c.nuova!);
      const coda = (c.coda ?? []).map(verso);
      const r = relazioniDaRegole(nuova, coda, nomi);
      regole = { dipende_da: r.certo ? r.dipende_da : [], conflitti: [], chiamata: false };
      if (r.certo || coda.length === 0) combinato = { ...regole };
      else {
        const m = await arbitro.relazioni({ ...ctx, nuova, coda });
        // Come il Motore: niente dipendenze da azioni private altrui.
        const private_ = new Set(coda.filter((a) => a.privata && a.autore !== nuova.autore).map((a) => a.id));
        combinato = { dipende_da: m.dipende_da.filter((id) => !private_.has(id)), conflitti: m.conflitti, chiamata: true };
      }
    } else if (c.tipo === 'vecchie') {
      const azioni = (c.vecchie ?? []).map(verso);
      regole = { dipende_da: [], conflitti: [], giudizi: Object.fromEntries(azioni.map((a) => [a.id, 'valida' as Giudizio])), chiamata: false };
      const g = await arbitro.vecchie({ ...ctx, azioni });
      combinato = { dipende_da: [], conflitti: [], giudizi: Object.fromEntries(azioni.map((a) => [a.id, g[a.id]?.giudizio ?? 'valida'])), chiamata: true };
      (combinato as Predizione & { motivi?: unknown }).motivi = g;
    } else {
      const pulito = (t: string) => normalizza(t).replace(/[^\p{L}\p{N} ]/gu, '');
      const uguale = pulito(c.prima!.testo) === pulito(c.dopo!.testo);
      regole = { dipende_da: [], conflitti: [], toccata: !uguale, chiamata: false };
      if (uguale) combinato = { ...regole };
      else {
        const g = await arbitro.cambio({ ...ctx, prima: verso(c.prima!), dopo: verso(c.dopo!), dipendenti: [verso(c.dipendente!)] });
        combinato = { dipende_da: [], conflitti: [], toccata: g[c.dipendente!.id]?.toccata ?? true, chiamata: true };
      }
    }
    dettagli.push({ id: c.id, tipo: c.tipo, insieme: c.insieme, atteso: c.atteso, regole, combinato });
    process.stdout.write('.');
  }
  process.stdout.write('\n');

  // ---- metriche
  const metriche = (chiave: 'regole' | 'combinato', filtro: (d: Record<string, unknown>) => boolean) => {
    const ds = dettagli.filter(filtro);
    let tpD = 0, fpD = 0, fnD = 0, tpC = 0, fpC = 0, fnC = 0, nonEsclPredetti = 0;
    let vuoti = 0, falsiAllarmi = 0;
    let giudiziOk = 0, giudiziTot = 0, impossibiliMancati = 0;
    let cambiOk = 0, cambiTot = 0;
    const confusione: Record<string, number> = {};
    for (const d of ds) {
      const a = d['atteso'] as Caso['atteso'];
      const p = d[chiave] as Predizione;
      if (d['tipo'] === 'relazioni') {
        const attD = new Set(a.dipende_da ?? []);
        const preD = new Set(p.dipende_da);
        for (const x of preD) attD.has(x) ? tpD++ : fpD++;
        for (const x of attD) if (!preD.has(x)) fnD++;
        const attC = new Set((a.conflitti ?? []).filter((x) => x.esclusivo).map((x) => x.con));
        const preC = new Set(p.conflitti.filter((x) => x.esclusivo).map((x) => x.con));
        for (const x of preC) attC.has(x) ? tpC++ : fpC++;
        for (const x of attC) if (!preC.has(x)) fnC++;
        nonEsclPredetti += p.conflitti.filter((x) => !x.esclusivo).length;
        if (!attD.size && !attC.size) {
          vuoti++;
          if (preD.size || preC.size) falsiAllarmi++;
        }
      } else if (d['tipo'] === 'vecchie') {
        for (const [id, g] of Object.entries(a.giudizi ?? {})) {
          giudiziTot++;
          const pg = p.giudizi?.[id] ?? 'valida';
          if (pg === g) giudiziOk++;
          if (g === 'impossibile' && pg === 'valida') impossibiliMancati++;
          confusione[`${g}→${pg}`] = (confusione[`${g}→${pg}`] ?? 0) + 1;
        }
      } else {
        cambiTot++;
        if (p.toccata === a.toccata) cambiOk++;
      }
    }
    const r2 = (x: number) => Math.round(x * 100) / 100;
    return {
      casi: ds.length,
      dipendenze: { precisione: tpD + fpD ? r2(tpD / (tpD + fpD)) : null, richiamo: tpD + fnD ? r2(tpD / (tpD + fnD)) : null, tp: tpD, fp: fpD, fn: fnD },
      conflitti_esclusivi: { precisione: tpC + fpC ? r2(tpC / (tpC + fpC)) : null, richiamo: tpC + fnC ? r2(tpC / (tpC + fnC)) : null, tp: tpC, fp: fpC, fn: fnC },
      conflitti_non_esclusivi_predetti: nonEsclPredetti,
      falsi_allarmi: { casi_senza_collegamenti: vuoti, con_avviso_sbagliato: falsiAllarmi, tasso: vuoti ? r2(falsiAllarmi / vuoti) : null },
      vecchie: { accuratezza: giudiziTot ? r2(giudiziOk / giudiziTot) : null, n: giudiziTot, impossibili_date_per_valide: impossibiliMancati, confusione },
      cambi: { accuratezza: cambiTot ? r2(cambiOk / cambiTot) : null, n: cambiTot },
    };
  };
  const perInsieme = (i: string) => (d: Record<string, unknown>) => i === 'tutti' || d['insieme'] === i;
  const ms = misure.map((m) => m.ms);
  const riepilogo = {
    etichetta,
    insieme,
    modello: config.llm.modello,
    data: new Date().toISOString(),
    solo_regole: { sviluppo: metriche('regole', perInsieme('sviluppo')), riserva: metriche('regole', perInsieme('riserva')), tutti: metriche('regole', perInsieme('tutti')) },
    regole_piu_haiku: { sviluppo: metriche('combinato', perInsieme('sviluppo')), riserva: metriche('combinato', perInsieme('riserva')), tutti: metriche('combinato', perInsieme('tutti')) },
    haiku: {
      chiamate: misure.length,
      latenza_ms: { p50: percentile(ms, 50), p90: percentile(ms, 90), max: ms.length ? Math.max(...ms) : null },
      per_tipo: Object.fromEntries(['relazioni', 'vecchie', 'cambio'].map((t) => {
        const x = misure.filter((m) => m.tipo === t).map((m) => m.ms);
        return [t, { n: x.length, p50: percentile(x, 50), p90: percentile(x, 90) }];
      })),
      costo_usd: Math.round(misure.reduce((s, m) => s + m.costo.costo_usd, 0) * 1e6) / 1e6,
      costo_medio_usd: misure.length ? Math.round((misure.reduce((s, m) => s + m.costo.costo_usd, 0) / misure.length) * 1e7) / 1e7 : null,
      token_cache_lettura: misure.map((m) => m.costo.token_cache_lettura),
    },
  };
  const cartella = path.join(RADICE_REPO, 'esperimenti', 'risultati', 'arbitro', etichetta);
  fs.mkdirSync(cartella, { recursive: true });
  fs.writeFileSync(path.join(cartella, 'riepilogo.json'), JSON.stringify(riepilogo, null, 2) + '\n');
  fs.writeFileSync(path.join(cartella, 'dettagli.jsonl'), dettagli.map((d) => JSON.stringify(d)).join('\n') + '\n');
  console.log(JSON.stringify({ solo_regole: riepilogo.solo_regole.tutti, regole_piu_haiku: riepilogo.regole_piu_haiku, haiku: { ...riepilogo.haiku, token_cache_lettura: undefined } }, null, 1));
  console.log(`→ ${path.relative(RADICE_REPO, cartella)}`);
  log.flush?.();
}

main().catch((err: unknown) => {
  console.error('valutazione fallita:', (err as Error).message);
  process.exit(1);
});
