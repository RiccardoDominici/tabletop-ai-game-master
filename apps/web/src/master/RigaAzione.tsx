/**
 * Una riga d'azione nel pannello: autore, chip di stato, «privata» (bordo tratteggiato blu: il
 * master la vede, gli altri giocatori no), turno e ora d'invio, testo, motivo, legami
 * (dipendenze, conflitti) e «Salta» quando il server dice che si può.
 */
import clsx from 'clsx';
import type { AzioneMaster } from '@cantastorie/shared';
import { useInCorso } from '../store/master';
import { inviaComando } from './sessione';
import { Chip } from './Chip';
import { classePulsante } from './stili';
import { ETICHETTA_STATO_AZIONE_MASTER, oraBreve, TONO_STATO_AZIONE } from './etichette';
import { righeLegami } from './legami';

export function RigaAzione({ azione, turnoFinestra }: { azione: AzioneMaster; turnoFinestra: number }) {
  const inCorso = useInCorso(`salta_azione:${azione.id}`);
  const legami = righeLegami(azione);
  // Scritta a finestra chiusa (o mentre si chiudeva): entra nel turno dopo.
  const prossimoTurno = azione.turno > turnoFinestra && (azione.stato === 'in_coda' || azione.stato === 'da_confermare');

  return (
    <li
      data-testid={`master-azione-${azione.id}`}
      data-stato={azione.stato}
      data-privata={String(azione.privata)}
      className={clsx(
        'rounded-lg border px-3 py-2',
        azione.privata ? 'border-dashed border-lago/80 bg-lago/5' : 'border-bordo bg-notte-3/60',
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <strong className="font-bold text-pergamena">{azione.nome}</strong>
        {azione.privata && (
          <Chip tono="lago" titolo="Azione privata: i telefoni degli altri non la vedono" testid={`master-azione-${azione.id}-privata`}>
            privata
          </Chip>
        )}
        <Chip tono={TONO_STATO_AZIONE[azione.stato]}>{ETICHETTA_STATO_AZIONE_MASTER[azione.stato]}</Chip>
        {azione.pronto && <span className="text-xs font-semibold text-muschio">✓ pronto</span>}
        <span className="text-xs text-cenere tabular-nums">
          turno {azione.turno}
          {prossimoTurno && ' (prossimo)'} · {oraBreve(azione.inviata_alle)}
        </span>
        {azione.saltabile && (
          <button
            type="button"
            data-testid={`master-salta-${azione.id}`}
            disabled={inCorso}
            onClick={() => void inviaComando({ tipo: 'salta_azione', id_azione: azione.id }, `Salta l’azione di ${azione.nome}`)}
            title="Non entra nel turno: torna nella casella del giocatore, da riscrivere."
            className={classePulsante('normale', 'piccolo', 'ml-auto')}
          >
            Salta
          </button>
        )}
      </div>

      <p className="mt-1 leading-snug break-words text-pergamena">{azione.testo}</p>

      {azione.motivo && (
        <p className="mt-0.5 text-sm text-candela-2 italic">
          <span className="not-italic text-cenere">motivo:</span> {azione.motivo}
        </p>
      )}

      {legami.length > 0 && (
        <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
          {legami.map((l, i) => (
            <li
              key={`${l.tipo}-${i}`}
              data-tipo={l.tipo}
              className={clsx(l.tipo === 'dipendenza' ? 'text-lago' : l.perde ? 'font-semibold text-sangue' : 'text-brace')}
            >
              {l.tipo === 'dipendenza' ? '↳ ' : '⚔ '}
              {l.testo}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
