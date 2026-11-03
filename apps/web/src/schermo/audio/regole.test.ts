import { describe, expect, it } from 'vitest';
import { curvaPotenzaCostante, dbALineare, giroIncrociato, IsteresiMusica, lineareADb, MemoriaTemi, PianoDucking, puntiDiLoop } from './regole';

describe('IsteresiMusica', () => {
  it('dal silenzio parte subito; un altro brano entro 60 s aspetta', () => {
    const i = new IsteresiMusica(60_000);
    expect(i.chiedi({ id: 'a', forza: false }, 0)).toEqual({ tipo: 'cambia', id: 'a' });
    expect(i.chiedi({ id: 'b', forza: false }, 20_000)).toEqual({ tipo: 'rimanda', id: 'b', traMs: 40_000 });
    expect(i.branoCorrente).toBe('a');
    expect(i.branoPendente).toBe('b');
    // Troppo presto: il timer era sbagliato o è scattato prima.
    expect(i.scadenza(50_000)).toEqual({ tipo: 'rimanda', id: 'b', traMs: 10_000 });
    expect(i.scadenza(60_000)).toEqual({ tipo: 'cambia', id: 'b' });
    expect(i.branoPendente).toBeUndefined();
  });

  it('non cambia più di una volta ogni intervallo: tornare al brano che suona annulla l’attesa', () => {
    const i = new IsteresiMusica(60_000);
    i.chiedi({ id: 'a', forza: false }, 0);
    i.chiedi({ id: 'b', forza: false }, 10_000);
    expect(i.chiedi({ id: 'a', forza: false }, 15_000)).toEqual({ tipo: 'resta' });
    expect(i.scadenza(60_000)).toEqual({ tipo: 'resta' });
    expect(i.branoCorrente).toBe('a');
    // Oltre l'intervallo il cambio è immediato, e fa ripartire il conto.
    expect(i.chiedi({ id: 'c', forza: false }, 70_000)).toEqual({ tipo: 'cambia', id: 'c' });
    expect(i.chiedi({ id: 'a', forza: false }, 80_000)).toMatchObject({ tipo: 'rimanda', traMs: 50_000 });
  });

  it('l’ultimo brano chiesto vince durante l’attesa; anche il silenzio aspetta', () => {
    const i = new IsteresiMusica(60_000);
    i.chiedi({ id: 'a', forza: false }, 0);
    i.chiedi({ id: 'b', forza: false }, 5_000);
    i.chiedi({ id: null, forza: false }, 6_000);
    expect(i.branoPendente).toBeNull();
    expect(i.scadenza(60_000)).toEqual({ tipo: 'cambia', id: null });
    // Dal silenzio si riparte subito.
    expect(i.chiedi({ id: 'c', forza: false }, 61_000)).toEqual({ tipo: 'cambia', id: 'c' });
  });

  it('un cambio esplicito (umore, scena) non aspetta', () => {
    const i = new IsteresiMusica(60_000);
    i.chiedi({ id: 'a', forza: false }, 0);
    expect(i.chiedi({ id: 'umore_tensione', forza: true }, 3_000)).toEqual({ tipo: 'cambia', id: 'umore_tensione' });
    i.azzera();
    expect(i.branoCorrente).toBeNull();
  });
});

describe('MemoriaTemi', () => {
  it('una volta per PNG per scena; una scena nuova ricomincia', () => {
    const m = new MemoriaTemi();
    expect(m.deveSuonare('s1', 'png_o')).toBe(true);
    expect(m.deveSuonare('s1', 'png_o')).toBe(false);
    expect(m.deveSuonare('s1', 'png_b')).toBe(true);
    expect(m.elenco).toEqual(['s1:png_o', 's1:png_b']);
    expect(m.deveSuonare('s2', 'png_o')).toBe(true);
    expect(m.deveSuonare('s2', 'png_b')).toBe(true);
    m.azzera();
    expect(m.deveSuonare('s2', 'png_o')).toBe(true);
  });
});

