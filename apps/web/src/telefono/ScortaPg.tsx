/**
 * What the PC has, on its own phone's sheet (docs/prove.md §10): the AC its gear gives, load and movement, coins, spell
 * slots and resources left, the gear carried (worn marked) and the lights lit. It comes with the table's state, so it
 * changes as soon as the Engine changes it (an arrow shot, a purchase), without reopening the sheet.
 */
import type { ScortaScheda } from '@tabletop-ai-gm/shared';
import { t } from '../lingua';

export function ScortaPg({ scorta }: { scorta: ScortaScheda | null | undefined }) {
  if (!scorta) return null;
  const carico = scorta.carico;
  return (
    <section data-testid="scorta-pg" className="flex flex-col gap-1.5">
      <h3 className="font-titolo text-base font-semibold text-candela-2">{t('telefono.scorta.titolo')}</h3>
      <p className="text-[1.05rem] leading-snug text-pergamena" data-testid="scorta-pg-difesa">
        {t('telefono.scorta.ca', { ca: scorta.difesa ?? '–' })}
        {scorta.difesa_da ? ` (${scorta.difesa_da})` : ''}
      </p>
      {carico && (
        <p className="text-[1.05rem] leading-snug text-pergamena-2" data-testid="scorta-pg-carico">
          {t('telefono.scorta.carico', { fascia: carico.fascia, peso: carico.peso, unita: carico.unita })}
          {carico.movimento !== null ? ` · ${t('telefono.scorta.movimento', { n: carico.movimento, unita: carico.unita_movimento ?? '' })}` : ''}
        </p>
      )}
      {scorta.monete.length > 0 && (
        <p className="text-[1.05rem] text-pergamena-2" data-testid="scorta-pg-monete">
          {scorta.monete.map((m) => `${m.quante} ${m.nome.toLowerCase()}`).join(', ')}
        </p>
      )}
      {scorta.contatori.length > 0 && (
        <ul className="flex flex-wrap gap-2" data-testid="scorta-pg-contatori">
          {scorta.contatori.map((c) => (
            <li key={c.id} className="rounded-full border border-bordo-chiaro px-2 py-0.5 text-sm text-pergamena tabular-nums">
              {c.nome}: <span className="font-bold">{c.restanti}</span>
            </li>
          ))}
        </ul>
      )}
      {(scorta.luci ?? []).length > 0 && (
        <p className="text-sm text-candela" data-testid="scorta-pg-luci">
          {(scorta.luci ?? []).map((l) => t('telefono.scorta.luce', { nome: l.nome })).join(' · ')}
        </p>
      )}
      {scorta.oggetti.length > 0 && (
        <p className="font-racconto text-[1.05rem] leading-snug text-pergamena-2" data-testid="scorta-pg-oggetti">
          {scorta.oggetti.map((o) => `${o.nome}${o.quante > 1 ? ` ×${o.quante}` : ''}${o.indossato ? ` (${t('telefono.scorta.indossato')})` : ''}`).join(', ')}
        </p>
      )}
    </section>
  );
}
