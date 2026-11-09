/**
 * Un piccolo lettore di markdown per i riassunti delle regole (scheda «Regole» del telefono).
 *
 * Non produce HTML: legge il testo e restituisce una struttura di blocchi (titoli, paragrafi, elenchi)
 * con il grassetto come nodi separati. Chi la mostra la trasforma in elementi React, che escono
 * come testo: niente `dangerouslySetInnerHTML`, quindi un riassunto ostile non può iniettare codice.
 *
 * Sintassi riconosciuta (il resto è testo così com'è):
 * - «# », «## », «### » titoli di livello 1, 2, 3 (oltre il terzo si fa livello 3);
 * - righe che iniziano con «- » o «* » formano un elenco puntato (le righe consecutive, una voce a riga);
 * - righe consecutive senza altro formano un paragrafo; una riga vuota separa i blocchi;
 * - «**testo**» in grassetto; un ** senza chiusura resta letterale.
 */

/** Un pezzo di riga: testo normale o grassetto. */
export type Frammento = { tipo: 'testo'; testo: string } | { tipo: 'grassetto'; testo: string };

export type BloccoMarkdown =
  | { tipo: 'titolo'; livello: 1 | 2 | 3; frammenti: Frammento[] }
  | { tipo: 'paragrafo'; frammenti: Frammento[] }
  | { tipo: 'elenco'; voci: Frammento[][] };

const RIGA_TITOLO = /^(#{1,6})\s+(.*)$/;
const RIGA_ELENCO = /^[-*]\s+(.*)$/;

/**
 * Spezza una riga nei suoi frammenti: il grassetto è `**…**`. Un ** senza chiusura resta testo.
 * Una riga vuota dà nessun frammento.
 */
export function frammentiInline(riga: string): Frammento[] {
  const frammenti: Frammento[] = [];
  let resto = riga;
  while (resto.length > 0) {
    const apre = resto.indexOf('**');
    const chiude = apre === -1 ? -1 : resto.indexOf('**', apre + 2);
    // Grassetto vuoto («****») o non chiuso: il pezzo resta testo.
    if (apre === -1 || chiude === -1 || chiude === apre + 2) {
      frammenti.push({ tipo: 'testo', testo: resto });
      break;
    }
    if (apre > 0) frammenti.push({ tipo: 'testo', testo: resto.slice(0, apre) });
    frammenti.push({ tipo: 'grassetto', testo: resto.slice(apre + 2, chiude) });
    resto = resto.slice(chiude + 2);
  }
  return frammenti;
}

/** Legge il markdown dei riassunti in blocchi. Input vuoto o di soli spazi: nessun blocco. */
export function leggiMarkdown(sorgente: string): BloccoMarkdown[] {
  const blocchi: BloccoMarkdown[] = [];
  let paragrafo: string[] = [];
  let elenco: Frammento[][] | null = null;

  const chiudiParagrafo = () => {
    if (paragrafo.length === 0) return;
    blocchi.push({ tipo: 'paragrafo', frammenti: frammentiInline(paragrafo.join(' ')) });
    paragrafo = [];
  };
  const chiudiElenco = () => {
    if (elenco === null) return;
    blocchi.push({ tipo: 'elenco', voci: elenco });
    elenco = null;
  };

  for (const grezza of sorgente.replace(/\r\n?/g, '\n').split('\n')) {
    const riga = grezza.trim();

    if (riga === '') {
      chiudiParagrafo();
      chiudiElenco();
      continue;
    }

    const titolo = RIGA_TITOLO.exec(riga);
    if (titolo) {
      chiudiParagrafo();
      chiudiElenco();
      const livello = Math.min((titolo[1] ?? '#').length, 3) as 1 | 2 | 3;
      blocchi.push({ tipo: 'titolo', livello, frammenti: frammentiInline((titolo[2] ?? '').trim()) });
      continue;
    }

    const voce = RIGA_ELENCO.exec(riga);
    if (voce) {
      chiudiParagrafo();
      elenco ??= [];
      elenco.push(frammentiInline((voce[1] ?? '').trim()));
      continue;
    }

    // Una riga di testo dopo un elenco senza riga vuota chiude l'elenco (non si attacca alla voce).
    chiudiElenco();
    paragrafo.push(riga);
  }

  chiudiParagrafo();
  chiudiElenco();
  return blocchi;
}
