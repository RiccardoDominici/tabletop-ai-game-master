import { describe, expect, it } from 'vitest';
import type { AudioFrase } from '@tabletop-ai-gm/shared';
import { Programmatore, type Segno } from './programmatore';

const SR = 24000;

function frase(id: string, turno: number, indice: number, sample_rate = SR): AudioFrase {
  return { id_frase: id, turno, indice, parlante: 'narratore', nome: 'Narratore', testo: `frase ${id}`, sample_rate };
}

/** `secondi` di PCM s16le (silenzio) alla frequenza data. */
function pcm(secondi: number, sampleRate = SR): Uint8Array {
  return new Uint8Array(Math.round(secondi * sampleRate) * 2);
}

const tipi = (segni: Segno[]) => segni.map((s) => s.tipo);

describe('Programmatore', () => {
  it('un turno completo: segni d’inizio e fine sulla linea del tempo, non all’arrivo', () => {
    const p = new Programmatore(0.15);
    p.frase(frase('a', 1, 0));

    const primo = p.pezzo('a', 0, pcm(0.2), 10);
    expect(tipi(primo.segni)).toEqual(['inizio_turno', 'inizio_frase']);
    expect(primo.segni[0]).toMatchObject({ tipo: 'inizio_turno', t: 10.15, turno: 1, id_frase: 'a' });
    expect(primo.pezzo?.inizio).toBeCloseTo(10.15, 10);
    expect(primo.pezzo?.durata).toBeCloseTo(0.2, 10);
    expect(primo.pezzo?.sampleRate).toBe(SR);

    // Secondo pezzo arrivato presto: nessun segno nuovo, contiguo al primo.
    const secondo = p.pezzo('a', 1, pcm(0.2), 10.1);
    expect(secondo.segni).toEqual([]);
    expect(secondo.pezzo?.inizio).toBeCloseTo(10.35, 10);

    // La frase finisce quando finisce il suo ultimo pezzo (10,55), anche se l'evento arriva prima.
    const fineFrase = p.fineFrase({ id_frase: 'a', turno: 1, secondi: 0.4, interrotta: false });
    expect(fineFrase).toHaveLength(1);
    expect(fineFrase[0]?.t).toBeCloseTo(10.55, 10);

    // Seconda frase dello stesso turno, ancora in anticipo: nuovo inizio_frase, nessun inizio_turno.
    p.frase(frase('b', 1, 1));
    const b0 = p.pezzo('b', 0, pcm(0.5), 10.3);
    expect(tipi(b0.segni)).toEqual(['inizio_frase']);
    expect(b0.segni[0]?.t).toBeCloseTo(10.55, 10);

    const fineTurno = p.fineTurno({ turno: 1, frasi: 2 }, 10.4);
    expect(fineTurno).toHaveLength(1);
    expect(fineTurno[0]).toMatchObject({ tipo: 'fine_turno', turno: 1, buchi: { buchi: 0, buchi_in_frase: 0, buchi_tra_frasi: 0, silenzio_ms: 0 } });
    expect(fineTurno[0]?.t).toBeCloseTo(11.05, 10);

    expect(p.contatori.pezzi).toBe(3);
    expect(p.contatori.byte).toBe((4800 + 4800 + 12000) * 2);
    expect(p.contatori.secondiProgrammati).toBeCloseTo(0.9, 10);
  });

  it('conta i buchi solo a metà turno e li riporta nel segno di fine turno', () => {
    const p = new Programmatore(0.15);
    p.frase(frase('a', 2, 0));
    p.pezzo('a', 0, pcm(0.2), 0); // 0,15 → 0,35
    const tardi = p.pezzo('a', 1, pcm(0.2), 1); // la coda era vuota da 0,35
    expect(tardi.buco).toBe(true);
    expect(tardi.pezzo?.inizio).toBeCloseTo(1.15, 10);

    // Anche tra due frasi dello stesso turno il silenzio è un buco.
    p.frase(frase('b', 2, 1));
    const b0 = p.pezzo('b', 0, pcm(0.2), 3);
    expect(b0.buco).toBe(true);

    const [fine] = p.fineTurno({ turno: 2, frasi: 2 }, 3.1);
    // a1 arriva a metà frase (0,8 s di silenzio), b0 apre la frase dopo (1,8 s di silenzio).
    expect(fine).toMatchObject({ tipo: 'fine_turno', buchi: { buchi: 2, buchi_in_frase: 1, buchi_tra_frasi: 1, silenzio_ms: 2600 } });
    expect(p.contatori.buchi).toBe(2);

    // Un turno nuovo che parte tardi non è un buco.
    p.frase(frase('c', 3, 0));
    const c0 = p.pezzo('c', 0, pcm(0.2), 20);
    expect(c0.buco).toBe(false);
    expect(tipi(c0.segni)).toEqual(['inizio_turno', 'inizio_frase']);
    expect(p.contatori.buchi).toBe(2);
  });

  it('riporto del byte dispari tra pezzi della stessa frase', () => {
    const p = new Programmatore(0.1);
    p.frase(frase('a', 0, 0));
    const r0 = p.pezzo('a', 0, new Uint8Array(9601), 0);
    expect(r0.pezzo?.campioni.length).toBe(4800);
    const r1 = p.pezzo('a', 1, new Uint8Array(9599), 0.01);
    expect(r1.pezzo?.campioni.length).toBe(4800); // 1 riportato + 9599 = 9600
    const r2 = p.pezzo('a', 2, new Uint8Array(1), 0.02);
    expect(r2.pezzo).toBeNull();
    expect(r2.scartato).toBe('vuoto');
    p.fineFrase({ id_frase: 'a', turno: 0, secondi: 0.4, interrotta: true });
    expect(p.contatori.byteOrfani).toBe(1);
  });

  it('usa il sample rate annunciato dalla frase (il browser ricampiona)', () => {
    const p = new Programmatore(0);
    p.frase(frase('a', 0, 0, 16000));
    const r = p.pezzo('a', 0, pcm(0.5, 16000), 0);
    expect(r.pezzo?.sampleRate).toBe(16000);
    expect(r.pezzo?.durata).toBeCloseTo(0.5, 10);
  });

  it('pezzi di frasi mai annunciate si scartano', () => {
    const p = new Programmatore();
    const r = p.pezzo('ignota', 0, pcm(0.1), 0);
    expect(r.pezzo).toBeNull();
    expect(r.scartato).toBe('frase_sconosciuta');
    expect(p.contatori.pezziSenzaFrase).toBe(1);
  });

  it('turno senza audio: si chiude subito, una frase mai suonata non dà segni', () => {
    const p = new Programmatore();
    p.frase(frase('a', 4, 0));
    expect(p.fineFrase({ id_frase: 'a', turno: 4, secondi: 0, interrotta: true })).toEqual([]);
    const [fine] = p.fineTurno({ turno: 4, frasi: 1 }, 7.5);
    expect(fine).toEqual({ tipo: 'fine_turno', t: 7.5, turno: 4, buchi: { buchi: 0, buchi_in_frase: 0, buchi_tra_frasi: 0, silenzio_ms: 0 } });
  });

  it('interrompi azzera tutto: il pezzo successivo riparte col jitter, senza buco', () => {
    const p = new Programmatore(0.15);
    p.frase(frase('a', 1, 0));
    p.pezzo('a', 0, pcm(2), 0); // in programma fino a 2,15
    p.interrompi();
    expect(p.anticipo(0.5)).toBe(0);
    expect(p.pezzo('a', 1, pcm(0.2), 0.5).scartato).toBe('frase_sconosciuta');

    p.frase(frase('b', 0, 0));
    const b = p.pezzo('b', 0, pcm(0.2), 0.6);
    expect(b.pezzo?.inizio).toBeCloseTo(0.75, 10);
    expect(b.buco).toBe(false);
    expect(tipi(b.segni)).toEqual(['inizio_turno', 'inizio_frase']);
  });

  it('il turno successivo si accoda all’audio ancora in programma del precedente', () => {
    const p = new Programmatore(0.15);
    p.frase(frase('a', 0, 0));
    p.pezzo('a', 0, pcm(1), 0); // 0,15 → 1,15
    p.fineFrase({ id_frase: 'a', turno: 0, secondi: 1, interrotta: false });
    p.fineTurno({ turno: 0, frasi: 1 }, 0.1);
    p.frase(frase('b', 1, 0));
    const b = p.pezzo('b', 0, pcm(0.2), 0.2);
    expect(b.segni[0]).toMatchObject({ tipo: 'inizio_turno', turno: 1 });
    expect(b.segni[0]?.t).toBeCloseTo(1.15, 10);
  });
});
