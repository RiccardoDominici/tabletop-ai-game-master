/**
 * What a character has, in the Game Master panel's sheet row (docs/prove.md §10): the AC its gear gives and what gives
 * it, load and movement, coins, the counters of the set (spell slots left, arrows, uses), the items carried (worn ones
 * marked) and the lights burning with the time left. Below, one compact control for the gear: an item of the set's
 * catalog, how many, and what to do (buy, give, take, sell, put on, take off, light, put out); and one for coins.
 * Every change goes to the server as the `inventario` or `tempo` command; the server checks it and refuses with a line.
 */
import { useState } from 'react';
import type { CombattimentoMaster, ScortaScheda } from '@tabletop-ai-gm/shared';
import { useInCorso } from '../store/master';
import { inviaComando } from './sessione';
import { classePulsante } from './stili';
import { t } from '../lingua';

type Azione = 'compra' | 'dai' | 'togli_oggetto' | 'vendi' | 'indossa' | 'togli' | 'accendi' | 'spegni';
const AZIONI: Azione[] = ['compra', 'dai', 'togli_oggetto', 'vendi', 'indossa', 'togli', 'accendi', 'spegni'];

/** The command for an action of the gear control (pure: tested in scorta.test.ts). */
export function comandoScorta(id: string, azione: Azione, oggetto: string, quante: number, prezzo: string) {
  if (azione === 'accendi' || azione === 'spegni') return { tipo: 'tempo' as const, cosa: azione, id, oggetto };
  const cosa = azione === 'dai' || azione === 'togli_oggetto' ? ('oggetto' as const) : azione;
  const n = azione === 'togli_oggetto' ? -quante : quante;
  return { tipo: 'inventario' as const, id, cosa, oggetto, ...(n !== 1 ? { quante: n } : {}), ...((azione === 'compra' || azione === 'vendi') && prezzo.trim() ? { prezzo: prezzo.trim() } : {}) };
}

