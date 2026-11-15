/**
 * Worst-case false positives of the dictation correction (docs/ascolto.md, «Measured»): the FULL vocabulary of one
 * campaign (every lexicon entry, every PC and NPC, as if all had been said at the table) against ordinary sentences
 * taken from OTHER campaigns of the same language (their repertoire lines and scene openings). Every correction made
 * there is an unwanted one: it should be zero. No model, no server; a few seconds.
 *
 *   npx tsx strumenti/ascolto/falsi.ts <campagna> <altra-campagna> [<altra> ...]
 */
import path from 'node:path';
import { caricaCampagna } from '../../apps/server/src/campagna/caricatore';
import { correggi } from '../../apps/server/src/dettato/correzione';
import { paroleComuni, testiCampagna } from '../../apps/server/src/dettato/lingua';
import { costruisciVocabolario } from '../../apps/server/src/dettato/vocabolario';
import { LINGUA_PREDEFINITA } from '../../apps/server/src/lingua';
import { loggerMuto } from '../../apps/server/src/logger';
import { RADICE_REPO } from '../../apps/server/src/percorsi';
import { caricaRepertorio } from '../../apps/server/src/repertorio/caricatore';
import { FILE_LESSICO, FILE_LESSICO_GIOCO, leggiLessico } from '../../apps/server/src/voce/pronuncia';

const [id, ...altre] = process.argv.slice(2);
if (!id || !altre.length) {
  console.error('use: npx tsx strumenti/ascolto/falsi.ts <campagna> <altra-campagna> [<altra> ...]');
  process.exit(2);
}
const carica = (x: string) => caricaCampagna(path.join(RADICE_REPO, 'campagne', x), loggerMuto());
const repertorio = (c: ReturnType<typeof carica>) => {
  try {
    return caricaRepertorio(c, loggerMuto());
  } catch {
    return undefined;
  }
};
const c = carica(id);
const lingua = c.lingua ?? LINGUA_PREDEFINITA;
const comuni = paroleComuni(lingua, testiCampagna(c, repertorio(c)));
const voci = costruisciVocabolario({
  lingua,
  pg: c.pg.map((p) => ({ nome: p.nome })),
  png: c.png.map((p) => ({ nome: p.nome, presente: true })),
  appresi: [],
  lessico: [...leggiLessico(path.join(c.cartella, FILE_LESSICO)), ...leggiLessico(path.join(c.cartella, FILE_LESSICO_GIOCO))],
  menzionato: () => true,
});
let frasi = 0;
const trovate: string[] = [];
for (const altra of altre) {
  let a: ReturnType<typeof carica>;
  try {
    a = carica(altra);
  } catch (err) {
    console.log(`${altra}: not loaded (${(err as Error).message.slice(0, 80)}), skipped`);
    continue;
  }
  if ((a.lingua ?? LINGUA_PREDEFINITA) !== lingua) {
    console.log(`${altra}: another language, skipped`);
    continue;
  }
  const testi = [...(repertorio(a)?.battute ?? []).flatMap((b) => [b.testo, ...b.varianti].flat().map((r) => r.testo)), ...a.scene.flatMap((s) => s.apertura)];
  for (const t of testi) {
    for (const f of t.split(/(?<=[.!?…])\s+/u)) {
      frasi += 1;
      for (const x of correggi(f, { lingua, voci, comuni }).correzioni) trovate.push(`${altra}: «${x.sentito}» → «${x.scritto}» (${x.motivo} ${x.punteggio}) in: ${f.slice(0, 100)}`);
    }
  }
}
console.log(`${id}: ${voci.filter((v) => v.correggibile).length} names; ${frasi} ordinary sentences of ${altre.join(', ')}; unwanted corrections: ${trovate.length}`);
for (const t of trovate) console.log(`  ${t}`);
