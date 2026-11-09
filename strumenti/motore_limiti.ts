/**
 * Che cosa il Motore NON fa (ancora): ogni limite scritto in .claude/skills/preparatore/riferimenti/motore.md
 * qui si verifica sul codice vero del server, così la pagina non può restare indietro. Se un limite cade
 * (il Motore comincia a farlo), la verifica fallisce, il test strumenti/test_motore_limiti.py diventa rosso
 * e la pagina va aggiornata. Solo lettura: importa i moduli del server senza modificarli.
 *
 *   npx tsx strumenti/motore_limiti.ts          una riga JSON {id: {vale, dettaglio}}
 */
import fs from 'node:fs';
import path from 'node:path';
import { caricaCampagna } from '../apps/server/src/campagna/caricatore';
import { accetta, blocchi } from '../apps/server/src/repertorio/condizioni';
import { caricaRepertorio } from '../apps/server/src/repertorio/caricatore';
import { StatoOrologi } from '../apps/server/src/scena/orologi';

const RADICE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SERVER = path.join(RADICE, 'apps', 'server', 'src');

function sorgenti(cartella: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const nome of fs.readdirSync(cartella)) {
    const p = path.join(cartella, nome);
    if (fs.statSync(p).isDirectory()) out.push(...sorgenti(p));
    else if (nome.endsWith('.ts')) out.push([path.relative(SERVER, p), fs.readFileSync(p, 'utf8')]);
  }
  return out;
}

const esiti: Record<string, { vale: boolean; dettaglio: string }> = {};
const verifica = (id: string, vale: boolean, dettaglio: string): void => {
  esiti[id] = { vale, dettaglio };
};
const codice = sorgenti(SERVER);

// 1. Azioni private: una battuta senza richiede.privata non risponde a un'azione privata.
{
  const rep = caricaRepertorio(caricaCampagna(path.join(RADICE, 'campagne', 'prova-f0')));
  const libera = rep.battute.find((b) => !b.solo_esempio && !b.richiede.privata && b.richiede.oppure.length === 0 && b.richiede.da_pg.length === 0)!;
  const privata = { autore: 'pg_x', privata: true };
  verifica('azioni_private', !blocchi(libera).some((bl) => accetta(bl, privata)),
    `${libera.id} (senza cancello) non accetta un'azione privata: rispondono solo le battute con privata: true`);
}

// 2. avanza_quando: il Motore lo carica e non lo usa (nessuna lettura fuori dalla definizione).
{
  const usi = codice.filter(([, t]) => /avanzaQuando/.test(t)).flatMap(([f, t]) => (t.match(/avanzaQuando/g) ?? []).map(() => f));
  verifica('avanza_quando', usi.length === 2 && usi.every((f) => f === path.join('scena', 'orologi.ts')),
    `avanzaQuando compare solo in scena/orologi.ts (tipo e caricamento): ${usi.length} occorrenze`);
}

// 3. Cambio di scena: gli orologi tengono i loro segni e nessuno avanza da solo (ponte-lanterne non ha
//    `orologi_in_scena`, l'unico modo di farli salire entrando in una scena).
{
  const c = caricaCampagna(path.join(RADICE, 'campagne', 'ponte-lanterne'));
  const o = new StatoOrologi(c);
  const primo = o.elenco[0]!;
  o.avanza(primo.id, 1, false);
  const prima = Object.fromEntries(Object.entries(o.esporta()).map(([k, v]) => [k, v.pieni]));
  for (const s of c.scene) o.impostaScena(s);
  const dopo = Object.fromEntries(Object.entries(o.esporta()).map(([k, v]) => [k, v.pieni]));
  verifica('cambio_scena', JSON.stringify(prima) === JSON.stringify(dopo),
    `impostaScena cambia solo gli orologi attivi: segni prima ${JSON.stringify(prima)}, dopo ${JSON.stringify(dopo)}`);
}

// 4. Finali: nessuna regola li fa uscire per «la domanda ha risposta»; per stato entra solo ciò che chiede l'orologio pieno.
{
  const stato = codice.find(([f]) => f === path.join('repertorio', 'stato.ts'))?.[1] ?? '';
  const soloOrologio = /const perStato = segmentiCompleti != null && oro!\.min >= segmentiCompleti;/.test(stato);
  const nienteFinali = !/tipo === 'finale'/.test(stato);
  verifica('finali', soloOrologio && nienteFinali,
    "repertorio/stato.ts: una battuta entra «per stato» solo con richiede.orologio a orologio pieno; nessun trattamento a parte dei finali");
}

// 5. Oggetti: il Motore non tiene chi ha che cosa; resta solo nella trascrizione.
{
  const tipi = ['sessione/tipi.ts', 'repertorio/stato.ts', 'repertorio/tipi.ts'].map((f) => codice.find(([g]) => g === f)?.[1] ?? '');
  verifica('oggetti', tipi.every((t) => !/oggett/i.test(t)), 'nessuno stato degli oggetti in sessione/tipi.ts, repertorio/stato.ts, repertorio/tipi.ts');
}

// 6. Una battuta esce solo legata a un'azione («> pg»), salvo il segno dovuto del suo orologio, i riempitivi
//    allo stallo e i finali (dal playtest di nozze-neve il finale a orologio pieno lo dice il Motore): ogni
//    altra battuta «per stato» senza un'azione pubblica nel turno non esce.
{
  const regia = codice.find(([f]) => f === path.join('scena', 'regia.ts'))?.[1] ?? '';
  const libera = /const libera = motore \|\| b\.tipo === 'finale' \|\| \(b\.tipo === 'segno_orologio' && segnoDovutoDi\(b, t\?\.dovuti\)\) \|\| \(b\.riempitivo && !!t\?\.stallo\);/.test(regia);
  verifica('senza_azione', libera, "scena/regia.ts: senza «> pg» passano solo il segno dovuto del suo orologio, i riempitivi allo stallo e i finali");
}

process.stdout.write(JSON.stringify(esiti) + '\n');
