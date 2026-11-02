/**
 * Finestra delle azioni con un orologio finto: invio/modifica/ritiro, pronto, chiusura
 * per tutti pronti o 10 s dopo la prima azione, versione della scena.
 */
import { describe, expect, it } from 'vitest';
import { FinestraAzioni, type Orologio, type RiepilogoFinestra } from '../src/turni/finestra';

class OrologioFinto implements Orologio {
  t = 0;
  private timer: Array<{ a: number; cb: () => void; vivo: boolean }> = [];
  ora = () => this.t;
  adesso = () => 1_700_000_000_000 + this.t;
  dopo = (ms: number, cb: () => void) => {
    const x = { a: this.t + ms, cb, vivo: true };
    this.timer.push(x);
    return () => {
      x.vivo = false;
    };
  };
  avanza(ms: number): void {
    this.t += ms;
    for (const x of this.timer) {
      if (x.vivo && x.a <= this.t) {
        x.vivo = false;
        x.cb();
      }
    }
  }
}

function crea(invitati = ['pg_a', 'pg_b'], invitoATutti = false) {
  const orologio = new OrologioFinto();
  const chiusure: RiepilogoFinestra[] = [];
  let cambi = 0;
  const f = new FinestraAzioni({
    turno: 3,
    invitati,
    versioneScena: 2,
    chiusuraDopoPrimaAzioneMs: 10_000,
    invitoATutti,
    orologio,
    onChiusura: (r) => chiusure.push(r),
    onCambio: () => cambi++,
  });
  return { f, orologio, chiusure, cambi: () => cambi };
}

describe('FinestraAzioni', () => {
  it('si chiude quando tutti gli invitati sono pronti (anche chi passa)', () => {
    const { f, orologio, chiusure } = crea();
    orologio.avanza(1500);
    expect(f.invia('pg_a', 'Spezzo una pagnotta.', 2)).toEqual({ ok: true });
    expect(f.pronto('pg_a', true)).toEqual({ ok: true });
    expect(f.aperta).toBe(true);
    orologio.avanza(500);
    expect(f.pronto('pg_b', true)).toEqual({ ok: true }); // passa senza azione
    expect(f.aperta).toBe(false);
    expect(chiusure).toHaveLength(1);
    expect(chiusure[0]).toMatchObject({ motivo: 'tutti_pronti', durata_ms: 2000, senzaAzione: ['pg_b'], turno: 3 });
    expect(chiusure[0]!.azioni.map((a) => [a.id_pg, a.testo, a.versione_scena])).toEqual([['pg_a', 'Spezzo una pagnotta.', 2]]);
  });

  it('si chiude 10 s dopo la PRIMA azione, non dopo le modifiche', () => {
    const { f, orologio, chiusure } = crea();
    orologio.avanza(3000); // la finestra aperta senza azioni non scade
    f.invia('pg_a', 'Guardo il cane.', 2);
    expect(f.pubblica().chiusura_prevista_ms).toBe(1_700_000_000_000 + 13_000);
    orologio.avanza(6000);
    f.invia('pg_a', 'Accarezzo il cane.', 2); // modifica: il timer NON riparte
    f.invia('pg_b', 'Apro un sacco.', 2);
    orologio.avanza(3999);
    expect(f.aperta).toBe(true);
    orologio.avanza(1);
    expect(f.aperta).toBe(false);
    expect(chiusure[0]).toMatchObject({ motivo: 'scadenza', durata_ms: 13_000 });
    expect(chiusure[0]!.azioni.find((a) => a.id_pg === 'pg_a')).toMatchObject({ testo: 'Accarezzo il cane.', modifiche: 2 });
  });

  it('ritirare l’unica azione ferma il conto alla rovescia', () => {
    const { f, orologio, chiusure } = crea();
    f.invia('pg_a', 'Esco.', 2);
    orologio.avanza(5000);
    expect(f.ritira('pg_a')).toEqual({ ok: true });
    expect(f.pubblica().chiusura_prevista_ms).toBeNull();
    orologio.avanza(20_000);
    expect(f.aperta).toBe(true);
    f.invia('pg_b', 'Resto.', 2);
    orologio.avanza(10_000);
    expect(chiusure[0]).toMatchObject({ motivo: 'scadenza' });
    expect(chiusure[0]!.azioni.map((a) => a.id_pg)).toEqual(['pg_b']);
  });

  it('rifiuta chi non è invitato, testo vuoto, versione vecchia, finestra chiusa', () => {
    const { f } = crea();
    expect(f.invia('pg_c', 'Io!', 2)).toMatchObject({ ok: false });
    expect(f.invia('pg_a', '   ', 2)).toMatchObject({ ok: false });
    expect(f.invia('pg_a', 'x'.repeat(501), 2)).toMatchObject({ ok: false });
    expect(f.invia('pg_a', 'Vecchia.', 1)).toMatchObject({ ok: false, errore: expect.stringMatching(/scena è cambiata/) });
    expect(f.ritira('pg_a')).toMatchObject({ ok: false });
    f.chiudi('forzata');
    expect(f.invia('pg_a', 'Tardi.', 2)).toMatchObject({ ok: false, errore: expect.stringMatching(/chiusa/) });
    expect(f.chiudi('forzata')).toBeNull();
  });

  it('pubblica non rivela il testo, solo scritta/pronto', () => {
    const { f } = crea();
    f.invia('pg_a', 'Segreto.', 2);
    f.pronto('pg_b', true);
    const p = f.pubblica();
    expect(p).toMatchObject({ aperta: true, turno: 3, invitati: ['pg_a', 'pg_b'] });
    expect(p.azioni).toEqual([
      { id_pg: 'pg_a', scritta: true, pronto: false },
      { id_pg: 'pg_b', scritta: false, pronto: true },
    ]);
    expect(JSON.stringify(p)).not.toContain('Segreto');
  });

  it('un PG che lascia il tavolo non si aspetta più; uno che arriva entra se l’invito era a tutti', () => {
    const { f, chiusure } = crea(['pg_a', 'pg_b'], true);
    f.pronto('pg_a', true);
    f.aggiungiInvitato('pg_c');
    expect(f.pubblica().invitati).toEqual(['pg_a', 'pg_b', 'pg_c']);
    f.rimuoviInvitato('pg_b');
    expect(f.aperta).toBe(true); // manca ancora pg_c
    f.rimuoviInvitato('pg_c');
    expect(f.aperta).toBe(false);
    expect(chiusure[0]).toMatchObject({ motivo: 'tutti_pronti', invitati: ['pg_a'] });
  });
});
