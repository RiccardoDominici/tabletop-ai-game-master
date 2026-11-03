/**
 * Sessione salvata: il server scrive il gioco nel registro e, dopo un riavvio, lo riprende da solo.
 * Qui il master vede da quando dura la sessione, se è stata ripresa (quando e da che turno) o se
 * una ripresa aspetta il proiettore, e:
 * - «Fine sessione»: ferma il gioco, chiude la sessione e fa scrivere al server il registro
 *   (registro.yaml: la base della preparazione della sessione dopo, docs/strati.md);
 * - «Prossima sessione» (campagne a più sessioni): passa al pacchetto dopo, se c'è e si carica; il
 *   pannello si ricollega da solo al server ricostruito;
 * - «Nuova sessione»: ricomincia da capo la stessa (la partita in corso si perde).
 * I tre comandi non si annullano: si confermano col secondo clic (useConferma).
 */
import type { StatoMaster } from '@cantastorie/shared';
import { useInCorso } from '../store/master';
import { inviaComando } from './sessione';
import { Riquadro } from './Riquadro';
import { classePulsante } from './stili';
import { oraBreve } from './etichette';
import { rigaPacchetto, statoProssima } from './pacchetti';
import { TelefoniRicordati } from './TelefoniRicordati';
import { useConferma } from './useConferma';

export function SezioneSessione({ stato }: { stato: StatoMaster }) {
  const s = stato.sessione;
  const nuovaInCorso = useInCorso('nuova_sessione');
  const fineInCorso = useInCorso('fine_sessione');
  const prossimaInCorso = useInCorso('prossima_sessione');
  const [confermaNuova, clicNuova] = useConferma(() => void inviaComando({ tipo: 'nuova_sessione' }, 'Nuova sessione'));
  const [confermaFine, clicFine] = useConferma(() => void inviaComando({ tipo: 'fine_sessione' }, 'Fine sessione'));
  const [confermaProssima, clicProssima] = useConferma(() => void inviaComando({ tipo: 'prossima_sessione' }, 'Prossima sessione'));
  if (!s) return null;
  const pacchetti = s.pacchetti;
  const prossima = pacchetti ? statoProssima(pacchetti) : null;

  return (
    <Riquadro titolo="Sessione" zona="sessione" data-testid="master-sessione">
      {pacchetti && (
        <p data-testid="master-pacchetto" className="text-sm font-semibold text-pergamena">
          {rigaPacchetto(pacchetti)}
        </p>
      )}
      {pacchetti?.avviso && (
        <p data-testid="master-pacchetto-avviso" className="text-sm text-candela-2">
          {pacchetti.avviso}
        </p>
      )}
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
        {s.registro && (
          <>
            <dt className="text-cenere">registro</dt>
            <dd data-testid="master-sessione-registro" className="break-all font-mono text-xs" title={s.registro.file}>
              {s.registro.file.split('/').slice(-3).join('/')} · {s.registro.turni} turni
            </dd>
          </>
        )}
      </dl>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="master-fine-sessione"
          data-conferma={String(confermaFine)}
          disabled={fineInCorso || s.fine_possibile === false}
          onClick={clicFine}
          title="Ferma il gioco, chiude la sessione e scrive il registro (registro.yaml)"
          className={classePulsante(confermaFine ? 'pericolo' : 'normale', 'piccolo')}
        >
          {confermaFine ? 'Confermi la fine della sessione?' : 'Fine sessione'}
        </button>
        {prossima && (
          <button
            type="button"
            data-testid="master-prossima-sessione"
            data-conferma={String(confermaProssima)}
            disabled={prossimaInCorso || !prossima.abilitato}
            onClick={clicProssima}
            title={prossima.spiegazione}
            className={classePulsante(confermaProssima ? 'pericolo' : 'primario', 'piccolo')}
          >
            {confermaProssima ? 'Confermi? Questa sessione si chiude' : prossima.testo}
          </button>
        )}
        <button
          type="button"
          data-testid="master-nuova-sessione"
          data-conferma={String(confermaNuova)}
          disabled={nuovaInCorso}
          onClick={clicNuova}
          title="Chiude la sessione salvata e ricomincia dall'apertura della prima scena"
          className={classePulsante(confermaNuova ? 'pericolo' : 'tenue', 'piccolo')}
        >
          {confermaNuova ? 'Confermi? La partita in corso si perde' : 'Nuova sessione'}
        </button>
      </div>
      {prossima && !prossima.abilitato && (
        <p data-testid="master-prossima-motivo" className="text-xs text-cenere">
          {prossima.spiegazione}
        </p>
      )}
      {s.telefoni && <TelefoniRicordati telefoni={s.telefoni} pg={stato.tavolo.pg} />}
    </Riquadro>
  );
}
