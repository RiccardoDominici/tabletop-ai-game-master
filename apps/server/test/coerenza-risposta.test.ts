/**
 * The Engine's acknowledgement of an action whose answer the checker dropped (coerenza/risposta.ts): who tried and how
 * it went, from the action's own card or, with no card, from the ledger's state of its target. Invented fixture: Ida
 * Marchi (PC), Ruggero the bandit (dead), Bertoldo (fled), Nives (elsewhere), Ugolino (standing).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { confermaDelMotore, type AzioneDaConfermare } from '../src/coerenza/risposta';
import type { EntitaRegistro, Registro } from '../src/coerenza/registro';
import { impostaLingua } from '../src/lingua';

const e = (id: string, nome: string, stato: EntitaRegistro['stato'], presenza: EntitaRegistro['presenza'] = 'in_scena'): EntitaRegistro => ({
  id,
  tipo: id.startsWith('pg_') ? 'pg' : 'png',
  nome,
  nomi: [nome.toLowerCase()],
  stato,
  presenza,
  uscito: null,
});
const registro: Registro = {
  turno: 5,
  scena: 'scena_mulino',
  entita: [e('pg_ida', 'Ida Marchi', 'in_piedi'), e('png_ruggero', 'Ruggero', 'morto'), e('png_bertoldo', 'Bertoldo', 'fuggito'), e('png_nives', 'Nives', 'in_piedi', 'altrove'), e('png_ugolino', 'Ugolino', 'in_piedi')],
  fatti: [],
  esiti: [],
  negati: [],
};
const ida = { id: 'pg_ida', nome: 'Ida Marchi' };
const azione = (decisione: AzioneDaConfermare['decisione'], carte: AzioneDaConfermare['carte'] = []): AzioneDaConfermare => ({ pg: ida, decisione, carte });
const ugolino = { id: 'png_ugolino', nome: 'Ugolino' };

describe('the Engine acknowledges an action whose answer was dropped', () => {
  beforeAll(() => impostaLingua('it'));
  afterAll(() => impostaLingua('it'));

  it('from the card: a blow that landed or missed, a check passed or failed', () => {
    expect(confermaDelMotore(azione({ tipo: 'attacco', bersaglio: 'png_ugolino' }, [{ tipo: 'attacco', riuscita: true, bersaglio: ugolino }]), registro)).toBe('Ida colpisce Ugolino.');
    expect(confermaDelMotore(azione({ tipo: 'attacco', bersaglio: 'png_ugolino' }, [{ tipo: 'attacco', riuscita: false, bersaglio: ugolino }]), registro)).toBe('Ida manca Ugolino.');
    expect(confermaDelMotore(azione({ tipo: 'prova', bersaglio: null }, [{ tipo: 'prova', riuscita: true, bersaglio: null }]), registro)).toBe('Ida ci riesce.');
    expect(confermaDelMotore(azione({ tipo: 'prova', bersaglio: null }, [{ tipo: 'prova', riuscita: false, bersaglio: null }]), registro)).toBe('Ida ci prova, ma non ci riesce.');
  });

  it('with no card: the target fell before, fled, or is elsewhere; an impossible action; nothing known', () => {
    expect(confermaDelMotore(azione({ tipo: 'attacco', bersaglio: 'png_ruggero' }), registro)).toBe('Ida ci prova, ma Ruggero non si muove più.');
    expect(confermaDelMotore(azione({ tipo: 'attacco', bersaglio: 'png_bertoldo' }), registro)).toBe('Ida ci prova, ma Bertoldo non è più qui.');
    expect(confermaDelMotore(azione({ tipo: 'nessuna', bersaglio: 'png_nives' }), registro)).toBe('Ida ci prova, ma Nives non è più qui.');
    expect(confermaDelMotore(azione({ tipo: 'impossibile', bersaglio: null }), registro)).toBe('Ida ci prova, ma così non si può.');
    // A standing target and no card (an action with no roll): nothing more than who tried.
    expect(confermaDelMotore(azione({ tipo: 'nessuna', bersaglio: 'png_ugolino' }), registro)).toBe('Ida ci prova.');
    expect(confermaDelMotore(azione(null), registro)).toBe('Ida ci prova.');
  });

  it('in English, from the same data', () => {
    impostaLingua('en');
    expect(confermaDelMotore(azione({ tipo: 'attacco', bersaglio: 'png_ruggero' }), registro)).toBe('Ida tries, but Ruggero no longer moves.');
    expect(confermaDelMotore(azione({ tipo: 'attacco', bersaglio: 'png_ugolino' }, [{ tipo: 'attacco', riuscita: true, bersaglio: ugolino }]), registro)).toBe('Ida hits Ugolino.');
    impostaLingua('it');
  });
});
