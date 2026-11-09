// Misura formato pcm/mp3 di drama-3 via OpenRouter. La chiave si legge e non si stampa mai.
import fs from 'node:fs';
const riga = fs.readFileSync('/Users/riccardo/Developer/agora/.env', 'utf8').split('\n').find((r) => r.startsWith('OPENROUTER_API_KEY='));
const chiave = riga.slice('OPENROUTER_API_KEY='.length).trim().replace(/^["']|["']$/g, '');
const testo = process.argv[3] ?? '[con calma, a voce bassa] La neve copre il sentiero. Nessuno è passato di qui stanotte.';
const formato = process.argv[2] ?? 'pcm';
const voce = process.argv[4] ?? '130bd00e5d89470bb0352d20b8c4bf8b';
const t0 = performance.now();
const r = await fetch('https://openrouter.ai/api/v1/audio/speech', {
  method: 'POST',
  headers: { authorization: `Bearer ${chiave}`, 'content-type': 'application/json' },
  body: JSON.stringify({ model: 'fish-audio/drama-3', input: testo, voice: voce, response_format: formato }),
});
const intest = Object.fromEntries([...r.headers].filter(([k]) => !/cookie|cf-|report|nel/.test(k)));
console.log('stato', r.status, 'intestazioni', JSON.stringify(intest));
const pezzi = [];
const dati = [];
let primo = null;
for await (const p of r.body) {
  if (primo === null) primo = performance.now() - t0;
  pezzi.push({ t: Math.round(performance.now() - t0), n: p.length }); dati.push(Buffer.from(p));
}
const tot = pezzi.reduce((a, p) => a + p.n, 0);
console.log('primo byte ms', Math.round(primo), 'totale ms', Math.round(performance.now() - t0), 'byte', tot, 'pezzi', pezzi.length);
console.log('tempi pezzi', JSON.stringify(pezzi.slice(0, 12)), '...', JSON.stringify(pezzi.slice(-3)));
fs.writeFileSync(process.argv[5] ?? `prova.${formato}`, Buffer.concat(dati));
