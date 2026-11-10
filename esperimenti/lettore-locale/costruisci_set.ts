/**
 * Costruisce il set di prova del lettore locale (esperimenti/lettore-locale/).
 *
 * Per ogni turno del selettore (modo B, nozze-neve, cinque run in esperimenti/risultati/) ricostruisce
 * il prompt che il server manda a Haiku, usando le STESSE funzioni del server:
 *   - sistema  = prompts/selettore.md + contestoPer(scena) (compilaContestoRepertorio + blocco audio),
 *                come in apps/server/src/avvio.ts;
 *   - messaggio = compilaMessaggioTurno (apps/server/src/narrazione/messaggio.ts), con la storia pubblica
 *                ricavata dal transcript dei turni precedenti e le azioni del turno.
 * Riferimento = le righe etichettate che Haiku ha scritto (blocco «Narratore:», senza le battute pre-scritte
 * che il Motore ha espanso da un [usa]).
 *
 * Limiti dichiarati (vedi risultati.md): il catalogo del turno è quello STATICO della scena (il caso peggiore,
 * come strumenti/contesto_modo_b.ts --catalogo), perché il catalogo vero dipende dallo stato del Motore che il
 * transcript non conserva; la preselezione «Battute indicate dal Motore» non si ricostruisce.
 *
 * Uso (dalla radice del repo):  npx tsx esperimenti/lettore-locale/costruisci_set.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { caricaCampagna } from '../../apps/server/src/campagna/caricatore';
import { conScena } from '../../apps/server/src/campagna/tipi';
import { caricaRepertorio } from '../../apps/server/src/repertorio/caricatore';
import { compilaContestoRepertorio } from '../../apps/server/src/repertorio/contesto';
import { caricaParoleSegreteCampagna } from '../../apps/server/src/repertorio/segreti';
import { StatoRepertorio, parlantiDi } from '../../apps/server/src/repertorio/stato';
import type { Repertorio } from '../../apps/server/src/repertorio/tipi';
import { compilaMessaggioTurno } from '../../apps/server/src/narrazione/messaggio';
import { CatalogoAudio } from '../../apps/server/src/audio/catalogo';
import { bloccoAudioContesto } from '../../apps/server/src/audio/cue';
import { loggerMuto } from '../../apps/server/src/logger';
import { StatoOrologi } from '../../apps/server/src/scena/orologi';
import { nomiDeiPng } from '../../apps/server/src/repertorio/pertinenza';
import { sezioniContestoRepertorio } from '../../apps/server/src/repertorio/contesto';
import type { Battuta } from '../../apps/server/src/repertorio/tipi';
import type { VoceTrascrizione } from '../../packages/shared/src/dominio';

// Si lancia dalla radice del repo (vedi l'uso sopra): tsx esegue il file come ES module, senza __dirname.
const RADICE = process.cwd();
const CAMPAGNA_DIR = path.join(RADICE, 'campagne', 'nozze-neve');
const RISULTATI = path.join(RADICE, 'esperimenti', 'risultati');
const DATI = path.join(RADICE, 'esperimenti', 'lettore-locale', 'dati');
const PROMPT_SELETTORE = fs.readFileSync(path.join(RADICE, 'prompts', 'selettore.md'), 'utf8');

interface AzioneTrascritta { id: string; testo: string }
interface TurnoTrascritto {
  n: number;
  apertura: boolean;
  cambio: boolean;
  scena: string;
  azioni: AzioneTrascritta[];
  haiku: string[];
  haveNarratore: boolean;
  /** Voci pubbliche da mettere nella storia dopo questo turno. */
  storia: VoceTrascrizione[];
}

/** Catalogo statico della scena (come strumenti/contesto_modo_b.ts, catalogoDi + cancelli). */
function cancelli(b: Repertorio['battute'][number]): string[] {
  const r = b.richiede;
  const out: string[] = [];
  if (r.indizi_rivelati.length) out.push(`dopo ${r.indizi_rivelati.join('+')}`);
  if (r.battute_usate.length) out.push(`dopo ${r.battute_usate.join('+')}`);
  if (r.orologio) out.push(`${r.orologio.id} ${r.orologio.min}–${r.orologio.max}`);
  if (r.privata) out.push('privata');
  if (r.da_pg.length) out.push(`da ${r.da_pg.join('/')}`);
  if (r.oppure.length) out.push(`oppure ×${r.oppure.length}`);
  return out;
}

