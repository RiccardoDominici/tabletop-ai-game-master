/**
 * Divisore di frasi: casi italiani difficili e, soprattutto, confini di chunk arbitrari.
 * Ogni caso viene provato tutto insieme, carattere per carattere e con tagli casuali:
 * il risultato deve essere sempre lo stesso.
 */
import { describe, expect, it } from 'vitest';
import { DivisoreFrasi, dividiTesto } from '../src/narrazione/frasi';

/** Simula lo streaming: spezza il testo nei punti dati e raccoglie le frasi. */
function inStreaming(testo: string, tagli: number[]): string[] {
  const d = new DivisoreFrasi();
  const out: string[] = [];
  let prec = 0;
  for (const t of [...tagli, testo.length]) {
    out.push(...d.aggiungi(testo.slice(prec, t)));
    prec = t;
  }
  out.push(...d.chiudi());
  return out;
}

function carattereXCarattere(testo: string): string[] {
  return inStreaming(testo, Array.from({ length: testo.length }, (_, i) => i));
}

/** Generatore pseudo-casuale deterministico (mulberry32) per i tagli. */
function casuale(seme: number): () => number {
  let a = seme;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tagliCasuali(n: number, seme: number): number[] {
  const r = casuale(seme);
  const tagli = new Set<number>();
  for (let i = 0; i < n / 3; i++) tagli.add(Math.floor(r() * n));
  return [...tagli].sort((a, b) => a - b);
}

const CASI: Array<[string, string, string[]]> = [
  ['due frasi semplici', 'La porta cigola. Entra un uomo.', ['La porta cigola.', 'Entra un uomo.']],
  ['domanda ed esclamazione', 'Chi va là? Fermi! Nessuno risponde.', ['Chi va là?', 'Fermi!', 'Nessuno risponde.']],
  ['domanda seguita da minuscola', 'Chi va là? chiede la guardia. Silenzio.', ['Chi va là? chiede la guardia.', 'Silenzio.']],
  ['puntini con minuscola restano una frase', 'Aspetta... forse no. Poi esce.', ['Aspetta... forse no.', 'Poi esce.']],
  ['puntini con maiuscola spezzano', 'Il fuoco muore... Qualcuno bussa.', ['Il fuoco muore...', 'Qualcuno bussa.']],
  ['carattere ellissi', 'Silenzio… Poi un passo.', ['Silenzio…', 'Poi un passo.']],
  ['citazione con punto interno', 'Lei dice: «Fermi. Non toccate niente.» Poi tace.', ['Lei dice: «Fermi. Non toccate niente.»', 'Poi tace.']],
  ['citazione chiusa da domanda', '«Chi siete?» Il nano si alza.', ['«Chi siete?»', 'Il nano si alza.']],
  ['citazione seguita da minuscola', '«Andate via!» grida il nano. Poi siede.', ['«Andate via!» grida il nano.', 'Poi siede.']],
  ['virgolette dritte', 'Scrive "Via. Subito." sul muro. Basta.', ['Scrive "Via. Subito." sul muro.', 'Basta.']],
  ['numeri con punto e virgola', 'Costa 3.500 corone, o 1,5 sacchi. Troppo.', ['Costa 3.500 corone, o 1,5 sacchi.', 'Troppo.']],
  ['numero a fine frase', 'Sono le 3. Arriva il carro.', ['Sono le 3.', 'Arriva il carro.']],
  ['abbreviazioni', 'Il sig. Rossi e il dott. Bianchi entrano. Salutano.', ['Il sig. Rossi e il dott. Bianchi entrano.', 'Salutano.']],
  ['iniziale', 'Firmato A. Ferlini. Nient’altro.', ['Firmato A. Ferlini.', 'Nient’altro.']],
  ['punti esclamativi multipli', 'Basta!! Fuori di qui. Ora.', ['Basta!!', 'Fuori di qui.', 'Ora.']],
  ['?! insieme', 'Davvero?! Non ci credo.', ['Davvero?!', 'Non ci credo.']],
  ['ultima frase senza punto', 'Il cane trema. Nella ciotola restano croste', ['Il cane trema.', 'Nella ciotola restano croste']],
  ['spazi multipli e accenti', 'È tardi.   Perché  aspettate? Città vuota.', ['È tardi.', 'Perché aspettate?', 'Città vuota.']],
  ['frase che inizia con virgolette dopo il punto', 'Ottavia sorride. «Mangiate, figlioli.»', ['Ottavia sorride.', '«Mangiate, figlioli.»']],
  ['scarta i frammenti vuoti', 'Fine. … »', ['Fine.']],
];

describe('DivisoreFrasi', () => {
  for (const [nome, testo, attese] of CASI) {
    it(`${nome} — tutto insieme`, () => {
      expect(inStreaming(testo, [])).toEqual(attese);
    });
    it(`${nome} — carattere per carattere`, () => {
      expect(carattereXCarattere(testo)).toEqual(attese);
    });
    it(`${nome} — tagli casuali`, () => {
      for (let seme = 1; seme <= 25; seme++) {
        expect(inStreaming(testo, tagliCasuali(testo.length, seme))).toEqual(attese);
      }
    });
  }

  it('emette la frase appena arriva il carattere dopo lo spazio, non prima', () => {
    const d = new DivisoreFrasi();
    expect(d.aggiungi('La porta cigola.')).toEqual([]);
    expect(d.aggiungi(' ')).toEqual([]);
    expect(d.aggiungi('E')).toEqual(['La porta cigola.']);
    expect(d.inAttesa).toBe('E');
  });

  it('spezza una frase lunghissima a una virgola oltre il limite', () => {
    const parte = 'una parola dopo l’altra senza mai fermarsi';
    const testo = `${parte}, ${parte}, ${parte}, ${parte}, ${parte}, ${parte}. Fine.`;
    const frasi = new DivisoreFrasi({ maxCaratteri: 100 }).aggiungi(testo);
    expect(frasi.length).toBeGreaterThanOrEqual(2);
    expect(frasi[0]!.endsWith(',')).toBe(true);
    expect(frasi[0]!.length).toBeGreaterThan(100);
  });

  it('una citazione non chiusa non blocca per sempre', () => {
    const lunga = '«' + 'parole e ancora parole. '.repeat(15) + 'Basta. Poi esce.';
    const frasi = new DivisoreFrasi({ maxCaratteri: 120 }).aggiungi(lunga);
    expect(frasi.length).toBeGreaterThan(0);
  });
});

describe('dividiTesto', () => {
  it('divide il testo d’apertura e tratta gli a capo come fine frase', () => {
    expect(dividiTesto('Prima riga senza punto\nSeconda. Terza.')).toEqual(['Prima riga senza punto', 'Seconda.', 'Terza.']);
  });
});
