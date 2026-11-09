/**
 * Il selettore che non trova le battute (playtest di nozze-neve, conclusioni §4: 115 battute su 139 mai
 * uscite, indizi chiesti dai giocatori e non arrivati, tre battute giuste rifiutate per il «> pg»
 * dimenticato). Il Motore aiuta in modo deterministico:
 * - preselezione: per ogni azione, le battute del catalogo i cui temi QUELL'azione tocca, con la voce
 *   giusta (il narratore o un PNG nominato), in testa al catalogo e in una sezione loro;
 * - «> pg» dedotto quando una sola azione può essere quella giusta;
 * - un «> pg» sbagliato si corregge una volta, con la stessa regola.
 */
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { conScena } from '../src/campagna/tipi';
import { RADICE_REPO } from '../src/percorsi';
import { caricaRepertorio } from '../src/repertorio/caricatore';
import { nomiDeiPng } from '../src/repertorio/pertinenza';
import { StatoRepertorio } from '../src/repertorio/stato';
import { StatoOrologi } from '../src/scena/orologi';
import { inizia, Prova, turno } from './aiuti/partita';

describe('preselezione per temi (nozze-neve)', () => {
  const c0 = caricaCampagna(path.join(RADICE_REPO, 'campagne', 'nozze-neve'));
  const nomi = nomiDeiPng(c0);
  /** Catalogo e battute indicate di un turno nella scena `scena`, con queste azioni pubbliche. */
  const indicate = (scena: string, azioni: Array<[string, string]>) => {
    const c = conScena(c0, scena);
    const orologi = new StatoOrologi(c);
    const s = new StatoRepertorio(caricaRepertorio(c), c, orologi);
    const az = azioni.map(([autore, testo]) => ({ autore, testo, privata: false }));
    const { battute } = s.catalogo({ turno: 1, azioni: az, stallo: false, dovuti: new Set(), nomiPng: nomi, parole: [] });
    return Object.fromEntries(s.indicatePerAzioni(battute, az, nomi).map((x) => [x.autore, x.ids]));
  };

  it('le azioni del playtest che chiedevano un indizio ricevono la battuta giusta', () => {
    expect(indicate('scena_casa_bonfanti', [['pg_livia', 'agnese, la nonna ha l\'anello al dito o nella tasca? me lo dici con la testa, sì o no']])).toEqual({ pg_livia: ['nar_sposa_mima'] });
    expect(indicate('scena_casa_bonfanti', [['pg_vanda', 'gaspare, il tuo fiato ha odore di vino e di paura. cosa hai nascosto nel cassetto?']])['pg_vanda']).toContain('nar_scrittoio_cassetto');
  });

  it('niente voce sbagliata, niente transizioni: una domanda a Zelia non riceve la bugia di Gaspare', () => {
    expect(indicate('scena_casera', [['pg_livia', 'zelia, dove sei stata tra le undici e mezzogiorno? guardami in faccia mentre rispondi']])).toEqual({});
    expect(indicate('scena_casa_bonfanti', [['pg_vanda', 'ferma! io salgo, le mule sulle scale non ci vanno']])).toEqual({});
  });
});

// ---------------------------------------------------------------------------------------------
// Col server: il «> pg» dedotto e quello corretto (mini: pg_anna, pg_bruno; nar_brocca ha i temi banco, brocca).

let prova: Prova;
afterEach(async () => prova?.chiudi());

async function partita(copione: (turno: number) => string) {
  prova = new Prova();
  const { url, messaggi } = await prova.avvia(prova.campagna('mini'), copione);
  const schermo = await prova.proiettore(url);
  const tel = await prova.telefono(url, 'pg_anna');
  return { tel, messaggi, s: await inizia(schermo, tel) };
}

describe('«> pg» dedotto o corretto dal Motore', () => {
  it('senza «> pg», una sola azione adatta: la battuta esce per quella azione, senza riparazione', async () => {
    const { tel, s, messaggi } = await partita(() => '[narratore] Anna si china.\n[usa] nar_brocca\n[invito] tutti');
    await turno(tel, 'pg_anna', s, 'Guardo dietro il banco.');
    // La preselezione l'aveva indicata, col «> pg» già scritto.
    expect(messaggi[0]).toContain('[usa] nar_brocca > pg_anna');
    const n = prova.narrazioni().find((r) => r['tipo'] === 'turno' && r['turno'] === 1)!;
    expect((n['uscita'] as Array<{ tipo: string; id?: string; per?: string | null }>).find((u) => u.id === 'nar_brocca')).toMatchObject({ tipo: 'usa', per: 'pg_anna' });
    expect(n).toMatchObject({ usa_rifiutati: 0, riparazioni: 0, pg_dedotti: 1, battute_indicate: 1, battute_indicate_usate: 1 });
  }, 20_000);

  it('«> pg» di chi non ha agito: il Motore lo corregge verso l’unica azione adatta', async () => {
    const { tel, s } = await partita(() => '[usa] nar_brocca > pg_bruno\n[narratore] Anna, cosa fai?\n[invito] tutti');
    await turno(tel, 'pg_anna', s, 'Guardo dietro il banco.');
    const n = prova.narrazioni().find((r) => r['tipo'] === 'turno' && r['turno'] === 1)!;
    expect((n['uscita'] as Array<{ tipo: string; id?: string; per?: string | null }>).find((u) => u.id === 'nar_brocca')).toMatchObject({ tipo: 'usa', per: 'pg_anna' });
    expect(n).toMatchObject({ usa_rifiutati: 0, pg_dedotti: 1 });
  }, 20_000);
});