function catalogoDi(rep: Repertorio, scena: { id: string; png_presenti: readonly string[] }): string[] {
  return rep.battute
    .filter((b) => !b.solo_esempio && (b.scene.length === 0 || b.scene.includes(scena.id)))
    .filter((b) => parlantiDi(b).every((p) => scena.png_presenti.includes(p)))
    .map((b) => {
      const c = cancelli(b);
      return c.length ? `${StatoRepertorio.riga(b)}   [chiusa: ${c.join(', ')}]` : StatoRepertorio.riga(b);
    });
}

// Legge un transcript (formato di esperimenti/risultati/<run>/trascrizione.md) in turni.
function leggiTranscript(file: string, nomePg: Map<string, string>): TurnoTrascritto[] {
  const righe = fs.readFileSync(file, 'utf8').split('\n');
  const turni: TurnoTrascritto[] = [];
  let corrente: TurnoTrascritto | null = null;
  let scena = 'scena_casera';
  let modo: 'nessuno' | 'azioni' | 'blocco' = 'nessuno';
  let tipoBlocco: 'narratore' | 'motore' = 'narratore';
  let attesaMotore = false;
  let prossimoBlocco: 'narratore' | 'motore' = 'narratore';
  let idStoria = 0;

  const aggiungiStoria = (v: Omit<VoceTrascrizione, 'id'>): void => {
    corrente?.storia.push({ id: idStoria++, ...v });
  };

  for (const riga of righe) {
    const intest = /^## Turno (\d+)(.*)$/.exec(riga);
    if (intest) {
      const n = Number(intest[1]);
      const resto = intest[2] ?? '';
      corrente = { n, apertura: /apertura/.test(resto), cambio: /cambio di scena/.test(resto), scena, azioni: [], haiku: [], haveNarratore: false, storia: [] };
      if (corrente.apertura) {
        const m = /\((scena_\w+)\)/.exec(resto);
        if (m) scena = m[1]!;
        corrente.scena = scena;
      }
      if (corrente.cambio) {
        const m = /→ (scena_\w+)/.exec(resto);
        if (m) scena = m[1]!;
        corrente.scena = scena;
      }
      corrente.scena = scena;
      turni.push(corrente);
      modo = 'nessuno';
      continue;
    }
    if (!corrente) continue;
    if (riga === 'Azioni:') { modo = 'azioni'; continue; }
    if (modo === 'azioni') {
      const a = /^- (pg_\w+): «(.*)»$/.exec(riga);
      if (a) { corrente.azioni.push({ id: a[1]!, testo: a[2]! }); continue; }
      if (riga.trim() === '') modo = 'nessuno';
    }
    if (riga === 'Narratore:') { corrente.haveNarratore = true; prossimoBlocco = 'narratore'; continue; }
    if (riga.startsWith('Aggiunta dal Motore')) { attesaMotore = true; continue; }
    if (riga.startsWith('```text')) {
      modo = 'blocco';
      tipoBlocco = attesaMotore ? 'motore' : prossimoBlocco;
      attesaMotore = false;
      prossimoBlocco = 'narratore';
      continue;
    }
    if (modo === 'blocco') {
      if (riga === '```') { modo = 'nessuno'; continue; }
      if (riga.trim() === '') continue;
      const prescritta = /^\s*⟨pre-scritta⟩ (.*)$/.exec(riga);
      if (prescritta) {
        const l = /^\[([^\]]+)\] (.*)$/.exec(prescritta[1]!);
        if (l) aggiungiStoria({ turno: corrente.n, tipo: 'battuta', chi: l[1]!, nome: nomeDi(l[1]!, nomePg), testo: l[2]! });
        continue;
      }
      const l = /^\[([^\]]+)\] ?(.*)$/.exec(riga);
      if (!l) continue;
      const etichetta = l[1]!;
      if (tipoBlocco === 'narratore') {
        corrente.haiku.push(riga.trim());
        if (etichetta === 'narratore' || etichetta.startsWith('png_')) {
          aggiungiStoria({ turno: corrente.n, tipo: 'narrazione', chi: etichetta, nome: nomeDi(etichetta, nomePg), testo: l[2]! });
        }
      }
      continue;
    }
  }
  // Le azioni del turno entrano nella storia prima della narrazione del turno (come le riceve il server).
  for (const t of turni) {
    const azioni: VoceTrascrizione[] = t.azioni.map((a, i) => ({
      id: 0, turno: t.n, tipo: 'azione', chi: a.id, nome: nomePg.get(a.id) ?? a.id, testo: a.testo,
    }));
    t.storia = [...azioni, ...t.storia];
  }
  return turni;
}

