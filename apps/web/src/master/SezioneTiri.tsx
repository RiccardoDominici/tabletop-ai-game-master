/**
 * Rolls in the Game Master panel (docs/prove.md §8–9). Only here the DC is visible.
 * - Who rolls: the players at the table (manual) or the Engine (automatic), from the campaign; the Game Master's own
 *   rolls hidden, sometimes shown or always shown.
 * - The open requests while the table rolls: who, what, the DC (or AC, threshold), the values already entered. For a
 *   forgotten roll the Game Master types the dice the player says («Inserisci»), or lets the Engine roll it
 *   («Tira il Motore»); «Tutti al Motore» unblocks the whole turn.
 * - The last turn's cards as rolled: dice, total, DC, outcome, who entered the dice.
 * Absent without dice (`stato.tiri` missing).
 */
import { useState } from 'react';
import type { RichiestaTiroMaster, StatoMaster, TiroMostrato } from '@tabletop-ai-gm/shared';
import { totaleRichiesta } from '@tabletop-ai-gm/shared';
import { useInCorso } from '../store/master';
import { inviaComando } from './sessione';
import { Riquadro, Vuoto } from './Riquadro';
import { Chip } from './Chip';
import { classePulsante } from './stili';
import { t } from '../lingua';
import { conSegno, siglaContro } from '../lib/tiri';

export function SezioneTiri({ stato }: { stato: StatoMaster }) {
  const tiri = stato.tiri;
  const inCorsoTutti = useInCorso('tiro:*');
  if (!tiri) return null;
  const aperte = tiri.richieste.filter((r) => r.valori === null);
  return (
    <Riquadro
      titolo={t('master.tiri.titolo')}
      conteggio={aperte.length ? t('master.tiri.in_attesa', { n: aperte.length }) : undefined}
      zona="tiri"
      data-testid="master-tiri"
      azioni={
        aperte.length > 1 ? (
          <button type="button" data-testid="master-tiri-tutti" disabled={inCorsoTutti} onClick={() => void inviaComando({ tipo: 'tiro', id: '*', valori: null })} className={classePulsante('normale', 'piccolo')}>
            {t('master.tiri.tutti_al_motore')}
          </button>
        ) : undefined
      }
    >
      <p className="text-sm text-pergamena-2" data-testid="master-tiri-modo">
        {t(tiri.giocatori === 'manuale' ? 'master.tiri.giocatori_manuale' : 'master.tiri.giocatori_automatico')}
        {' · '}
        {t(`master.tiri.master_${tiri.master}`)}
      </p>
      {tiri.richieste.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {tiri.richieste.map((r) => (
            <li key={r.id}>
              <RigaRichiesta r={r} />
            </li>
          ))}
        </ul>
      )}
      {tiri.carte.length === 0 ? (
        tiri.richieste.length === 0 && <Vuoto>{t('master.tiri.nessuno')}</Vuoto>
      ) : (
        <ul className="flex flex-col gap-1 text-sm" data-testid="master-tiri-carte">
          {tiri.carte.map((c) => (
            <li key={c.id}>
              <RigaCarta c={c} />
            </li>
          ))}
        </ul>
      )}
    </Riquadro>
  );
}

/** The number to beat as the panel shows it: «CD 15», «CA 13», «≤ 35», or the 2d6 band. */
function contro(c: Pick<TiroMostrato, 'contro'>): string {
  if (c.contro.tipo === 'soglia') return `≤ ${c.contro.valore}`;
  if (c.contro.tipo === 'fasce') return c.contro.descrizione ?? '';
  return `${siglaContro(c.contro.tipo)} ${c.contro.valore}`;
}

function RigaRichiesta({ r }: { r: RichiestaTiroMaster }) {
  const [campi, setCampi] = useState<string[]>(() => Array.from({ length: r.quanti }, () => ''));
  const inCorso = useInCorso(`tiro:${r.id}`);
  const valori = campi.map((x) => Number(x));
  const totale = campi.every((x) => x.trim() !== '') ? totaleRichiesta(r, valori) : null;
  const chiusa = r.valori !== null;
  return (
    <div data-testid={`master-tiro-${r.id}`} data-chiusa={String(chiusa)} className="flex flex-col gap-1.5 rounded-lg border border-candela/50 bg-notte-3 p-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-semibold">
          {r.nome}: {r.etichetta}
          {r.bersaglio ? ` → ${r.bersaglio.nome}` : ''}
        </span>
        {r.privata && <Chip tono="lago">{t('master.tiri.privata')}</Chip>}
        <span data-testid={`master-tiro-${r.id}-contro`} className="font-semibold text-candela tabular-nums">
          {contro(r)}
        </span>
      </div>
      <p className="text-pergamena-2">
        {`${r.quanti}d${r.facce}`}
        {!r.sotto_soglia && ` ${conSegno(r.modificatore)}`}
        {r.vantaggio && ` · ${t(r.vantaggio === 'vantaggio' ? 'master.tiri.vantaggio' : 'master.tiri.svantaggio')}`}
        {chiusa && ` · ${t('master.tiri.inseriti', { valori: r.valori!.join(', ') })}`}
      </p>
      {!chiusa && (
        <div className="flex flex-wrap items-center gap-2">
          {campi.map((x, i) => (
            <input
              key={i}
              data-testid={`master-tiro-${r.id}-dado-${i}`}
              inputMode="numeric"
              aria-label={t('master.tiri.dado', { n: i + 1, facce: r.facce })}
              value={x}
              onChange={(e) => setCampi((c) => c.map((y, k) => (k === i ? e.target.value.replace(/\D/g, '').slice(0, 3) : y)))}
              className="h-9 w-14 rounded border border-bordo-chiaro bg-notte-2 text-center tabular-nums"
            />
          ))}
          {totale !== null && <span className="tabular-nums text-pergamena-2">= {totale}</span>}
          <button type="button" data-testid={`master-tiro-${r.id}-inserisci`} disabled={inCorso || totale === null} onClick={() => void inviaComando({ tipo: 'tiro', id: r.id, valori })} className={classePulsante('primario', 'piccolo')}>
            {t('master.tiri.inserisci')}
          </button>
          <button type="button" data-testid={`master-tiro-${r.id}-motore`} disabled={inCorso} onClick={() => void inviaComando({ tipo: 'tiro', id: r.id, valori: null })} className={classePulsante('normale', 'piccolo')}>
            {t('master.tiri.tira_motore')}
          </button>
        </div>
      )}
    </div>
  );
}

function RigaCarta({ c }: { c: TiroMostrato }) {
  const conto = c.risoluzione === 'sotto_soglia' ? `${c.dado}` : `${c.dadi.join('/')} ${conSegno(c.modificatore)} = ${c.totale}`;
  return (
    <span data-testid={`master-carta-${c.id}`} className="text-pergamena-2">
      <span className="font-semibold text-pergamena">{c.nome}</span> · {c.etichetta}: {c.automatico ? c.danno?.totale : conto} {!c.automatico && contro(c)} →{' '}
      <span className={c.riuscita ? 'text-muschio' : 'text-brace'}>{t(c.riuscita ? 'master.tiri.riuscita' : 'master.tiri.fallita')}</span>
      {c.manuale && <span className="text-cenere"> · {t(`master.tiri.da_${c.manuale}`)}</span>}
      {c.privata && <span className="text-cenere"> · {t('master.tiri.privata')}</span>}
    </span>
  );
}
