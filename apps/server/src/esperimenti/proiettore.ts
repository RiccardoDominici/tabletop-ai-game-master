/**
 * Proiettore virtuale per gli esperimenti: un client Socket.IO che si comporta come la pagina
 * /schermo, senza browser. Programma i pezzi PCM su una linea del tempo reale con le stesse regole
 * del lettore web (apps/web/src/audio/pianificatore.ts): ogni pezzo parte dove finisce il
 * precedente; se la coda si è svuotata riparte con 150 ms di cuscinetto e conta un buco (a metà
 * frase o tra due frasi). Avvisa il server quando il primo pezzo del turno «suona» e quando
 * l'ultimo finisce, proprio come lo schermo vero.
 */
import type { Socket } from 'socket.io-client';
import type { AudioFrase, EventiClientVersoServer, EventiServerVersoClient } from '@cantastorie/shared';

const JITTER_S = 0.15;

export interface StatisticheTurnoAudio {
  turno: number;
  frasi: number;
  pezzi: number;
  secondi: number;
  buchi: number;
  buchi_in_frase: number;
  buchi_tra_frasi: number;
  silenzio_ms: number;
}

interface StatoTurno extends StatisticheTurnoAudio {
  iniziato: boolean;
}

export class ProiettoreVirtuale {
  private prossimoInizio: number | null = null;
  private frasi = new Map<string, { meta: AudioFrase; pezzi: number }>();
  private turni = new Map<number, StatoTurno>();
  private timer = new Set<NodeJS.Timeout>();
  readonly finiti: StatisticheTurnoAudio[] = [];

  constructor(private readonly socket: Socket<EventiServerVersoClient, EventiClientVersoServer>) {
    socket.on('audio:frase', (f) => {
      this.frasi.set(f.id_frase, { meta: f, pezzi: 0 });
      this.turno(f.turno).frasi += 1;
    });
    socket.on('audio:pezzo', (p) => this.pezzo(p.id_frase, (p.pcm as ArrayBuffer).byteLength));
    socket.on('audio:fine_turno', (f) => this.fineTurno(f.turno));
    socket.on('audio:interrompi', () => {
      for (const t of this.timer) clearTimeout(t);
      this.timer.clear();
      this.prossimoInizio = null;
      this.frasi.clear();
      this.turni.clear();
    });
  }

  private ora(): number {
    return performance.now() / 1000;
  }

  private turno(n: number): StatoTurno {
    let t = this.turni.get(n);
    if (!t) {
      t = { turno: n, frasi: 0, pezzi: 0, secondi: 0, buchi: 0, buchi_in_frase: 0, buchi_tra_frasi: 0, silenzio_ms: 0, iniziato: false };
      this.turni.set(n, t);
    }
    return t;
  }

  private dopo(s: number, cb: () => void): void {
    const t = setTimeout(() => {
      this.timer.delete(t);
      cb();
    }, Math.max(0, s * 1000));
    this.timer.add(t);
  }

  private pezzo(id_frase: string, byte: number): void {
    const frase = this.frasi.get(id_frase);
    if (!frase) return;
    const t = this.turno(frase.meta.turno);
    const ora = this.ora();
    const durata = Math.floor(byte / 2) / frase.meta.sample_rate;
    let inizio: number;
    if (this.prossimoInizio === null || this.prossimoInizio < ora) {
      inizio = ora + JITTER_S;
      if (t.iniziato && this.prossimoInizio !== null) {
        t.buchi += 1;
        if (frase.pezzi > 0) t.buchi_in_frase += 1;
        else t.buchi_tra_frasi += 1;
        t.silenzio_ms += Math.round((inizio - this.prossimoInizio) * 1000);
      }
    } else {
      inizio = this.prossimoInizio;
    }
    this.prossimoInizio = inizio + durata;
    frase.pezzi += 1;
    t.pezzi += 1;
    t.secondi += durata;
    if (!t.iniziato) {
      t.iniziato = true;
      // Il primo pezzo del turno «suona» all'istante programmato: lo si dice al server allora.
      this.dopo(inizio - ora, () => this.socket.emit('schermo:audio_iniziato', { turno: t.turno, id_frase, ritardo_ms: 0 }));
    }
  }

  private fineTurno(turno: number): void {
    const t = this.turni.get(turno) ?? this.turno(turno);
    const ora = this.ora();
    const fine = t.iniziato && this.prossimoInizio !== null ? this.prossimoInizio : ora;
    this.dopo(fine - ora, () => {
      const { iniziato: _i, ...stat } = t;
      this.finiti.push(stat);
      this.turni.delete(turno);
      this.socket.emit('schermo:audio_finito', {
        turno,
        ritardo_ms: 0,
        buchi: stat.buchi,
        buchi_in_frase: stat.buchi_in_frase,
        buchi_tra_frasi: stat.buchi_tra_frasi,
        silenzio_ms: stat.silenzio_ms,
      });
    });
  }
}
