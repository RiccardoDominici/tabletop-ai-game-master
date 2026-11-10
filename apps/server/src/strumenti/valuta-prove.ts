/**
 * Valutazione dell'arbitro delle prove con Haiku vero (docs/prove.md, «Verifica»): i casi di
 * apps/server/test/prove/casi.yaml sulla campagna di prova con le schede, una chiamata per caso
 * (com'è all'invio di un'azione) e una chiamata con tutti i casi insieme (com'è alla chiusura,
 * per le azioni rimaste senza decisione). Misura accordo per campo, latenza p50/p90 e costo.
 *
 *   npx tsx apps/server/src/strumenti/valuta-prove.ts [--solo-singole | --solo-gruppo]
 *
 * La chiave la cerca llm/chiavi.ts (ambiente, poi .env alla radice): non si stampa mai.
 */
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { caricaCampagna } from '../campagna/caricatore';
import { caricaSchede } from '../campagna/schede';
import { caricaConfig } from '../config';
import { creaClientAnthropic } from '../llm/haiku';
import { ModelloAnthropic } from '../llm/anthropic';
import { creaLogger } from '../logger';
import { RADICE_REPO } from '../percorsi';
import { riassuntoPubblico } from '../azioni/contesto';
import { ArbitroProveHaiku, type MisuraProve } from '../prove/arbitro-haiku';
import { MotoreProve, type ContestoProve } from '../prove/motore';
import type { DecisioneProva, IngressoArbitroProve } from '../prove/tipi';
import { orologioDiSistema } from '../turni/orologio';

interface Caso {
  id: string;
  autore: string;
  testo: string;
  privata?: boolean;
  altre?: Array<{ id: string; autore: string; testo: string }>;
  atteso: Record<string, string>;
}

const CARTELLA = path.join(RADICE_REPO, 'apps', 'server', 'test', 'fixtures', 'campagne', 'prove');
const FILE_CASI = path.join(RADICE_REPO, 'apps', 'server', 'test', 'prove', 'casi.yaml');

function valore(d: DecisioneProva, campo: string): string {
  if (campo === 'reazione_png') return d.reazione?.png ?? '';
  const v = (d as unknown as Record<string, unknown>)[campo];
  return v === null || v === undefined ? '' : String(v);
}

function percentile(xs: number[], p: number): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] ?? 0;
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const config = caricaConfig(process.env);
  const log = creaLogger({ livello: 'warn', cartellaLog: path.join(RADICE_REPO, 'logs', 'porta-4720'), nomeFile: 'valuta-prove.jsonl' });
  const campagna = caricaCampagna(CARTELLA, log);
  const schede = caricaSchede(campagna);
  const { casi, narrazione } = YAML.parse(fs.readFileSync(FILE_CASI, 'utf8')) as { casi: Caso[]; narrazione: string };
  const misure: MisuraProve[] = [];
  const arbitro = new ArbitroProveHaiku(() => new ModelloAnthropic(() => creaClientAnthropic(config.llm.fileChiave, log), config.llm.modello), { modello: config.llm.modello, log, onMisura: (m) => misure.push(m) });
  const nome = (id: string): string => campagna.pg.find((p) => p.id === id)?.nome ?? campagna.png.find((p) => p.id === id)?.nome ?? id;
  const contesto: ContestoProve = { campagna, scenaPubblica: riassuntoPubblico(campagna, []), narrazione, versione: 1, pgAlTavolo: campagna.pg.map((p) => p.id), nome };
  // Il motore costruisce l'ingresso dell'arbitro come in partita (personaggi, prove della scena).
  const motore = new MotoreProve({ schede, arbitro: null, log, orologio: orologioDiSistema, attivo: true, conIndizi: false, contesto: () => contesto });
  const ingresso = (cs: Caso[]): IngressoArbitroProve => ({
    scena: contesto.scenaPubblica,
    narrazione,
    personaggi: motore.righePersonaggi(contesto),
    proveScena: '- p_guado · un PG attraversa il fiume a guado, aggrappato alla corda · Atletica\n- p_cassetta · un PG apre di nascosto il lucchetto della cassetta del pedaggio · Rapidità di mano',
    azioni: cs.map((c) => ({ id: c.id, autore: c.autore, nome: nome(c.autore), testo: c.testo, privata: !!c.privata })),
    altre: cs.flatMap((c) => (c.altre ?? []).map((a) => ({ ...a, nome: nome(a.autore), privata: false }))),
  });

  const confronta = (titolo: string, decisioni: Record<string, DecisioneProva>): void => {
    let campiOk = 0;
    let campi = 0;
    let tipiOk = 0;
    console.log(`\n== ${titolo}`);
    for (const c of casi) {
      const d = decisioni[c.id];
      const errori: string[] = [];
      if (!d) errori.push('nessuna decisione');
      else {
        for (const [campo, atteso] of Object.entries(c.atteso)) {
          campi++;
          const ok = atteso.split('|').includes(valore(d, campo));
          if (ok) campiOk++;
          else errori.push(`${campo}: «${valore(d, campo)}» invece di «${atteso}»`);
          if (campo === 'tipo' && ok) tipiOk++;
        }
      }
      const riass = d ? [d.tipo, d.abilita ?? d.caratteristica, d.bersaglio, d.arma, d.prova_scena, d.difficolta, d.vantaggio, d.motivo, d.aiuta, d.reazione?.png].filter(Boolean).join(' · ') : '';
      console.log(`${errori.length ? '✗' : '✓'} ${c.id} ${c.testo.slice(0, 60)} → ${riass}${errori.length ? `  [${errori.join('; ')}]` : ''}`);
    }
    console.log(`tipo giusto ${tipiOk}/${casi.length} · campi giusti ${campiOk}/${campi}`);
  };

  if (!args.has('--solo-gruppo')) {
    const singole: Record<string, DecisioneProva> = {};
    for (const c of casi) Object.assign(singole, await arbitro.classifica(ingresso([c])));
    const ms = misure.map((m) => m.ms);
    confronta('una chiamata per azione (all\'invio)', singole);
    const costo = misure.reduce((s, m) => s + m.costo.costo_usd, 0);
    console.log(`latenza p50 ${percentile(ms, 50)} ms · p90 ${percentile(ms, 90)} ms · max ${Math.max(...ms)} ms · costo ${costo.toFixed(4)} $ per ${ms.length} chiamate`);
  }
  if (!args.has('--solo-singole')) {
    const prima = misure.length;
    const gruppo = await arbitro.classifica(ingresso(casi));
    confronta(`una chiamata per ${casi.length} azioni (alla chiusura)`, gruppo);
    const m = misure.slice(prima)[0]!;
    console.log(`latenza ${m.ms} ms · costo ${m.costo.costo_usd.toFixed(4)} $`);
  }
}

void main();
