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
import { SerataMasterRiquadro } from './SerataMaster';
import { useConferma } from './useConferma';
import { localeInterfaccia, t } from '../lingua';

export function SezioneSessione({ stato }: { stato: StatoMaster }) {
  const s = stato.sessione;
  const nuovaInCorso = useInCorso('nuova_sessione');
  const fineInCorso = useInCorso('fine_sessione');
  const prossimaInCorso = useInCorso('prossima_sessione');
  const [confermaNuova, clicNuova] = useConferma(() => void inviaComando({ tipo: 'nuova_sessione' }, t('master.cmd.nuova_sessione')));
  const [confermaFine, clicFine] = useConferma(() => void inviaComando({ tipo: 'fine_sessione' }, t('master.cmd.fine_sessione')));
  const [confermaProssima, clicProssima] = useConferma(() => void inviaComando({ tipo: 'prossima_sessione' }, t('master.cmd.prossima_sessione')));
  if (!s) return null;
  const pacchetti = s.pacchetti;
  const prossima = pacchetti ? statoProssima(pacchetti) : null;

  return (
    <Riquadro titolo={t('master.sessione.titolo')} zona="sessione" data-testid="master-sessione">
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
        <dt className="text-cenere">{t('master.sessione.iniziata')}</dt>
        <dd data-testid="master-sessione-inizio">
          {s.creata
            ? `${new Date(s.creata).toLocaleDateString(localeInterfaccia())} ${oraBreve(Date.parse(s.creata))}`
            : s.registro
              ? t('master.sessione.chiusa')
              : t('master.sessione.non_ancora')}
        </dd>
        <dt className="text-cenere">{t('master.sessione.salvataggi')}</dt>
        <dd className="tabular-nums">{s.eventi}</dd>
        {s.in_attesa_di_ripresa && (
          <>
            <dt className="text-candela">{t('master.sessione.da_riprendere')}</dt>
            <dd data-testid="master-sessione-attesa" className="text-candela-2">
              {t('master.sessione.attesa', { turno: s.in_attesa_di_ripresa.turno, ora: oraBreve(Date.parse(s.in_attesa_di_ripresa.quando)) })}
            </dd>
          </>
        )}
        {s.ripresa && (
          <>
            <dt className="text-cenere">{t('master.sessione.ripresa')}</dt>
            <dd data-testid="master-sessione-ripresa">
              {t('master.sessione.ripresa_da', { ora: oraBreve(Date.parse(s.ripresa.quando)), turno: s.ripresa.turno })}
            </dd>
          </>
        )}
        {s.registro && (
          <>
            <dt className="text-cenere">{t('master.sessione.registro')}</dt>
            <dd data-testid="master-sessione-registro" className="break-all font-mono text-xs" title={s.registro.file}>
              {s.registro.file.split('/').slice(-3).join('/')} · {t('master.turni.plurale', { n: s.registro.turni })}
            </dd>
          </>
        )}
      </dl>
      {s.serata && <SerataMasterRiquadro serata={s.serata} />}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid="master-fine-sessione"
          data-conferma={String(confermaFine)}
          disabled={fineInCorso || s.fine_possibile === false}
          onClick={clicFine}
          title={t('master.sessione.fine_titolo')}
          className={classePulsante(confermaFine ? 'pericolo' : 'normale', 'piccolo')}
        >
          {confermaFine ? t('master.sessione.conferma_fine') : t('master.cmd.fine_sessione')}
        </button>
        <span className="text-xs text-cenere">{t('master.sessione.uscita')}</span>
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
            {confermaProssima ? t('master.sessione.conferma_prossima') : prossima.testo}
          </button>
        )}
        <button
          type="button"
          data-testid="master-nuova-sessione"
          data-conferma={String(confermaNuova)}
          disabled={nuovaInCorso}
          onClick={clicNuova}
          title={t('master.sessione.nuova_titolo')}
          className={classePulsante(confermaNuova ? 'pericolo' : 'tenue', 'piccolo')}
        >
          {confermaNuova ? t('master.sessione.conferma_nuova') : t('master.cmd.nuova_sessione')}
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
