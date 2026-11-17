/**
 * The world that moves (docs/mondo.md), on the Game Master panel: the stall counter, marks owed by facts of the
 * game, NPC attitudes changed in play, and the world's log (consequences of marks and omens, seen or off-screen, and
 * when an off-screen event surfaced). What happened (`cosa`) may be secret: it shows only with spoilers visible. The
 * Game Master can set an NPC's attitude by hand (A25: the command `atteggiamento`, docs/mondo.md §4).
 */
import { useState } from 'react';
import type { MondoMaster, StatoMaster } from '@tabletop-ai-gm/shared';
import { useSenzaSpoiler } from '../store/master';
import { Riquadro, Vuoto } from './Riquadro';
import { Chip } from './Chip';
import { classePulsante } from './stili';
import { inviaComando } from './sessione';
import { t } from '../lingua';

const STATI = ['ostile', 'indifferente', 'amichevole'] as const;
type Stato = (typeof STATI)[number];
const CLASSE_SELECT = 'rounded-md border border-bordo-chiaro bg-notte px-2 py-1 text-sm text-pergamena';

/** The next stall level after n consecutive stalls (same rule as the server: mondo/stallo.ts). */
export function prossimoLivelloStallo(n: number): number {
  return (n % 3) + 1;
}

export function SezioneMondo({ stato }: { stato: StatoMaster }) {
  const senzaSpoiler = useSenzaSpoiler();
  return stato.mondo ? <VistaMondo mondo={stato.mondo} senzaSpoiler={senzaSpoiler} /> : null;
}

/** The box itself, pure (the spoiler switch comes from the store in SezioneMondo). */
export function VistaMondo({ mondo: m, senzaSpoiler }: { mondo: MondoMaster; senzaSpoiler: boolean }) {
  const vuoto = m.cronaca.length === 0 && m.atteggiamenti.length === 0 && m.debiti.length === 0 && m.stallo === 0;
  return (
    <Riquadro titolo={t('master.mondo.titolo')} conteggio={m.cronaca.length ? t('master.mondo.conteggio', { n: m.cronaca.length }) : undefined} zona="mondo" data-testid="master-mondo">
      {m.scelte && m.scelte.png.length > 0 && <ImpostaAtteggiamento scelte={m.scelte} />}
      {vuoto ? (
        <Vuoto>{t('master.mondo.vuoto')}</Vuoto>
      ) : (
        <div className="flex flex-col gap-2 text-sm">
          {m.stallo > 0 && (
            <p data-testid="master-mondo-stallo" className="text-pergamena-2">
              {t('master.mondo.stallo', { n: m.stallo, livello: prossimoLivelloStallo(m.stallo) })}
            </p>
          )}
          {m.debiti.map((d) => (
            <p key={d.orologio} data-testid={`master-mondo-debito-${d.orologio}`} className="text-pergamena-2">
              {t('master.mondo.debito', { nome: senzaSpoiler ? d.orologio : d.nome, n: d.debito })}
            </p>
          ))}
          {m.atteggiamenti.length > 0 && (
            <div>
              <p className="font-semibold">{t('master.mondo.atteggiamenti')}</p>
              <ul className="flex flex-col gap-1" data-testid="master-mondo-atteggiamenti">
                {m.atteggiamenti.map((a) => (
                  <li key={`${a.png}>${a.pg}`} data-testid={`master-mondo-atteggiamento-${a.png}-${a.pg}`} data-stato={a.stato}>
                    {t('master.mondo.atteggiamento', { png: a.nome, pg: a.nome_pg, stato: a.stato, base: a.base ?? '—', turno: a.turno, causa: a.causa })}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {m.cronaca.length > 0 && (
            <div>
              <p className="font-semibold">{t('master.mondo.cronaca')}</p>
              <ul className="flex flex-col gap-1.5" data-testid="master-mondo-cronaca">
                {[...m.cronaca].reverse().map((v) => (
                  <li key={`${v.id}@${v.turno}`} data-testid={`master-mondo-voce-${v.id}`} data-visto={String(v.visto)} className="rounded-lg border border-bordo bg-notte-3/60 px-2 py-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-cenere">
                      <span className="tabular-nums">t{v.turno}</span>
                      <span>{t('master.mondo.segno', { orologio: v.orologio, segno: v.segno })}</span>
                      <Chip tono={v.visto ? 'muschio' : 'cenere'}>{v.visto ? t('master.mondo.visto') : t('master.mondo.fuori_scena')}</Chip>
                      {v.emerso_al_turno !== null && <Chip tono="brace">{t('master.mondo.emerso', { turno: v.emerso_al_turno })}</Chip>}
                    </div>
                    <p className={senzaSpoiler ? 'italic text-cenere' : ''}>{senzaSpoiler ? t('master.mondo.nascosto') : v.cosa}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Riquadro>
  );
}

/**
 * The Game Master's own change (A25): an NPC, towards one PC or every PC, a state; the attitude now is shown for the
 * pair chosen. Any state, no limits: the server logs it with cause `master`.
 */
export function ImpostaAtteggiamento({ scelte }: { scelte: NonNullable<MondoMaster['scelte']> }) {
  const [png, setPng] = useState(scelte.png[0]!.id);
  const [pg, setPg] = useState('tutti');
  const [stato, setStato] = useState<Stato>('indifferente');
  const scelto = scelte.png.find((p) => p.id === png) ?? scelte.png[0]!;
  const ora = pg === 'tutti' ? null : (scelto.verso[pg] ?? null);
  const nomePg = pg === 'tutti' ? t('master.mondo.imposta_tutti') : (scelte.pg.find((x) => x.id === pg)?.nome ?? pg);
  const invia = () => void inviaComando({ tipo: 'atteggiamento', id_png: scelto.id, id_pg: pg, stato }, `${scelto.nome} → ${nomePg}: ${t(`master.mondo.stato.${stato}`)}`);
  return (
    <div data-testid="master-mondo-imposta" className="mb-2 flex flex-wrap items-center gap-1.5 text-sm">
      <span className="font-semibold">{t('master.mondo.imposta')}</span>
      <select aria-label={t('master.mondo.imposta_png')} data-testid="master-mondo-imposta-png" value={scelto.id} onChange={(e) => setPng(e.target.value)} className={CLASSE_SELECT}>
        {scelte.png.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome}
          </option>
        ))}
      </select>
      <select aria-label={t('master.mondo.imposta_pg')} data-testid="master-mondo-imposta-pg" value={pg} onChange={(e) => setPg(e.target.value)} className={CLASSE_SELECT}>
        <option value="tutti">{t('master.mondo.imposta_tutti')}</option>
        {scelte.pg.map((x) => (
          <option key={x.id} value={x.id}>
            {x.nome}
          </option>
        ))}
      </select>
      <select aria-label={t('master.mondo.imposta_stato')} data-testid="master-mondo-imposta-stato" value={stato} onChange={(e) => setStato(e.target.value as Stato)} className={CLASSE_SELECT}>
        {STATI.map((s) => (
          <option key={s} value={s}>
            {t(`master.mondo.stato.${s}`)}
          </option>
        ))}
      </select>
      {ora && <Chip tono="cenere">{t('master.mondo.imposta_ora', { stato: (STATI as readonly string[]).includes(ora) ? t(`master.mondo.stato.${ora as Stato}`) : ora })}</Chip>}
      <button type="button" data-testid="master-mondo-imposta-invia" onClick={invia} className={classePulsante('normale', 'piccolo')}>
        {t('master.mondo.imposta_btn')}
      </button>
    </div>
  );
}
