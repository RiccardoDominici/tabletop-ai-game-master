import { describe, expect, it } from 'vitest';
import type { AzioneMaster, FaseScena, StatoMaster } from '@tabletop-ai-gm/shared';
import {
  azioniInOrdine,
  puoChiudereFinestra,
  puoFermareNarrazione,
  puoMettereInPausa,
  puoRiprendere,
  spazioPerNote,
} from './permessi';

const pausa = (richiesta: boolean, attiva: boolean): Pick<StatoMaster, 'pausa'> => ({ pausa: { richiesta, attiva } });

/** Il minimo di StatoMaster che serve a `puoChiudereFinestra`. */
function perFinestra(aperta: boolean, fase: FaseScena, attiva = false): Pick<StatoMaster, 'tavolo' | 'pausa'> {
  return {
    pausa: { richiesta: false, attiva },
    tavolo: { fase, finestra: { aperta, turno: 2, invitati: [], azioni: [], chiusura_prevista_ms: null } } as unknown as StatoMaster['tavolo'],
  };
}

describe('pausa e ripresa', () => {
  it('«Pausa» solo se non già chiesta o attiva; «Riprendi» al contrario', () => {
    expect(puoMettereInPausa(pausa(false, false))).toBe(true);
    expect(puoMettereInPausa(pausa(true, false))).toBe(false);
    expect(puoMettereInPausa(pausa(false, true))).toBe(false);
    expect(puoRiprendere(pausa(false, false))).toBe(false);
    expect(puoRiprendere(pausa(true, false))).toBe(true);
    expect(puoRiprendere(pausa(true, true))).toBe(true);
  });
  it('«Ferma la narrazione» solo a narrazione in corso', () => {
    expect(puoFermareNarrazione({ narrazione_in_corso: true })).toBe(true);
    expect(puoFermareNarrazione({ narrazione_in_corso: false })).toBe(false);
  });
});

describe('puoChiudereFinestra', () => {
  it('finestra aperta e tavolo non in pausa', () => {
    expect(puoChiudereFinestra(perFinestra(true, 'finestra'))).toBe(true);
    expect(puoChiudereFinestra(perFinestra(false, 'finestra'))).toBe(false);
    expect(puoChiudereFinestra(perFinestra(true, 'pausa'))).toBe(false);
    expect(puoChiudereFinestra(perFinestra(true, 'finestra', true))).toBe(false);
  });
});

describe('spazioPerNote', () => {
  it('al massimo limiti_note.max note', () => {
    const nota = { id: 'n', testo: 'x', turni_rimasti: 3, turni_totali: 15, creata_al_turno: 1 };
    const limiti = { max: 3, turni_max: 15 };
    expect(spazioPerNote({ note: [nota, nota], limiti_note: limiti })).toBe(true);
    expect(spazioPerNote({ note: [nota, nota, nota], limiti_note: limiti })).toBe(false);
  });
});

describe('azioniInOrdine', () => {
  const azione = (id: string, turno: number, inviata_alle: number) => ({ id, turno, inviata_alle }) as AzioneMaster;
  it('turno, poi ordine d’invio, poi id; non tocca l’originale', () => {
    const originale = [azione('c', 3, 5), azione('b', 2, 9), azione('a', 2, 9), azione('d', 2, 1)];
    expect(azioniInOrdine(originale).map((a) => a.id)).toEqual(['d', 'a', 'b', 'c']);
    expect(originale.map((a) => a.id)).toEqual(['c', 'b', 'a', 'd']);
  });
});
