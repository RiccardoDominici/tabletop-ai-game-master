/**
 * Quanto l'arbitro delle prove A REGOLE (prove/classificatore-regole.ts, il default del profilo
 * locale) si accorda con l'arbitro Haiku (prove/arbitro-haiku.ts), su:
 *  A. i 16 casi scritti a mano (apps/server/test/prove/casi.yaml, campagna di prova con le schede);
 *  B. le azioni dei turni B3 (esperimenti/copioni/nozze-neve/*.yaml, su campagne/nozze-neve), con Haiku
 *     chiamato una volta per turno con tutte le azioni del turno (com'è alla chiusura).
 *
 *   npx tsx apps/server/src/strumenti/confronta-arbitri.ts [--solo-casi | --solo-b3]
 *
 * Misure: si tira sì/no uguale; stesso tipo; stessa abilità o prova della scena quando entrambi tirano
 * una prova; stesso bersaglio negli attacchi. La chiave la legge llm/chiave.ts (mai stampata).
 */
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { caricaCampagna } from '../campagna/caricatore';
import { caricaSchede } from '../campagna/schede';
import { proveDellaScena } from '../campagna/prove-scena';
import { conScena, type Campagna } from '../campagna/tipi';
import { caricaConfig } from '../config';
import { creaClientAnthropic } from '../llm/haiku';
import { ModelloAnthropic } from '../llm/anthropic';
import { creaLogger } from '../logger';
import { RADICE_REPO } from '../percorsi';
import { riassuntoPubblico } from '../azioni/contesto';
import { ArbitroProveHaiku } from '../prove/arbitro-haiku';
import { classificaARegole, type IngressoClassificatore } from '../prove/classificatore-regole';
import { MotoreProve, type ContestoProve } from '../prove/motore';
import type { DecisioneProva } from '../prove/tipi';
import { ABILITA_INFLUENZA, DIFFICOLTA } from '../campagna/regole-srd';
import { cdInfluenza, passiva } from '../campagna/schede';

/** La CD (o la CA) che il Motore userebbe per questa decisione (null = niente tiro). */
function cdDi(d: DecisioneProva | undefined, c: Campagna, schede: ReturnType<typeof caricaSchede>): number | null {
  if (!d || ['nessuna', 'impossibile', 'aiuto'].includes(d.tipo)) return null;
  const b = d.bersaglio ? (schede.get(d.bersaglio) ?? null) : null;
  if (d.tipo === 'attacco') return b?.ca ?? null;
  if (d.prova_scena) {
    const p = proveDellaScena(c, c.scena).find((x) => x.id === d.prova_scena);
    if (p) return p.cd;
  }
  if (d.tipo === 'contrapposta') return b ? passiva(b, d.abilita_bersaglio ?? 'percezione') : 10;
  if (d.abilita && ABILITA_INFLUENZA.has(d.abilita) && d.bersaglio?.startsWith('png_')) return cdInfluenza(b);
  return DIFFICOLTA[d.difficolta ?? 'media'];
}
import { orologioDiSistema } from '../turni/orologio';

interface Azione {
  id: string;
  autore: string;
  testo: string;
  privata: boolean;
}

const tira = (d: { tipo: string } | undefined): boolean => !!d && !['nessuna', 'impossibile', 'aiuto'].includes(d.tipo);

