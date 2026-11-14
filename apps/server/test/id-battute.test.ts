/**
 * L7 della prova finale (docs/e2e-finale.md): un id di battuta del repertorio scritto tra parentesi nel
 * testo del narratore non si legge. Si toglie; le direzioni e i suoni di drama-3 restano.
 */
import { describe, expect, it } from 'vitest';
import { togliIdBattute } from '../src/narrazione/id-battute';
import { analizza } from '../src/voce/espressione';

const IDS: ReadonlySet<string> = new Set(['zir_ragazzo_mio', 'bertoldo_confessa']);

describe('togliIdBattute', () => {
  it('toglie l’id scritto tra parentesi, dal testo che arriva alla voce e al tavolo', () => {
    const r = togliIdBattute('Zirrà si gira. [zir_ragazzo_mio] Poi tace.', IDS);
    expect(r).toEqual({ testo: 'Zirrà si gira. Poi tace.', tolti: ['zir_ragazzo_mio'] });
  });

  it('una frase fatta solo dell’id resta vuota (il chiamante la scarta)', () => {
    expect(togliIdBattute('[bertoldo_confessa]', IDS)).toEqual({ testo: '', tolti: ['bertoldo_confessa'] });
  });

  it('le direzioni e i suoni restano: [sigh], [pause], [offesa, ma a voce bassa]', () => {
    const t = '[offesa, ma a voce bassa] Non venni. [sigh] Lo so io. [pause] Via.';
    expect(togliIdBattute(t, IDS)).toEqual({ testo: t, tolti: [] });
    // Anche dopo aver tolto un id, le altre parentesi restano per drama-3.
    const misto = togliIdBattute('[zir_ragazzo_mio] [sigh] Basta.', IDS);
    expect(misto.testo).toBe('[sigh] Basta.');
    expect(analizza(misto.testo).espressivo).toContain('[sigh]');
  });

  it('senza id noti, o senza parentesi, il testo è lo stesso oggetto di prima', () => {
    expect(togliIdBattute('Ciao [zir_ragazzo_mio].', new Set())).toEqual({ testo: 'Ciao [zir_ragazzo_mio].', tolti: [] });
    expect(togliIdBattute('Ciao.', IDS)).toEqual({ testo: 'Ciao.', tolti: [] });
  });

  it('un id ripetuto viene tolto e segnalato ogni volta', () => {
    const r = togliIdBattute('[bertoldo_confessa] Sì. [bertoldo_confessa]', IDS);
    expect(r.tolti).toEqual(['bertoldo_confessa', 'bertoldo_confessa']);
    expect(r.testo).toBe('Sì.');
  });
});
