/**
 * Prove e dadi, la parte pura (docs/prove.md): modificatori e bonus di competenza dell'SRD 5.2,
 * CA dalle armature, formule dei dadi, dadi crittografici riproducibili, prove con vantaggio e
 * svantaggio, attacchi con critico e 1 naturale, danni, punti ferita.
 */
import { describe, expect, it } from 'vitest';
import { bonusCompetenza, classeArmatura, comeAbilita, comeArmatura, comeCaratteristica, leggiFormula, modificatore, scriviFormula } from '../src/campagna/regole-srd';
import { bonusAttacco, bonusDanno, caricaSchede, cdInfluenza, leggiScheda, modAbilita, modSalvezza, passiva } from '../src/campagna/schede';
import { DadiACopione, DadiCrittografici } from '../src/prove/dadi';
import { attacco, combinaVantaggi, contesa, danno, prova, tiraD20 } from '../src/prove/regole';
import { StatoProve } from '../src/prove/stato';

describe('SRD 5.2: modificatori, competenza, armature, formule', () => {
  it('modificatore = (punteggio − 10) / 2 per difetto, su tutta la tabella', () => {
    const attesi: Array<[number, number]> = [[1, -5], [2, -4], [3, -4], [8, -1], [9, -1], [10, 0], [11, 0], [12, 1], [15, 2], [18, 4], [19, 4], [20, 5], [30, 10]];
    for (const [p, m] of attesi) expect(modificatore(p), `punteggio ${p}`).toBe(m);
  });

  it('bonus di competenza per livello: +2 fino al 4, +3 dal 5, +6 dal 17', () => {
    expect([1, 4, 5, 8, 9, 12, 13, 16, 17, 20].map(bonusCompetenza)).toEqual([2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);
    expect(bonusCompetenza(0.25)).toBe(2); // grado di sfida 1/4
  });

  it('nomi italiani, abbreviazioni e inglese dell’SRD', () => {
    expect(comeCaratteristica('Des')).toBe('destrezza');
    expect(comeCaratteristica('CHA')).toBe('carisma');
    expect(comeAbilita('Rapidità di mano')).toBe('rapidita_di_mano');
    expect(comeAbilita('Furtività')).toBe('furtivita');
    expect(comeAbilita('sleight of hand')).toBe('rapidita_di_mano');
    expect(comeAbilita('volare')).toBeNull();
  });

  it('CA: armature leggere con tutta la Destrezza, medie al massimo +2, pesanti senza; scudo +2', () => {
    expect(classeArmatura(3, comeArmatura('armatura di cuoio'), false)).toBe(14);
    expect(classeArmatura(3, comeArmatura('giaco di maglia'), false)).toBe(15);
    expect(classeArmatura(3, comeArmatura('cotta di maglia'), true)).toBe(18);
    expect(classeArmatura(-1, null, false)).toBe(9);
  });

  it('formule dei dadi', () => {
    expect(leggiFormula('1d8')).toEqual({ numero: 1, facce: 8, bonus: 0 });
    expect(leggiFormula('2d6+3')).toEqual({ numero: 2, facce: 6, bonus: 3 });
    expect(leggiFormula('d4-1')).toEqual({ numero: 1, facce: 4, bonus: -1 });
    expect(leggiFormula('1d7')).toBeNull();
    expect(scriviFormula({ numero: 2, facce: 8, bonus: 2 })).toBe('2d8+2');
  });
});

describe('schede numeriche: i modificatori li calcola il codice', () => {
  const corrado = leggiScheda('pg_corrado', 'Corrado', false, {
    caratteristiche: { for: 16, des: 14, cos: 14, int: 10, sag: 12, car: 8 },
    competenze: ['atletica', 'percezione', 'Intimidire'],
    tiri_salvezza: ['forza', 'costituzione'],
    armatura: { tipo: 'giaco di maglia', scudo: true },
    pf: 12,
    attacchi: [
      { nome: 'Balestra leggera', caratteristica: 'destrezza', danno: '1d8', tipo_danno: 'perforante', distanza: true },
      { nome: 'Spada lunga', danno: '1d8', tipo_danno: 'tagliente' },
    ],
  }, 3)!;

  it('abilità, salvezze, passivi, attacchi e danni', () => {
    expect(corrado.livello).toBe(3);
    expect(modAbilita(corrado, 'atletica')).toBe(3 + 2);
    expect(modAbilita(corrado, 'persuasione')).toBe(-1);
    expect(modSalvezza(corrado, 'forza')).toBe(5);
    expect(modSalvezza(corrado, 'destrezza')).toBe(2);
    expect(passiva(corrado, 'percezione')).toBe(10 + 1 + 2);
    expect(corrado.ca).toBe(13 + 2 + 2);
    expect(bonusAttacco(corrado, corrado.attacchi[0]!)).toBe(2 + 2);
    expect(bonusDanno(corrado, corrado.attacchi[0]!)).toBe(2);
    // Senza caratteristica: da mischia vale la Forza.
    expect(corrado.attacchi[1]!.caratteristica).toBe('forza');
    expect(bonusAttacco(corrado, corrado.attacchi[1]!)).toBe(3 + 2);
    expect(corrado.avvisi).toEqual([]);
  });

  it('CD per influenzare un PNG: 15 o la sua Intelligenza; quella della scheda vince', () => {
    const saggio = leggiScheda('png_m', 'Mago', true, { caratteristiche: { int: 18 }, pf: 9 }, null)!;
    expect(cdInfluenza(saggio)).toBe(18);
    const oste = leggiScheda('png_o', 'Oste', true, { caratteristiche: { int: 10 }, pf: 9, influenza: { cd: 12 } }, null)!;
    expect(cdInfluenza(oste)).toBe(12);
    expect(cdInfluenza(null)).toBe(15);
  });

  it('una scheda sbagliata non ferma niente: valori di riserva e avvisi', () => {
    const s = leggiScheda('pg_x', 'X', false, { caratteristiche: { forza: 40, magia: 3 }, armatura: 'mithril', ca: 13, competenze: ['volare'] }, null)!;
    expect(s.punteggi.forza).toBe(10);
    expect(s.pf_massimi).toBe(1);
    expect(s.ca).toBe(13);
    expect(s.avvisi.join('\n')).toMatch(/forza: punteggio da 1 a 30/);
    expect(s.avvisi.join('\n')).toMatch(/mithril/);
    expect(s.avvisi.join('\n')).toMatch(/volare/);
  });

  it('una CA scritta diversa da quella dell’armatura: vale la calcolata, con un avviso', () => {
    const s = leggiScheda('pg_y', 'Y', false, { caratteristiche: { des: 12 }, armatura: 'cuoio', ca: 16, pf: 8 }, 1)!;
    expect(s.ca).toBe(12);
    expect(s.avvisi.join(' ')).toMatch(/ca 16 diversa/);
  });

  it('campagna senza schede: mappa vuota (la sessione gioca senza dadi)', () => {
    const vuota = caricaSchede({ pg: [{ id: 'pg_a', nome: 'A', descrizione: '', pubblico: { livello: 1 }, privato: [] }], png: [] });
    expect(vuota.size).toBe(0);
  });
});

describe('dadi crittografici riproducibili', () => {
  it('stesso seme, stessa sequenza; seme diverso, sequenza diversa', () => {
    const a = new DadiCrittografici('00112233445566778899aabbccddeeff');
    const b = new DadiCrittografici('00112233445566778899aabbccddeeff');
    const c = new DadiCrittografici('ffeeddccbbaa99887766554433221100');
    const sa = Array.from({ length: 30 }, () => a.tira(20));
    expect(Array.from({ length: 30 }, () => b.tira(20))).toEqual(sa);
    expect(Array.from({ length: 30 }, () => c.tira(20))).not.toEqual(sa);
    expect(a.contatore).toBe(30);
  });

  it('si riprende dal contatore salvato', () => {
    const seme = 'abcdef0123456789abcdef0123456789';
    const tutta = new DadiCrittografici(seme);
    const prima = Array.from({ length: 10 }, () => tutta.tira(6));
    const ripresa = new DadiCrittografici(seme, 5);
    expect(Array.from({ length: 5 }, () => ripresa.tira(6))).toEqual(prima.slice(5));
  });

  it('ogni faccia esce, nessuna fuori dal dado, distribuzione piatta (chi quadro largo)', () => {
    const d = new DadiCrittografici('5eed5eed5eed5eed5eed5eed5eed5eed');
    const conti = new Array(21).fill(0);
    const n = 20_000;
    for (let i = 0; i < n; i++) conti[d.tira(20)]++;
    expect(conti[0]).toBe(0);
    const atteso = n / 20;
    const chi2 = conti.slice(1).reduce((s, x) => s + (x - atteso) ** 2 / atteso, 0);
    // 19 gradi di libertà: p = 0,001 a 43,8.
    expect(chi2).toBeLessThan(43.8);
  });

  it('ogni tiro si registra con indice, facce e valore', () => {
    const registro: Array<{ indice: number; facce: number; valore: number }> = [];
    const d = new DadiCrittografici('0123456789abcdef0123456789abcdef', 0, (t) => registro.push(t));
    const v = d.tira(8);
    expect(registro).toEqual([{ indice: 0, facce: 8, valore: v }]);
  });
});

describe('tiri di d20, attacchi, danni', () => {
  it('vantaggio: il più alto dei due; svantaggio: il più basso; insieme si annullano', () => {
    expect(tiraD20(new DadiACopione([5, 17]), 'vantaggio')).toEqual({ dadi: [5, 17], dado: 17, vantaggio: 'vantaggio' });
    expect(tiraD20(new DadiACopione([5, 17]), 'svantaggio')).toEqual({ dadi: [5, 17], dado: 5, vantaggio: 'svantaggio' });
    expect(combinaVantaggi(['vantaggio', 'vantaggio'])).toBe('vantaggio');
    expect(combinaVantaggi(['vantaggio', 'svantaggio', 'vantaggio'])).toBeNull();
    expect(combinaVantaggi([null])).toBeNull();
  });

  it('prova: totale ≥ CD riesce; il 20 naturale non salva una prova impossibile (SRD 5.2)', () => {
    expect(prova(new DadiACopione([12]), 3, 15, null)).toMatchObject({ totale: 15, riuscita: true });
    expect(prova(new DadiACopione([11]), 3, 15, null)).toMatchObject({ totale: 14, riuscita: false });
    expect(prova(new DadiACopione([20]), 0, 25, null)).toMatchObject({ totale: 20, riuscita: false });
  });

  it('attacco: 20 naturale critico (dadi del danno raddoppiati), 1 naturale manca sempre', () => {
    const crit = attacco(new DadiACopione([20, 3, 6]), 4, 30, null, { numero: 1, facce: 8, bonus: 0 }, 2);
    expect(crit).toMatchObject({ riuscita: true, critico: true });
    expect(crit.danno).toEqual({ formula: '2d8+2', dadi: [3, 6], bonus: 2, totale: 11 });
    const uno = attacco(new DadiACopione([1]), 30, 5, null, { numero: 1, facce: 8, bonus: 0 }, 2);
    expect(uno).toMatchObject({ riuscita: false, fallimento_critico: true, danno: null });
    const colpo = attacco(new DadiACopione([10, 4]), 4, 14, null, { numero: 1, facce: 6, bonus: 0 }, 2);
    expect(colpo).toMatchObject({ totale: 14, riuscita: true, critico: false });
    expect(colpo.danno?.totale).toBe(6);
  });

  it('danno mai sotto zero', () => {
    expect(danno(new DadiACopione([1]), { numero: 1, facce: 4, bonus: 0 }, -3, false).totale).toBe(0);
  });

  it('contesa tra PG: vince il più alto, a parità nessuno', () => {
    expect(contesa(new DadiACopione([10, 12]), 3, null, 1, null).vince).toBe('pari');
    expect(contesa(new DadiACopione([15, 12]), 3, null, 1, null).vince).toBe('a');
  });
});

describe('punti ferita', () => {
  const schede = caricaSchede({
    pg: [{ id: 'pg_a', nome: 'A', descrizione: '', pubblico: { livello: 1, scheda: { caratteristiche: {}, pf: 10 } }, privato: [] }],
    png: [{ id: 'png_b', nome: 'B', voce_id: 'x', dati: { scheda: { caratteristiche: {}, pf: 7 } } }],
  });

  it('danno, a terra a 0, mai sotto 0, cura fino ai massimi; esporta e riprende', () => {
    const s = new StatoProve(schede);
    expect(s.danneggia('png_b', 5)).toEqual({ prima: 7, dopo: 2, massimi: 7, a_terra: false });
    expect(s.danneggia('png_b', 9)).toEqual({ prima: 2, dopo: 0, massimi: 7, a_terra: true });
    expect(s.aTerra('png_b')).toBe(true);
    expect(s.cura('pg_a', 4)).toEqual({ attuali: 10, massimi: 10 });
    s.danneggia('pg_a', 3);
    const salvato = s.esporta('aa'.repeat(8), 12);
    const r = new StatoProve(schede);
    r.importa(salvato);
    expect(r.puntiFerita('pg_a')).toEqual({ attuali: 7, massimi: 10 });
    expect(r.aTerra('png_b')).toBe(true);
    expect(s.puntiFerita('nessuno')).toBeNull();
  });
});
