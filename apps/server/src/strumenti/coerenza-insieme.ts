/**
 * The frozen replay set of the coherence checker (docs/coerenza.md, «Frozen replay set»): from the run folders kept in
 * git, every narrator sentence the model wrote (the raw answer, before any checker) in the calls whose turn had the
 * coherence ledger in the log, with that turn's ledger rows rebuilt from the `registro: evento` lines, the turn's
 * public attack cards, and a flag on the sentences a coherence rule is about: a sentence that names a character out of
 * play or absent from the scene, uses a creature noun that nobody in play in the scene answers to, or names the target
 * of a blow that hurt together with a miss or absorb word. Those flagged sentences are labelled once by hand
 * (esperimenti/coerenza/etichette.json); `coerenza-punteggio.ts` scores any checker variant on them in seconds.
 *
 *   npx tsx apps/server/src/strumenti/coerenza-insieme.ts <campaign folder> <run folder>… > esperimenti/coerenza/insieme.json
 *
 * Limits, said in the output too: the ledger is rebuilt from the change events (a state never changed is standing; the
 * presence is the scene's `png_presenti`, then the presence events of the visit); the private replies' raw text is not in the logs (only the
 * public answer is); presence events logged in a turn are taken as before that turn's narration.
 */
import fs from 'node:fs';
import path from 'node:path';
import { caricaCampagna } from '../campagna/caricatore';
import { nomeBreve } from '../campagna/nomi';
import { normalizza } from '../azioni/regole';
import { contestoMenzioni, menzioniDi, presentiNominati } from '../coerenza/menzioni';
import { dividiTesto } from '../narrazione/frasi';
import type { EntitaRegistro, PresenzaEntita, Registro, StatoEntita } from '../coerenza/registro';
import { tipiGregari } from '../campagna/gregari';
import { impostaLingua } from '../lingua';
import { nomiDeiPng } from '../repertorio/pertinenza';

/** One attack card of the turn, as the replay needs it. */
export interface CartaInsieme {
  chi: string;
  bersaglio: string;
  riuscita: boolean;
  danno: number;
}

export interface FraseInsieme {
  i: number;
  etichetta: string;
  testo: string;
  /** A coherence rule is about this sentence (see the module comment); only these are labelled and scored. */
  segnata: boolean;
  /** Why it is flagged: `fuori:<id>`, `assente:<id>`, `nome:<noun>`, `colpo:<id>`. */
  menzioni: string[];
}

export interface ChiamataInsieme {
  id: string;
  run: string;
  turno: number;
  scena: string;
  /** A fight was on, or a blow was struck earlier in this scene's visit, or this turn. */
  scontro: boolean;
  entita: EntitaRegistro[];
  /** Who went out of play by this turn's cards: their fall is this turn's story, not an act (as R-fuori's `oraFuori`). */
  fuoriOra: string[];
  carte: CartaInsieme[];
  /** The turn's actions (public and private), as the guards' noun filter reads them. */
  azioni: Array<{ id_pg: string; testo: string; privata: boolean }>;
  frasi: FraseInsieme[];
}

const IN_GIOCO: ReadonlySet<StatoEntita> = new Set(['in_piedi', 'ferito', 'grave', 'nascosto']);

