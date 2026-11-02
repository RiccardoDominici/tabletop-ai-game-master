/**
 * Strumento: quanti token pesano il prompt del narratore e il contesto della campagna, sezione
 * per sezione, contati dall'endpoint count_tokens con il modello vero (claude-haiku-5-5).
 * Il conteggio non genera testo (nessun token d'uscita).
 *
 * Uso: npx tsx apps/server/src/strumenti/conta-token.ts   (stesse variabili d'ambiente del server)
 */
import fs from 'node:fs';
import YAML from 'yaml';
import { caricaCampagna } from '../campagna/caricatore';
import path from 'node:path';
import { compilaContestoCampagna, sezioniContestoCampagna } from '../campagna/contesto';
import { compilaContestoRepertorio, sezioniContestoRepertorio } from '../repertorio/contesto';
import { caricaParoleSegrete } from '../repertorio/segreti';
import { caricaConfig } from '../config';
import { creaClientAnthropic } from '../llm/haiku';
import { creaLogger } from '../logger';

async function main(): Promise<void> {
  const config = caricaConfig();
  const log = creaLogger({ livello: 'warn', cartellaLog: config.cartellaLog, nomeFile: 'strumenti.jsonl' });
  const client = creaClientAnthropic(config.llm.fileChiave, log);
  const modello = config.llm.modello;
  const conta = async (testo: string): Promise<number> =>
    (await client.messages.countTokens({ model: modello, messages: [{ role: 'user', content: testo }] })).input_tokens;

  const campagna = caricaCampagna(config.cartellaCampagna);
  // CANTASTORIE_MODO=repertorio: prompt del selettore e contesto per allowlist (modalità B).
  const b = config.modo === 'repertorio';
  const parole = caricaParoleSegrete(path.join(campagna.cartella, 'repertorio'));
  const filePrompt = b ? config.filePromptSelettore : config.filePromptNarratore;
  const prompt = fs.readFileSync(filePrompt, 'utf8');
  const contesto = b ? compilaContestoRepertorio(campagna, parole) : compilaContestoCampagna(campagna);
  const sezioni = b ? sezioniContestoRepertorio(campagna, parole) : sezioniContestoCampagna(campagna);
  const base = await conta('.');

  // Totale come nella richiesta vera: due blocchi di sistema + un messaggio minimo.
  const totale = (
    await client.messages.countTokens({
      model: modello,
      system: [
        { type: 'text', text: prompt },
        { type: 'text', text: contesto },
      ],
      messages: [{ role: 'user', content: '.' }],
    })
  ).input_tokens;

  const righe: Array<[string, number, number]> = [];
  const aggiungi = async (nome: string, testo: string): Promise<void> => {
    righe.push([nome, (await conta(testo)) - base, testo.length]);
  };
  await aggiungi(path.basename(filePrompt), prompt);
  await aggiungi('contesto campagna (intero)', contesto);
  for (const s of sezioni) await aggiungi(`  ${s.nome}`, s.testo);
  // campagna.yaml chiave per chiave (senza preparazione), solo in modalità A.
  for (const [chiave, valore] of b ? [] : Object.entries(campagna.campagnaNarratore)) {
    if (chiave === 'id') continue;
    await aggiungi(`    campagna.${chiave}`, YAML.stringify({ [chiave]: valore }, { lineWidth: 0 }));
  }
  console.log(`modo ${config.modo} · modello ${modello} · sistema+messaggio minimo: ${totale} token (base di un messaggio «.»: ${base})`);
  console.log('sezione'.padEnd(36), 'token'.padStart(7), 'caratteri'.padStart(10));
  for (const [nome, token, caratteri] of righe) console.log(nome.padEnd(36), String(token).padStart(7), String(caratteri).padStart(10));
}

main().catch((err: unknown) => {
  console.error('conteggio fallito:', (err as Error).message);
  process.exit(1);
});
