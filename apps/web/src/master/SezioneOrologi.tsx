/**
 * Orologi delle minacce: caselle (piene, la prossima evidenziata, vuote), i segni già mostrati e il
 * prossimo, i segni futuri piegati, il badge «dovuto» (il ritmo minimo impone di mostrarlo nella
 * prossima risposta) e cosa succede a orologio completo. −1 / +1 correggono di un segno.
 * Senza spoiler: «Orologio N · segni 1/6 · dovuto», senza nome, segni né «a orologio completo».
 */
import clsx from 'clsx';
import type { OrologioMaster, StatoMaster } from '@tabletop-ai-gm/shared';
import { useInCorso, useSenzaSpoiler } from '../store/master';
import { nomeOrologio } from './spoiler';
import { inviaComando } from './sessione';
import { Riquadro, Vuoto } from './Riquadro';
import { Chip } from './Chip';
import { classePulsante } from './stili';
import {
  caselleOrologio,
  frazioneOrologio,
  orologioCompleto,
  puoArretrare,
  puoAvanzare,
  testoUltimoSegno,
  type CasellaOrologio,
} from './orologi';
import { t } from '../lingua';

export function SezioneOrologi({ stato }: { stato: StatoMaster }) {
  const dovuti = stato.orologi.filter((o) => o.dovuto).length;
  return (
    <Riquadro
      titolo={t('master.orologi.titolo')}
      conteggio={dovuti > 0 ? t('master.orologi.conteggio', { n: stato.orologi.length, dovuti }) : stato.orologi.length}
      zona="orologi"
      data-testid="master-orologi"
    >
      {stato.orologi.length === 0 ? (
        <Vuoto>{t('master.orologi.nessuno')}</Vuoto>
      ) : (
        <ul className="flex flex-col gap-2">
          {stato.orologi.map((o, i) => (
            <li key={o.id}>
              <Orologio orologio={o} indice={i} />
            </li>
          ))}
        </ul>
      )}
    </Riquadro>
  );
}

function Orologio({ orologio, indice }: { orologio: OrologioMaster; indice: number }) {
  const inCorso = useInCorso(`orologio:${orologio.id}`);
  const senzaSpoiler = useSenzaSpoiler();
  const nome = nomeOrologio(orologio.nome, indice, senzaSpoiler);
  const caselle = caselleOrologio(orologio);
  const completo = orologioCompleto(orologio);
  const passo = (verso: 1 | -1) =>
    void inviaComando({ tipo: 'orologio', id: orologio.id, passo: verso }, t('master.orologi.descr', { nome, passo: verso > 0 ? '+1' : '−1' }));

  return (
    <div
      data-testid={`master-orologio-${orologio.id}`}
      data-pieni={orologio.pieni}
      data-segmenti={orologio.segmenti}
      data-dovuto={String(orologio.dovuto)}
      className={clsx(
        'rounded-lg border bg-notte-3/60 px-3 py-2',
        orologio.dovuto ? 'border-brace/80' : completo ? 'border-sangue/60' : 'border-bordo',
      )}
    >
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate font-semibold" title={senzaSpoiler ? undefined : orologio.id}>
          {nome}
        </p>
        <span data-testid={`master-orologio-${orologio.id}-segni`} className="font-semibold tabular-nums text-pergamena-2">
          {senzaSpoiler ? t('master.orologi.segni', { frazione: frazioneOrologio(orologio) }) : frazioneOrologio(orologio)}
        </span>
        {orologio.dovuto && (
          <Chip tono="brace" titolo={t('master.orologi.dovuto_titolo')}>
            {t('master.orologi.dovuto')}
          </Chip>
        )}
        {completo && <Chip tono="sangue">{t('master.orologi.completo')}</Chip>}
        {!orologio.partito && (
          <Chip titolo={t('master.orologi.non_partito_titolo')} testid={`master-orologio-${orologio.id}-fermo`}>
            {t('master.orologi.non_partito')}
          </Chip>
        )}
        <button
          type="button"
          data-testid={`master-orologio-${orologio.id}-indietro`}
          disabled={!puoArretrare(orologio) || inCorso}
          onClick={() => passo(-1)}
          aria-label={t('master.orologi.indietro', { nome })}
          className={classePulsante('normale', 'piccolo', 'w-10 tabular-nums')}
        >
          −1
        </button>
        <button
          type="button"
          data-testid={`master-orologio-${orologio.id}-avanti`}
          disabled={!puoAvanzare(orologio) || inCorso}
          onClick={() => passo(1)}
          aria-label={t('master.orologi.avanti', { nome })}
          className={classePulsante('normale', 'piccolo', 'w-10 tabular-nums')}
        >
          +1
        </button>
      </div>

      <ol className="mt-1.5 flex flex-wrap gap-1" aria-label={t('master.orologi.segmenti')}>
        {caselle.map((c) => (
          <li
            key={c.indice}
            title={senzaSpoiler ? undefined : (c.segno ?? undefined)}
            className={clsx(
              'h-4 w-7 rounded-sm border',
              c.stato === 'pieno' && 'border-brace bg-brace',
              c.stato === 'prossimo' && 'border-candela bg-candela/20 ring-1 ring-candela/60',
              c.stato === 'vuoto' && 'border-bordo-chiaro bg-notte',
            )}
          />
        ))}
      </ol>

      {!senzaSpoiler && <Segni caselle={caselle} />}

      <p className="mt-1 text-xs text-cenere">
        {testoUltimoSegno(orologio)}
        {orologio.al_completo && !senzaSpoiler && (
          <>
            {' · '}
            <span className={completo ? 'font-semibold text-sangue' : 'text-pergamena-2'}>{t('master.orologi.al_completo', { testo: orologio.al_completo ?? '' })}</span>
          </>
        )}
      </p>
    </div>
  );
}

