/**
 * Wandering monster checks on the game clock (docs/prove.md §14; docs/regole.md §2 «Esplorazione»; audit P8-01 to P8-03):
 * the set's environments and encounter tables as data, a check every few turns while a scene explores, the table's roll,
 * the nested roll and how many, surprise in advance in the wilderness, a long advance that stops at the first encounter,
 * a check deferred by a fight, the panel's next check, the snapshot. On the invented cunicolo fixture.
 */
import { describe, expect, it } from 'vitest';
import { fattiDovuti, rigaDovuta } from '../src/prove/fatti-dovuti';
import { caricaRegole } from '../src/regole/caricatore';
import { doveDellaScena, leggiEsplorazione, leggiIncontri } from '../src/regole/esplorazione';
import { leggiTempo } from '../src/regole/tempo';
import { azione, CUNICOLO, motoreCunicolo as motore } from './aiuti/cunicolo';

describe('exploration as rule-set data', () => {
  const tempo = leggiTempo({ unita: [{ id: 'round', secondi: 10 }, { id: 'turno', secondi: 600 }, { id: 'ora', secondi: 3600 }], round: 'round' }, [])!;

  it('an environment: a check every so long with its odds, the table by level, surprise in advance', () => {
    const errori: string[] = [];
    const e = leggiEsplorazione({ ambienti: [{ id: 'sotto', nome: 'Sotto', controllo: { ogni: { turno: 3 }, dado: 6, fino_a: 1 }, tabelle: [{ da: 1, tabella: 't1' }, { da: 4, tabella: 't4' }] }, { id: 'fuori', controllo: { ogni: { ora: 4 }, dado: 6, fino_a: 1 }, sorpresa_prima: { dado: 6, fino_a: 2, imboscata: 4 } }] }, tempo, errori);
    expect(errori).toEqual([]);
    expect(e!.ambienti[0]).toMatchObject({ controllo: { ogni: 1800, dado: 6, finoA: 1 }, tabelle: [{ da: 1, tabella: 't1' }, { da: 4, tabella: 't4' }], sorpresaPrima: null });
    expect(e!.ambienti[1]!.sorpresaPrima).toEqual({ dado: 6, finoA: 2, imboscata: 4 });
    const t = leggiIncontri([{ v: [{ id: 't1', dadi: '1d4', voci: [{ tiro: [1, 2], mostro: 'm' }, { tiro: 3, gruppo: 'Viandanti' }, { tiro: 4, scelta: { dadi: '1d2', voci: [{ tiro: 1, mostro: 'm' }, { tiro: 2, mostro: 'm', numero: '2d4' }] } }] }, { id: 't4', dadi: '1d2', voci: [{ tiro: [1, 2], mostro: 'm' }] }], dove: 'incontri' }], new Set(['m']), errori);
    expect(errori).toEqual([]);
    // The scene's level picks the row; a level below the first takes the first; the scene may name its table.
    expect(doveDellaScena({ esplorazione: e, incontri: t }, { ambiente: 'sotto', livello: 5 })!.tabella!.id).toBe('t4');
    expect(doveDellaScena({ esplorazione: e, incontri: t }, { ambiente: 'sotto', livello: 3 })!.tabella!.id).toBe('t1');
    expect(doveDellaScena({ esplorazione: e, incontri: t }, { ambiente: 'sotto', tabella: 't4' })!.tabella!.id).toBe('t4');
    expect(doveDellaScena({ esplorazione: e, incontri: t }, undefined)).toBeNull();
  });

  it('refused: a roll with no entry, two kinds in one entry, a creature the bestiary lacks, a check off the clock', () => {
    const errori: string[] = [];
    leggiIncontri([{ v: [{ id: 'buca', dadi: '1d4', voci: [{ tiro: 1, mostro: 'm' }, { tiro: 2, mostro: 'm', gruppo: 'x' }, { tiro: 3, mostro: 'drago' }] }], dove: 'incontri' }], new Set(['m']), errori);
    expect(errori.join('\n')).toMatch(/exactly one of mostro, gruppo, scelta/);
    expect(errori.join('\n')).toMatch(/«drago» is not an entry of the set's bestiary/);
    expect(errori.join('\n')).toMatch(/no entry for the rolls 4 of 1d4/);
    const e2: string[] = [];
    leggiEsplorazione({ ambienti: [{ id: 'sotto', controllo: { ogni: { secolo: 1 }, dado: 6, fino_a: 7 } }] }, tempo, e2);
    expect(e2.join('\n')).toMatch(/fino_a: the highest face/);
  });

  it('the fixture loads: its environments, its tables, every creature in its bestiary', () => {
    const r = caricaRegole(CUNICOLO);
    expect(r.sistema.esplorazione!.ambienti.map((a) => a.id)).toEqual(['sotterraneo', 'selvaggio', 'villaggio']);
    expect(r.sistema.incontri!.map((t) => t.id)).toEqual(['galleria_1', 'galleria_2', 'bosco']);
  });
});

describe('wandering monster checks on the clock', () => {
  it('underground every two turns: the first check misses, the second finds goblins; the card is the Game Master’s, hidden', async () => {
    // d6: the checks (4: none, 2: an encounter), then the table (3: goblins); the 2d4 of how many: 2 + 3.
    const { m } = motore({ 6: [4, 2, 3], 4: [2, 3] });
    expect(m.vistaTempo()!.incontri).toMatchObject({ ambiente: 'Sotterraneo', tabella: 'Galleria, primo livello', prossimo: '2 turni', ogni: '2 turni', probabilita: '2 su 1d6' });
    await m.risolvi(1, [azione('pg_aldo', 'Avanzo nel buio')]);
    expect(m.vistaTempo()!.incontri!.prossimo).toBe('1 turno');
    const r2 = await m.risolvi(2, [azione('pg_aldo', 'Avanzo nel buio')]);
    const carta = r2.tiri.find((t) => t.del_master)!;
    expect(carta).toMatchObject({ etichetta: 'Mostri erranti (Sotterraneo)', dadi: [4], riuscita: false, nascosta: true });
    expect(r2.fatti.join(' ')).not.toMatch(/Mostri erranti/);
    await m.risolvi(3, [azione('pg_aldo', 'Avanzo nel buio')]);
    const r4 = await m.risolvi(4, [azione('pg_aldo', 'Avanzo nel buio')]);
    expect(r4.fatti.join(' ')).toMatch(/Mostri erranti \(tiro del master\): arrivano 5 creature, goblin\./);
    expect(r4.tiri.filter((t) => t.del_master).map((t) => [t.etichetta, t.totale])).toEqual([
      ['Mostri erranti (Sotterraneo)', 2],
      ['Tabella degli incontri', 3],
      ['Quanti', 5],
    ]);
    expect(r4.incontri).toEqual([{ id: 'png_goblin_inc1_1', nome: 'Goblin', quanti: 5 }]);
    const dovuti = fattiDovuti(r4.tiri, [], [], [], r4.incontri);
    expect(dovuti).toEqual([{ tipo: 'incontro', id: 'png_goblin_inc1_1', nome: 'Goblin', quanti: 5 }]);
    // Untold by the narration, the Engine's line says how many arrive.
    expect(rigaDovuta(dovuti[0]!)).toBe('Arrivano in 5: Goblin.');
    expect(m.vistaTempo()!.incontri!.ultimo!.testo).toMatch(/arrivano 5 creature, goblin/);
  });

  it('a nested roll picks the variant; a group without a stat block is the Game Master’s to build', async () => {
    const { m } = motore({ 6: [1, 5, 6] }); // check 1, table 5 (rat or goblin), nested 6: one goblin
    await m.risolvi(1, [azione('pg_aldo', 'Avanzo')]);
    const r = await m.risolvi(2, [azione('pg_aldo', 'Avanzo')]);
    expect(r.fatti.join(' ')).toMatch(/arriva goblin\./);
    const g = motore({ 6: [1, 4], 4: [3] }); // table 4: other adventurers, 1d4 = 3
    await g.m.risolvi(1, [azione('pg_aldo', 'Avanzo')]);
    const r2 = await g.m.risolvi(2, [azione('pg_aldo', 'Avanzo')]);
    expect(r2.fatti.join(' ')).toMatch(/Un incontro \(tiro del master\): Altri avventurieri \(3\); il master lo prepara\./);
  });

  it('a scene that explores nothing has no checks; going back underground counts from the moment of arrival', async () => {
    const { m, vai } = motore({ 6: [1, 1] }, 'scena_locanda');
    for (let k = 1; k <= 3; k++) await m.risolvi(k, [azione('pg_aldo', 'Bevo')]);
    expect(m.vistaTempo()!.incontri).toBeUndefined();
    vai('scena_galleria');
    const r = await m.risolvi(4, [azione('pg_aldo', 'Scendo')]);
    expect(r.tiri.filter((t) => t.del_master)).toEqual([]);
  });

  it('a check due during a fight waits for its end, then is rolled', async () => {
    const { m } = motore({ 6: [6], 20: [10] });
    await m.risolvi(1, [azione('pg_aldo', 'Avanzo')]);
    m.iniziaCombattimento();
    m.tempoDelMaster({ cosa: 'avanza', durata: { turno: 1 } }); // refused in a fight
    expect(m.vistaTempo()!.incontri!.prossimo).toBe('1 turno');
    m.terminaCombattimento();
    const r = await m.risolvi(5, [azione('pg_aldo', 'Avanzo')]);
    expect(r.tiri.filter((t) => t.del_master)).toHaveLength(1);
  });

  it('a long advance in the woods rolls each check in order and stops at the first encounter, saying when', () => {
    // Every three hours: 9 hours = checks at 3h (6: none) and 6h (1: wolves); the 9h check is not rolled.
    // The woods' table 1d4 = 1 (wolves), how many 1d4 = 2, surprise in advance 1d6 = 5: not surprised, an ambush.
    const { m } = motore({ 6: [6, 1, 5], 4: [1, 2] }, 'scena_bosco');
    const e = m.tempoDelMaster({ cosa: 'avanza', durata: { ora: 9 } })!;
    // The public line says the time; who arrives (and the ambush) is the narrator's, in the next turn.
    expect(e.fatto).toMatch(/^Tempo trascorso: 9 ore; ora è giorno 2, 03:00\./);
    expect(e.fatto).not.toMatch(/lupo/);
    expect(m.esporta().fatti_in_sospeso!.join(' ')).toMatch(/arrivano 2 creature, lupo\. Succede verso giorno 2, 00:00\. Si sono accorti del gruppo per primi e hanno teso un agguato\./);
    // The next check counts from the encounter: three hours after it, which is now (rolled at the next advance).
    expect(m.vistaTempo()!.incontri!.prossimo).toBe('adesso');
    expect(m.tiriDelMaster().filter((t) => t.del_master).map((t) => t.etichetta)).toEqual(['Mostri erranti (Terre selvagge)', 'Mostri erranti (Terre selvagge)', 'Tabella degli incontri', 'Quanti', 'Sorpresa, in anticipo']);
  });

  it('surprised in advance: the party may avoid them', async () => {
    // d6: the check (1), how many rats (1d6 = 4), their surprise (2: surprised); d4: the table (3: rats).
    const { m } = motore({ 6: [1, 4, 2], 4: [3] }, 'scena_bosco');
    m.tempoDelMaster({ cosa: 'avanza', durata: { ora: 3 } });
    // The check falls at the end of the advance: no «when» to say. The narrator hears it in the next turn.
    const r = await m.risolvi(1, [azione('pg_aldo', 'Ascolto')]);
    expect(r.fatti.join(' ')).toMatch(/arrivano 4 creature, ratto gigante\. Non si sono accorti del gruppo: i personaggi possono evitarli\./);
  });

  it('the schedule and the last encounter survive a resume; «Ricomincia» clears them', async () => {
    const { m } = motore({ 6: [1, 3], 4: [1, 1] });
    await m.risolvi(1, [azione('pg_aldo', 'Avanzo')]);
    await m.risolvi(2, [azione('pg_aldo', 'Avanzo')]);
    const s = JSON.parse(JSON.stringify(m.esporta()));
    const { m: r } = motore({ 6: [6] });
    r.importa(s);
    expect(r.vistaTempo()!.incontri).toMatchObject({ prossimo: '2 turni', ultimo: { testo: expect.stringMatching(/goblin/) } });
    r.azzera();
    expect(r.vistaTempo()!.incontri!.ultimo).toBeUndefined();
  });
});

describe('the creatures of an encounter join the scene', () => {
  it('one sheet each from the bestiary, numbered, their hit points rolled; an attack names one and opens the fight', async () => {
    // d6: check 2 (encounter), table 3 (goblins); 2d4 = 1 + 1: two goblins.
    const { m } = motore({ 6: [2, 3], 4: [1, 1], 20: [15], 8: [6] });
    await m.risolvi(1, [azione('pg_aldo', 'Avanzo')]);
    const r = await m.risolvi(2, [azione('pg_aldo', 'Avanzo')]);
    expect(r.incontri).toEqual([{ id: 'png_goblin_inc1_1', nome: 'Goblin', quanti: 2 }]);
    expect(m.gregariDellaScena().map((g) => [g.id, g.nome])).toEqual([
      ['png_goblin_inc1_1', 'Goblin 1'],
      ['png_goblin_inc1_2', 'Goblin 2'],
    ]);
    // «1-1» hit dice: a d8 − 1, rolled from the session seed and the creature's id (the same on every resume).
    const pf = m.stato.puntiFerita('png_goblin_inc1_1')!;
    expect(pf.massimi).toBeGreaterThanOrEqual(1);
    const a = await m.risolvi(3, [azione('pg_aldo', 'Attacco il goblin con la spada')]);
    expect(a.tiri.find((t) => t.tipo === 'attacco')).toMatchObject({ chi: 'pg_aldo', bersaglio: { id: 'png_goblin_inc1_1' } });
    expect(m.combattimento.attivo).toBe(true);
    expect(m.combattimento.partecipanti('png').sort()).toEqual(['png_goblin_inc1_1', 'png_goblin_inc1_2']);
  });

  it('a resume rebuilds them with the same ids and maxima, wounds kept; «Ricomincia» sends them away', async () => {
    const { m } = motore({ 6: [2, 6], 8: [5] }); // check 2, table 6: one wolf
    await m.risolvi(1, [azione('pg_aldo', 'Avanzo')]);
    await m.risolvi(2, [azione('pg_aldo', 'Avanzo')]);
    const max = m.stato.puntiFerita('png_lupo_inc1_1')!.massimi;
    m.stato.danneggia('png_lupo_inc1_1', 1);
    const s = JSON.parse(JSON.stringify(m.esporta()));
    const { m: r } = motore({ 6: [6] });
    r.importa(s);
    expect(r.gregariDellaScena().map((g) => g.id)).toEqual(['png_lupo_inc1_1']);
    expect(r.stato.puntiFerita('png_lupo_inc1_1')).toEqual({ attuali: max - 1, massimi: max });
    r.azzera();
    expect(r.gregariDellaScena()).toEqual([]);
    expect(r.stato.puntiFerita('png_lupo_inc1_1')).toBeNull();
  });

  it('the Game Master rolls an encounter from the panel: a table named, or the scene’s; not during a fight', () => {
    const { m } = motore({ 4: [2, 3], 6: [5] }, 'scena_locanda');
    expect(m.incontroDelMaster({})).toEqual({ ok: false, motivo: 'senza_tabella' });
    const e = m.incontroDelMaster({ tabella: 'bosco' });
    expect(e).toMatchObject({ ok: true, fatto: expect.stringMatching(/arrivano 5 creature, goblin/) });
    expect(m.gregariDellaScena()).toHaveLength(5);
    expect(m.tiriDelMaster().filter((t) => t.del_master).map((t) => t.etichetta)).toEqual(['Tabella degli incontri', 'Quanti', 'Sorpresa, in anticipo']);
    m.iniziaCombattimento();
    expect(m.incontroDelMaster({ tabella: 'bosco' })).toEqual({ ok: false, motivo: 'combattimento' });
  });
});

describe('where the wandering creatures go, and who sees the checks', () => {
  it('the party leaves the scene: its wandering creatures stay behind (no longer in its fights or the ledger)', async () => {
    const { m, vai } = motore({ 6: [2, 3], 4: [1, 1] });
    await m.risolvi(1, [azione('pg_aldo', 'Avanzo')]);
    await m.risolvi(2, [azione('pg_aldo', 'Avanzo')]);
    expect(m.gregariDellaScena()).toHaveLength(2);
    vai('scena_bosco');
    m.fineScena();
    vai('scena_galleria');
    expect(m.gregariDellaScena()).toEqual([]);
    expect(m.stato.puntiFerita('png_goblin_inc1_1')).toBeNull();
    expect(m.esporta().vaganti).toBeUndefined();
  });

  it('«Se ne vanno»: the scene\'s wandering creatures still standing leave; refused with none', () => {
    const { m } = motore({ 4: [2, 1], 6: [2, 5] }, 'scena_bosco'); // the woods' table: 2 goblins, 1d6 = 2
    m.incontroDelMaster({ tabella: 'bosco' });
    expect(m.vistaTempo()!.incontri!.ultimo!.in_scena).toBe(2);
    // A second encounter in the same scene (1d4 = 1: wolves, 1d4 = 2 of them): «Se ne vanno» sends off both.
    m.incontroDelMaster({ tabella: 'bosco' });
    expect(m.vistaTempo()!.incontri!.ultimo!.in_scena).toBe(4);
    expect(m.vagantiVia()).toEqual({ ok: true, fatto: 'Se ne vanno per la loro strada: Goblin 1, Goblin 2, Lupo 1, Lupo 2.' });
    expect(m.gregariDellaScena()).toEqual([]);
    expect(m.vistaTempo()!.incontri!.ultimo!.in_scena).toBe(0);
    expect(m.vagantiVia()).toEqual({ ok: false });
  });

  it('`a_volte` shows a check by its odds before the dice (2 in 6 underground: shown; 1 in 6 outdoors: hidden), never by the roll', async () => {
    const sotto = motore({ 6: [6] }, 'scena_galleria', { tiriMaster: 'a_volte' }).m;
    await sotto.risolvi(1, [azione('pg_aldo', 'Avanzo')]);
    const r = await sotto.risolvi(2, [azione('pg_aldo', 'Avanzo')]);
    expect(r.tiri.find((t) => t.del_master)).toMatchObject({ dadi: [6], riuscita: false });
    expect(r.tiri.find((t) => t.del_master)!.nascosta).toBeUndefined();
    const fuori = motore({ 6: [6] }, 'scena_bosco', { tiriMaster: 'a_volte' }).m;
    fuori.tempoDelMaster({ cosa: 'avanza', durata: { ora: 3 } });
    expect(fuori.tiriDelMaster().find((t) => t.del_master)!.nascosta).toBe(true);
  });
});

describe('a scene change in the middle of a fight with wandering creatures', () => {
  it('those fighting follow the party into the new scene and the fight goes on; after it they stay there until the next change', async () => {
    const { m, vai } = motore({ 6: [2, 3], 4: [1, 1], 20: [15, 15, 15, 15, 15, 15], 8: [6, 6, 6, 6] });
    await m.risolvi(1, [azione('pg_aldo', 'Avanzo')]);
    await m.risolvi(2, [azione('pg_aldo', 'Avanzo')]);
    await m.risolvi(3, [azione('pg_aldo', 'Attacco il goblin con la spada')]);
    expect(m.combattimento.attivo).toBe(true);
    vai('scena_bosco');
    m.fineScena();
    // In the new scene, with their sheets: the next round resolves with them.
    expect(m.gregariDellaScena().map((g) => g.id).sort()).toEqual(['png_goblin_inc1_1', 'png_goblin_inc1_2']);
    const r = await m.risolvi(4, [azione('pg_aldo', 'Attacco il goblin con la spada')]);
    expect(r.tiri.find((t) => t.tipo === 'attacco' && t.chi === 'pg_aldo')).toMatchObject({ bersaglio: { id: expect.stringMatching(/^png_goblin_inc1_/) } });
    expect(m.stato.puntiFerita('png_goblin_inc1_2')).not.toBeNull();
    // A resume keeps them in the scene they followed the party to.
    expect(m.esporta().vaganti!.every((v: { scena: string }) => v.scena === 'scena_bosco')).toBe(true);
    // The fight ends; the next scene change leaves them behind.
    m.terminaCombattimento();
    vai('scena_galleria');
    m.fineScena();
    expect(m.gregariDellaScena()).toEqual([]);
    expect(m.esporta().vaganti).toBeUndefined();
  });
});