function nomeDi(chi: string, nomePg: Map<string, string>): string {
  if (chi === 'narratore') return 'narratore';
  return nomePg.get(chi) ?? chi;
}


/** Variante breve: solo le sezioni che servono a un lettore piccolo (scena, PNG presenti con voce, PG, etichette). */
function sistemaBreve(campagna: ReturnType<typeof caricaCampagna>, rep: Repertorio, parole: ReturnType<typeof caricaParoleSegreteCampagna>, scenaId: string, promptBreve: string): { testo: string; png: Set<string> } {
  // Scena: solo nome, descrizione e domanda (il resto della scena è per il modello grande).
  const sc = conScena(campagna, scenaId);
  const dati = sc.scena.dati as Record<string, unknown>;
  const scena = [`Scena: ${sc.scena.titolo}`, dati['descrizione'] ?? '', dati['domanda_drammatica'] ? `Domanda: ${dati['domanda_drammatica']}` : ''].filter(Boolean).join('\n');
  // PNG presenti: una scheda compatta (aspetto, voce, carattere troncati) e al massimo due esempi di voce.
  const presenti = campagna.png.filter((p) => sc.scena.png_presenti.includes(p.id));
  const esempi = sezioniContestoRepertorio(sc, parole, rep).find((s) => s.nome === 'esempi di voce')?.testo ?? '';
  const blocchi = esempi.split('\n### ').slice(1);
  const schede = presenti.map((p) => {
    const d = p.dati as Record<string, any>;
    const aspetto = String(d['aspetto']?.['lettura'] ?? '').slice(0, 220);
    const voce = JSON.stringify(d['voce'] ?? {}).slice(0, 220);
    const carattere = JSON.stringify(d['personalita']?.['superficie'] ?? '').slice(0, 160);
    const es = blocchi.find((b) => b.includes(`[${p.id}]`));
    const righeEs = es ? es.split('\n').slice(1).filter((r) => r.startsWith('- ')).slice(0, 2).map((r) => r.slice(0, 140)) : [];
    return [`### ${p.nome} [${p.id}]`, `aspetto: ${aspetto}`, `voce: ${voce}`, `carattere: ${carattere}`, ...righeEs].join('\n');
  });
  const pg = campagna.pg.map((p) => `- ${p.id} = ${p.nome}`).join('\n');
  const etichette = sezioniContestoRepertorio(sc, parole, rep).find((s) => s.nome === 'etichette');
  const parti = [scena, '## PNG presenti', schede.join('\n\n'), `## Personaggi giocanti\n${pg}`, etichette?.testo ?? ''].filter(Boolean);
  return { testo: `${promptBreve.trim()}\n\n${parti.join('\n\n')}\n`, png: new Set(presenti.map((p) => p.id)) };
}

/** Preselezione come il Motore (StatoRepertorio.indicatePerAzioni), dallo stato iniziale della partita. */
function preselezione(rep: Repertorio, campagna: ReturnType<typeof caricaCampagna>, sc: { id: string; png_presenti: readonly string[] }, stato: StatoRepertorio, azioni: Array<{ id: string; testo: string }>, nomePieno: Map<string, string>): { righe: string[]; ids: string[]; indicate: string[]; perAzione: Record<string, string[]>; righePerAzione: Record<string, string[]> } {
  const battute = rep.battute.filter(
    (b) => !b.solo_esempio && (b.scene.length === 0 || b.scene.includes(sc.id)) && parlantiDi(b).every((p) => sc.png_presenti.includes(p)),
  );
  stato.impostaScena(sc);
  const perAzioneRaw = stato.indicatePerAzioni(battute, azioni.map((a) => ({ autore: a.id, testo: a.testo, privata: false })), nomiDeiPng(campagna));
  const perId = new Map(battute.map((b) => [b.id, b] as const));
  const ids = perAzioneRaw.flatMap((x) => x.ids);
  const righe = ids.map((id) => StatoRepertorio.riga(perId.get(id) as Battuta));
  const indicate = perAzioneRaw.map((x) => `- ${x.autore} (${nomePieno.get(x.autore) ?? x.autore}): ${x.ids.map((id) => `[usa] ${id} > ${x.autore}`).join(' oppure ')}`);
  const perAzione = Object.fromEntries(perAzioneRaw.map((x) => [x.autore, x.ids]));
  const righePerAzione = Object.fromEntries(perAzioneRaw.map((x) => [x.autore, x.ids.map((id) => StatoRepertorio.riga(perId.get(id) as Battuta).replace(/^- /, ''))]));
  return { righe, ids, indicate, perAzione, righePerAzione };
}

