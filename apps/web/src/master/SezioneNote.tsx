/**
 * Note di regia: entrano nel messaggio del narratore per i prossimi N turni (al massimo
 * `limiti_note.max` insieme). Lista con turni rimasti e «Togli», poi il modulo (FormNota).
 */
import type { NotaRegia, StatoMaster } from '@cantastorie/shared';
import { useInCorso } from '../store/master';
import { inviaComando } from './sessione';
import { Riquadro, Vuoto } from './Riquadro';
import { classePulsante } from './stili';
import { FormNota } from './FormNota';
import { testoTurniNota } from './note';
import { etichettaTurno } from './etichette';
import { t } from '../lingua';

export function SezioneNote({ stato }: { stato: StatoMaster }) {
  const { note, limiti_note: limiti } = stato;
  return (
    <Riquadro titolo={t('master.note.titolo')} conteggio={`${note.length}/${limiti.max}`} zona="note" data-testid="master-note">
      {note.length === 0 ? (
        <Vuoto>{t('master.note.nessuna')}</Vuoto>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {note.map((n) => (
            <RigaNota key={n.id} nota={n} />
          ))}
        </ul>
      )}
      <FormNota piene={note.length >= limiti.max} max={limiti.max} turniMax={limiti.turni_max} />
    </Riquadro>
  );
}

function RigaNota({ nota }: { nota: NotaRegia }) {
  const inCorso = useInCorso(`togli_nota:${nota.id}`);
  // Barra dei turni rimasti: si svuota man mano che la nota si consuma.
  const quota = nota.turni_totali > 0 ? Math.max(0, Math.min(1, nota.turni_rimasti / nota.turni_totali)) : 0;
  return (
    <li
      data-testid={`master-nota-${nota.id}`}
      data-turni-rimasti={nota.turni_rimasti}
      className="rounded-lg border border-bordo bg-notte-3/60 px-3 py-2"
    >
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 leading-snug break-words whitespace-pre-wrap text-pergamena">{nota.testo}</p>
        <button
          type="button"
          data-testid={`master-togli-nota-${nota.id}`}
          disabled={inCorso}
          onClick={() => void inviaComando({ tipo: 'togli_nota', id: nota.id }, t('master.note.descr_togli'))}
          className={classePulsante('tenue', 'piccolo')}
        >
          {t('master.note.togli')}
        </button>
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-cenere">
        <span className="tabular-nums">
          {nota.turni_rimasti}/{nota.turni_totali}
        </span>
        <span className="h-1 flex-1 overflow-hidden rounded-full bg-notte" aria-hidden>
          <span className="block h-full rounded-full bg-candela/70" style={{ width: `${quota * 100}%` }} />
        </span>
        <span>
          {testoTurniNota(nota)} · {t('master.note.scritta_al', { turno: etichettaTurno(nota.creata_al_turno) })}
        </span>
      </div>
    </li>
  );
}
