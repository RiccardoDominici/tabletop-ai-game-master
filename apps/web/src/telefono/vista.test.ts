import { describe, expect, it } from 'vitest';
import type { AzionePrivata, StatoTavolo } from '@cantastorie/shared';
import { azioneDellaFinestra, bannerTelefono, possoAgire, sonoInvitato, sonoPronto } from './vista';

function stato(parziale: Partial<StatoTavolo> = {}): StatoTavolo {
  return {
    versione_stato: 1,
    versione_scena: 1,
    fase: 'finestra',
    turno: 1,
    scena: { id_campagna: 'prova', titolo: 'Prova', umore: 'mistero', intensita: 2 },
    pg: [],
    finestra: {
      aperta: true,
      turno: 2,
      invitati: ['aldo', 'bea'],
      azioni: [
        { id_pg: 'aldo', scritta: true, pronto: false },
        { id_pg: 'bea', scritta: false, pronto: true },
      ],
      chiusura_prevista_ms: null,
    },
    trascrizione: [],
    voce_motore: 'mock',
    schermo_connesso: true,
    ora_server_ms: 1_700_000_000_000,
    ...parziale,
  };
}

const mia: AzionePrivata = {
  id_pg: 'aldo',
  testo: 'Apro la botola',
  stato: 'in_coda',
  pronto: true,
  versione_scena: 1,
  turno: 2,
};

describe('vista del telefono', () => {
  it('invito esplicito e «tutti»', () => {
    const s = stato();
    expect(sonoInvitato(s.finestra, 'aldo')).toBe(true);
    expect(sonoInvitato(s.finestra, 'cosimo')).toBe(false);
    expect(sonoInvitato(s.finestra, null)).toBe(false);
    expect(sonoInvitato({ ...s.finestra, invitati: ['tutti'] }, 'cosimo')).toBe(true);
  });

  it('si può agire solo a finestra aperta e da invitati', () => {
    expect(possoAgire(stato(), 'aldo')).toBe(true);
    expect(possoAgire(stato(), 'cosimo')).toBe(false);
    expect(possoAgire(stato({ fase: 'narrazione' }), 'aldo')).toBe(false);
    const chiusa = stato();
    chiusa.finestra.aperta = false;
    expect(possoAgire(chiusa, 'aldo')).toBe(false);
  });

  it('banner per ogni fase', () => {
    expect(bannerTelefono(stato({ fase: 'attesa' }), 'aldo').tipo).toBe('attesa');
    expect(bannerTelefono(stato({ fase: 'apertura' }), 'aldo').tipo).toBe('narratore');
    expect(bannerTelefono(stato({ fase: 'narrazione' }), 'aldo').titolo).toBe('Il narratore sta parlando…');
    expect(bannerTelefono(stato({ fase: 'fermata' }), 'aldo').tipo).toBe('fermata');
    expect(bannerTelefono(stato(), 'cosimo').tipo).toBe('non_chiamato');
    const mio = bannerTelefono(stato(), 'aldo');
    expect(mio).toMatchObject({ tipo: 'tocca_a_te', titolo: 'Tocca a te: cosa fai?', scadenzaMs: null });
  });

  it('il conto alla rovescia arriva nel banner quando la chiusura è fissata', () => {
    const s = stato();
    s.finestra.chiusura_prevista_ms = 123_456;
    expect(bannerTelefono(s, 'bea').scadenzaMs).toBe(123_456);
  });

  it('pronto: fa fede il riepilogo pubblico, anche senza azione («passo»)', () => {
    expect(sonoPronto(stato(), 'bea', null)).toBe(true);
    expect(sonoPronto(stato(), 'aldo', mia)).toBe(false);
    const senzaRiepilogo = stato();
    senzaRiepilogo.finestra.azioni = [];
    expect(sonoPronto(senzaRiepilogo, 'aldo', mia)).toBe(true);
  });

  it('un’azione di un turno passato non vale per la finestra corrente', () => {
    expect(azioneDellaFinestra(stato(), mia)).toBe(mia);
    expect(azioneDellaFinestra(stato(), { ...mia, turno: 1 })).toBeNull();
    expect(azioneDellaFinestra(stato(), null)).toBeNull();
  });
});