function main(): void {
  const campagna = caricaCampagna(CAMPAGNA_DIR);
  const rep = caricaRepertorio(campagna);
  const parole = caricaParoleSegreteCampagna(campagna);
  const audio = new CatalogoAudio([path.join(CAMPAGNA_DIR, 'audio')], loggerMuto());
  const bloccoAudio = bloccoAudioContesto(audio);

  // Nome corto del PG (primo nome), come lo mostra il tavolo; nome pieno per il tavolo di pgAlTavolo.
  const nomePieno = new Map(campagna.pg.map((p) => [p.id, p.nome] as const));
  const nomeCorto = new Map(campagna.pg.map((p) => [p.id, p.nome.split(' ')[0]!] as const));

  // Sistema per scena: selettore + contestoPer (come avvio.ts).
  fs.mkdirSync(DATI, { recursive: true });
  const sistemaPerScena = new Map<string, string>();
  for (const sc of campagna.scene) {
    const contesto = compilaContestoRepertorio(conScena(campagna, sc.id), parole, rep);
    const contestoPer = bloccoAudio ? `${contesto}\n\n${bloccoAudio}` : contesto;
    const sistema = `${PROMPT_SELETTORE.trim()}\n\n${contestoPer.trim()}\n`;
    sistemaPerScena.set(sc.id, sistema);
    fs.writeFileSync(path.join(DATI, `sistema_${sc.id}.txt`), sistema);
  }

  const promptBreve = fs.readFileSync(path.join(DATI, 'selettore_breve.md'), 'utf8');
  const sistemaBreveScena = new Map<string, { testo: string; png: Set<string> }>();
  for (const sc of campagna.scene) {
    const b = sistemaBreve(campagna, rep, parole, sc.id, promptBreve);
    sistemaBreveScena.set(sc.id, b);
    fs.writeFileSync(path.join(DATI, `sistema_breve_${sc.id}.txt`), b.testo);
  }
  const statoBase = new StatoRepertorio(rep, campagna, new StatoOrologi(campagna));
  const tuttiBreve: Array<Record<string, unknown>> = [];

  const cartelle = fs.readdirSync(RISULTATI).filter((d) => /^nozze-neve-.*-B\d*$/.test(d)).sort();
  const tuttiRecord: Array<Record<string, unknown>> = [];
  for (const cartella of cartelle) {
    const intestazione = fs.readFileSync(path.join(RISULTATI, cartella, 'trascrizione.md'), 'utf8').split('\n').find((l) => l.startsWith('Campagna:')) ?? '';
    const pgAlTavolo = (intestazione.match(/PG: (.*)$/)?.[1] ?? '').split(',').map((s) => s.trim()).filter(Boolean)
      .map((id) => ({ id, nome: nomePieno.get(id) ?? id }));
    const turni = leggiTranscript(path.join(RISULTATI, cartella, 'trascrizione.md'), nomeCorto);
    const storia: VoceTrascrizione[] = [];
    for (const t of turni) {
      const sc = campagna.scene.find((s) => s.id === t.scena);
      const eleggibile = t.haveNarratore && t.azioni.length > 0 && !t.apertura && !t.cambio;
      if (eleggibile && sc) {
        const catalogo = catalogoDi(rep, sc);
        const messaggio = compilaMessaggioTurno({
          turno: t.n,
          trascrizione: storia.filter((v) => v.turno < t.n),
          azioni: t.azioni.map((a, i) => ({ id_pg: a.id, nome: nomeCorto.get(a.id) ?? a.id, testo: a.testo, numero: i + 1 })),
          pgAlTavolo,
          repertorio: { fattiScoperti: [], battuteDisponibili: catalogo.join('\n') },
        });
        tuttiRecord.push({
          cartella,
          turno: t.n,
          scena: t.scena,
          pg: pgAlTavolo.map((p) => p.id),
          azioni: t.azioni.map((a) => ({ id_pg: a.id, nome: nomeCorto.get(a.id) ?? a.id, testo: a.testo })),
          messaggio,
          catalogo_ids: catalogo.map((r) => r.replace(/^- /, '').split(' · ')[0]!.trim()),
          catalogo_righe: catalogo.length,
          riferimento_haiku: t.haiku,
        });
      }
      if (eleggibile && sc) {
        // Variante breve: stesso turno, prompt condensato, catalogo = solo le battute preselezionate.
        const pre = preselezione(rep, campagna, sc, statoBase, t.azioni, nomePieno);
        const azioniBreve = t.azioni.map((a, i) => ({ id_pg: a.id, nome: nomeCorto.get(a.id) ?? a.id, testo: a.testo, numero: i + 1 }));
        const ultimi = storia.filter((v) => v.turno < t.n && v.turno >= t.n - 3);
        const messaggioBreve = compilaMessaggioTurno({
          turno: t.n,
          trascrizione: ultimi,
          azioni: azioniBreve,
          pgAlTavolo,
          repertorio: { fattiScoperti: [], battuteDisponibili: pre.righe.join('\n') || '(nessuna)', indicate: pre.indicate },
        });
        tuttiBreve.push({
          cartella,
          turno: t.n,
          scena: t.scena,
          sistema: `sistema_breve_${t.scena}.txt`,
          pg: pgAlTavolo.map((p) => p.id),
          azioni: t.azioni.map((a) => ({ id_pg: a.id, nome: nomeCorto.get(a.id) ?? a.id, testo: a.testo })),
          messaggio: messaggioBreve,
          catalogo_ids: pre.ids,
          catalogo_righe: pre.righe.length,
          pre_per_azione: pre.perAzione,
          pre_righe_per_azione: pre.righePerAzione,
          png_scheda: campagna.png.filter((p) => sc.png_presenti.includes(p.id)).map((p) => ({ id: p.id, nome: p.nome, aspetto: (p.dati['aspetto'] as Record<string, unknown> | undefined)?.['lettura'] ?? '', voce: p.dati['voce'] ?? {}, personalita: p.dati['personalita'] ?? {} })),
          scena_descrizione: [conScena(campagna, sc.id).scena.titolo, (conScena(campagna, sc.id).scena.dati as Record<string, unknown>)['descrizione'] ?? ''].join(' — '),
          riferimento_haiku: t.haiku,
        });
      }
      // La storia cresce con questo turno, dopo averlo usato come contesto dei successivi.
      storia.push(...t.storia.map((v) => ({ ...v, turno: t.n })));
    }
  }
  // Campione deterministico: un turno su due nell'ordine delle run (27 o poco più, come chiesto).
  const campione = tuttiRecord.filter((_, i) => i % 2 === 0).map((r, i) => ({ id: `t${String(i + 1).padStart(2, '0')}`, ...r }));
  fs.writeFileSync(path.join(DATI, 'set.jsonl'), campione.map((r) => JSON.stringify(r)).join('\n') + '\n');
  const campioneBreve = tuttiBreve.filter((_, i) => i % 2 === 0).map((r, i) => ({ id: `t${String(i + 1).padStart(2, '0')}`, ...r }));
  fs.writeFileSync(path.join(DATI, 'set_breve.jsonl'), campioneBreve.map((r) => JSON.stringify(r)).join('\n') + '\n');
  console.log(`variante breve: ${campioneBreve.length} turni, catalogo medio ${(campioneBreve.reduce((s, r) => s + Number(r.catalogo_righe), 0) / Math.max(1, campioneBreve.length)).toFixed(1)} battute`);
  console.log(`turni selettore trovati: ${tuttiRecord.length}; nel set: ${campione.length}`);
  const perScena = campione.reduce<Record<string, number>>((acc, r) => { const s = String(r.scena); acc[s] = (acc[s] ?? 0) + 1; return acc; }, {});
  console.log('per scena:', perScena);
  for (const [id, s] of sistemaPerScena) console.log(`sistema ${id}: ${s.length} caratteri`);
}

main();
