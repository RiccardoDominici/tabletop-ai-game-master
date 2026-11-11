/**
 * Combattimento nel pannello del master (docs/combattimento.md): avvio e fine dello scontro (la fine
 * chiede una seconda conferma), round, fase e chi deve agire; per ogni scheda (PG e PNG) i punti
 * ferita da impostare a mano («Imposta» manda il valore assoluto, come il server) e, durante lo
 * scontro, le condizioni attive con «Aggiungi» e la rimozione con un clic.
 * Senza spoiler non c'è nulla da nascondere: i PF dei PNG si vedono normalmente (il master li gestisce).
 * La sezione non compare se lo stato non ha il blocco `combattimento` (niente dadi, niente scheda).
 */
import { useState } from 'react';
import type { CombattentePubblico, CombattimentoMaster, CombattimentoPubblico, StatoMaster } from '@tabletop-ai-gm/shared';
import { useInCorso } from '../store/master';
import { inviaComando } from './sessione';
import { useConferma } from './useConferma';
import { Riquadro, Vuoto } from './Riquadro';
import { Chip } from './Chip';
import { classePulsante } from './stili';
import { t } from '../lingua';

export function SezioneCombattimento({ stato }: { stato: StatoMaster }) {
  const [daConfermare, clicTermina] = useConferma(() => void inviaComando({ tipo: 'combattimento_termina' }));
  const inCorsoInizia = useInCorso('combattimento_inizia');
  const inCorsoTermina = useInCorso('combattimento_termina');

  const cmb = stato.combattimento;
  if (!cmb) return null;
  const vivo: CombattimentoPubblico | null = stato.tavolo.combattimento ?? null;
  const attivo = cmb.attivo;

  const nomi = new Map<string, string>((vivo?.combattenti ?? []).map((c) => [c.id, c.nome]));
  const turno = (vivo?.turno_di ?? []).map((id) => nomi.get(id) ?? id).join(', ');

  return (
    <Riquadro
      titolo={t('master.combattimento.titolo')}
      conteggio={attivo ? t('master.combattimento.round', { n: vivo?.round ?? '–' }) : t('master.combattimento.non_in_corso')}
      zona="combattimento"
      data-testid="master-combattimento"
      azioni={
        attivo ? (
          <button
            type="button"
            data-testid="master-combattimento-termina"
            disabled={inCorsoTermina}
            onClick={clicTermina}
            className={classePulsante(daConfermare ? 'pericolo' : 'normale', 'piccolo')}
          >
            {daConfermare ? t('master.combattimento.conferma_termina') : t('master.cmd.combattimento_termina')}
          </button>
        ) : (
          <button
            type="button"
            data-testid="master-combattimento-inizia"
            disabled={inCorsoInizia}
            onClick={() => void inviaComando({ tipo: 'combattimento_inizia' })}
            className={classePulsante('primario', 'piccolo')}
          >
            {t('master.cmd.combattimento_inizia')}
          </button>
        )
      }
    >
      {attivo && vivo && (
        <p className="text-sm text-pergamena-2" data-testid="master-combattimento-turno">
          {t('master.combattimento.fase')} <span className="font-semibold text-pergamena">{vivo.fase ?? t('master.combattimento.fase_unica')}</span>
          {' · '}
          {t('master.combattimento.tocca_a')} <span className="font-semibold text-pergamena">{turno || t('master.combattimento.nessuno')}</span>
        </p>
      )}

      {cmb.schede.length === 0 ? (
        <Vuoto>{t('master.combattimento.nessuna_scheda')}</Vuoto>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {cmb.schede.map((s) => (
            <li key={s.id}>
              <RigaScheda
                id={s.id}
                nome={s.nome}
                diPng={s.di_png}
                attuali={s.pf.attuali}
                massimi={s.pf.massimi}
                condizioniAttive={vivo ? (vivo.combattenti.find((c) => c.id === s.id)?.condizioni ?? []) : null}
                catalogo={cmb.condizioni}

              />
            </li>
          ))}
        </ul>
      )}
    </Riquadro>
  );
}

interface PropsRiga {
  id: string;
  nome: string;
  diPng: boolean;
  attuali: number;
  massimi: number;
  /** Condizioni attive del combattente; null fuori dallo scontro (nessuna condizione da mostrare). */
  condizioniAttive: CombattentePubblico['condizioni'] | null;
  catalogo: CombattimentoMaster['condizioni'];
}

