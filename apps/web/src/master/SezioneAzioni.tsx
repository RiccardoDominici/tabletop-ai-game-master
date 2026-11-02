/**
 * Azioni dei giocatori come le vede il master: le vive (in coda, da decidere) e quelle dell'ultimo
 * turno, PRIVATE COMPRESE (segnate). Una riga per azione (RigaAzione), in ordine di turno e d'invio.
 */
import type { StatoMaster } from '@cantastorie/shared';
import { Riquadro, Vuoto } from './Riquadro';
import { RigaAzione } from './RigaAzione';
import { azioniInOrdine } from './permessi';

export function SezioneAzioni({ stato, className }: { stato: StatoMaster; className?: string }) {
  const azioni = azioniInOrdine(stato.azioni);
  const private_ = azioni.filter((a) => a.privata).length;
  return (
    <Riquadro
      titolo="Azioni"
      conteggio={private_ > 0 ? `${azioni.length} · ${private_} private` : azioni.length}
      zona="azioni"
      data-testid="master-azioni"
      className={className}
      classeCorpo="overflow-y-auto pr-1"
    >
      {azioni.length === 0 ? (
        <Vuoto>Nessuna azione in questo turno.</Vuoto>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {azioni.map((a) => (
            <RigaAzione key={a.id} azione={a} turnoFinestra={stato.tavolo.finestra.turno} />
          ))}
        </ul>
      )}
    </Riquadro>
  );
}
