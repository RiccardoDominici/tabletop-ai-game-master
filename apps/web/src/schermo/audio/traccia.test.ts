/**
 * Loop delle tracce con l'AudioContext finto: loop nativo coi punti del manifest, loop a giunta
 * incrociata (copie sovrapposte programmate col timer), uscita senza scatti a metà entrata.
 */
import { describe, expect, it } from 'vitest';
import type { TracciaAudio } from '@tabletop-ai-gm/shared';
import { bufferFinto, ContestoFinto } from './contestoFinto';
import { TracciaInRiproduzione } from './traccia';

function traccia(parziale: Partial<TracciaAudio> = {}): TracciaAudio {
  return { id: 'luogo_x', tipo: 'musica', url: '/x.ogg', loop: true, guadagno: 0.8, durata_s: 8, loop_inizio_s: null, loop_fine_s: null, giunta_s: 0, ...parziale };
}

describe('TracciaInRiproduzione', () => {
  it('loop nativo: una sola sorgente, coi punti di loop del manifest se stanno nel file', () => {
    const ctx = new ContestoFinto();
    const bus = ctx.createGain();
    new TracciaInRiproduzione(ctx, traccia({ loop_inizio_s: 0.5, loop_fine_s: 7.5 }), bufferFinto(8), bus, ctx).avvia(0.1, 2);
    expect(ctx.sorgenti).toHaveLength(1);
    expect(ctx.sorgenti[0]).toMatchObject({ loop: true, loopStart: 0.5, loopEnd: 7.5, avviataA: 0.1 });
    // Punti oltre la fine del file: si ripete il file intero.
    new TracciaInRiproduzione(ctx, traccia({ loop_inizio_s: 1, loop_fine_s: 20 }), bufferFinto(8), bus, ctx).avvia(0, 0);
    expect(ctx.sorgenti[1]).toMatchObject({ loop: true, loopStart: 0, loopEnd: 0 });
  });

  it('AAC col priming in testa: loopStart dopo il silenzio, loopEnd dopo `durata_s`', () => {
    const ctx = new ContestoFinto();
    const campioni = new Float32Array(Math.round(8.044 * 48000));
    for (let i = 2112; i < campioni.length; i += 1) campioni[i] = 0.1 * Math.sin(i / 7);
    new TracciaInRiproduzione(ctx, traccia({ durata_s: 8 }), bufferFinto(8.044, 2, 48000, campioni), ctx.createGain(), ctx).avvia(0, 0);
    expect(ctx.sorgenti[0]?.loopStart).toBeCloseTo(0.044, 4);
    expect(ctx.sorgenti[0]?.loopEnd).toBeCloseTo(8.044, 4);
  });

  it('regola: lo stesso file cambia volume senza ripartire', () => {
    const ctx = new ContestoFinto();
    const t = new TracciaInRiproduzione(ctx, traccia(), bufferFinto(8), ctx.createGain(), ctx);
    t.avvia(0, 0);
    ctx.avanza(1);
    t.regola(0.2, 2);
    ctx.avanza(1);
    expect(t.valore).toBeCloseTo(0.5, 2);
    ctx.avanza(1.5);
    expect(t.valore).toBeCloseTo(0.2, 5);
    expect(ctx.sorgenti).toHaveLength(1);
  });

  it('entrata a potenza costante fino al guadagno della traccia', () => {
    const ctx = new ContestoFinto();
    const t = new TracciaInRiproduzione(ctx, traccia(), bufferFinto(8), ctx.createGain(), ctx);
    t.avvia(1, 2);
    ctx.avanza(2);
    expect(t.valore).toBeCloseTo(0.8 * Math.sin(Math.PI / 4), 2);
    ctx.avanza(1.5);
    expect(t.valore).toBeCloseTo(0.8, 5);
  });

  it('giunta incrociata: copie sovrapposte di `giunta_s`, la successiva programmata in anticipo', () => {
    const ctx = new ContestoFinto();
    const t = new TracciaInRiproduzione(ctx, traccia({ giunta_s: 2 }), bufferFinto(8), ctx.createGain(), ctx);
    t.avvia(0, 0);
    expect(ctx.sorgenti.map((s) => s.avviataA)).toEqual([0]);
    expect(ctx.sorgenti[0]?.loop).toBe(false);
    ctx.avanza(4.5); // la copia 1 (a 6 s) si programma 2 s prima
    expect(ctx.sorgenti.map((s) => s.avviataA)).toEqual([0, 6]);
    ctx.avanza(6.5); // t = 11: anche la copia 2 (a 12 s)
    expect(ctx.sorgenti.map((s) => s.avviataA)).toEqual([0, 6, 12]);
    // A metà giunta (7 s) le due copie si passano il testimone a potenza costante.
    const ponti = ctx.guadagni.slice(-3);
    const a7 = ponti.map((p) => p.gain.valoreA(7));
    expect(a7[0]! ** 2 + a7[1]! ** 2).toBeCloseTo(1, 2);
    t.ferma(1);
    ctx.avanza(10);
    expect(ctx.sorgenti.map((s) => s.avviataA)).toEqual([0, 6, 12]); // nessuna copia dopo la fermata
  });

  it('uscita a metà entrata: riparte dal valore corrente, arriva a zero, poi chiude e avvisa', () => {
    const ctx = new ContestoFinto();
    const t = new TracciaInRiproduzione(ctx, traccia(), bufferFinto(8), ctx.createGain(), ctx);
    t.avvia(0, 4);
    ctx.avanza(1);
    const aMeta = t.valore;
    expect(aMeta).toBeGreaterThan(0.2);
    let chiusa = false;
    t.ferma(2, () => (chiusa = true));
    expect(t.valore).toBeCloseTo(aMeta, 5);
    ctx.avanza(1);
    expect(t.valore).toBeLessThan(aMeta);
    ctx.avanza(1.1);
    expect(t.valore).toBe(0);
    expect(ctx.sorgenti[0]?.fermataA).toBeCloseTo(3.05, 5);
    ctx.avanza(0.5);
    expect(chiusa).toBe(true);
  });
});