describe('PianoDucking', () => {
  const opz = { livello: dbALineare(-9), anticipoS: 0.25, attaccoTau: 0.1, tenutaS: 1.4, rilascioTau: 0.45 };

  it('scende poco prima della voce, una volta sola per tutta la narrazione', () => {
    const p = new PianoDucking(opz);
    const e1 = p.voce(10, 12, 9);
    expect(e1.comandi).toEqual([{ verso: 'giu', valore: opz.livello, a: 9.75, tau: 0.1 }]);
    expect(e1.controlloAlle).toBeCloseTo(13.4);
    // Altri pezzi (anche la frase dopo, con una pausa breve): nessun nuovo comando, tenuta spostata.
    const e2 = p.voce(12, 14, 11);
    expect(e2.comandi).toEqual([]);
    expect(e2.controlloAlle).toBeCloseTo(15.4);
    expect(p.sottoVoce).toBe(true);
    expect(p.abbassamenti).toBe(1);
  });

  it('risale solo dopo la tenuta di silenzio, poi di nuovo giù alla voce successiva', () => {
    const p = new PianoDucking(opz);
    p.voce(1, 3, 0.5);
    expect(p.controlla(4)).toEqual({ comandi: [], controlloAlle: 4.4 });
    expect(p.controlla(4.4)).toEqual({ comandi: [{ verso: 'su', valore: 1, a: 4.4, tau: 0.45 }], controlloAlle: null });
    expect(p.sottoVoce).toBe(false);
    // Una voce già cominciata (inizio nel passato): si scende adesso, mai indietro nel tempo.
    expect(p.voce(5, 6, 5.5).comandi[0]).toMatchObject({ verso: 'giu', a: 5.5 });
    expect(p.abbassamenti).toBe(2);
  });

  it('interruzione: risale subito; i comandi non tornano mai indietro nel tempo', () => {
    const p = new PianoDucking(opz);
    p.voce(20, 30, 19);
    expect(p.interrompi(21).comandi).toEqual([{ verso: 'su', valore: 1, a: 21, tau: 0.45 }]);
    expect(p.interrompi(21.5).comandi).toEqual([]);
    expect(p.voce(18, 19, 18).comandi[0]?.a).toBe(21);
  });
});

describe('puntiDiLoop (priming AAC)', () => {
  const SR = 48000;
  /** Segnale: `silenzio` campioni muti (rumore del codec ~1e-5), poi un seno a −20 dBFS. */
  function campioni(silenzio: number, totale: number): Float32Array {
    const c = new Float32Array(totale);
    for (let i = 0; i < totale; i += 1) c[i] = i < silenzio ? 1e-5 * Math.sin(i) : 0.1 * Math.sin((2 * Math.PI * 440 * i) / SR);
    return c;
  }

  it('file intero quando il buffer è lungo quanto dichiarato (o la durata manca o è assurda)', () => {
    expect(puntiDiLoop(8.003, SR, 8)).toBeNull();
    expect(puntiDiLoop(8.05, SR, null)).toBeNull();
    expect(puntiDiLoop(9, SR, 8)).toBeNull();
  });

  it('priming in testa non tolto dal decoder: il loop salta il silenzio iniziale', () => {
    const p = puntiDiLoop(8.044, SR, 8, campioni(2112, Math.round(8.044 * SR)))!;
    expect(p.inizio * SR).toBe(2112);
    expect(p.fine - p.inizio).toBeCloseTo(8, 9);
  });

  it('solo imbottitura in coda (priming già tolto): il loop parte da zero', () => {
    const p = puntiDiLoop(8.021, SR, 8, campioni(0, Math.round(8.021 * SR)))!;
    expect(p.inizio).toBe(0);
    expect(p.fine).toBe(8);
  });

  it('senza campioni: tutto l’eccesso in testa (suggerimento della pipeline)', () => {
    expect(puntiDiLoop(8.04, SR, 8)).toEqual({ inizio: 1920 / SR, fine: 1920 / SR + 8 });
  });
});

describe('utilità', () => {
  it('dB e curve a potenza costante', () => {
    expect(dbALineare(-9)).toBeCloseTo(0.3548, 4);
    expect(lineareADb(0.5)).toBeCloseTo(-6.02, 2);
    const entra = curvaPotenzaCostante(65, 0.8, true);
    const esce = curvaPotenzaCostante(65, 0.8, false);
    expect([entra[0], entra[64], esce[0], esce[64]]).toEqual([0, Math.fround(0.8), Math.fround(0.8), 0]);
    // Potenza costante: a metà dissolvenza la somma dei quadrati è quella piena.
    expect(entra[32]! ** 2 + esce[32]! ** 2).toBeCloseTo(0.64, 4);
  });

  it('giri del loop a giunta incrociata', () => {
    expect(giroIncrociato(10, 8, 2, 0)).toEqual({ inizio: 10, fine: 18, prossimo: 16 });
    expect(giroIncrociato(10, 8, 2, 2)).toEqual({ inizio: 22, fine: 30, prossimo: 28 });
    expect(giroIncrociato(0, 4, 10, 1).inizio).toBe(2); // giunta limitata a metà durata
  });
});
