#!/usr/bin/env node
/**
 * Scrive logs/f0-trascrizione.md dalla sessione più recente di logs/narrazioni.jsonl:
 * per ogni turno le azioni dei giocatori, l'uscita del narratore VERBATIM (etichette comprese),
 * invito, orologi, anomalie del protocollo e misure; in fondo mediana e peggiore di ogni campo.
 *
 * Uso: node scripts/trascrizione.mjs [--sessione <iso>] [--uscita <file.md>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (nome) => {
  const i = process.argv.indexOf(nome);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const fileNarrazioni = path.join(RADICE, 'logs', 'narrazioni.jsonl');
const uscita = arg('--uscita') ?? path.join(RADICE, 'logs', 'f0-trascrizione.md');
if (!fs.existsSync(fileNarrazioni)) {
  console.error('manca logs/narrazioni.jsonl: gioca almeno un turno');
  process.exit(1);
}
const righe = fs.readFileSync(fileNarrazioni, 'utf8').split('\n').filter(Boolean).map((r) => JSON.parse(r));
const sessione = arg('--sessione') ?? righe.at(-1).sessione;
const turni = righe.filter((r) => r.sessione === sessione);

const CAMPI = ['finestra_ms', 'voce_sveglia', 'llm_primo_token', 'llm_prima_frase', 'voce_richiesta', 'voce_primo_audio', 'schermo_inizio_audio', 'llm_fine', 'audio_fine', 'buchi', 'buchi_in_frase', 'buchi_tra_frasi', 'silenzio_ms', 'token_ingresso', 'token_uscita', 'token_cache_lettura', 'token_cache_scrittura', 'costo_usd'];
const mediana = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const fmt = (v) => (v === null || v === undefined ? '—' : typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(5)) : String(v));

const out = [];
out.push('# F0 — trascrizione del narratore', '');
out.push(`Sessione: \`${sessione}\` · turni narrati: ${turni.filter((t) => t.tipo === 'turno').length} · voce: ${turni.find((t) => t.voce)?.voce ?? '?'}`, '');
out.push('Uscita del narratore riportata verbatim, etichette comprese. Generato da `scripts/trascrizione.mjs` da `logs/narrazioni.jsonl`.', '');
for (const t of turni) {
  if (t.tipo === 'apertura') {
    out.push('## Turno 0 — apertura (testo fisso della scena)', '', '```text', t.testo, '```', '');
    continue;
  }
  out.push(`## Turno ${t.turno}`, '');
  out.push(`pg_presenti: ${(t.pg_presenti ?? []).join(', ')}`, '');
  out.push('Azioni:');
  for (const a of t.azioni ?? []) out.push(`- ${a.id_pg}: ${a.testo ? `«${a.testo}»` : '(nessuna azione, pronto)'}`);
  out.push('', 'Narratore (verbatim):', '', '```text', t.testo ?? `(nessun testo — errore: ${t.errore})`, '```', '');
  const orologi = (t.orologi ?? []).map((o) => (o.ok ? `${o.id} accettato (${o.stato})` : `${o.id} RIFIUTATO: ${o.motivo}`));
  out.push(`- invito: ${Array.isArray(t.invito) ? t.invito.join(', ') : (t.invito ?? 'MANCANTE (invitati tutti)')}`);
  out.push(`- orologi: ${orologi.length ? orologi.join('; ') : 'nessuna riga [orologio]'} · stato: ${JSON.stringify(t.stato_orologi ?? {})}`);
  out.push(`- anomalie del protocollo: ${(t.anomalie ?? []).length ? t.anomalie.map((a) => `${a.codice} (${a.dettaglio})`).join('; ') : 'nessuna'}`);
  const m = t.misure ?? {};
  out.push(
    `- misure (ms da t0): finestra ${fmt(m.finestra_ms)}, prima frase LLM ${fmt(m.llm_prima_frase)}, primo audio voce ${fmt(m.voce_primo_audio)}, ` +
      `inizio audio schermo ${fmt(m.schermo_inizio_audio)}, fine LLM ${fmt(m.llm_fine)}, fine audio ${fmt(m.audio_fine)}; ` +
      `buchi ${fmt(m.buchi)} (in frase ${fmt(m.buchi_in_frase)}, tra frasi ${fmt(m.buchi_tra_frasi)}, silenzio ${fmt(m.silenzio_ms)} ms); costo $${fmt(m.costo_usd)}`,
  );
  out.push('');
}
const misure = turni.filter((t) => t.tipo === 'turno' && t.misure).map((t) => t.misure);
if (misure.length) {
  out.push('## Riepilogo delle misure', '', '| campo | mediana | peggiore | n |', '|---|---|---|---|');
  for (const c of CAMPI) {
    const v = misure.map((m) => m[c]).filter((x) => typeof x === 'number');
    if (!v.length) {
      out.push(`| ${c} | — | — | 0 |`);
      continue;
    }
    out.push(`| ${c} | ${fmt(mediana(v))} | ${fmt(Math.max(...v))} | ${v.length} |`);
  }
  out.push('', `Costo totale dei turni: $${misure.reduce((s, m) => s + (m.costo_usd ?? 0), 0).toFixed(5)}`, '');
}
fs.writeFileSync(uscita, out.join('\n'));
console.log(`scritto ${path.relative(process.cwd(), uscita)} (${turni.length} voci, sessione ${sessione})`);
