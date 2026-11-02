import { describe, expect, it } from 'vitest';
import { etichettaFase, primoNome } from './etichettaFase';

describe('riga di stato del proiettore', () => {
  it('un PNG in onda durante la narrazione: dice chi parla davvero', () => {
    expect(etichettaFase('narrazione', { parlante: 'png_ottavia', nome: 'Ottavia Ferlini' })).toBe('Ottavia sta parlando');
    expect(etichettaFase('apertura', { parlante: 'png_baldrin', nome: 'Baldrin Pietrafitta' })).toBe('Baldrin sta parlando');
  });

  it('il narratore in onda o il silenzio: etichetta della fase', () => {
    expect(etichettaFase('narrazione', { parlante: 'narratore', nome: 'Narratore' })).toBe('Il narratore sta parlando');
    expect(etichettaFase('narrazione', null)).toBe('Il narratore sta parlando');
    expect(etichettaFase('apertura', null)).toBe('Il narratore apre la scena');
  });

  it('fuori dalla narrazione il parlante non conta (coda audio che finisce)', () => {
    expect(etichettaFase('fermata', { parlante: 'png_ottavia', nome: 'Ottavia' })).toBe('Scena fermata');
    expect(etichettaFase('attesa', null)).toBe('In attesa di cominciare');
  });

  it('pausa: chi parla finché l’ultima frase suona, poi «Tavolo in pausa»', () => {
    expect(etichettaFase('pausa', { parlante: 'png_ottavia', nome: 'Ottavia Ferlini' })).toBe('Ottavia sta parlando');
    expect(etichettaFase('pausa', { parlante: 'narratore', nome: 'Narratore' })).toBe('Il narratore sta parlando');
    expect(etichettaFase('pausa', null)).toBe('Tavolo in pausa');
  });

  it('nome vuoto: si resta sull’etichetta di fase', () => {
    expect(etichettaFase('narrazione', { parlante: 'png_x', nome: '  ' })).toBe('Il narratore sta parlando');
  });

  it('nome breve: primo nome, saltando i titoli', () => {
    expect(primoNome('Sorella Teodora Vasi')).toBe('Teodora');
    expect(primoNome('Sebastiano')).toBe('Sebastiano');
    expect(primoNome('Mastro')).toBe('Mastro');
  });
});
