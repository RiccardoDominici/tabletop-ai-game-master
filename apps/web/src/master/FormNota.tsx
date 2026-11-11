/**
 * Modulo della nota di regia: testo (al massimo NOTA_REGIA_MAX_CARATTERI) e turni (1–turni_max,
 * predefinito turni_max). Spento, con la spiegazione, quando le note sono al completo. A invio
 * riuscito il testo si svuota (i turni restano, spesso si riusano). Cmd/Ctrl+Invio invia.
 */
import { useId, useState, type FormEvent } from 'react';
import { NOTA_REGIA_MAX_CARATTERI } from '@tabletop-ai-gm/shared';
import { useInCorso } from '../store/master';
import { inviaComando } from './sessione';
import { classePulsante } from './stili';
import { controllaNota, testoNoteAlCompleto } from './note';
import { turni as testoTurni } from './etichette';
import { t } from '../lingua';

export function FormNota({ piene, max, turniMax }: { piene: boolean; max: number; turniMax: number }) {
  const [testo, setTesto] = useState('');
  const [turni, setTurni] = useState(String(turniMax));
  const inCorso = useInCorso('nota');
  const idTesto = useId();
  const idTurni = useId();
  const controllo = controllaNota(testo, turni, turniMax);
  const spento = piene || inCorso;

  const invia = async (evento?: FormEvent) => {
    evento?.preventDefault();
    if (spento || !controllo.valida || controllo.turni === null) return;
    const esito = await inviaComando(
      { tipo: 'nota', testo: controllo.testo, turni: controllo.turni },
      t('master.nota.descr', { turni: testoTurni(controllo.turni) }),
    );
    if (esito.ok) setTesto('');
  };

  return (
    <form onSubmit={(e) => void invia(e)} className="mt-1 flex flex-col gap-1.5 border-t border-bordo pt-2" aria-label={t('master.nota.form')}>
      <label htmlFor={idTesto} className="text-xs font-semibold tracking-[0.16em] text-cenere uppercase">
        {t('master.nota.nuova')}
      </label>
      <textarea
        id={idTesto}
        data-testid="master-nota-testo"
        value={testo}
        onChange={(e) => setTesto(e.target.value.slice(0, NOTA_REGIA_MAX_CARATTERI))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void invia();
        }}
        maxLength={NOTA_REGIA_MAX_CARATTERI}
        rows={3}
        disabled={piene}
        placeholder={piene ? '' : t('master.nota.placeholder')}
        className="w-full resize-y rounded-lg border border-bordo-chiaro bg-notte px-2.5 py-1.5 text-sm text-pergamena placeholder:text-cenere/70 focus:border-candela disabled:opacity-40"
      />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor={idTurni} className="text-pergamena-2">
          {t('master.nota.per')}
        </label>
        <input
          id={idTurni}
          data-testid="master-nota-turni"
          type="number"
          inputMode="numeric"
          min={1}
          max={turniMax}
          step={1}
          value={turni}
          onChange={(e) => setTurni(e.target.value)}
          disabled={piene}
          className="w-16 rounded-lg border border-bordo-chiaro bg-notte px-2 py-1 text-pergamena tabular-nums focus:border-candela disabled:opacity-40"
        />
        <span className="text-pergamena-2">{t('master.nota.intervallo', { max: turniMax })}</span>
        <span className="ml-auto text-xs text-cenere tabular-nums">
          {testo.length}/{NOTA_REGIA_MAX_CARATTERI}
        </span>
        <button
          type="submit"
          data-testid="master-nota-invia"
          disabled={spento || !controllo.valida}
          className={classePulsante('primario', 'medio')}
        >
          {t('master.nota.aggiungi')}
        </button>
      </div>
      {piene ? (
        <p data-testid="master-note-piene" className="text-sm text-candela-2">
          {testoNoteAlCompleto(max)}
        </p>
      ) : (
        controllo.problema && <p className="text-sm text-sangue">{controllo.problema}</p>
      )}
    </form>
  );
}
