/**
 * Finestra delle azioni: aperta o chiusa, turno che prepara, invitati (ha inviato sì/no: inviare =
 * ha finito), chi ha scritto senza invito, «Aspettiamo: …», il ritmo del tavolo (calmo = nessuna
 * scadenza; concitato = conto alla rovescia, orologio del server) e «Risolvi ora» (solo a finestra
 * aperta e tavolo non in pausa: il narratore risponde subito, senza aspettare chi manca).
 */
import clsx from 'clsx';
import type { StatoMaster } from '@tabletop-ai-gm/shared';
import { testoAttesa } from '../lib/attesa';
import { secondiRimasti } from '../lib/formato';
import { useOra } from '../lib/useOra';
import { useInCorso } from '../store/master';
import { inviaComando } from './sessione';
import { Riquadro, Vuoto } from './Riquadro';
import { Chip } from './Chip';
import { classePulsante } from './stili';
import { righeInvitati } from './finestra';
import { puoChiudereFinestra } from './permessi';
import { t } from '../lingua';

export function SezioneFinestra({ stato }: { stato: StatoMaster }) {
  const { finestra, ritmo } = stato.tavolo;
  const inCorso = useInCorso('chiudi_finestra');
  const ritmoInCorso = useInCorso('ritmo');
  // In pausa la finestra non si chiude: un conto alla rovescia che scende a 0 ingannerebbe.
  const conScadenza = finestra.aperta && finestra.chiusura_prevista_ms !== null && !stato.pausa.attiva;
  const ora = useOra(conScadenza);
  const secondi = conScadenza && finestra.chiusura_prevista_ms !== null ? secondiRimasti(finestra.chiusura_prevista_ms, ora) : null;
  const righe = righeInvitati(stato.tavolo);
  const attesa = testoAttesa(stato.tavolo);
  const altroRitmo = ritmo === 'concitato' ? 'calmo' : 'concitato';

  return (
    <Riquadro
      titolo={t('master.finestra.titolo')}
      conteggio={t('master.turno.numero', { n: finestra.turno })}
      zona="finestra"
      data-testid="master-finestra"
      data-aperta={String(finestra.aperta)}
      azioni={
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            data-testid="master-ritmo"
            data-ritmo={ritmo}
            disabled={ritmoInCorso}
            onClick={() => void inviaComando({ tipo: 'ritmo', ritmo: altroRitmo }, t('master.finestra.descr_ritmo', { ritmo: t(altroRitmo === 'calmo' ? 'master.ritmo.calmo' : 'master.ritmo.concitato') }))}
            title={
              ritmo === 'concitato'
                ? t('master.finestra.ritmo_torna_titolo')
                : t('master.finestra.ritmo_concitato_titolo')
            }
            className={classePulsante('normale', 'medio')}
          >
            {ritmo === 'concitato' ? t('master.finestra.ritmo_calmo') : t('master.finestra.ritmo_concitato')}
          </button>
          <button
            type="button"
            data-testid="master-chiudi-finestra"
            disabled={!puoChiudereFinestra(stato) || inCorso}
            onClick={() => void inviaComando({ tipo: 'chiudi_finestra' }, t('master.cmd.chiudi_finestra'))}
            title={t('master.finestra.risolvi_titolo')}
            className={classePulsante('primario', 'medio')}
          >
            {t('master.cmd.chiudi_finestra')}
          </button>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {finestra.aperta ? <Chip tono="muschio">{t('master.finestra.aperta')}</Chip> : <Chip tono="cenere">{t('master.finestra.chiusa')}</Chip>}
        <span data-testid="master-ritmo-stato">
          {ritmo === 'concitato' ? <Chip tono="brace">{t('master.finestra.chip_concitato')}</Chip> : <Chip tono="lago">{t('master.finestra.chip_calmo')}</Chip>}
        </span>
        {secondi !== null ? (
          <span data-testid="master-finestra-conto" className="rounded-full bg-candela px-2.5 py-px font-bold text-notte tabular-nums">
            {t('master.finestra.conto', { secondi })}
          </span>
        ) : (
          finestra.aperta && !stato.pausa.attiva && <span className="text-cenere">{t('master.finestra.nessuna_scadenza')}</span>
        )}
        {stato.pausa.attiva && <span className="text-candela">{t('master.finestra.in_pausa')}</span>}
      </div>
      {attesa && (
        <p data-testid="master-aspettiamo" className="text-sm text-pergamena-2">
          {attesa}
        </p>
      )}

      {righe.length === 0 ? (
        <Vuoto>{finestra.aperta ? t('master.finestra.nessun_invitato') : t('master.finestra.nessuna_aperta')}</Vuoto>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {righe.map((r) => (
            <li
              key={r.id_pg}
              data-testid={`master-invitato-${r.id_pg}`}
              data-scritta={String(r.scritta)}
              className={clsx(
                'flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm',
                r.scritta ? 'border-muschio/70 bg-muschio/15 text-muschio' : 'border-bordo-chiaro bg-notte-3 text-pergamena',
                !r.invitato && 'border-dashed',
              )}
              title={r.invitato ? t('master.finestra.invitato') : t('master.finestra.non_invitato_titolo')}
            >
              <span className="font-semibold">{r.nome}</span>
              <span className="opacity-90">{r.scritta ? t('master.finestra.ha_scritto') : t('master.finestra.pensa')}</span>
              {!r.invitato && <span className="text-xs text-cenere">{t('master.finestra.non_invitato')}</span>}
            </li>
          ))}
        </ul>
      )}
    </Riquadro>
  );
}
