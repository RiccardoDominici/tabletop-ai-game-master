/**
 * Ingresso del narratore: azioni chiuse in ordine di invio, numerate, con i collegamenti.
 */
import { describe, expect, it } from 'vitest';
import { azioniPerNarratore } from '../src/azioni/narratore';
import type { RiepilogoChiusura } from '../src/azioni/tavolo';
import type { Azione } from '../src/azioni/tipi';
import { compilaMessaggioTurno } from '../src/narrazione/messaggio';

const NOMI: Record<string, string> = { pg_g: 'Ginestra', pg_c: 'Corrado', pg_a: 'Assenzio', pg_t: 'Teodora' };
function az(id: string, autore: string, testo: string, extra: Partial<Azione> = {}): Azione {
  return { id, autore, testo, privata: false, inviata_alle: 0, modificata_alle: 0, versione_vista: 1, turno: 1, stato: 'chiusa', motivo: null, richiesta: null, pronto: true, dipende_da: [], conflitti: [], revisione: 1, causa: null, ...extra };
}

describe('azioniPerNarratore', () => {
  it('ordine, dipendenze, conflitto esclusivo con vincitore, privata marcata, chi non ha scritto', () => {
    const a1 = az('a1', 'pg_c', 'prendo la chiave a Baldrin', { conflitti: [{ con: 'a3', esclusivo: true, vince: 'a1' }] });
    const a2 = az('a2', 'pg_g', 'lo copro', { dipende_da: ['a1'] });
    const a3 = az('a3', 'pg_a', 'gli sfilo la chiave', { conflitti: [{ con: 'a1', esclusivo: true, vince: 'a1' }], privata: true });
    const fuori = az('a9', 'pg_x', 'azione sospesa', { stato: 'sospesa' });
    const a4 = az('a4', 'pg_t', 'anch’io vado', { dipende_da: ['a9'] });
    const r: RiepilogoChiusura = { turno: 2, azioni: [a1, a2, a3, a4], sospese: [fuori], senzaAzione: ['pg_z'], motivo: 'tutti_pronti', durata_ms: 1, chiusa_a: 0 };
    const tutte = new Map([a1, a2, a3, a4, fuori].map((a) => [a.id, a]));
    const { azioni, collegamenti } = azioniPerNarratore(r, (id) => NOMI[id] ?? 'Zeno', (id) => tutte.get(id));
    expect(azioni.map((a) => [a.numero, a.id_pg])).toEqual([[1, 'pg_c'], [2, 'pg_g'], [3, 'pg_a'], [4, 'pg_t'], [undefined, 'pg_z']]);
    expect(collegamenti).toEqual([
      '[1] Corrado e [3] Assenzio vogliono la stessa cosa: si risolve prima [1] Corrado (ha scritto prima); [3] Assenzio riesce solo se resta possibile.',
      '[2] Ginestra dipende da [1] Corrado: va risolta insieme a quella o dopo.',
      "[4] Teodora dipendeva dall'azione di Zeno, rimasta fuori da questo turno.",
    ]);
    const m = compilaMessaggioTurno({ turno: 2, trascrizione: [], azioni, collegamenti, pgAlTavolo: [] });
    expect(m).toContain('- [1] Corrado (pg_c): prendo la chiave a Baldrin');
    expect(m).toContain('- [3] Assenzio (pg_a): gli sfilo la chiave (azione PRIVATA');
    expect(m).toContain('Le azioni sono in ordine di invio: risolvile in quest’ordine.');
    expect(m).toContain('Collegamenti tra le azioni:\n- [1] Corrado e [3] Assenzio vogliono la stessa cosa');
    expect(m).toContain('- Zeno (pg_z): nessuna azione, aspetta.');
  });
});
