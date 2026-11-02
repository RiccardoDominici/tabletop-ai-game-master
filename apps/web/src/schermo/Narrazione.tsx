/**
 * Chi parla (grande) e il sottotitolo della frase che sta suonando ADESSO.
 * `inOnda` lo scrive il ponte audio quando la frase comincia davvero sulla linea del tempo audio
 * (non quando arriva dal server) e lo toglie poco dopo la fine.
 *
 * I due elementi con testid restano sempre nel DOM: in silenzio il loro testo è vuoto.
 */
import clsx from 'clsx';
import type { StatoTavolo } from '@cantastorie/shared';
import { elencoNomi, virgolettato } from '../lib/formato';
import { useSchermo } from '../store/schermo';

export function Narrazione({ stato }: { stato: StatoTavolo }) {
  const inOnda = useSchermo((s) => s.inOnda);
  const narratore = inOnda?.parlante === 'narratore';

  return (
    <section className="flex flex-col items-center justify-end gap-[1.6vh] text-center" aria-live="polite">
      {!inOnda && <SuggerimentoFase stato={stato} />}
      {/*
        Leggibilità da proiettore: nome con accento pieno e alone scuro, sottotitolo quasi bianco su
        una fascia scura semitrasparente. La comparsa dura 160 ms ed è solo d'opacità.
      */}
      <p
        data-testid="parlante"
        key={`p-${inOnda?.idFrase ?? 'silenzio'}`}
        className={clsx(
          'font-titolo text-[3.3vw] leading-none font-bold tracking-wide',
          '[text-shadow:0_0_2px_rgb(0_0_0),0_3px_10px_rgb(0_0_0/0.95),0_0_28px_rgb(0_0_0/0.85)]',
          'animate-sottotitolo',
          narratore ? 'text-candela-2' : 'text-[#ff9a6b]',
        )}
      >
        {inOnda?.nome ?? ''}
      </p>
      <p
        data-testid="sottotitolo"
        key={`s-${inOnda?.idFrase ?? 'silenzio'}`}
        className={clsx(
          'max-w-[82vw] font-racconto text-[2.75vw] leading-[1.3] font-medium text-sottotitolo',
          '[text-shadow:0_0_2px_rgb(0_0_0),0_2px_6px_rgb(0_0_0/0.95)]',
          inOnda && 'rounded-[0.6vw] bg-black/55 px-[1.6vw] py-[0.8vh] [box-decoration-break:clone]',
          'animate-sottotitolo',
          inOnda && !narratore && 'italic',
        )}
      >
        {inOnda ? (narratore ? inOnda.testo : virgolettato(inOnda.testo)) : ''}
      </p>
    </section>
  );
}

/** In silenzio, al centro: cosa sta succedendo al tavolo (letto da lontano). */
function SuggerimentoFase({ stato }: { stato: StatoTavolo }) {
  let testo: string;
  if (stato.fase === 'finestra' && stato.finestra.aperta) {
    const tutti = stato.finestra.invitati.includes('tutti');
    const nomi = (tutti ? stato.pg : stato.pg.filter((p) => stato.finestra.invitati.includes(p.id))).map(
      (p) => p.nome.split(' ')[0] ?? p.nome,
    );
    testo = nomi.length > 0 ? `${elencoNomi(nomi)}, cosa fate?` : 'Cosa fate?';
  } else if (stato.fase === 'fermata') {
    testo = 'Scena fermata';
  } else if (stato.fase === 'attesa') {
    testo = 'La scena sta per cominciare';
  } else {
    testo = '…';
  }
  return (
    <p className="font-titolo text-[3vw] font-semibold text-pergamena/80 drop-shadow-[0_3px_12px_rgb(0_0_0/0.9)]">
      {testo}
    </p>
  );
}