/** Segni mostrati (spenti, con ✓) e il prossimo (in evidenza); i futuri piegati in un <details>. */
function Segni({ caselle }: { caselle: CasellaOrologio[] }) {
  const conTesto = caselle.filter((c) => c.segno !== null);
  if (conTesto.length === 0) return null;
  const visibili = conTesto.filter((c) => c.stato !== 'vuoto');
  const futuri = conTesto.filter((c) => c.stato === 'vuoto');
  return (
    <div className="mt-1.5 text-sm">
      <ol className="flex flex-col gap-0.5">
        {visibili.map((c) => (
          <RigaSegno key={c.indice} casella={c} />
        ))}
      </ol>
      {futuri.length > 0 && (
        <details className="mt-0.5">
          <summary className="cursor-pointer text-xs text-cenere select-none">
            {futuri.length === 1 ? t('master.orologi.un_altro') : t('master.orologi.altri', { n: futuri.length })}
          </summary>
          <ol className="mt-0.5 flex flex-col gap-0.5">
            {futuri.map((c) => (
              <RigaSegno key={c.indice} casella={c} />
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}

function RigaSegno({ casella }: { casella: CasellaOrologio }) {
  return (
    <li
      data-stato={casella.stato}
      className={clsx(
        'flex gap-1.5 leading-snug',
        casella.stato === 'pieno' && 'text-cenere',
        casella.stato === 'prossimo' && 'rounded border-l-2 border-candela bg-candela/10 px-1.5 py-0.5 text-pergamena',
        casella.stato === 'vuoto' && 'text-cenere/80',
      )}
    >
      <span className="w-5 shrink-0 text-right tabular-nums">{casella.indice + 1}.</span>
      <span className="min-w-0 flex-1">
        {casella.stato === 'prossimo' && <strong className="mr-1 font-semibold text-candela">{t('master.orologi.prossimo')}</strong>}
        {casella.segno}
        {casella.stato === 'pieno' && <span aria-label={t('master.orologi.gia_mostrato')}> ✓</span>}
      </span>
    </li>
  );
}
