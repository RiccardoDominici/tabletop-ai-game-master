/**
 * The coherence ledger on the Game Master panel (docs/coerenza.md §2): what is true now for every character (state and
 * presence), what only some PCs know, the violations the checker stopped this evening (rule, what it did, the sentence
 * and what was said instead) and the journal of what changed. Sentences and private facts may be secret: they show only
 * with spoilers visible; the rule, the action and the turn always show.
 */
import type { CoerenzaMaster, StatoMaster } from '@tabletop-ai-gm/shared';
import { useSenzaSpoiler } from '../store/master';
import { Riquadro, Vuoto } from './Riquadro';
import { Chip } from './Chip';
import { t } from '../lingua';

export function SezioneCoerenza({ stato }: { stato: StatoMaster }) {
  const senzaSpoiler = useSenzaSpoiler();
  return stato.coerenza ? <VistaCoerenza coerenza={stato.coerenza} senzaSpoiler={senzaSpoiler} /> : null;
}

const TONO: Record<CoerenzaMaster['entita'][number]['stato'], 'muschio' | 'brace' | 'cenere'> = {
  in_piedi: 'muschio',
  ferito: 'brace',
  grave: 'brace',
  a_terra: 'cenere',
  morente: 'cenere',
  morto: 'cenere',
  fuggito: 'cenere',
  nascosto: 'cenere',
};

/** The box itself, pure (the spoiler switch comes from the store in SezioneCoerenza). */
export function VistaCoerenza({ coerenza: c, senzaSpoiler }: { coerenza: CoerenzaMaster; senzaSpoiler: boolean }) {
  // The characters that matter now: every PC, and the NPCs in the scene or who left it.
  const righe = c.entita.filter((e) => e.tipo === 'pg' || e.presenza !== 'altrove');
  const vuoto = righe.length === 0 && c.violazioni.length === 0 && c.eventi.length === 0;
  return (
    <Riquadro titolo={t('master.coerenza.titolo')} conteggio={c.violazioni.length ? t('master.coerenza.conteggio', { n: c.violazioni.length }) : undefined} data-testid="master-coerenza">
      {vuoto ? (
        <Vuoto>{t('master.coerenza.vuoto')}</Vuoto>
      ) : (
        <div className="flex flex-col gap-2 text-sm">
          {righe.length > 0 && (
            <div>
              <p className="font-semibold">{t('master.coerenza.personaggi')}</p>
              <ul className="flex flex-wrap gap-1.5" data-testid="master-coerenza-entita">
                {righe.map((e) => (
                  <li key={e.id} data-testid={`master-coerenza-${e.id}`} data-stato={e.stato} data-presenza={e.presenza} className="flex items-center gap-1">
                    <span>{e.nome}</span>
                    <Chip tono={TONO[e.stato]}>{t(`master.coerenza.stato.${e.stato}`)}</Chip>
                    {e.presenza !== 'in_scena' && <Chip tono="cenere">{t(`master.coerenza.presenza.${e.presenza}`)}</Chip>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {c.violazioni.length > 0 && (
            <div>
              <p className="font-semibold">{t('master.coerenza.violazioni')}</p>
              <ul className="flex flex-col gap-1.5" data-testid="master-coerenza-violazioni">
                {[...c.violazioni].reverse().map((v, k) => (
                  <li key={`${v.turno}-${k}`} data-testid="master-coerenza-violazione" data-regola={v.regola} className="rounded-lg border border-bordo bg-notte-3/60 px-2 py-1">
                    <div className="text-xs text-cenere">{t('master.coerenza.violazione', { turno: v.turno, regola: v.regola, azione: v.azione })}</div>
                    {senzaSpoiler ? (
                      <p className="italic text-cenere">{t('master.coerenza.nascosto')}</p>
                    ) : (
                      <>
                        {v.frase && <p className="line-through decoration-cenere/60">{v.frase}</p>}
                        {v.sostituto.length > 0 && <p>{t('master.coerenza.sostituto', { testo: v.sostituto.join(' ') })}</p>}
                        {v.id_pg && <p className="text-xs text-cenere">{t('master.coerenza.al_telefono', { pg: v.id_pg })}</p>}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {c.privati.length > 0 && !senzaSpoiler && (
            <div>
              <p className="font-semibold">{t('master.coerenza.privati')}</p>
              <ul className="flex flex-col gap-1" data-testid="master-coerenza-privati">
                {c.privati.map((p, k) => (
                  <li key={k}>
                    <span className="text-xs text-cenere">{t('master.coerenza.privato', { turno: p.turno, chi: p.conosciuto_da.join(', ') })}</span> {p.testo}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {c.eventi.length > 0 && (
            <details>
              <summary className="cursor-pointer font-semibold">{t('master.coerenza.diario')}</summary>
              <ul className="flex flex-col gap-0.5 text-xs text-cenere" data-testid="master-coerenza-diario">
                {[...c.eventi].reverse().map((e, k) => (
                  <li key={k}>{t('master.coerenza.evento', { turno: e.turno, id: e.id, da: e.da ?? '—', a: e.a, causa: e.causa })}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </Riquadro>
  );
}
