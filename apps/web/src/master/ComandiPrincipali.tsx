/**
 * Comandi principali, sempre in vista in alto: «Pausa» / «Riprendi» e il freno d'emergenza
 * «Ferma la narrazione» (rosso, un clic, nessuna conferma: deve fermare subito LLM e voce).
 * Sotto, l'ultimo errore di un comando qualsiasi (master-errore).
 */
import type { StatoMaster } from '@tabletop-ai-gm/shared';
import { useInCorso, useMaster } from '../store/master';
import { inviaComando } from './sessione';
import { puoFermareNarrazione, puoMettereInPausa, puoRiprendere } from './permessi';
import { classePulsante } from './stili';
import { oraBreve } from './etichette';
import { t } from '../lingua';

export function ComandiPrincipali({ stato }: { stato: StatoMaster }) {
  const pausaInCorso = useInCorso('pausa');
  const riprendiInCorso = useInCorso('riprendi');
  const fermaInCorso = useInCorso('ferma_narrazione');
  const esito = useMaster((s) => s.esiti.controlli);

  const pausaChiesta = stato.pausa.richiesta && !stato.pausa.attiva;

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('master.comandi.gruppo')}>
      <button
        type="button"
        data-testid="master-pausa"
        disabled={!puoMettereInPausa(stato) || pausaInCorso}
        onClick={() => void inviaComando({ tipo: 'pausa' })}
        title={t('master.comandi.pausa_titolo')}
        className={classePulsante('primario', 'grande')}
      >
        <span aria-hidden>❚❚</span> {pausaChiesta ? t('master.comandi.pausa_chiesta') : t('master.cmd.pausa')}
      </button>
      <button
        type="button"
        data-testid="master-riprendi"
        disabled={!puoRiprendere(stato) || riprendiInCorso}
        onClick={() => void inviaComando({ tipo: 'riprendi' })}
        title={t('master.comandi.riprendi_titolo')}
        className={classePulsante('calmo', 'grande')}
      >
        <span aria-hidden>▶</span> {t('master.cmd.riprendi')}
      </button>
      <button
        type="button"
        data-testid="master-ferma-narrazione"
        disabled={!puoFermareNarrazione(stato) || fermaInCorso}
        onClick={() => void inviaComando({ tipo: 'ferma_narrazione' })}
        title={t('master.comandi.ferma_titolo')}
        className={classePulsante('pericolo', 'grande', 'min-w-56 text-lg font-extrabold')}
      >
        <span aria-hidden>■</span> {fermaInCorso ? t('master.comandi.fermo') : t('master.cmd.ferma_narrazione')}
      </button>
      {esito?.ok && (
        <span role="status" className="text-sm text-muschio">
          {t('master.esito.fatto', { descrizione: esito.descrizione })}
        </span>
      )}
    </div>
  );
}

/** Ultimo comando rifiutato, di qualunque zona (si toglie al prossimo comando riuscito). */
export function UltimoErrore() {
  const errore = useMaster((s) => s.ultimoErrore);
  const togli = useMaster((s) => s.togliUltimoErrore);
  if (!errore) return null;
  return (
    <p
      role="alert"
      data-testid="master-errore"
      data-comando={errore.tipo}
      className="flex items-start gap-3 rounded-lg border border-sangue/70 bg-sangue/15 px-3 py-2 text-sm text-sangue"
    >
      <span className="min-w-0 flex-1">
        <strong className="font-bold">{t('master.esito.rifiutato', { descrizione: errore.descrizione })}</strong> {errore.errore}
      </span>
      <time className="shrink-0 text-xs tabular-nums opacity-80">{oraBreve(errore.ts)}</time>
      <button type="button" onClick={togli} aria-label={t('master.comandi.chiudi_errore')} className="shrink-0 rounded px-1 font-bold">
        ×
      </button>
    </p>
  );
}
