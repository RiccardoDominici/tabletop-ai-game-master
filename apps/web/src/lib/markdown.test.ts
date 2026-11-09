import { describe, expect, it } from 'vitest';
import { frammentiInline, leggiMarkdown } from './markdown';

describe('frammentiInline', () => {
  it('testo semplice e grassetto', () => {
    expect(frammentiInline('Prova di **Carisma** contro CD')).toEqual([
      { tipo: 'testo', testo: 'Prova di ' },
      { tipo: 'grassetto', testo: 'Carisma' },
      { tipo: 'testo', testo: ' contro CD' },
    ]);
  });

  it('più grassetti nella stessa riga', () => {
    expect(frammentiInline('**a** e **b**')).toEqual([
      { tipo: 'grassetto', testo: 'a' },
      { tipo: 'testo', testo: ' e ' },
      { tipo: 'grassetto', testo: 'b' },
    ]);
  });

  it('un ** senza chiusura resta letterale', () => {
    expect(frammentiInline('costa **molto')).toEqual([{ tipo: 'testo', testo: 'costa **molto' }]);
  });

  it('grassetto vuoto o riga vuota', () => {
    expect(frammentiInline('x****y')).toEqual([{ tipo: 'testo', testo: 'x****y' }]);
    expect(frammentiInline('')).toEqual([]);
  });

  it('non interpreta HTML: resta testo', () => {
    expect(frammentiInline('<img src=x onerror=alert(1)>')).toEqual([{ tipo: 'testo', testo: '<img src=x onerror=alert(1)>' }]);
  });
});

describe('leggiMarkdown', () => {
  it('input vuoto o di soli spazi: nessun blocco', () => {
    expect(leggiMarkdown('')).toEqual([]);
    expect(leggiMarkdown('  \n\n  ')).toEqual([]);
  });

  it('titoli di livello 1, 2 e 3 (oltre il 3 diventa 3)', () => {
    const blocchi = leggiMarkdown('# Uno\n## Due\n### Tre\n#### Quattro');
    expect(blocchi).toEqual([
      { tipo: 'titolo', livello: 1, frammenti: [{ tipo: 'testo', testo: 'Uno' }] },
      { tipo: 'titolo', livello: 2, frammenti: [{ tipo: 'testo', testo: 'Due' }] },
      { tipo: 'titolo', livello: 3, frammenti: [{ tipo: 'testo', testo: 'Tre' }] },
      { tipo: 'titolo', livello: 3, frammenti: [{ tipo: 'testo', testo: 'Quattro' }] },
    ]);
  });

  it('righe consecutive formano un paragrafo; la riga vuota lo chiude', () => {
    const blocchi = leggiMarkdown('Prima riga\nseconda riga\n\nTerzo');
    expect(blocchi).toEqual([
      { tipo: 'paragrafo', frammenti: [{ tipo: 'testo', testo: 'Prima riga seconda riga' }] },
      { tipo: 'paragrafo', frammenti: [{ tipo: 'testo', testo: 'Terzo' }] },
    ]);
  });

  it('elenco puntato con «- » e «* », voci col grassetto', () => {
    const blocchi = leggiMarkdown('- **Forza**: colpi\n- Destrezza\n* Saggezza');
    expect(blocchi).toEqual([
      {
        tipo: 'elenco',
        voci: [
          [
            { tipo: 'grassetto', testo: 'Forza' },
            { tipo: 'testo', testo: ': colpi' },
          ],
          [{ tipo: 'testo', testo: 'Destrezza' }],
          [{ tipo: 'testo', testo: 'Saggezza' }],
        ],
      },
    ]);
  });

  it('una riga di testo dopo un elenco senza riga vuota chiude l\'elenco', () => {
    const blocchi = leggiMarkdown('- voce\nDopo l\'elenco');
    expect(blocchi.map((b) => b.tipo)).toEqual(['elenco', 'paragrafo']);
  });

  it('un riassunto intero con titoli, paragrafi ed elenchi, in ordine', () => {
    const sorgente = ['# Regole brevi', '', 'Si tira **2d6** e si somma.', '', '## Fasce', '- 10+: pieno', '- 7–9: con un costo', '', '### Note', 'Fine.'].join(
      '\n',
    );
    expect(leggiMarkdown(sorgente).map((b) => b.tipo)).toEqual(['titolo', 'paragrafo', 'titolo', 'elenco', 'titolo', 'paragrafo']);
  });

  it('CRLF e spazi attorno alle righe', () => {
    expect(leggiMarkdown('  ## Titolo  \r\n  testo  \r\n')).toEqual([
      { tipo: 'titolo', livello: 2, frammenti: [{ tipo: 'testo', testo: 'Titolo' }] },
      { tipo: 'paragrafo', frammenti: [{ tipo: 'testo', testo: 'testo' }] },
    ]);
  });

  it('HTML nel riassunto resta testo: nessun blocco speciale', () => {
    const [blocco] = leggiMarkdown('<script>alert(1)</script>');
    expect(blocco).toEqual({ tipo: 'paragrafo', frammenti: [{ tipo: 'testo', testo: '<script>alert(1)</script>' }] });
  });
});
