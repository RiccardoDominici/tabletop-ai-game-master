/**
 * Minions (docs/prove.md §2, «Minions»; C5): nameless foes of a scene with the stat line of their type. An attack on
 * one named by its words («la sentinella») rolls against its sheet, its hit points are kept and saved, it joins the
 * fight; an attack on a creature nobody wrote down is no roll and tells the narrator not to invent an enemy. Invented
 * fixture `prove` (SRD 5.2) with a goblin type in campagna.yaml and two goblins in its scene.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { StatoTavolo } from '@tabletop-ai-gm/shared';
import { caricaCampagna } from '../src/campagna/caricatore';
import { gregariDellaCampagna, tipiGregari } from '../src/campagna/gregari';
import { caricaSchede } from '../src/campagna/schede';
import { loggerMuto } from '../src/logger';
import { DadiACopione } from '../src/prove/dadi';
import { MotoreProve, type AzionePerProve } from '../src/prove/motore';
import { orologioDiSistema } from '../src/turni/orologio';
import { Prova, agisci, attendi, inizia } from './aiuti/partita';

const GOBLIN = {
  tipo: 'goblin',
  nome: 'goblin',
  parole: ['goblin', 'sentinella'],
  scheda: { gs: '1/4', caratteristiche: { forza: 8, destrezza: 14, costituzione: 10, intelligenza: 10, saggezza: 8, carisma: 8 }, competenze: ['furtivita'], armatura: { tipo: 'armatura di cuoio' }, pf: 5, attacchi: [{ nome: 'Scimitarra', caratteristica: 'destrezza', danno: '1d6', tipo_danno: 'tagliente' }] },
};

const az = (id: string, autore: string, testo: string): AzionePerProve => ({ id, autore, testo, privata: false, revisione: 1 });

function conGoblin(prova: Prova, quanti = 2): string {
  return prova.campagna('prove', {
    ritocchi: {
      'campagna.yaml': (d) => {
        d['gregari'] = [GOBLIN];
      },
      'scena.yaml': (d) => {
        d['gregari'] = [{ tipo: 'goblin', quanti }];
      },
    },
  });
}

/** The checks' Engine as the server builds it: the minions' sheets under their ids, the rules arbiter (no model). */
function motore(cartella: string, dadi: number[]): MotoreProve {
  const c = caricaCampagna(cartella);
  const g = gregariDellaCampagna(c);
  const schede = caricaSchede({ pg: c.pg, png: [...c.png, ...g.comePng] });
  const nome = (id: string): string => c.pg.find((p) => p.id === id)?.nome ?? c.png.find((p) => p.id === id)?.nome ?? id;
  return new MotoreProve({
    schede,
    arbitro: null,
    log: loggerMuto(),
    orologio: orologioDiSistema,
    attivo: true,
    conIndizi: false,
    gregari: g.gregari,
    contesto: () => ({ campagna: c, scenaPubblica: '', narrazione: '', versione: 1, pgAlTavolo: ['pg_corrado', 'pg_ida'], nome }),
    dadi: new DadiACopione(dadi),
  });
}

