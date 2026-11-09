/**
 * Voce espressiva (voce/espressione.ts): cosa si mostra, cosa va a drama-3, la guardia sui tag,
 * il riporto della direzione tra le frasi di una riga, le direzioni predefinite dalle schede.
 */
import { describe, expect, it } from 'vitest';
import {
  analizza,
  conDirezione,
  direzioneDaScheda,
  direzioneDaStile,
  EspressioneTurno,
  haMarkup,
  soloParole,
} from '../src/voce/espressione';

describe('analizza: parole e testo espressivo', () => {
  it('la direzione iniziale non si mostra e va alla voce', () => {
    const a = analizza('[offesa, ma a voce bassa] Non venni perché c’era la tormenta.');
    expect(a.parole).toBe('Non venni perché c’era la tormenta.');
    expect(a.espressivo).toBe('[offesa, ma a voce bassa] Non venni perché c’era la tormenta.');
    expect(a.iniziaConDirezione).toBe(true);
    expect(a.direzione).toBe('offesa, ma a voce bassa');
    expect(a.anomalie).toEqual([]);
  });

  it('suoni e tag a metà frase: tolti dalle parole, tenuti per la voce, niente spazi doppi', () => {
    const a = analizza('Ascoltate bene. <whisper>L’anello non è mai uscito di qui</whisper>. [sigh] Lo so io.');
    expect(a.parole).toBe('Ascoltate bene. L’anello non è mai uscito di qui. Lo so io.');
    expect(a.espressivo).toBe('Ascoltate bene. <whisper>L’anello non è mai uscito di qui</whisper>. [sigh] Lo so io.');
    expect(a.iniziaConDirezione).toBe(false);
    expect(a.direzione).toBeNull(); // un suono non è una direzione che dura
  });

  it('un suono prima della direzione: la riga ha comunque la sua direzione', () => {
    const a = analizza('[sigh] [stanca] Va bene.');
    expect(a.iniziaConDirezione).toBe(true);
    expect(a.parole).toBe('Va bene.');
  });

  it('tag sconosciuto e chiusura senza apertura: tolti e registrati', () => {
    const a = analizza('<shout>Fermi!</shout> E poi </whisper>basta.');
    expect(a.parole).toBe('Fermi! E poi basta.');
    expect(a.espressivo).toBe('Fermi! E poi basta.');
    expect(a.anomalie.map((x) => x.codice)).toEqual(['tag_sconosciuto', 'tag_sconosciuto', 'tag_chiuso_senza_apertura']);
  });

  it('tag non chiuso a fine frase: chiuso per la voce e segnalato come aperto', () => {
    const a = analizza('Promettimi <whisper>che non lo dici a nessuno.');
    expect(a.espressivo).toBe('Promettimi <whisper>che non lo dici a nessuno.</whisper>');
    expect(a.aperti).toEqual(['whisper']);
  });

  it('chiusure incrociate: si chiude prima il tag più interno', () => {
    const a = analizza('<soft>uno <slow>due</soft> tre</slow>');
    expect(a.espressivo).toBe('<soft>uno <slow>due</slow></soft> tre');
    expect(a.anomalie.map((x) => x.codice)).toEqual(['tag_chiuso_senza_apertura']);
  });

  it('direzione troppo lunga: tolta del tutto (non va nemmeno alla voce)', () => {
    const lunga = `[${'molto '.repeat(20)}piano] Non venni.`;
    const a = analizza(lunga);
    expect(a.parole).toBe('Non venni.');
    expect(a.espressivo).toBe('Non venni.');
    expect(a.anomalie[0]?.codice).toBe('direzione_lunga');
  });

  it('parentesi spaiata (direzione spezzata da un punto): tolta da parole e voce', () => {
    const a = analizza('[Sottovoce. Lento');
    expect(a.parole).toBe('');
    expect(a.anomalie[0]?.codice).toBe('parentesi_spaiata');
    expect(analizza('Lento] Non venni.').parole).toBe('Lento Non venni.');
  });

  it('testo senza markup: identico', () => {
    const t = 'La neve copre il sentiero, e nessuno è passato.';
    expect(analizza(t).parole).toBe(t);
    expect(soloParole(t)).toBe(t);
    expect(haMarkup(t)).toBe(false);
    expect(haMarkup('[sigh] Va bene.')).toBe(true);
    expect(haMarkup('Va <soft>bene</soft>.')).toBe(true);
  });
});

