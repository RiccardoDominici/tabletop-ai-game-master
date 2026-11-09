// Trascrive un file audio con openai/whisper-1 via OpenRouter. La chiave non si stampa mai.
import fs from 'node:fs';
import path from 'node:path';
const riga = fs.readFileSync('/Users/riccardo/Developer/agora/.env', 'utf8').split('\n').find((r) => r.startsWith('OPENROUTER_API_KEY='));
const chiave = riga.slice('OPENROUTER_API_KEY='.length).trim().replace(/^["']|["']$/g, '');
for (const file of process.argv.slice(2)) {
  const fd = new FormData();
  fd.append('model', 'openai/whisper-1');
  fd.append('language', 'it');
  fd.append('file', new Blob([fs.readFileSync(file)], { type: 'audio/mpeg' }), path.basename(file));
  const r = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', { method: 'POST', headers: { authorization: `Bearer ${chiave}` }, body: fd });
  const t = await r.text();
  console.log(path.basename(file), r.status, t.slice(0, 600));
}
