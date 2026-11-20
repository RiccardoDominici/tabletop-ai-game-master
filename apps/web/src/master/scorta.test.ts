/** The gear control's commands (master/ScortaMaster.tsx): what each action sends to the server. */
import { describe, expect, it } from 'vitest';
import { comandoScorta } from './ScortaMaster';

describe('comandoScorta', () => {
  it('buy with a typed price, give, take (negative), put on, light', () => {
    expect(comandoScorta('pg_a', 'compra', 'corda', 2, ' 2 mo 5 ma ')).toEqual({ tipo: 'inventario', id: 'pg_a', cosa: 'compra', oggetto: 'corda', quante: 2, prezzo: '2 mo 5 ma' });
    expect(comandoScorta('pg_a', 'dai', 'torcia', 1, '')).toEqual({ tipo: 'inventario', id: 'pg_a', cosa: 'oggetto', oggetto: 'torcia' });
    expect(comandoScorta('pg_a', 'togli_oggetto', 'freccia', 5, '')).toEqual({ tipo: 'inventario', id: 'pg_a', cosa: 'oggetto', oggetto: 'freccia', quante: -5 });
    expect(comandoScorta('pg_a', 'indossa', 'maglia', 1, '9 mo')).toEqual({ tipo: 'inventario', id: 'pg_a', cosa: 'indossa', oggetto: 'maglia' });
    expect(comandoScorta('pg_a', 'accendi', 'torcia', 1, '')).toEqual({ tipo: 'tempo', cosa: 'accendi', id: 'pg_a', oggetto: 'torcia' });
  });
});
