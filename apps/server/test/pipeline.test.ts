/**
 * Pipeline della voce col motore finto (tempi accorciati): ordine, allineamento dei byte,
 * fine turno, voce di riserva, interruzione.
 */
import { describe, expect, it } from 'vitest';
import type { AudioFineFrase, AudioFrase, AudioPezzo } from '@cantastorie/shared';
import { loggerMuto } from '../src/logger';
import { MotoreVoceMock } from '../src/voce/mock';
import { PipelineVoce, type FraseDaDire, type UscitaAudio } from '../src/voce/pipeline';
import type { FlussoTts, MotoreVoce, RichiestaTts } from '../src/voce/tipi';

type Evento = ['frase', AudioFrase] | ['pezzo', AudioPezzo] | ['fine', AudioFineFrase] | ['turno', number] | ['zitto'];

function registratore(): { uscita: UscitaAudio; eventi: Evento[] } {
  const eventi: Evento[] = [];
  return {
    eventi,
    uscita: {
      frase: (m) => eventi.push(['frase', m]),
      pezzo: (p) => eventi.push(['pezzo', p]),
      fineFrase: (f) => eventi.push(['fine', f]),
      fineTurno: (f) => eventi.push(['turno', f.turno]),
      interrompi: () => eventi.push(['zitto']),
    },
  };
}

function frase(turno: number, indice: number, testo: string, voce_id = 'narratore'): FraseDaDire {
  return { id_frase: `t${turno}-f${indice}`, turno, indice, parlante: voce_id, nome: voce_id, voce_id, testo };
}

const veloce = () => new MotoreVoceMock({ scalaTempo: 0.01 });

describe('PipelineVoce', () => {
  it('dice le frasi in ordine, una alla volta, e chiude il turno', async () => {
    const { uscita, eventi } = registratore();
    const richieste: string[] = [];
    const p = new PipelineVoce({
      motore: veloce,
      uscita,
      log: loggerMuto(),
      osservatore: { richiesta: (f) => richieste.push(f.id_frase) },
    });
    p.accoda(frase(1, 0, 'La porta cigola.'));
    p.accoda(frase(1, 1, 'Fermi lì.', 'vincent'));
    const esito = await p.chiudiTurno(1);
    expect(esito).toMatchObject({ turno: 1, frasi: 2, interrotto: false });
    expect(richieste).toEqual(['t1-f0', 't1-f1']);
    const sequenza = eventi.map((e) => (e[0] === 'pezzo' ? `p:${e[1].id_frase}` : e[0] === 'turno' ? 'turno' : `${e[0]}:${(e[1] as AudioFrase).id_frase ?? ''}`));
    // Tutti i pezzi della prima frase prima dell'annuncio della seconda.
    const iFine0 = sequenza.indexOf('fine:t1-f0');
    const iFrase1 = sequenza.indexOf('frase:t1-f1');
    expect(iFine0).toBeGreaterThan(0);
    expect(iFrase1).toBeGreaterThan(iFine0);
    expect(sequenza.at(-1)).toBe('turno');
    expect(esito.secondi).toBeGreaterThan(1);
  });

  it('chiudiTurno senza frasi risolve subito', async () => {
    const { uscita, eventi } = registratore();
    const p = new PipelineVoce({ motore: veloce, uscita, log: loggerMuto() });
    await expect(p.chiudiTurno(5)).resolves.toMatchObject({ frasi: 0, interrotto: false });
    expect(eventi).toEqual([['turno', 5]]);
  });

  it('ripara i pezzi con un numero dispari di byte', async () => {
    // Motore che spezza 10 campioni (20 byte) in pezzi da 3 byte.
    const dispari: MotoreVoce = {
      nome: 'mock',
      salute: async () => ({ pronto: true, modello: 'x', sample_rate: 24000, formato: 'pcm_s16le', voci: ['narratore'] }),
      sintetizza: async (_r: RichiestaTts): Promise<FlussoTts> => {
        const tutti = Uint8Array.from({ length: 20 }, (_, i) => i);
        async function* pezzi() {
          for (let i = 0; i < tutti.length; i += 3) yield tutti.slice(i, i + 3);
        }
        return { sampleRate: 24000, pezzi: pezzi() };
      },
    };
    const { uscita, eventi } = registratore();
    const p = new PipelineVoce({ motore: () => dispari, uscita, log: loggerMuto() });
    p.accoda(frase(1, 0, 'x'));
    await p.chiudiTurno(1);
    const pezzi = eventi.filter((e): e is ['pezzo', AudioPezzo] => e[0] === 'pezzo').map((e) => e[1].pcm as Uint8Array);
    for (const pz of pezzi) expect(pz.length % 2).toBe(0);
    const unito = Buffer.concat(pezzi.map((x) => Buffer.from(x)));
    expect([...unito]).toEqual(Array.from({ length: 20 }, (_, i) => i));
  });

  it('voce sconosciuta → riprova con la voce del narratore', async () => {
    const { uscita, eventi } = registratore();
    const p = new PipelineVoce({ motore: veloce, uscita, log: loggerMuto() });
    p.accoda(frase(1, 0, 'Chi sei?', 'voce_che_non_esiste'));
    await p.chiudiTurno(1);
    expect(eventi.some((e) => e[0] === 'pezzo')).toBe(true);
    expect(eventi.find((e) => e[0] === 'fine')?.[1]).toMatchObject({ interrotta: false });
  });

  it('interrompi ferma la frase in corso, svuota la coda e avvisa lo schermo', async () => {
    const { uscita, eventi } = registratore();
    const lento = () => new MotoreVoceMock({ scalaTempo: 0.2 });
    const p = new PipelineVoce({ motore: lento, uscita, log: loggerMuto() });
    p.accoda(frase(1, 0, 'Una frase abbastanza lunga da durare qualche secondo di audio.'));
    p.accoda(frase(1, 1, 'Questa non deve mai partire.'));
    const fine = p.chiudiTurno(1);
    await new Promise((r) => setTimeout(r, 250));
    p.interrompi('test');
    await expect(fine).resolves.toMatchObject({ interrotto: true });
    await new Promise((r) => setTimeout(r, 100));
    expect(eventi.some((e) => e[0] === 'zitto')).toBe(true);
    expect(eventi.some((e) => e[0] === 'frase' && e[1].id_frase === 't1-f1')).toBe(false);
    // Dopo l'interruzione la pipeline lavora ancora.
    p.accoda(frase(2, 0, 'Si ricomincia.'));
    await expect(p.chiudiTurno(2)).resolves.toMatchObject({ frasi: 1, interrotto: false });
  });
});

describe('MotoreVoceMock', () => {
  it('rispetta il contratto: 404 voce, 400 testo vuoto, PCM pari a 24 kHz', async () => {
    const m = veloce();
    await expect(m.sintetizza({ id: 'a', voce: 'boh', testo: 'x' }, new AbortController().signal)).rejects.toMatchObject({ stato: 404 });
    await expect(m.sintetizza({ id: 'a', voce: 'narratore', testo: ' ' }, new AbortController().signal)).rejects.toMatchObject({ stato: 400 });
    const f = await m.sintetizza({ id: 'a', voce: 'nadine', testo: 'Mangiate, figlioli.' }, new AbortController().signal);
    expect(f.sampleRate).toBe(24000);
    let byte = 0;
    for await (const p of f.pezzi) {
      expect(p.length % 2).toBe(0);
      byte += p.length;
    }
    expect(byte / 2 / 24000).toBeCloseTo(m.durataPer('Mangiate, figlioli.'), 1);
  });
});
