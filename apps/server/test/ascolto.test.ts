/**
 * «Ascolta qui» (trasporto/socket.ts, creaUscitaAudio): la voce va al proiettore e ai telefoni in
 * ascolto; quella di un esito privato solo ai telefoni di quel PG in ascolto, mai al proiettore.
 */
import { describe, expect, it } from 'vitest';
import { creaUscitaAudio, STANZA_ASCOLTO, STANZA_SCHERMO, stanzaAscoltoPg, type ServerIo } from '../src/trasporto/socket';

function ioFinto(): { io: ServerIo; inviati: Array<{ stanze: string[]; evento: string }> } {
  const inviati: Array<{ stanze: string[]; evento: string }> = [];
  const io = {
    to: (stanze: string | string[]) => ({
      emit: (evento: string) => inviati.push({ stanze: ([] as string[]).concat(stanze), evento }),
    }),
  } as unknown as ServerIo;
  return { io, inviati };
}

describe('uscita audio verso proiettore e telefoni in ascolto', () => {
  it('una frase pubblica va allo schermo e alla stanza ascolto, pezzi compresi', () => {
    const { io, inviati } = ioFinto();
    const u = creaUscitaAudio(io);
    u.frase({ id_frase: 'a', turno: 1, indice: 0, parlante: 'narratore', nome: 'Narratore', testo: 'Ciao.', sample_rate: 44_100 });
    u.pezzo({ id_frase: 'a', seq: 0, pcm: new Uint8Array(4) });
    u.fineFrase({ id_frase: 'a', turno: 1, secondi: 1, interrotta: false });
    u.fineTurno({ turno: 1, frasi: 1 });
    expect(inviati.every((x) => x.stanze.join() === [STANZA_SCHERMO, STANZA_ASCOLTO].join())).toBe(true);
    expect(inviati.map((x) => x.evento)).toEqual(['audio:frase', 'audio:pezzo', 'audio:fine_frase', 'audio:fine_turno']);
  });

  it('una frase privata (solo_pg) va solo ai telefoni di quel PG in ascolto', () => {
    const { io, inviati } = ioFinto();
    const u = creaUscitaAudio(io);
    u.frase({ id_frase: 'p', turno: 1, indice: 0, parlante: 'narratore', nome: 'Narratore', testo: 'Solo tu.', sample_rate: 44_100, solo_pg: 'pg_ida' });
    u.pezzo({ id_frase: 'p', seq: 0, pcm: new Uint8Array(4) });
    u.fineFrase({ id_frase: 'p', turno: 1, secondi: 1, interrotta: false });
    expect(inviati.map((x) => x.stanze)).toEqual([[stanzaAscoltoPg('pg_ida')], [stanzaAscoltoPg('pg_ida')], [stanzaAscoltoPg('pg_ida')]]);
    expect(inviati.some((x) => x.stanze.includes(STANZA_SCHERMO))).toBe(false);
    // Dopo la fine della frase lo stesso id (mai riusato in realtà) tornerebbe pubblico: la mappa si svuota.
    u.pezzo({ id_frase: 'p', seq: 1, pcm: new Uint8Array(4) });
    expect(inviati.at(-1)!.stanze).toEqual([STANZA_SCHERMO, STANZA_ASCOLTO]);
  });
});
