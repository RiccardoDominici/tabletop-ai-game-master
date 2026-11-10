/**
 * Chi parla (grande), il sottotitolo della frase che sta suonando ADESSO e, se chi parla è un PNG
 * con un ritratto, il ritratto incorniciato accanto.
 * `inOnda` lo scrive il ponte audio quando la frase comincia davvero sulla linea del tempo audio
 * (non quando arriva dal server) e lo toglie poco dopo la fine: ritratto e sottotitolo seguono la
 * stessa linea del tempo.
 *
 * - `parlante` e `sottotitolo` restano sempre nel DOM: in silenzio il loro testo è vuoto.
 * - `ritratto` c'è solo mentre si vede. Il suo posto (e uno uguale a destra) è sempre riservato:
 *   il testo resta centrato e non salta quando un ritratto compare o sparisce.
 */
import { useState } from 'react';
import clsx from 'clsx';
import type { StatoTavolo } from '@cantastorie/shared';
import { elencoNomi, virgolettato } from '../lib/formato';
import { creaLog } from '../lib/log';
import { useSchermo, type FraseInOnda } from '../store/schermo';
import { t } from '../lingua';

const log = creaLog('ritratti');

/** URL del ritratto di chi parla, o null (narratore, PNG senza ritratto, silenzio). */
function ritrattoDi(inOnda: FraseInOnda | null, ritratti: Readonly<Record<string, string>> | undefined): string | null {
  if (!inOnda || inOnda.parlante === 'narratore') return null;
  return ritratti?.[inOnda.parlante] ?? null;
}

export function Narrazione({ stato }: { stato: StatoTavolo }) {
  const inOnda = useSchermo((s) => s.inOnda);
  const narratore = inOnda?.parlante === 'narratore';
  // Ritratti che non si caricano: non si mostrano più (mai un'immagine rotta a schermo).
  const [rotti, setRotti] = useState<ReadonlySet<string>>(() => new Set());
  const url = ritrattoDi(inOnda, stato.scena.ritratti);
  const ritratto = url && !rotti.has(url) ? url : null;

  return (
    // Tre colonne: spazio riservato al ritratto | testo | spazio uguale (il testo resta al centro).
    <section className="grid w-full grid-cols-[18vh_minmax(0,1fr)_18vh] items-end gap-x-[2vw]" aria-live="polite">
      <div aria-hidden />
      <div className="flex min-w-0 flex-col items-center justify-end gap-[1.6vh] text-center">
        {!inOnda && <SuggerimentoFase stato={stato} />}
        {/*
          Blocco nome + sottotitolo, largo quanto il testo: il ritratto si aggancia al suo bordo
          sinistro (fuori dal flusso), così sta ACCANTO al testo anche con una battuta corta, e il
          testo non si sposta mai. Lo spazio a sinistra è garantito dalla colonna riservata.
        */}
        <div className="relative flex max-w-full flex-col items-center gap-[1.6vh]">
          {ritratto && inOnda && (
            <img
              // Chiave per PNG: due frasi di fila dello stesso PNG non fanno lampeggiare il ritratto.
              key={`r-${inOnda.parlante}`}
              data-testid="ritratto"
              src={ritratto}
              alt={t('schermo.ritratto_alt', { nome: inOnda.nome })}
              draggable={false}
              onError={() => {
                log.warn('Ritratto non caricato: si nasconde', { url: ritratto });
                setRotti((r) => new Set(r).add(ritratto));
              }}
              className={clsx(
                'animate-sottotitolo absolute right-full bottom-0 mr-[1.6vw] aspect-[3/4] h-[24vh] w-[18vh] max-w-none object-cover',
                // Cornice: filo dorato, bordo scuro e ombra: si stacca anche da un'immagine chiara.
                'rounded-[0.5vw] border-[0.3vh] border-[#e8c98a] shadow-[0_0_0_0.25vh_rgb(0_0_0/0.85),0_1.5vh_4vh_rgb(0_0_0/0.75)]',
              )}
            />
          )}
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
              'max-w-full font-racconto text-[2.75vw] leading-[1.3] font-medium text-sottotitolo',
              '[text-shadow:0_0_2px_rgb(0_0_0),0_2px_6px_rgb(0_0_0/0.95)]',
              inOnda && 'rounded-[0.6vw] bg-black/62 px-[1.6vw] py-[0.8vh] [box-decoration-break:clone]',
              'animate-sottotitolo',
              inOnda && !narratore && 'italic',
            )}
          >
            {inOnda ? (narratore ? inOnda.testo : virgolettato(inOnda.testo)) : ''}
          </p>
        </div>
      </div>
      <div aria-hidden />
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
    testo = nomi.length > 0 ? t('schermo.fase.cosa_fate_di', { nomi: elencoNomi(nomi) }) : t('schermo.fase.cosa_fate');
  } else if (stato.fase === 'fermata') {
    testo = t('schermo.fase.fermata');
  } else if (stato.fase === 'pausa') {
    testo = t('schermo.fase.pausa');
  } else if (stato.fase === 'narrazione' || stato.fase === 'apertura' || (stato.fase === 'finestra' && !stato.finestra.aperta)) {
    // Il Motore lavora (LLM, voce): in silenzio si dice che il narratore sta preparando.
    testo = t('schermo.fase.preparando');
  } else if (stato.fase === 'attesa') {
    testo = t('schermo.fase.per_cominciare');
  } else {
    testo = '…';
  }
  return (
    <p className="font-titolo text-[3vw] font-semibold text-pergamena/80 drop-shadow-[0_3px_12px_rgb(0_0_0/0.9)]">
      {testo}
    </p>
  );
}
