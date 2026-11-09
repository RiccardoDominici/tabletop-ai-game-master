/**
 * Sorvegliante delle attese (scena/sorvegliante.ts), con un orologio finto: un lavoro senza segni di
 * vita scatta una volta sola dopo il silenzio massimo; ogni segno di vita (e l'attesa lunga dichiarata)
 * sposta la scadenza; `fine` lo spegne; 0 = spento. L'uscita audio «con battito» inoltra tutto e batte
 * a ogni pezzo.
 */
import { describe, expect, it } from 'vitest';
import { conBattitoAudio, Sorvegliante, type BloccoSorvegliato } from '../src/scena/sorvegliante';
import { loggerMuto } from '../src/logger';
import type { Orologio } from '../src/turni/orologio';

class OrologioFinto implements Orologio {
  t = 0;
  private timer: Array<{ a: number; cb: () => void; vivo: boolean }> = [];
  ora = () => this.t;
  adesso = () => this.t;
  dopo = (ms: number, cb: () => void) => {
    const x = { a: this.t + ms, cb, vivo: true };
    this.timer.push(x);
    return () => {
      x.vivo = false;
    };
  };
  avanza(ms: number): void {
    const fine = this.t + ms;
    for (;;) {
      const p = this.timer.filter((x) => x.vivo && x.a <= fine).sort((a, b) => a.a - b.a)[0];
      if (!p) break;
      this.t = p.a;
      p.vivo = false;
      p.cb();
    }
    this.t = fine;
  }
}

function crea(silenzioMs = 1000) {
  const orologio = new OrologioFinto();
  const blocchi: BloccoSorvegliato[] = [];
  const s = new Sorvegliante({ orologio, log: loggerMuto(), silenzioMs, onBlocco: (b) => blocchi.push(b) });
  return { s, orologio, blocchi };
}

describe('sorvegliante', () => {
  it('nessun segno di vita: scatta una volta sola, con l’ultima cosa che succedeva', () => {
    const { s, orologio, blocchi } = crea();
    s.inizia(4, 'narrazione', 'llm: chiamata');
    orologio.avanza(999);
    expect(blocchi).toHaveLength(0);
    orologio.avanza(10);
    expect(blocchi).toEqual([{ turno: 4, fase: 'narrazione', ultimo: 'llm: chiamata', fermo_ms: 1000, durata_ms: 1000 }]);
    orologio.avanza(10_000);
    expect(blocchi).toHaveLength(1);
    expect(s.attivo).toBe(false);
  });

  it('ogni segno di vita sposta la scadenza; un’attesa lunga dichiarata la allunga', () => {
    const { s, orologio, blocchi } = crea();
    s.inizia(1, 'narrazione', 'llm: chiamata');
    for (let i = 0; i < 10; i++) {
      orologio.avanza(800);
      s.batti('voce: audio in uscita');
    }
    expect(blocchi).toHaveLength(0);
    s.batti('audio: in riproduzione', 5000); // l'audio del turno deve ancora suonare 5 s
    orologio.avanza(5900);
    expect(blocchi).toHaveLength(0);
    orologio.avanza(200);
    expect(blocchi[0]).toMatchObject({ ultimo: 'audio: in riproduzione', fermo_ms: 6000 }); // 1 s di silenzio + 5 s dichiarati
  });

  it('fine: niente più sorveglianza; silenzio 0 = spento', () => {
    const a = crea();
    a.s.inizia(1, 'apertura', 'apertura');
    a.s.fine('fine narrazione');
    a.orologio.avanza(5000);
    expect(a.blocchi).toHaveLength(0);
    const b = crea(0);
    b.s.inizia(1, 'narrazione', 'llm');
    b.orologio.avanza(60_000);
    expect(b.blocchi).toHaveLength(0);
    expect(b.s.attivo).toBe(false);
  });

  it('uscita audio con battito: inoltra tutti i metodi, e batte a ogni pezzo', () => {
    const chiamate: string[] = [];
    class Uscita {
      prefisso = 'u';
      frase(x: string) {
        chiamate.push(`${this.prefisso}:frase:${x}`);
      }
      pezzo(x: string) {
        chiamate.push(`${this.prefisso}:pezzo:${x}`);
      }
    }
    let battiti = 0;
    const u = conBattitoAudio(new Uscita(), () => (battiti += 1));
    u.frase('f1');
    u.pezzo('p1');
    u.pezzo('p2');
    expect(chiamate).toEqual(['u:frase:f1', 'u:pezzo:p1', 'u:pezzo:p2']);
    expect(battiti).toBe(2);
  });
});