export function ScortaMaster({ id, nome, scorta, catalogo }: { id: string; nome: string; scorta: ScortaScheda; catalogo: NonNullable<CombattimentoMaster['catalogo']> | undefined }) {
  const [oggetto, setOggetto] = useState('');
  const [azione, setAzione] = useState<Azione>('compra');
  const [quante, setQuante] = useState('1');
  const [prezzo, setPrezzo] = useState('');
  const [moneta, setMoneta] = useState(catalogo?.monete[1]?.id ?? catalogo?.monete[0]?.id ?? '');
  const [importo, setImporto] = useState('');
  const inCorso = useInCorso(`inventario:${id}`);
  const n = Number(quante);
  const nValido = Number.isInteger(n) && n >= 1 && n <= 999;
  const imp = Number(importo);
  const impValido = importo.trim() !== '' && Number.isInteger(imp) && imp !== 0 && Math.abs(imp) <= 100000;

  const applica = () => {
    if (!oggetto || !nValido) return;
    void inviaComando(comandoScorta(id, azione, oggetto, n, prezzo));
    setPrezzo('');
  };

  const carico = scorta.carico;
  return (
    <div data-testid={`master-scorta-${id}`} className="flex flex-col gap-1 text-xs text-pergamena-2">
      <p className="flex flex-wrap gap-x-3 gap-y-0.5">
        <span data-testid={`master-scorta-${id}-difesa`}>
          {t('master.scorta.ca')} <span className="font-semibold text-pergamena tabular-nums">{scorta.difesa ?? '–'}</span>
          {scorta.difesa_da ? ` (${scorta.difesa_da})` : ''}
        </span>
        {carico && (
          <span data-testid={`master-scorta-${id}-carico`}>
            {carico.fascia} {carico.peso} {carico.unita}
            {carico.movimento !== null ? ` · ${t('master.scorta.movimento', { n: carico.movimento, unita: carico.unita_movimento ?? '' })}` : ''}
          </span>
        )}
        {scorta.monete.length > 0 && <span data-testid={`master-scorta-${id}-monete`}>{scorta.monete.map((m) => `${m.quante} ${m.id}`).join(' · ')}</span>}
      </p>
      {scorta.contatori.length > 0 && (
        <p data-testid={`master-scorta-${id}-contatori`} className="flex flex-wrap gap-x-3">
          {scorta.contatori.map((c) => (
            <span key={c.id}>
              {c.nome} <span className="font-semibold text-pergamena tabular-nums">{c.restanti}</span>
            </span>
          ))}
        </p>
      )}
      {scorta.oggetti.length > 0 && (
        <p data-testid={`master-scorta-${id}-oggetti`} className="text-cenere">
          {scorta.oggetti.map((o) => `${o.indossato ? '◆ ' : ''}${o.nome}${o.quante > 1 ? ` ×${o.quante}` : ''}`).join(', ')}
        </p>
      )}
      {(scorta.luci ?? []).length > 0 && (
        <p data-testid={`master-scorta-${id}-luci`} className="text-candela">
          {(scorta.luci ?? []).map((l) => t('master.scorta.luce', { nome: l.nome, restante: l.restante })).join(' · ')}
        </p>
      )}
      {catalogo && catalogo.voci.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <label className="sr-only" htmlFor={`scorta-oggetto-${id}`}>
            {t('master.scorta.oggetto_per', { nome })}
          </label>
          <select id={`scorta-oggetto-${id}`} data-testid={`master-scorta-${id}-oggetto`} value={oggetto} onChange={(e) => setOggetto(e.target.value)} className="max-w-44 rounded-md border border-bordo-chiaro bg-notte px-1 py-0.5 text-xs text-pergamena">
            <option value="">{t('master.scorta.scegli')}</option>
            {catalogo.voci.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
              </option>
            ))}
          </select>
          <select data-testid={`master-scorta-${id}-azione`} aria-label={t('master.scorta.azione')} value={azione} onChange={(e) => setAzione(e.target.value as Azione)} className="rounded-md border border-bordo-chiaro bg-notte px-1 py-0.5 text-xs text-pergamena">
            {AZIONI.map((a) => (
              <option key={a} value={a}>
                {t(`master.scorta.azione_${a}`)}
              </option>
            ))}
          </select>
          <input data-testid={`master-scorta-${id}-quante`} aria-label={t('master.scorta.quante')} type="number" min={1} max={999} value={quante} onChange={(e) => setQuante(e.target.value)} className="w-14 rounded-md border border-bordo-chiaro bg-notte px-1 py-0.5 text-right text-xs text-pergamena" />
          {(azione === 'compra' || azione === 'vendi') && (
            <input data-testid={`master-scorta-${id}-prezzo`} aria-label={t('master.scorta.prezzo')} type="text" value={prezzo} placeholder={t('master.scorta.prezzo')} onChange={(e) => setPrezzo(e.target.value)} className="w-24 rounded-md border border-bordo-chiaro bg-notte px-1 py-0.5 text-xs text-pergamena" />
          )}
          <button type="button" data-testid={`master-scorta-${id}-applica`} disabled={!oggetto || !nValido || inCorso} onClick={applica} className={classePulsante('normale', 'piccolo')}>
            {t('master.combattimento.applica')}
          </button>
        </div>
      )}
      {catalogo && catalogo.monete.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <input data-testid={`master-scorta-${id}-importo`} aria-label={t('master.scorta.importo')} type="number" value={importo} placeholder={t('master.scorta.importo')} onChange={(e) => setImporto(e.target.value)} className="w-20 rounded-md border border-bordo-chiaro bg-notte px-1 py-0.5 text-right text-xs text-pergamena" />
          <select data-testid={`master-scorta-${id}-moneta`} aria-label={t('master.scorta.moneta')} value={moneta} onChange={(e) => setMoneta(e.target.value)} className="rounded-md border border-bordo-chiaro bg-notte px-1 py-0.5 text-xs text-pergamena">
            {catalogo.monete.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
          <button
            type="button"
            data-testid={`master-scorta-${id}-monete-applica`}
            disabled={!impValido || !moneta || inCorso}
            onClick={() => {
              void inviaComando({ tipo: 'inventario', id, cosa: 'monete', monete: { [moneta]: imp } });
              setImporto('');
            }}
            className={classePulsante('normale', 'piccolo')}
          >
            {t('master.scorta.monete_applica')}
          </button>
        </div>
      )}
    </div>
  );
}
