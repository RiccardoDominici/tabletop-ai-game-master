/**
 * Sessione salvata: il server scrive il gioco nel registro e, dopo un riavvio, lo riprende da solo.
 * Qui il master vede da quando dura la sessione, se è stata ripresa (quando e da che turno) o se
 * una ripresa aspetta il proiettore, e può cominciarne una nuova. «Nuova sessione» cancella la
 * partita in corso: si conferma con un secondo clic entro pochi secondi (niente window.confirm,
 * che il browser del proiettore o le prove chiuderebbero da soli).
 */
import { useEffect, useState } from 'react';
import type { StatoMaster } from '@cantastorie/shared';
import { useInCorso } from '../store/master';
import { inviaComando } from './sessione';
import { Riquadro } from './Riquadro';
import { classePulsante } from './stili';
import { oraBreve } from './etichette';

/** Tempo per confermare «Nuova sessione» col secondo clic. */
const FINESTRA_CONFERMA_MS = 5000;

export function SezioneSessione({ stato }: { stato: StatoMaster }) {
  const s = stato.sessione;
  const inCorso = useInCorso('nuova_sessione');
  const [daConfermare, setDaConfermare] = useState(false);
  useEffect(() => {
    if (!daConfermare) return;
    const t = window.setTimeout(() => setDaConfermare(false), FINESTRA_CONFERMA_MS);
    return () => window.clearTimeout(t);
  }, [daConfermare]);
  if (!s) return null;

  const clic = () => {
    if (!daConfermare) return setDaConfermare(true);
    setDaConfermare(false);
    void inviaComando({ tipo: 'nuova_sessione' }, 'Nuova sessione');
  };

  return (
    <Riquadro titolo="Sessione" zona="sessione" data-testid="master-sessione">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
        <dt className="text-cenere">iniziata</dt>
        <dd data-testid="master-sessione-inizio">{s.creata ? `${new Date(s.creata).toLocaleDateString('it-IT')} ${oraBreve(Date.parse(s.creata))}` : 'non ancora (scena da avviare)'}</dd>
        <dt className="text-cenere">salvataggi</dt>
        <dd className="tabular-nums">{s.eventi}</dd>
        {s.in_attesa_di_ripresa && (
          <>
            <dt className="text-candela">da riprendere</dt>
            <dd data-testid="master-sessione-attesa" className="text-candela-2">
              turno {s.in_attesa_di_ripresa.turno} (salvata alle {oraBreve(Date.parse(s.in_attesa_di_ripresa.quando))}): riparte con «Inizia sessione» sul proiettore
            </dd>
          </>
        )}
        {s.ripresa && (
          <>
            <dt className="text-cenere">ripresa</dt>
            <dd data-testid="master-sessione-ripresa">
              alle {oraBreve(Date.parse(s.ripresa.quando))}, dal turno {s.ripresa.turno}
            </dd>
          </>
        )}
      </dl>
      <button
        type="button"
        data-testid="master-nuova-sessione"
        data-conferma={String(daConfermare)}
        disabled={inCorso}
        onClick={clic}
        title="Chiude la sessione salvata e ricomincia dall'apertura della prima scena"
        className={classePulsante(daConfermare ? 'pericolo' : 'tenue', 'piccolo', 'self-start')}
      >
        {daConfermare ? 'Confermi? La partita in corso si perde' : 'Nuova sessione'}
      </button>
    </Riquadro>
  );
}
