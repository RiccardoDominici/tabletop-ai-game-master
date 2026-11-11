import { describe, expect, it } from 'vitest';
import type { FaseScena, StatoAzione } from '@tabletop-ai-gm/shared';
import {
  ETICHETTA_FASE_MASTER,
  ETICHETTA_STATO_AZIONE_MASTER,
  etichettaModo,
  etichettaPausa,
  etichettaTurno,
  etichettaVoce,
  oraBreve,
  TONO_STATO_AZIONE,
  tonoPausa,
  turni,
} from './etichette';

describe('fase e pausa', () => {
  it('ogni fase ha un’etichetta italiana, compresa la pausa', () => {
    const fasi: FaseScena[] = ['attesa', 'apertura', 'finestra', 'narrazione', 'pausa', 'fermata'];
    for (const fase of fasi) expect(ETICHETTA_FASE_MASTER[fase]).toMatch(/\S/);
    expect(ETICHETTA_FASE_MASTER.pausa).toBe('in pausa');
  });
  it('pausa: attiva vince su richiesta', () => {
    expect(etichettaPausa({ richiesta: false, attiva: false })).toBe('in gioco');
    expect(etichettaPausa({ richiesta: true, attiva: false })).toBe('pausa alla fine della narrazione');
    expect(etichettaPausa({ richiesta: true, attiva: true })).toBe('in pausa');
    expect(etichettaPausa({ richiesta: false, attiva: true })).toBe('in pausa');
    expect(tonoPausa({ richiesta: false, attiva: false })).toBe('muschio');
    expect(tonoPausa({ richiesta: true, attiva: false })).toBe('brace');
  });
});

describe('voce, modo, turni', () => {
  it('motore voce e modalità', () => {
    expect(etichettaVoce('qwen')).toBe('Qwen (locale)');
    expect(etichettaVoce('fish')).toBe('drama-3 (Fish)');
    expect(etichettaVoce('mock')).toBe('finta (mock)');
    expect(etichettaModo('improvvisa')).toBe('A · improvvisa');
    expect(etichettaModo('repertorio')).toBe('B · repertorio');
  });
  it('turni', () => {
    expect(etichettaTurno(0)).toBe('apertura');
    expect(etichettaTurno(3)).toBe('turno 3');
    expect(turni(1)).toBe('1 turno');
    expect(turni(15)).toBe('15 turni');
  });
});

describe('stato delle azioni', () => {
  it('ogni stato ha etichetta e tono; mai «conflitto»', () => {
    const stati: StatoAzione[] = ['in_coda', 'da_confermare', 'ritirata', 'chiusa', 'risolta', 'superata', 'sospesa'];
    for (const s of stati) {
      expect(ETICHETTA_STATO_AZIONE_MASTER[s]).toMatch(/\S/);
      expect(ETICHETTA_STATO_AZIONE_MASTER[s].toLowerCase()).not.toContain('conflitto');
      expect(TONO_STATO_AZIONE[s]).toBeTruthy();
    }
    expect(ETICHETTA_STATO_AZIONE_MASTER.da_confermare).toBe('da decidere');
  });
});

describe('oraBreve', () => {
  it('ora locale HH:MM:SS da epoch ms o da ISO', () => {
    // Costruita in ora locale: il test non dipende dal fuso della macchina.
    const data = new Date(2026, 10, 2, 9, 5, 7);
    expect(oraBreve(data.getTime())).toBe('09:05:07');
    expect(oraBreve(data.toISOString())).toBe('09:05:07');
  });
  it('«—» per date non valide', () => {
    expect(oraBreve('ieri')).toBe('—');
    expect(oraBreve(Number.NaN)).toBe('—');
  });
});
