/**
 * Barra dell'iniziativa sul proiettore: il round, la fase e una scheda per combattente (nome, barra
 * dei PF, condizioni, chi tocca adesso, chi è a terra, morto o fuggito). Compare solo quando lo
 * scontro c'è (`stato.combattimento`).
 *
 * Dove: nella testata della scena, sotto il titolo, al posto della fila dei ritratti (FilaPersonaggi,
 * che PaginaSchermo nasconde durante lo scontro: alta quanto un ritratto da 9vw, spingeva il sottotitolo sui nomi).
 * Allineata a sinistra e larga al massimo come il titolo (70vw): non tocca la colonna delle carte a
 * destra (17vw), il QR in basso né i sottotitoli. Con più di SOGLIA_INIZIALI combattenti i nomi
 * diventano iniziali.
 *
 * Per i PNG si vede solo la barra; per i PG anche i numeri (7/12). Con iniziativa «nessuna» non si
 * evidenzia nessuno: si vedono solo le schede.
 */
import clsx from 'clsx';
import type { CombattentePubblico, CombattimentoPubblico } from '@cantastorie/shared';
import {
  CLASSE_TONO_PF,
  etichettaRound,
  etichettaStato,
  etichettaTiriMorte,
  eSbiadito,
  iniziali,
  ordinaCombattenti,
  quotaPf,
  SOGLIA_INIZIALI,
  testoPf,
  tonoPf,
} from '../lib/combattimento';

export function BarraIniziativa({ combattimento }: { combattimento: CombattimentoPubblico | null | undefined }) {
  if (!combattimento) return null;
  const ordinati = ordinaCombattenti(combattimento.combattenti);
  const molti = ordinati.length > SOGLIA_INIZIALI;
  const conOrdine = combattimento.iniziativa !== 'nessuna';
  return (
    <section data-testid="barra-iniziativa" aria-label="Iniziativa" className="flex max-w-full flex-wrap items-center gap-x-[1.2vw] gap-y-[1vh]">
      <p
        data-testid="barra-round"
        className="rounded-lg border border-candela/60 bg-notte/85 px-[0.9vw] py-[0.6vh] font-titolo text-[1.2vw] leading-none font-semibold whitespace-nowrap text-candela-2"
      >
        {etichettaRound(combattimento.round, combattimento.fase)}
      </p>
      <ol className="flex min-w-0 flex-wrap items-stretch gap-[0.6vw]">
        {ordinati.map((c) => (
          <Scheda key={c.id} combattente={c} molti={molti} evidenzia={conOrdine} />
        ))}
      </ol>
    </section>
  );
}

function Scheda({ combattente: c, molti, evidenzia }: { combattente: CombattentePubblico; molti: boolean; evidenzia: boolean }) {
  const corrente = evidenzia && c.corrente;
  const etichetta = etichettaStato(c.stato);
  const testo = testoPf(c);
  const quota = c.pf ? quotaPf(c.pf.attuali, c.pf.massimi) : 0;
  const nome = molti ? iniziali(c.nome) : c.nome;
  return (
    <li
      data-testid={`combattente-${c.id}`}
      data-corrente={String(corrente)}
      data-stato={c.stato}
      className={clsx(
        'flex min-w-[7vw] max-w-[14vw] flex-col gap-[0.5vh] rounded-xl border bg-notte/85 px-[0.7vw] py-[0.6vh] transition',
        corrente ? 'scale-105 border-[0.25vw] border-candela-2 shadow-candela' : 'border-bordo-chiaro',
        eSbiadito(c) && 'opacity-55',
      )}
    >
      <div className="flex items-baseline justify-between gap-[0.5vw]">
        <span className={clsx('truncate text-[1.15vw] leading-tight font-semibold', corrente ? 'text-candela-2' : 'text-pergamena')} title={c.nome}>
          {nome}
        </span>
        {c.condizioni.length > 0 && (
          <span className="flex shrink-0 gap-[0.2vw] text-[1.1vw] leading-none">
            {c.condizioni.map((k) => (
              <span key={k.id} title={k.nome} aria-label={k.nome}>
                {k.icona}
              </span>
            ))}
          </span>
        )}
      </div>
      {c.pf && (
        <div className="flex items-center gap-[0.5vw]">
          <div className="h-[0.9vh] min-w-[4vw] flex-1 overflow-hidden rounded-full bg-notte-4" role="meter" aria-valuemin={0} aria-valuemax={c.pf.massimi} aria-valuenow={c.pf.attuali} aria-label={`Punti ferita di ${c.nome}`}>
            <div className={clsx('h-full rounded-full', CLASSE_TONO_PF[tonoPf(c.pf.attuali, c.pf.massimi)])} style={{ width: `${quota * 100}%` }} />
          </div>
          {testo && <span className="font-mono text-[0.95vw] leading-none text-pergamena-2">{testo}</span>}
        </div>
      )}
      {(etichetta || c.tiri_morte) && (
        <div className="flex flex-wrap items-baseline gap-x-[0.6vw] text-[0.95vw] leading-tight text-cenere">
          {etichetta && <span>{etichetta}</span>}
          {c.tiri_morte && <span className="font-mono">{etichettaTiriMorte(c.tiri_morte)}</span>}
        </div>
      )}
    </li>
  );
}
