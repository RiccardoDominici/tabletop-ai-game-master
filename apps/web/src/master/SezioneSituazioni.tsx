/**
 * Immagini di situazione (`situazione_<png>_<id>`): compaiono sul proiettore solo a comando o da
 * sole dopo la rivelazione giusta (`dopo`). Ogni riga è un interruttore: un clic la mette in onda
 * ({tipo:'situazione', id}), un clic su quella in onda la toglie (id null).
 * Senza spoiler una situazione non in onda non mostra nome, miniatura né rivelazione collegata.
 */
import clsx from 'clsx';
import type { SituazioneMaster, StatoMaster } from '@tabletop-ai-gm/shared';
import { useInCorso, useSenzaSpoiler } from '../store/master';
import { inviaComando } from './sessione';
import { Riquadro } from './Riquadro';
import { Chip } from './Chip';
import { Miniatura } from './Miniatura';
import { t } from '../lingua';

export function SezioneSituazioni({ stato }: { stato: StatoMaster }) {
  const { situazioni } = stato;
  if (situazioni.length === 0) return null;
  const inOnda = situazioni.filter((s) => s.in_onda).length;
  return (
    <Riquadro
      titolo={t('master.situazioni.titolo')}
      conteggio={inOnda > 0 ? t('master.situazioni.conteggio', { totale: situazioni.length, onda: inOnda }) : situazioni.length}
      zona="situazioni"
      data-testid="master-situazioni"
    >
      <ul className="flex flex-col gap-1.5">
        {situazioni.map((s, i) => (
          <li key={s.id}>
            <RigaSituazione situazione={s} indice={i} />
          </li>
        ))}
      </ul>
    </Riquadro>
  );
}

function RigaSituazione({ situazione, indice }: { situazione: SituazioneMaster; indice: number }) {
  // Mostrare e togliere condividono la chiave (comandi.ts): un solo comando alla volta.
  const inCorso = useInCorso('situazione');
  const { in_onda: inOnda } = situazione;
  // In onda è già sul proiettore (pubblica); le altre, senza spoiler, restano coperte.
  const coperta = useSenzaSpoiler() && !inOnda;
  const nome = coperta ? t('master.situazioni.coperta', { n: indice + 1 }) : situazione.nome;
  const alterna = () =>
    void inviaComando(
      { tipo: 'situazione', id: inOnda ? null : situazione.id },
      inOnda ? t('master.situazioni.togli', { nome }) : t('master.situazioni.mostra', { nome }),
    );

  return (
    <button
      type="button"
      data-testid={`master-situazione-${situazione.id}`}
      data-in-onda={String(inOnda)}
      data-coperta={String(coperta)}
      aria-pressed={inOnda}
      disabled={inCorso}
      onClick={alterna}
      title={inOnda ? t('master.situazioni.togli_titolo') : t('master.situazioni.metti_titolo')}
      className={clsx(
        'flex w-full items-center gap-2.5 rounded-lg border p-1.5 text-left text-sm transition-colors disabled:opacity-60',
        inOnda ? 'border-brace bg-brace/10' : 'border-bordo bg-notte-3 enabled:hover:border-candela/60 enabled:hover:bg-notte-4',
      )}
    >
      {coperta ? <span aria-hidden className="h-10 w-18 shrink-0 rounded border border-bordo bg-notte" /> : <Miniatura url={situazione.url} alt="" className="h-10 w-18" />}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{nome}</span>
        <span className="block truncate text-xs text-cenere">
          {!coperta && situazione.png ? `${situazione.png} · ` : ''}
          {situazione.dopo ? (coperta ? t('master.situazioni.dopo_coperta') : t('master.situazioni.dopo', { dopo: situazione.dopo })) : t('master.situazioni.solo_comando')}
        </span>
      </span>
      {inOnda ? <Chip tono="brace">{t('master.situazioni.in_onda_togli')}</Chip> : <span className="shrink-0 text-xs font-semibold text-pergamena-2">{t('master.situazioni.mostra_btn')}</span>}
    </button>
  );
}