describe('conDirezione: la predefinita solo se la riga non ne ha una', () => {
  it('aggiunge la predefinita davanti', () => {
    expect(conDirezione(analizza('Eh? Parla forte.'), 'burbero e rumoroso')).toBe('[burbero e rumoroso] Eh? Parla forte.');
    expect(conDirezione(analizza('[sigh] Eh?'), 'burbero')).toBe('[burbero] [sigh] Eh?');
  });
  it('la direzione della riga vince', () => {
    expect(conDirezione(analizza('[commosso] Eh?'), 'burbero')).toBe('[commosso] Eh?');
    expect(conDirezione(analizza('Eh?'), null)).toBe('Eh?');
  });
});

describe('EspressioneTurno: le frasi di una riga vanno alla voce una per volta', () => {
  it('la direzione della riga si riporta sulle frasi seguenti, una riga nuova riparte pulita', () => {
    const anomalie: string[] = [];
    const e = new EspressioneTurno((a) => anomalie.push(a.codice));
    expect(e.frase(0, '[sottovoce] Non venni.')).toEqual({ parole: 'Non venni.', voce: '[sottovoce] Non venni.' });
    expect(e.frase(0, 'C’era la tormenta.')).toEqual({ parole: 'C’era la tormenta.', voce: '[sottovoce] C’era la tormenta.' });
    expect(e.frase(0, '[di colpo, forte] E tu dov’eri?')).toEqual({ parole: 'E tu dov’eri?', voce: '[di colpo, forte] E tu dov’eri?' });
    expect(e.frase(1, 'La neve cade.')).toEqual({ parole: 'La neve cade.', voce: 'La neve cade.' });
    expect(anomalie).toEqual([]);
  });

  it('un tag aperto su più frasi: riaperto e chiuso in ognuna; a fine riga è un errore', () => {
    const anomalie: string[] = [];
    const e = new EspressioneTurno((a) => anomalie.push(a.codice));
    expect(e.frase(0, '<whisper>L’anello è qui.').voce).toBe('<whisper>L’anello è qui.</whisper>');
    expect(e.frase(0, 'Lo so io.</whisper> Davvero.').voce).toBe('<whisper>Lo so io.</whisper> Davvero.');
    expect(anomalie).toEqual([]);
    e.frase(0, '<soft>Mai detto');
    e.chiudi();
    expect(anomalie).toEqual(['tag_non_chiuso']);
  });

  it('una «frase» di solo markup va davanti alla frase dopo', () => {
    const e = new EspressioneTurno();
    expect(e.frase(0, '[sigh]')).toEqual({ parole: '', voce: '' });
    expect(e.frase(0, 'Va bene.')).toEqual({ parole: 'Va bene.', voce: '[sigh] Va bene.' });
  });
});

describe('direzioni predefinite dalle schede', () => {
  it('PNG: carattere, timbro, età e velocità', () => {
    const d = direzioneDaScheda({
      personalita: { superficie: ['burbero e rumoroso, batte il bastone per farsi sentire'] },
      voce: { tts: { voce_id: 'vincent', eta_apparente: '75-85', velocita: 0.9, timbro: 'grave e ruvido' } },
    });
    expect(d).toBe('burbero e rumoroso; timbro grave e ruvido; sui 75-85 anni; parla adagio');
  });
  it('PNG: la direzione esplicita della scheda vince', () => {
    expect(direzioneDaScheda({ voce: { tts: { direzione: 'calma, quasi un bisbiglio', timbro: 'liscio' } } })).toBe('calma, quasi un bisbiglio');
    expect(direzioneDaScheda({ voce: {} })).toBeNull();
  });
  it('narratore: prima frase del registro della carta di stile, accorciata a una virgola', () => {
    expect(direzioneDaStile({ registro_narratore: 'Voce di veglia d’inverno: calda, svelta. Sulla tensione asciutta.' })).toBe('Voce di veglia d’inverno: calda, svelta');
    expect(direzioneDaStile({ direzione_voce: 'calda e svelta' })).toBe('calda e svelta');
    expect(direzioneDaStile({})).toBeNull();
    const lunga = direzioneDaStile({ registro_narratore: `Calda, ${'molto lenta, '.repeat(15)}fine.` })!;
    expect(lunga.length).toBeLessThanOrEqual(110);
    expect(lunga.endsWith(',')).toBe(false);
  });
});
