import { describe, expect, it } from 'vitest';
import type { AzionePrivata } from '@cantastorie/shared';
import { INTERVALLO_SCRIVO_MS, riconciliaBozza, TracciaScrittura } from './bozza';

function azione(parziale: Partial<AzionePrivata> = {}): AzionePrivata {
  return {
    id: 'a1',
    id_pg: 'pg_corrado',
    testo: 'anch’io',
    privata: false,
    stato: 'in_coda',
    motivo: null,
    richiesta: null,
    pronto: false,
    versione_vista: 3,
    turno: 2,
    inviata_alle: 0,
    ...parziale,
  };
}

describe('TracciaScrittura', () => {
  it('fissa la versione vista al primo tasto, anche se poi arriva una narrazione', () => {
    const t = new TracciaScrittura();
    expect(t.versioneVista).toBeNull();
    expect(t.tasto(3, 1000).versioneVista).toBe(3);
    expect(t.tasto(4, 1100).versioneVista).toBe(3);
    expect(t.versioneVista).toBe(3);
  });

  it('azione:scrivo al primo tasto, poi al massimo una volta al secondo', () => {
    const t = new TracciaScrittura();
    expect(t.tasto(1, 0).scrivo).toBe(true);
    expect(t.tasto(1, 200).scrivo).toBe(false);
    expect(t.tasto(1, INTERVALLO_SCRIVO_MS - 1).scrivo).toBe(false);
    expect(t.tasto(1, INTERVALLO_SCRIVO_MS).scrivo).toBe(true);
    expect(t.tasto(1, INTERVALLO_SCRIVO_MS + 500).scrivo).toBe(false);
  });

  it('azzera dopo l’invio: la bozza successiva fissa una versione nuova', () => {
    const t = new TracciaScrittura();
    t.tasto(2, 0);
    t.azzera();
    expect(t.versioneVista).toBeNull();
    const dopo = t.tasto(5, 10);
    expect(dopo).toEqual({ versioneVista: 5, scrivo: true });
  });
});

describe('riconciliaBozza', () => {
  it('in coda: casella vuota (ricaricamento) → torna il testo, con «privata»', () => {
    expect(riconciliaBozza('', azione({ privata: true }))).toEqual({ testo: 'anch’io', privata: true });
    expect(riconciliaBozza('anch’io', azione())).toEqual({ testo: 'anch’io', privata: null });
  });

  it('mai perdere una bozza non inviata', () => {
    for (const stato of ['in_coda', 'da_confermare', 'superata', 'sospesa', 'chiusa', 'risolta', 'ritirata'] as const) {
      expect(riconciliaBozza('scrivo altro', azione({ stato })).testo).toBe('scrivo altro');
    }
  });

  it('superata / sospesa: il testo torna nella casella vuota', () => {
    expect(riconciliaBozza('', azione({ stato: 'superata', motivo: 'La grata è crollata.' })).testo).toBe('anch’io');
    expect(riconciliaBozza('  ', azione({ stato: 'sospesa' })).testo).toBe('anch’io');
  });

  it('chiusa / risolta: la casella che mostrava quel testo si svuota', () => {
    expect(riconciliaBozza('anch’io ', azione({ stato: 'chiusa' }))).toEqual({ testo: '', privata: false });
    expect(riconciliaBozza('anch’io', azione({ stato: 'risolta' })).testo).toBe('');
  });

  it('ritirata o nessuna azione: la casella non si tocca', () => {
    expect(riconciliaBozza('anch’io', azione({ stato: 'ritirata' })).testo).toBe('anch’io');
    expect(riconciliaBozza('bozza', null)).toEqual({ testo: 'bozza', privata: null });
  });
});
