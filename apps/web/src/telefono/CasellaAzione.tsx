/**
 * Casella dell'azione: scrivi, invia (poi «Aggiorna»), ritira, «Pronto».
 *
 * Attiva solo a finestra aperta e se il mio PG è invitato; altrimenti si riduce a una riga
 * (comandi nascosti ma presenti e `disabled`) per lasciare spazio alla trascrizione.
 * La bozza vive qui (stato locale):
 * - a ogni nuova finestra (turno diverso) si azzera;
 * - se il server mi rimanda un'azione in coda e la casella è vuota (es. dopo un ricaricamento),
 *   la si ricopia nella bozza.
 */
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import clsx from 'clsx';
import type { StatoTavolo } from '@cantastorie/shared';
import { useTelefono } from '../store/telefono';
import { MASSIMO_CARATTERI_AZIONE, impostaPronto, inviaAzione, ritiraAzione } from './sessione';
import { azioneDellaFinestra, possoAgire, sonoPronto } from './vista';
import { MiaAzione } from './MiaAzione';

export function CasellaAzione({ stato }: { stato: StatoTavolo }) {
  const idPg = useTelefono((s) => s.idPg);
  const miaAzione = useTelefono((s) => s.miaAzione);
  const occupato = useTelefono((s) => s.occupato);
  const errore = useTelefono((s) => s.errore);

  const attiva = possoAgire(stato, idPg);
  const azioneFinestra = azioneDellaFinestra(stato, miaAzione);
  const inviata = azioneFinestra?.stato === 'in_coda' ? azioneFinestra : null;
  const pronto = sonoPronto(stato, idPg, azioneFinestra);

  const [bozza, setBozza] = useState(inviata?.testo ?? '');

  // Nuova finestra → bozza pulita (o l'azione già in coda per quel turno).
  const turnoFinestra = stato.finestra.turno;
  const turnoDellaBozza = useRef(turnoFinestra);
  useEffect(() => {
    if (turnoDellaBozza.current === turnoFinestra) return;
    turnoDellaBozza.current = turnoFinestra;
    setBozza(inviata?.testo ?? '');
    // Dipende solo dal turno: `inviata` qui si legge, non si osserva (la segue l'effetto sotto).
  }, [turnoFinestra]);

  // Azione rimandata dal server con casella vuota → la si ripristina.
  const testoInviato = inviata?.testo ?? null;
  useEffect(() => {
    if (testoInviato !== null) setBozza((attuale) => (attuale.trim() === '' ? testoInviato : attuale));
  }, [testoInviato]);

  const pulita = bozza.trim();
  const puoInviare = attiva && !occupato && pulita.length > 0 && pulita !== testoInviato;

  const invia = (evento?: FormEvent) => {
    evento?.preventDefault();
    if (puoInviare) void inviaAzione(pulita);
  };

  // Ctrl/Cmd+Invio invia (comodo con la tastiera fisica); Invio semplice va a capo.
  const suTasto = (evento: KeyboardEvent<HTMLTextAreaElement>) => {
    if (evento.key === 'Enter' && (evento.metaKey || evento.ctrlKey)) invia();
  };

  const etichettaPronto = pronto
    ? '✓ Pronto · tocca per annullare'
    : inviata
      ? 'Pronto'
      : 'Pronto (passo il turno)';

  return (
    <form onSubmit={invia} className="flex flex-col gap-2.5" aria-label="La tua azione">
      {miaAzione && (
        <MiaAzione
          azione={miaAzione}
          compatta={attiva && inviata !== null}
          modificheNonInviate={inviata !== null && pulita !== testoInviato && pulita.length > 0}
        />
      )}

      {!attiva && (
        <p className="py-1 text-center text-[0.95rem] text-cenere" data-testid="casella-chiusa">
          La casella si apre quando il narratore ti chiama.
        </p>
      )}

      {/*
        A finestra chiusa i comandi restano nel DOM (testid stabili, `disabled`) ma nascosti:
        il pannello si riduce e lascia spazio alla trascrizione.
      */}
      <div className={attiva ? 'contents' : 'hidden'}>
        <div className="relative">
          <label htmlFor="testo-azione" className="sr-only">
            Cosa fa il tuo personaggio
          </label>
          <textarea
            id="testo-azione"
            data-testid="testo-azione"
            value={bozza}
            onChange={(e) => setBozza(e.target.value.slice(0, MASSIMO_CARATTERI_AZIONE))}
            onKeyDown={suTasto}
            maxLength={MASSIMO_CARATTERI_AZIONE}
            disabled={!attiva}
            rows={3}
            enterKeyHint="send"
            placeholder="Cosa fa il tuo personaggio? Es.: «Sollevo la lanterna e scendo per primo.»"
            className={clsx(
              'block w-full resize-none rounded-xl border border-bordo-chiaro bg-notte-2 px-4 pt-3 pb-7',
              'text-[1.0625rem] leading-snug text-pergamena placeholder:text-cenere',
              'focus:border-candela focus:ring-2 focus:ring-candela/40 focus:outline-none',
            )}
          />
          <span
            className={clsx(
              'pointer-events-none absolute right-3 bottom-2 text-xs tabular-nums',
              bozza.length > MASSIMO_CARATTERI_AZIONE * 0.9 ? 'text-brace' : 'text-cenere',
            )}
            aria-hidden
          >
            {bozza.length}/{MASSIMO_CARATTERI_AZIONE}
          </span>
        </div>

        {errore && (
          <p role="alert" data-testid="errore-azione" className="rounded-lg bg-sangue/10 px-3 py-2 text-[0.95rem] text-sangue">
            {errore}
          </p>
        )}

        <div className="grid grid-cols-[1fr_2fr] gap-2.5">
          <button
            type="button"
            data-testid="ritira-azione"
            disabled={!attiva || !inviata || occupato}
            onClick={() => void ritiraAzione()}
            className="min-h-13 rounded-xl border border-bordo-chiaro px-3 font-semibold text-pergamena-2 transition active:scale-[0.98] disabled:opacity-40"
          >
            Ritira
          </button>
          <button
            type="submit"
            data-testid="invia-azione"
            disabled={!puoInviare}
            className="min-h-13 rounded-xl bg-candela px-4 text-lg font-bold text-notte transition active:scale-[0.98] disabled:bg-notte-4 disabled:text-cenere"
          >
            {inviata ? 'Aggiorna' : 'Invia'}
          </button>
        </div>

        <button
          type="button"
          data-testid="pronto"
          aria-pressed={pronto}
          disabled={!attiva || occupato}
          onClick={() => void impostaPronto(!pronto)}
          className={clsx(
            'min-h-14 rounded-xl border-2 px-4 text-xl font-bold transition active:scale-[0.98] disabled:opacity-40',
            pronto ? 'border-muschio bg-muschio text-notte' : 'border-muschio/70 bg-transparent text-muschio',
          )}
        >
          {etichettaPronto}
        </button>
      </div>

      {/* Errori anche a finestra chiusa (es. un invio arrivato tardi). */}
      {!attiva && errore && (
        <p role="alert" className="rounded-lg bg-sangue/10 px-3 py-2 text-[0.95rem] text-sangue">
          {errore}
        </p>
      )}
    </form>
  );
}