function jsonl(f: string): Array<Record<string, unknown>> {
  if (!fs.existsSync(f)) return [];
  return fs
    .readFileSync(f, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .flatMap((l) => {
      try {
        return [JSON.parse(l) as Record<string, unknown>];
      } catch {
        return [];
      }
    });
}

function main(): void {
  const argomenti = process.argv.slice(2);
  const uscite = argomenti.includes('--uscite');
  const [cartellaCampagna, ...runs] = argomenti.filter((a) => a !== '--uscite');
  if (!cartellaCampagna || !runs.length) {
    process.stderr.write('usage: coerenza-insieme.ts <campaign folder> <run folder>…\n');
    process.exit(2);
  }
  const c = caricaCampagna(cartellaCampagna);
  impostaLingua(c.lingua ?? "it");
  const nomiPng = nomiDeiPng(c);
  const tipi = tipiGregari(c);
  const perNome = new Map<string, string>();
  for (const p of c.pg) for (const n of [p.nome, nomeBreve(p.nome)]) perNome.set(normalizza(n), p.id);
  for (const p of c.png) for (const n of [p.nome, nomeBreve(p.nome)]) perNome.set(normalizza(n), p.id);
  const idDi = (nome: string): string | null => perNome.get(normalizza(nome.trim())) ?? perNome.get(normalizza(nome.trim().split(/\s+/)[0] ?? '')) ?? null;
  const chiamate: ChiamataInsieme[] = [];
  for (const run of runs) {
    const nome = path.basename(run);
    const server = jsonl(path.join(run, 'log-server', 'server.jsonl'));
    const narr = jsonl(path.join(run, 'log-server', 'narrazioni.jsonl'));
    let eventi = server.filter((r) => r['msg'] === 'registro: evento');
    if (!eventi.length) {
      // Code before the ledger (the third pass's own runs, the held-out set): the falls from «combattimento: esce dallo
      // scontro», which has no turn of its own: it is the turn of the next line that has one (its turn's message).
      eventi = [];
      for (const [k, r] of server.entries()) {
        if (r['msg'] !== 'combattimento: esce dallo scontro') continue;
        const dopo = server.slice(k + 1).find((x) => x['turno'] !== undefined);
        const turno = Number(dopo?.['turno'] ?? 0);
        const id = String(r['id']);
        eventi.push({ msg: 'registro: evento', turno, tipo: 'stato', id, da: 'None', a: String(r['esito']), causa: 'carte del turno' });
        if (r['esito'] === 'fuggito') eventi.push({ msg: 'registro: evento', turno, tipo: 'presenza', id, da: 'in_scena', a: 'altrove', causa: 'carte del turno' });
      }
      process.stderr.write(`${nome}: no ledger events: falls rebuilt from «esce dallo scontro» (${eventi.length} events)\n`);
    }
    // The first state and presence of every character: the `da` of its first event, else standing and elsewhere.
    const stato = new Map<string, StatoEntita>();
    for (const e of eventi) {
      const id = String(e['id']);
      if (e['tipo'] === 'stato' && !stato.has(id) && e['da'] && e['da'] !== 'None') stato.set(id, e['da'] as StatoEntita);
    }
    const cambi = narr.filter((r) => r['tipo'] === 'cambio_scena').map((r) => ({ turno: Number(r['turno']), a: String(r['a']) }));
    const apertura = narr.find((r) => r['tipo'] === 'apertura');
    const turni = narr.filter((r) => r['tipo'] === 'turno' && typeof r['testo'] === 'string').sort((a, b) => Number(a['turno']) - Number(b['turno']));
    // Fights: a turn with an attack card, or the combat log lines; a visit lasts until the next scene change.
    const colpiPerTurno = new Map<number, CartaInsieme[]>();
    const scontroTurni = new Set<number>();
    for (const r of server) {
      const t = Number(r['turno']);
      if (r['msg'] === 'prove: tiri del turno') {
        const carte: CartaInsieme[] = [];
        for (const f of (r['fatti'] as string[] | undefined) ?? []) {
          const npc = /^Turno di ([^:]+):.*?Dettagli: attacco con .+? a (.+?): .*?→ (COLPITO|MANCATO|SUCCESSO CRITICO|FALLIMENTO CRITICO)(?:, (\d+) danni)?/u.exec(f);
          const pc = /^(?:\[\d+\] )?([^:]+): attacco con .+? a (.+?): .*?→ (COLPITO|MANCATO|SUCCESSO CRITICO|FALLIMENTO CRITICO)(?:, (\d+) danni)?/u.exec(f);
          const m = npc ?? pc;
          if (!m) continue;
          const chi = idDi(m[1]!);
          const bersaglio = idDi(m[2]!);
          if (!chi || !bersaglio) continue;
          const riuscita = m[3] === 'COLPITO' || m[3] === 'SUCCESSO CRITICO';
          carte.push({ chi, bersaglio, riuscita, danno: riuscita ? Number(m[4] ?? 0) : 0 });
        }
        colpiPerTurno.set(t, carte);
        if (carte.length) scontroTurni.add(t);
      }
      if (typeof r['msg'] === 'string' && (r['msg'] as string).startsWith('combattimento:')) scontroTurni.add(t);
    }
    let scena = String(apertura?.['scena'] ?? '');
    let ingresso = 0;
    let fatti = 0;
    for (const tr of turni) {
      const turno = Number(tr['turno']);
      const cambio = cambi.filter((x) => x.turno < turno).at(-1);
      if (cambio && cambio.a !== scena) {
        scena = cambio.a;
        ingresso = cambio.turno + 1;
      }
      // Events up to this turn: earlier turns all, this turn's (cards and state) as before the narration.
      for (; fatti < eventi.length && Number(eventi[fatti]!['turno']) <= turno; fatti++) {
        const e = eventi[fatti]!;
        const id = String(e['id']);
        if (e['tipo'] === 'stato') stato.set(id, e['a'] as StatoEntita);
      }
      // Presence: the scene's `png_presenti`, then what the events of this visit changed (a flight, a tag).
      const diScena = new Set(((c.scene.find((s) => s.id === scena)?.dati['png_presenti'] as string[] | undefined) ?? []).map(String));
      const presenzaOra = (id: string): PresenzaEntita => {
        const ultimo = eventi.filter((e) => e['tipo'] === 'presenza' && String(e['id']) === id && Number(e['turno']) >= ingresso && Number(e['turno']) <= turno).at(-1);
        return ultimo ? (ultimo['a'] as PresenzaEntita) : diScena.has(id) ? 'in_scena' : 'altrove';
      };
      const entita: EntitaRegistro[] = [
        ...c.pg.map((p) => ({ id: p.id, tipo: 'pg' as const, nome: p.nome, nomi: [p.nome, nomeBreve(p.nome)], stato: stato.get(p.id) ?? 'in_piedi', presenza: 'in_scena' as const, uscito: null })),
        ...c.png.map((p) => ({ id: p.id, tipo: 'png' as const, nome: p.nome, nomi: nomiPng.get(p.id) ?? [p.nome], stato: stato.get(p.id) ?? 'in_piedi', presenza: presenzaOra(p.id), uscito: null })),
      ];
      const registro: Registro = { turno, scena, entita, fatti: [], esiti: [], negati: [] };
      const carte = colpiPerTurno.get(turno) ?? [];
      const fuoriOra = eventi.filter((e) => e['tipo'] === 'stato' && Number(e['turno']) === turno && !IN_GIOCO.has(e['a'] as StatoEntita)).map((e) => String(e['id']));
      const contesto = contestoMenzioni(registro, tipi, carte, fuoriOra);
      const scontro = [...scontroTurni].some((t) => t >= ingresso && t <= turno);
      const frasi: FraseInsieme[] = [];
      for (const riga of String(tr['testo']).split('\n')) {
        const m = /^\[([a-z_0-9]+)\]\s*(.*)$/u.exec(riga.trim());
        if (!m || !(m[1] === 'narratore' || m[1]!.startsWith('png_'))) continue;
        // The pipeline's own sentence splitter (narrazione/frasi.ts), so the set's sentences are the checker's.
        for (const testo of dividiTesto(m[2]!)) {
          // `--uscite`: the set of possible silent exits (a narrator sentence naming an NPC in the scene and in play).
          const menzioni = uscite ? (m[1] === 'narratore' ? presentiNominati(testo, contesto) : []) : menzioniDi(testo, m[1]!, contesto);
          frasi.push({ i: frasi.length, etichetta: m[1]!, testo, segnata: menzioni.length > 0, menzioni });
        }
      }
      if (!frasi.some((f) => f.segnata)) continue;
      const azioni = ((tr['azioni'] as Array<Record<string, unknown>> | undefined) ?? [])
        .filter((a) => typeof a['testo'] === 'string')
        .map((a) => ({ id_pg: String(a['id_pg']), testo: String(a['testo']), privata: a['privata'] === true }));
      chiamate.push({ id: `${nome}#${turno}`, run: nome, turno, scena, scontro, entita, fuoriOra, carte, azioni, frasi });
    }
  }
  const segnate = chiamate.reduce((n, x) => n + x.frasi.filter((f) => f.segnata).length, 0);
  process.stdout.write(
    `${JSON.stringify(
      {
        nota: 'Frozen replay set (docs/coerenza.md). Raw public answers; ledger rebuilt from registro events; private replies not included.',
        campagna: path.basename(cartellaCampagna),
        chiamate: chiamate.length,
        segnate,
        insieme: chiamate,
      },
      null,
      1,
    )}\n`,
  );
  process.stderr.write(`${chiamate.length} calls, ${segnate} flagged sentences\n`);
}

main();
