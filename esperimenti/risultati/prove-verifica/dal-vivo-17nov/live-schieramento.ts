/**
 * Live check of initiative by sides (A2): drives a server already started on a test port (scripts/avvio.sh --finto
 * --mock, campaign = a scratchpad copy of the invented fixture `bx`). Projector + two phones; each window the PCs on
 * turn act: Corrado attacks Ruggero in the melee phase (and in the first turn, to open the fight), otherwise both wait.
 * Prints, per window: turn, round, phase, who is on turn, the sides' order as the projector shows it, HP.
 * Usage: npx tsx live-schieramento.ts http://127.0.0.1:4970 [windows]
 */
import { io as connetti, type Socket } from 'socket.io-client';

type S = Record<string, any>;
const url = process.argv[2] ?? 'http://127.0.0.1:4970';
const finestre = Number(process.argv[3] ?? 12);
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
  const tel: Record<string, Socket> = {};
  for (const id of ['pg_ida', 'pg_corrado']) {
    tel[id] = nuovo();
    await emetti(tel[id]!, 'telefono:entra');
    const e = await emetti<S>(tel[id]!, 'telefono:scegli_pg', { id_pg: id, dispositivo: `tel-${id}-0123456789` });
    if (!e['ok']) throw new Error(`phone ${id}: ${JSON.stringify(e)}`);
  }
  const ida = tel['pg_ida']!;
  const primo = attendi(ida, (x) => x['fase'] === 'finestra' && x['turno'] === 1);
  await emetti(schermo, 'schermo:inizia');
  let s = await primo;
  for (let w = 0; w < finestre; w++) {
    const c = s['combattimento'] as S | null;
    const diTurno: string[] = c ? c['turno_di'] : ['pg_ida', 'pg_corrado'];
    const pf = (s['pg'] as S[]).map((p) => `${p['id']} ${p['pf']?.['attuali']}/${p['pf']?.['massimi']}`).join(', ');
    console.log(`T${s['turno']}: ${c ? `round ${c['round']}, phase ${c['fase']}, initiative ${c['iniziativa']}, on turn [${diTurno.join(', ')}], order ${c['combattenti'].map((x: S) => x['id']).join(' > ')}` : 'no fight'}; invited [${s['finestra']['invitati'].join(', ')}]; ${pf}`);
    if (!diTurno.length) break;
    const dopo = attendi(ida, (x) => (x['fase'] === 'finestra' && x['turno'] > s['turno']) || x['fase'] === 'pausa');
    for (const id of diTurno) {
      const attacca = id === 'pg_corrado' && (!c || c['fase'] === 'Mischia');
      const testo = attacca ? 'Colpisco Ruggero con la spada' : id === 'pg_corrado' ? 'Tengo la spada alta' : 'Resto dietro Corrado';
      const e = await emetti<S>(tel[id]!, 'azione:invia', { id_pg: id, testo, versione_vista: s['versione_scena'], privata: false });
      if (!e['ok']) console.log(`  ${id} refused: ${JSON.stringify(e)}`);
      else console.log(`  ${id}: «${testo}»`);
    }
    s = await dopo;
    if (s['fase'] === 'pausa') {
      console.log(`T${s['turno']}: pause`);
      break;
    }
  }
  const t = (s['trascrizione'] as S[]).filter((v) => v['tipo'] === 'sistema').map((v) => `  [T${v['turno']}] ${v['testo']}`);
  console.log('system lines:\n' + t.join('\n'));
  for (const c of [schermo, ...Object.values(tel)]) c.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
