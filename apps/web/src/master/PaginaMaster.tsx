/**
 * Pagina /master: il pannello con cui un umano, sul Mac, corregge o ferma il master IA
 * (docs/architettura.md, «Pannello master»). Non è collegata dai telefoni né dal QR.
 *
 * Tre stati: senza token (o token rifiutato) → modulo; token in prova → «Entro…»; dentro → cruscotto
 * con l'ultima istantanea `master:stato`. Durante una riconnessione il cruscotto resta visibile con
 * l'ultima istantanea e il banner di connessione in alto; i comandi rispondono «non connesso».
 */
import { useEffect } from 'react';
import { BannerConnessione } from '../components/BannerConnessione';
import { Avvisi } from '../components/Avvisi';
import { useMaster } from '../store/master';
import { avviaMaster, cambiaToken } from './sessione';
import { classePulsante } from './stili';
import { FormToken } from './FormToken';
import { Intestazione } from './Intestazione';
import { Cruscotto } from './Cruscotto';

export function PaginaMaster() {
  useEffect(() => avviaMaster(), []);
  useEffect(() => {
    document.title = 'Cantastorie · Master';
  }, []);

  const stato = useMaster((s) => s.stato);
  const entrata = useMaster((s) => s.entrata);

  let contenuto;
  if (entrata === 'senza_token' || entrata === 'rifiutato') {
    contenuto = <FormToken />;
  } else if (!stato) {
    contenuto = <Entrando />;
  } else {
    contenuto = (
      <>
        <Intestazione stato={stato} />
        <Cruscotto stato={stato} />
      </>
    );
  }

  return (
    <div data-testid="pagina-master" data-entrata={entrata} className="flex min-h-dvh flex-col xl:h-dvh xl:overflow-hidden">
      <BannerConnessione />
      {contenuto}
      <Avvisi />
    </div>
  );
}

function Entrando() {
  return (
    <main data-testid="master-entrando" className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <p className="font-titolo text-3xl font-semibold text-candela">Pannello del master</p>
      <p className="text-pergamena-2">Entro nel tavolo col token…</p>
      <p className="max-w-md text-sm text-cenere">
        Se resta qui, il server non risponde ancora al pannello: controlla che sia avviato.
      </p>
      <button type="button" data-testid="master-cambia-token" onClick={cambiaToken} className={classePulsante('tenue', 'medio')}>
        Usa un altro token
      </button>
    </main>
  );
}