/** Una condizione attiva: un clic la toglie. Componente a sé perché il blocco «in attesa» è per chiave. */
function CondizioneAttiva({ id, nome, condizione }: { id: string; nome: string; condizione: CombattentePubblico['condizioni'][number] }) {
  const inCorso = useInCorso(`condizione:${id}:${condizione.id}`);
  return (
    <button
      type="button"
      data-testid={`master-scheda-${id}-togli-${condizione.id}`}
      title={t('master.combattimento.togli_condizione', { nome: condizione.nome })}
      disabled={inCorso}
      onClick={() => void inviaComando({ tipo: 'condizione', id, condizione: condizione.id, attiva: false }, t('master.combattimento.condizione_tolta', { nome, condizione: condizione.nome }))}
      className={classePulsante('calmo', 'piccolo')}
    >
      <span aria-hidden="true">{condizione.icona}</span>
      {condizione.nome}
      <span aria-hidden="true" className="text-xs opacity-70">×</span>
    </button>
  );
}

/** Una scheda: nome, PF con correzione a mano e, durante lo scontro, le condizioni. */
function RigaScheda({ id, nome, diPng, attuali, massimi, condizioniAttive, catalogo }: PropsRiga) {
  const [testoPf, setTestoPf] = useState('');
  const [condizione, setCondizione] = useState('');
  const inCorsoPf = useInCorso(`pf:${id}`);

  const valore = Number(testoPf);
  const pfValido = testoPf.trim() !== '' && Number.isInteger(valore) && valore >= 0 && valore <= 999;

  const imposta = () => {
    if (!pfValido) return;
    void inviaComando({ tipo: 'pf', id, valore });
    setTestoPf('');
  };

  const aggiungi = () => {
    if (!condizione) return;
    const scelta = catalogo.find((c) => c.id === condizione);
    void inviaComando({ tipo: 'condizione', id, condizione, attiva: true }, t('master.combattimento.condizione_messa', { nome, condizione: scelta?.nome ?? condizione }));
    setCondizione('');
  };

  // Le condizioni già attive non si ripropongono nella lista da aggiungere.
  const attive = new Set((condizioniAttive ?? []).map((c) => c.id));
  const daAggiungere = catalogo.filter((c) => !attive.has(c.id));

  return (
    <div data-testid={`master-scheda-${id}`} data-di-png={String(diPng)} className="flex flex-col gap-1.5 rounded-lg border border-bordo bg-notte-3 p-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-semibold">{nome}</span>
        {!diPng && <Chip tono="lago">{t('master.combattimento.pg')}</Chip>}
        <span data-testid={`master-scheda-${id}-pf`} className="font-semibold tabular-nums text-pergamena-2">
          {t('master.pf')} {attuali}/{massimi}
        </span>
        <label className="sr-only" htmlFor={`pf-${id}`}>
          {t('master.combattimento.nuovi_pf', { nome })}
        </label>
        <input
          id={`pf-${id}`}
          data-testid={`master-scheda-${id}-input-pf`}
          type="number"
          inputMode="numeric"
          min={0}
          max={999}
          step={1}
          value={testoPf}
          placeholder={String(attuali)}
          onChange={(e) => setTestoPf(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') imposta();
          }}
          className="w-20 rounded-md border border-bordo-chiaro bg-notte px-2 py-1 text-right tabular-nums text-pergamena"
        />
        <button
          type="button"
          data-testid={`master-scheda-${id}-imposta`}
          disabled={!pfValido || inCorsoPf}
          onClick={imposta}
          className={classePulsante('normale', 'piccolo')}
        >
          {t('master.combattimento.imposta')}
        </button>
      </div>

      {condizioniAttive !== null && (
        <div className="flex flex-wrap items-center gap-1.5">
          {condizioniAttive.length === 0 && <span className="text-xs text-cenere">{t('master.combattimento.nessuna_condizione')}</span>}
          {condizioniAttive.map((c) => (
            <CondizioneAttiva key={c.id} id={id} nome={nome} condizione={c} />
          ))}

          {daAggiungere.length > 0 && (
            <>
              <label className="sr-only" htmlFor={`condizione-${id}`}>
                {t('master.combattimento.da_aggiungere', { nome })}
              </label>
              <select
                id={`condizione-${id}`}
                data-testid={`master-scheda-${id}-select-condizione`}
                value={condizione}
                onChange={(e) => setCondizione(e.target.value)}
                className="rounded-md border border-bordo-chiaro bg-notte px-2 py-1 text-sm text-pergamena"
              >
                <option value="">{t('master.combattimento.scegli')}</option>
                {daAggiungere.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icona} {c.nome}
                  </option>
                ))}
              </select>
              <button
                type="button"
                data-testid={`master-scheda-${id}-aggiungi`}
                disabled={!condizione}
                onClick={aggiungi}
                className={classePulsante('normale', 'piccolo')}
              >
                {t('master.combattimento.aggiungi')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
