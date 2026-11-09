/**
 * Interruttore «Ascolta qui» nell'intestazione del telefono: la voce del gioco anche da qui
 * (logica in ./ascolto.ts). È un tondo con l'altoparlante, per non rubare spazio al nome del PG:
 * spento ha l'altoparlante barrato, acceso è color candela e pulsa mentre qualcuno parla. L'esito di
 * un'azione privata di questo PG si sente solo qui, mai dal proiettore.
 */
import { useEffect } from 'react';
import { accendiAscolto, riattivaAlPrimoTocco, spegniAscolto, useAscolto } from './ascolto';

function Altoparlante({ acceso }: { acceso: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" fillOpacity={acceso ? 0.25 : 0} />
      {acceso ? (
        <>
          <path d="M15.5 9a4 4 0 0 1 0 6" />
          <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
        </>
      ) : (
        <path d="M16 9.5l5 5M21 9.5l-5 5" />
      )}
    </svg>
  );
}

export function AscoltaQui() {
  const attivo = useAscolto((s) => s.attivo);
  const daRiattivare = useAscolto((s) => s.daRiattivare);
  const inOnda = useAscolto((s) => s.inOnda);
  const errore = useAscolto((s) => s.errore);

  useEffect(() => riattivaAlPrimoTocco(), []);

  const descrizione = attivo
    ? inOnda
      ? `Ascolti qui: parla ${inOnda}. Tocca per spegnere`
      : 'Ascolti qui. Tocca per spegnere la voce su questo telefono'
    : daRiattivare
      ? 'Tocca per riascoltare la voce su questo telefono'
      : 'Ascolta qui: la voce del gioco anche su questo telefono';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={attivo}
      aria-label={descrizione}
      title={errore ?? descrizione}
      data-testid="ascolta-qui"
      data-in-onda={inOnda ? 'si' : 'no'}
      onClick={() => (attivo ? spegniAscolto() : void accendiAscolto())}
      className={`relative flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-full border active:bg-notte-3 ${
        attivo ? 'border-candela bg-candela/15 text-candela' : daRiattivare ? 'border-candela/60 text-candela/80' : 'border-bordo-chiaro text-pergamena-2'
      }`}
    >
      <Altoparlante acceso={attivo} />
      {attivo && inOnda && <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-2 animate-pulse rounded-full bg-candela" />}
    </button>
  );
}