class Conteggio {
  n = 0;
  tiroUguale = 0;
  tipoUguale = 0;
  proveEntrambi = 0;
  proveUguali = 0;
  attacchiEntrambi = 0;
  attacchiUguali = 0;
  cdEntrambi = 0;
  cdUguali = 0;
  disaccordi: string[] = [];
  aggiungi(testo: string, h: DecisioneProva | undefined, r: DecisioneProva, cd?: { h: number | null; r: number | null }): void {
    this.n++;
    if (cd && cd.h !== null && cd.r !== null) {
      this.cdEntrambi++;
      if (cd.h === cd.r) this.cdUguali++;
    }
    if (tira(h) === tira(r)) this.tiroUguale++;
    if (h?.tipo === r.tipo) this.tipoUguale++;
    if (h && tira(h) && tira(r) && h.tipo !== 'attacco' && r.tipo !== 'attacco') {
      this.proveEntrambi++;
      if ((h.prova_scena && h.prova_scena === r.prova_scena) || (h.abilita ?? h.caratteristica) === (r.abilita ?? r.caratteristica)) this.proveUguali++;
    }
    if (h?.tipo === 'attacco' && r.tipo === 'attacco') {
      this.attacchiEntrambi++;
      if (h.bersaglio === r.bersaglio) this.attacchiUguali++;
    }
    const breve = (d?: DecisioneProva): string => (d ? [d.tipo, d.prova_scena ?? d.abilita ?? d.caratteristica, d.bersaglio].filter(Boolean).join('·') : '—');
    if (tira(h) !== tira(r) || (tira(h) && breve(h) !== breve(r))) this.disaccordi.push(`  ${testo.slice(0, 70)}  | Haiku ${breve(h)} | regole ${breve(r)}`);
  }
  stampa(titolo: string): void {
    const pc = (a: number, b: number): string => (b ? `${a}/${b} (${Math.round((100 * a) / b)}%)` : '—');
    console.log(`\n== ${titolo}: ${this.n} azioni`);
    console.log(`si tira sì/no uguale ${pc(this.tiroUguale, this.n)} · tipo uguale ${pc(this.tipoUguale, this.n)} · stessa abilità o prova ${pc(this.proveUguali, this.proveEntrambi)} · stessa CD/CA quando tirano entrambi ${pc(this.cdUguali, this.cdEntrambi)} · stesso bersaglio ${pc(this.attacchiUguali, this.attacchiEntrambi)}`);
    console.log(`disaccordi (${this.disaccordi.length}):\n${this.disaccordi.join('\n')}`);
  }
}

