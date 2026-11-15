/**
 * The world that moves (docs/mondo.md), on the Game Master panel: the stall counter, marks owed by facts of the
 * game, NPC attitudes changed in play, and the world's log (consequences of marks and omens, seen or off-screen, and
 * when an off-screen event surfaced). What happened (`cosa`) may be secret: it shows only with spoilers visible.
 */
import type { MondoMaster, StatoMaster } from '@tabletop-ai-gm/shared';
import { useSenzaSpoiler } from '../store/master';
import { Riquadro, Vuoto } from './Riquadro';
import { Chip } from './Chip';
import { t } from '../lingua';

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
    <Riquadro titolo={t('master.mondo.titolo')} conteggio={m.cronaca.length ? t('master.mondo.conteggio', { n: m.cronaca.length }) : undefined} data-testid="master-mondo">
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
