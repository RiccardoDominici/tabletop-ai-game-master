/**
 * Immagini di situazione (`situazione_<png>_<id>`): compaiono sul proiettore solo a comando o da
 * sole dopo la rivelazione giusta (`dopo`). Ogni riga è un interruttore: un clic la mette in onda
 * ({tipo:'situazione', id}), un clic su quella in onda la toglie (id null).
 */
import clsx from 'clsx';
import type { SituazioneMaster, StatoMaster } from '@cantastorie/shared';
import { useInCorso } from '../store/master';
import { inviaComando } from './sessione';
import { Riquadro } from './Riquadro';
import { Chip } from './Chip';
import { Miniatura } from './Miniatura';

export function SezioneSituazioni({ stato }: { stato: StatoMaster }) {
  const { situazioni } = stato;
  if (situazioni.length === 0) return null;
  const inOnda = situazioni.filter((s) => s.in_onda).length;
  return (
    <Riquadro
      titolo="Situazioni"
      conteggio={inOnda > 0 ? `${situazioni.length} · ${inOnda} in onda` : situazioni.length}
      zona="situazioni"
      data-testid="master-situazioni"
    >
      <ul className="flex flex-col gap-1.5">
        {situazioni.map((s) => (
          <li key={s.id}>
            <RigaSituazione situazione={s} />
          </li>
        ))}
      </ul>
    </Riquadro>
  );
}

function RigaSituazione({ situazione }: { situazione: SituazioneMaster }) {
  // Mostrare e togliere condividono la chiave (comandi.ts): un solo comando alla volta.
  const inCorso = useInCorso('situazione');
  const { in_onda: inOnda } = situazione;
  const alterna = () =>
    void inviaComando(
      { tipo: 'situazione', id: inOnda ? null : situazione.id },
      inOnda ? `Togli «${situazione.nome}»` : `Mostra «${situazione.nome}»`,
    );

  return (
    <button
      type="button"
      data-testid={`master-situazione-${situazione.id}`}
      data-in-onda={String(inOnda)}
      aria-pressed={inOnda}
      disabled={inCorso}
      onClick={alterna}
      title={inOnda ? 'Togli l’immagine dal proiettore' : 'Metti l’immagine sul proiettore'}
      className={clsx(
        'flex w-full items-center gap-2.5 rounded-lg border p-1.5 text-left text-sm transition-colors disabled:opacity-60',
        inOnda ? 'border-brace bg-brace/10' : 'border-bordo bg-notte-3 enabled:hover:border-candela/60 enabled:hover:bg-notte-4',
      )}
    >
      <Miniatura url={situazione.url} alt="" className="h-10 w-18" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{situazione.nome}</span>
        <span className="block truncate text-xs text-cenere">
          {situazione.png ? `${situazione.png} · ` : ''}
          {situazione.dopo ? `compare da sola dopo «${situazione.dopo}»` : 'solo a comando'}
        </span>
      </span>
      {inOnda ? <Chip tono="brace">in onda · togli</Chip> : <span className="shrink-0 text-xs font-semibold text-pergamena-2">Mostra</span>}
    </button>
  );
}
