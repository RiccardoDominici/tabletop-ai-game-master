/**
 * Numeri delle regole a voce (narrazione/numeri-regole.ts): punti ferita, CA e CD non si dicono, li
 * mostra la carta. La e2e del 10 novembre: «quattro punti di vita rimasti» detto dal narratore.
 * Più le regole nei prompt: niente numeri a voce, e il colpo di un PNG raccontato in una frase sua.
 */
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { togliNumeriRegole } from '../src/narrazione/numeri-regole';
import { RADICE_REPO } from '../src/percorsi';
import { Prova, agisci, attendi, inizia } from './aiuti/partita';

describe('numeri delle regole tolti dalla voce', () => {
  it('punti ferita, CA e CD perdono il numero; il resto resta', () => {
    expect(togliNumeriRegole('La botta lo fa barcollare: quattro punti di vita rimasti.').testo).toBe('La botta lo fa barcollare: alcuni punti di vita rimasti.');
    expect(togliNumeriRegole('Corrado ha 7 punti ferita su 12.').testo).toBe('Corrado ha alcuni punti ferita.');
    expect(togliNumeriRegole('Ida è a 0 punti ferita.').testo).toBe('Ida è a terra.');
    expect(togliNumeriRegole('Non ha zero punti ferita.').testo).toBe('Non ha nessun punto ferita.');
    expect(togliNumeriRegole('Il dardo supera la CA 15 di Ruggero.').testo).toBe("Il dardo supera l'armatura di Ruggero.");
    expect(togliNumeriRegole('Serviva battere la CD 15.').testo).toBe('Serviva battere la difficoltà.');
    expect(togliNumeriRegole('Gli restano 3/11 PF.').testo).toBe('Gli restano alcuni punti ferita.');
    const r = togliNumeriRegole('Tre monete e sette passi: la cassa è a due metri.');
    expect(r).toEqual({ testo: 'Tre monete e sette passi: la cassa è a due metri.', tolti: [] });
  });

  it('i prompt vietano i numeri a voce e chiedono una frase per il colpo di un PNG', () => {
    for (const f of ['narratore.md', 'selettore.md']) {
      const p = fs.readFileSync(path.join(RADICE_REPO, 'prompts', 'it', f), 'utf8');
      expect(p, f).toMatch(/A voce niente numeri, dadi, punti ferita, CA o CD/);
      expect(p, f).toMatch(/«Ruggero colpisce Corrado: 6 danni», «Ruggero manca Corrado»\) si racconta sempre con una frase sua/);
    }
  });
});

describe('numeri delle regole col server intero', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());
  it('la frase del narratore arriva al tavolo senza i punti ferita', async () => {
    prova = new Prova();
    const cartella = prova.campagna('mini');
    const { url } = await prova.avvia(cartella, (t) => (t === 0 ? '[narratore] Fumo.\n[invito] tutti' : '[narratore] La botta lo fa barcollare: quattro punti di vita rimasti.\n[invito] tutti'));
    const schermo = await prova.proiettore(url);
    const anna = await prova.telefono(url, 'pg_anna');
    const s1 = await inizia(schermo, anna);
    await agisci(anna, 'pg_anna', 'Mi difendo', s1.versione_scena);
    const dopo = await attendi(anna, (x) => x.fase === 'finestra' && x.turno === 2);
    const testo = dopo.trascrizione.map((v) => v.testo).join(' ');
    expect(testo).toContain('alcuni punti di vita rimasti');
    expect(testo).not.toMatch(/quattro punti/);
  });
});