describe('minions from the campaign\'s stat lines', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('each scene\'s minions get an id, a name and their type\'s sheet; an unknown type is logged', () => {
    prova = new Prova();
    const c = caricaCampagna(conGoblin(prova));
    expect(tipiGregari(c).map((t) => t.tipo)).toEqual(['goblin']);
    const g = gregariDellaCampagna(c);
    expect(g.gregari.map((x) => [x.id, x.nome, x.scena])).toEqual([
      ['png_goblin_guado_1', 'goblin 1', 'scena_guado'],
      ['png_goblin_guado_2', 'goblin 2', 'scena_guado'],
    ]);
    expect(caricaSchede({ pg: [], png: g.comePng }).get('png_goblin_guado_1')).toMatchObject({ ca: 13, pf_massimi: 5 });
    const avvisi: string[] = [];
    const altra = { ...c, scene: c.scene.map((s) => ({ ...s, dati: { ...s.dati, gregari: [{ tipo: 'drago' }] } })) };
    expect(gregariDellaCampagna(altra, (m) => avvisi.push(m)).gregari).toEqual([]);
    expect(avvisi.join(' ')).toMatch(/unknown type «drago»/);
  });

  it('«colpisco la sentinella»: an attack on the first goblin standing, against its sheet; the next one after it falls', async () => {
    prova = new Prova();
    // Corrado's crossbow: 20 hits (critical), damage 6+6 drops goblin 1; then a fight starts.
    const m = motore(conGoblin(prova), [20, 6, 6, 10, 10, 10, 10]);
    const d = await m.decidi(3, [az('a1', 'pg_corrado', 'Tiro con la balestra leggera alla sentinella')]);
    expect(d.decisioni.get('a1')).toMatchObject({ tipo: 'attacco', bersaglio: 'png_goblin_guado_1' });
    const e = m.completa(d);
    const carta = e.tiri.find((t) => t.chi === 'pg_corrado')!;
    expect(carta).toMatchObject({ tipo: 'attacco', bersaglio: { id: 'png_goblin_guado_1', nome: 'goblin 1' }, contro: { tipo: 'CA', valore: 13 }, a_terra: true });
    expect(e.fatti.join(' ')).toMatch(/goblin 1/);
    // The fight: goblin 2 is an enemy of the scene and joins it.
    expect(m.vistaCombattimento()!.combattenti.map((x) => x.id)).toContain('png_goblin_guado_2');
    const d2 = await m.decidi(4, [az('a2', 'pg_ida', 'Colpisco il goblin con la spada lunga')]);
    expect(d2.decisioni.get('a2')).toMatchObject({ tipo: 'attacco', bersaglio: 'png_goblin_guado_2' });
    // Saved and resumed: the fallen goblin is still down.
    const altro = motore(conGoblin(prova), [1]);
    altro.importa(JSON.parse(JSON.stringify(m.esporta())));
    expect(altro.stato.aTerra('png_goblin_guado_1')).toBe(true);
  });

  it('an attack on a creature nobody wrote down: no roll, and the narrator is told not to invent one', async () => {
    prova = new Prova();
    // A scene with nobody standing who has stats: no NPC present, no minion.
    const m = motore(prova.campagna('prove', { ritocchi: { 'scena.yaml': (d) => { d['png_presenti'] = []; } } }), [10]);
    const d = await m.decidi(3, [az('a1', 'pg_corrado', 'Tiro con la balestra leggera alla sentinella goblin')]);
    const e = m.completa(d);
    expect(e.tiri).toEqual([]);
    expect(e.fatti.join(' ')).toMatch(/non inventarla/);
  });
});

describe('minions with the whole server', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('the attack card on the projector names the goblin and the narrator hears its fall', async () => {
    prova = new Prova();
    const { url, messaggi } = await prova.avvia(conGoblin(prova, 1), () => '[narratore] La sentinella crolla nel fango.\n[invito] tutti', { TAGM_TIRI_GIOCATORI: 'automatico' }, { dadi: new DadiACopione([20, 6, 6, 10]) });
    const schermo = await prova.proiettore(url);
    const corrado = await prova.telefono(url, 'pg_corrado');
    const s1 = await inizia(schermo, corrado);
    const dopo = attendi(schermo, (x: StatoTavolo) => (x.tiri ?? []).some((t) => t.bersaglio?.nome === 'goblin'));
    await agisci(corrado, 'pg_corrado', 'Tiro con la balestra leggera alla sentinella', s1.versione_scena);
    const st = await dopo;
    expect(st.tiri!.find((t) => t.chi === 'pg_corrado')).toMatchObject({ bersaglio: { id: 'png_goblin_guado_1', nome: 'goblin' }, a_terra: true });
    await attendi(corrado, (x) => x.fase === 'finestra' && x.turno === 2);
    expect(messaggi.at(-1)!).toMatch(/goblin/);
  }, 20_000);
});
