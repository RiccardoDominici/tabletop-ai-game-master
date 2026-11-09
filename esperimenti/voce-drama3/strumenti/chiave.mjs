// Chiave OpenRouter per gli strumenti di misura: OPENROUTER_API_KEY dall'ambiente, poi la riga
// nel .env alla radice del repo (stesso ordine di apps/server/src/llm/chiavi.ts). Non si stampa mai.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const NOME = 'OPENROUTER_API_KEY';

export function chiaveOpenRouter() {
  const ambiente = process.env[NOME]?.trim();
  if (ambiente) return ambiente;
  const file = path.join(RADICE, '.env');
  if (fs.existsSync(file)) {
    const righe = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((r) => r.startsWith(`${NOME}=`));
    if (righe.length > 1) throw new Error(`più di una riga ${NOME}= nel .env alla radice`);
    const valore = righe[0]?.slice(NOME.length + 1).trim().replace(/^["']|["']$/g, '').trim();
    if (valore) return valore;
  }
  throw new Error(`${NOME} non trovata: esportala nell'ambiente o mettila nel .env alla radice (vedi .env.example)`);
}
