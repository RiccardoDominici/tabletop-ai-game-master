/**
 * Scripted live run against a server already started on a test port (scripts/avvio.sh --finto --mock, campaign = a
 * scratchpad copy, TAGM_MASTER_TOKEN fixed): a projector, one phone per PC, the Game Master's socket for scene
 * changes. Script (JSON): {"pg": ["pg_a", …], "passi": [{"scena": "scena_x"} | {"azioni": {"pg_a": "testo"}}]}.
 * In each window every PC on turn (or invited) sends its action of the step, or «Aspetto». Prints per window the
 * turn, the fight, HP, and at the end the system lines and the Game Master's rolls. The token is read from the
 * environment (TAGM_MASTER_TOKEN) and never printed.
 * Usage: TAGM_MASTER_TOKEN=… npx tsx live-copione.ts http://127.0.0.1:4971 copione.json
 */
import fs from 'node:fs';
import { io as connetti, type Socket } from 'socket.io-client';

type S = Record<string, any>;
const url = process.argv[2]!;
const copione = JSON.parse(fs.readFileSync(process.argv[3]!, 'utf8')) as { pg: string[]; passi: Array<{ scena?: string; azioni?: Record<string, string> }> };
const emetti = <T>(c: Socket, ev: string, ...a: unknown[]): Promise<T> => new Promise((r) => c.emit(ev, ...a, r));

function attendi(c: Socket, cond: (s: S) => boolean, ms = 60_000): Promise<S> {
  return new Promise((ok, ko) => {
    const t = setTimeout(() => ko(new Error('state not reached')), ms);
    const f = (s: S): void => {
      if (cond(s)) {
        clearTimeout(t);
        c.off('stato', f);
        ok(s);
      }
    };
    c.on('stato', f);
  });
}

async function main(): Promise<void> {
  const nuovo = (): Socket => connetti(url, { transports: ['websocket'], forceNew: true, reconnection: false });
  const schermo = nuovo();
  await emetti(schermo, 'schermo:osserva');
  schermo.on('audio:fine_turno', (f: S) => schermo.emit('schermo:audio_finito', { turno: f.turno, ritardo_ms: 0, buchi: 0, buchi_in_frase: 0, buchi_tra_frasi: 0, silenzio_ms: 0 }));
  const master = nuovo();
  const entrata = await emetti<S>(master, 'master:entra', { token: process.env['TAGM_MASTER_TOKEN'] });
  if (!entrata['ok']) throw new Error('master not in');
  const tel: Record<string, Socket> = {};
  for (const id of copione.pg) {
    tel[id] = nuovo();
    await emetti(tel[id]!, 'telefono:entra');
    const e = await emetti<S>(tel[id]!, 'telefono:scegli_pg', { id_pg: id, dispositivo: `tel-${id}-0123456789` });
    if (!e['ok']) throw new Error(`phone ${id}: ${JSON.stringify(e)}`);
  }
  const primo = tel[copione.pg[0]!]!;
  const inizio = attendi(primo, (x) => x['fase'] === 'finestra' && x['turno'] === 1);
  await emetti(schermo, 'schermo:inizia');
  let s = await inizio;
  for (const passo of copione.passi) {
    if (passo.scena) {
      const v0 = s['versione_scena'];
      const dopoScena = attendi(primo, (x) => x['fase'] === 'finestra' && x['versione_scena'] > v0);
      const e = await emetti<S>(master, 'master:comando', { tipo: 'scena', scena: passo.scena });
      console.log(`scene → ${passo.scena}: ${JSON.stringify(e)}`);
      s = await dopoScena;
      continue;
    }
    const c = s['combattimento'] as S | null;
    const diTurno: string[] = c && c['turno_di']?.length ? c['turno_di'] : s['finestra']['invitati']?.length ? s['finestra']['invitati'] : copione.pg;
    const pf = (s['pg'] as S[]).filter((p) => copione.pg.includes(p['id'])).map((p) => `${p['id']} ${p['pf']?.['attuali']}/${p['pf']?.['massimi']}`).join(', ');
    console.log(`T${s['turno']} [${s['scena']?.['titolo'] ?? '?'}]: ${c ? `fight round ${c['round']}, on turn [${c['turno_di'].join(', ')}], ${c['combattenti'].map((x: S) => `${x['id']}${x['pf'] ? ` ${x['pf']['attuali']}/${x['pf']['massimi']}` : ''}`).join(' > ')}` : 'no fight'}; ${pf}`);
    const dopo = attendi(primo, (x) => (x['fase'] === 'finestra' && x['turno'] > s['turno']) || x['fase'] === 'pausa');
    for (const id of diTurno) {
      const testo = passo.azioni?.[id] ?? 'Aspetto e guardo';
      const e = await emetti<S>(tel[id]!, 'azione:invia', { id_pg: id, testo, versione_vista: s['versione_scena'], privata: false });
      console.log(`  ${id}: «${testo}»${e['ok'] ? '' : ` refused ${JSON.stringify(e)}`}`);
    }
    s = await dopo;
    if (s['fase'] === 'pausa') {
      console.log(`T${s['turno']}: pause`);
      break;
    }
  }
  const sm = ((await emetti<S>(master, 'master:entra', { token: process.env['TAGM_MASTER_TOKEN'] })) as S)['stato'] as S;
  console.log('system lines:\n' + (s['trascrizione'] as S[]).filter((v) => v['tipo'] === 'sistema').map((v) => `  [T${v['turno']}] ${v['testo']}`).join('\n'));
  console.log('Game Master rolls: ' + JSON.stringify(sm?.['tiri']?.['del_master'] ?? null).slice(0, 1500));
  for (const x of [schermo, master, ...Object.values(tel)]) x.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