function ingressoRegole(c: Campagna, schede: ReturnType<typeof caricaSchede>, altre: Azione[]): IngressoClassificatore {
  return {
    campagna: c,
    regole: null,
    armi: (id) => schede.get(id)?.attacchi.map((a) => a.id) ?? [],
    haScheda: (id) => schede.has(id),
    proveScena: proveDellaScena(c, c.scena).map((p) => ({ id: p.id, quando: p.quando, parole: p.parole })),
    altre: altre.map((a) => ({ id: a.id, autore: a.autore })),
  };
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const config = caricaConfig(process.env);
  const log = creaLogger({ livello: 'warn', cartellaLog: path.join(RADICE_REPO, 'logs', 'porta-4720'), nomeFile: 'confronta-arbitri.jsonl' });
  const haiku = new ArbitroProveHaiku(() => new ModelloAnthropic(() => creaClientAnthropic(config.llm.fileChiave, log), config.llm.modello), { modello: config.llm.modello, log });
  const nomeDi = (c: Campagna) => (id: string): string => c.pg.find((p) => p.id === id)?.nome ?? c.png.find((p) => p.id === id)?.nome ?? id;

  // Le decisioni di Haiku si tengono in un file: ripetendo la misura dopo un ritocco delle regole non si
  // richiama il modello (--nuovo per rifarle).
  const fileCache = path.join(RADICE_REPO, 'logs', 'porta-4720', 'confronta-arbitri-haiku.json');
  const cache: Record<string, Record<string, DecisioneProva>> = !args.has('--nuovo') && fs.existsSync(fileCache) ? JSON.parse(fs.readFileSync(fileCache, 'utf8')) : {};
  const salva = (): void => fs.writeFileSync(fileCache, JSON.stringify(cache));

  /** Haiku su un gruppo di azioni, con l'ingresso costruito come in partita. */
  async function chiediHaiku(c: Campagna, schede: ReturnType<typeof caricaSchede>, azioni: Azione[], narrazione: string): Promise<Record<string, DecisioneProva>> {
    const chiave = azioni.map((a) => `${a.id}:${a.testo}`).join('|');
    if (cache[chiave]) return cache[chiave]!;
    const r = await chiediHaikuVero(c, schede, azioni, narrazione);
    cache[chiave] = r;
    salva();
    return r;
  }

  async function chiediHaikuVero(c: Campagna, schede: ReturnType<typeof caricaSchede>, azioni: Azione[], narrazione: string): Promise<Record<string, DecisioneProva>> {
    const contesto: ContestoProve = { campagna: c, scenaPubblica: riassuntoPubblico(c, []), narrazione, versione: 1, pgAlTavolo: [...new Set(azioni.map((a) => a.autore))], nome: nomeDi(c) };
    const m = new MotoreProve({ schede, arbitro: null, log, orologio: orologioDiSistema, attivo: true, conIndizi: false, contesto: () => contesto });
    const nome = nomeDi(c);
    return haiku.classifica({
      scena: contesto.scenaPubblica,
      narrazione,
      personaggi: m.righePersonaggi(contesto),
      proveScena: proveDellaScena(c, c.scena).map((p) => `- ${p.id} · ${p.quando}`).join('\n'),
      azioni: azioni.map((a) => ({ ...a, nome: nome(a.autore) })),
      altre: [],
    });
  }

  if (!args.has('--solo-b3')) {
    const cartella = path.join(RADICE_REPO, 'apps', 'server', 'test', 'fixtures', 'campagne', 'prove');
    const c = caricaCampagna(cartella);
    const schede = caricaSchede(c);
    const { casi, narrazione } = YAML.parse(fs.readFileSync(path.join(RADICE_REPO, 'apps', 'server', 'test', 'prove', 'casi.yaml'), 'utf8')) as { casi: Array<Azione & { altre?: Azione[] }>; narrazione: string };
    const conto = new Conteggio();
    for (const caso of casi) {
      const az = { id: caso.id, autore: caso.autore, testo: caso.testo, privata: !!caso.privata };
      const altre = (caso.altre ?? []).map((a) => ({ ...a, privata: false }));
      const h = (await chiediHaiku(c, schede, [az], narrazione))[caso.id];
      const r = classificaARegole(az, ingressoRegole(c, schede, altre)) as DecisioneProva;
      conto.aggiungi(caso.testo, h, r, { h: cdDi(h, c, schede), r: cdDi(r, c, schede) });
    }
    conto.stampa('A. 16 casi scritti a mano');
  }

  if (!args.has('--solo-casi')) {
    const base = caricaCampagna(path.join(RADICE_REPO, 'campagne', 'nozze-neve'));
    const schede = caricaSchede(base);
    const conto = new Conteggio();
    for (const f of ['indagine', 'caotico', 'privato']) {
      const copione = YAML.parse(fs.readFileSync(path.join(RADICE_REPO, 'esperimenti', 'copioni', 'nozze-neve', `${f}.yaml`), 'utf8')) as { scena: string; turni: Array<Array<{ pg?: string; azione?: string; privata?: boolean; scena?: string }>> };
      let c = conScena(base, copione.scena);
      let n = 0;
      for (const turno of copione.turni) {
        const azioni: Azione[] = [];
        for (const voce of turno) {
          if (voce.scena) c = conScena(base, voce.scena);
          else if (voce.pg && voce.azione) azioni.push({ id: `${f}-${++n}`, autore: voce.pg, testo: voce.azione, privata: !!voce.privata });
        }
        if (!azioni.length) continue;
        const h = await chiediHaiku(c, schede, azioni, '(i PG sono in scena e agiscono)');
        for (const a of azioni) {
          const r = classificaARegole(a, ingressoRegole(c, schede, azioni)) as DecisioneProva;
          conto.aggiungi(a.testo, h[a.id], r, { h: cdDi(h[a.id], c, schede), r: cdDi(r, c, schede) });
        }
      }
    }
    conto.stampa('B. turni B3 di nozze-neve (indagine, caotico, privato)');
  }
}

void main();
