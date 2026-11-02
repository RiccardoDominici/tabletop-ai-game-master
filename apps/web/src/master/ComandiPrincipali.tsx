/**
 * Comandi principali, sempre in vista in alto: «Pausa» / «Riprendi» e il freno d'emergenza
 * «Ferma la narrazione» (rosso, un clic, nessuna conferma: deve fermare subito LLM e voce).
 * Sotto, l'ultimo errore di un comando qualsiasi (master-errore).
 */
import type { StatoMaster } from '@cantastorie/shared';
import { useInCorso, useMaster } from '../store/master';
import { inviaComando } from './sessione';
import { puoFermareNarrazione, puoMettereInPausa, puoRiprendere } from './permessi';
import { classePulsante } from './stili';
import { oraBreve } from './etichette';

export function ComandiPrincipali({ stato }: { stato: StatoMaster }) {
  const pausaInCorso = useInCorso('pausa');
  const riprendiInCorso = useInCorso('riprendi');
  const fermaInCorso = useInCorso('ferma_narrazione');
  const esito = useMaster((s) => s.esiti.controlli);

  const pausaChiesta = stato.pausa.richiesta && !stato.pausa.attiva;

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Comandi principali">
      <button
        type="button"
        data-testid="master-pausa"
        disabled={!puoMettereInPausa(stato) || pausaInCorso}
        onClick={() => void inviaComando({ tipo: 'pausa' })}
        title="Nessuna nuova finestra: la narrazione in corso finisce, poi il tavolo si ferma."
        className={classePulsante('primario', 'grande')}
      >
        <span aria-hidden>❚❚</span> {pausaChiesta ? 'Pausa chiesta' : 'Pausa'}
      </button>
      <button
        type="button"
        data-testid="master-riprendi"
        disabled={!puoRiprendere(stato) || riprendiInCorso}
        onClick={() => void inviaComando({ tipo: 'riprendi' })}
        title="Riapre la finestra delle azioni (o annulla la pausa chiesta)."
        className={classePulsante('calmo', 'grande')}
      >
        <span aria-hidden>▶</span> Riprendi
      </button>
      <button
        type="button"
        data-testid="master-ferma-narrazione"
        disabled={!puoFermareNarrazione(stato) || fermaInCorso}
        onClick={() => void inviaComando({ tipo: 'ferma_narrazione' })}
        title="Freno d’emergenza: ferma subito LLM e voce e mette il tavolo in pausa."
        className={classePulsante('pericolo', 'grande', 'min-w-56 text-lg font-extrabold')}
      >
        <span aria-hidden>■</span> {fermaInCorso ? 'Fermo…' : 'Ferma la narrazione'}
      </button>
      {esito?.ok && (
        <span role="status" className="text-sm text-muschio">
          Fatto: {esito.descrizione}
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
        <strong className="font-bold">«{errore.descrizione}» rifiutato:</strong> {errore.errore}
      </span>
      <time className="shrink-0 text-xs tabular-nums opacity-80">{oraBreve(errore.ts)}</time>
      <button type="button" onClick={togli} aria-label="Chiudi l’errore" className="shrink-0 rounded px-1 font-bold">
        ×
      </button>
    </p>
  );
}
