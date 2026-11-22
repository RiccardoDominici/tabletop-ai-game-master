/**
 * The steps of building a PC on the phone (docs/creazione.md), one screen each: the scores (rolled, placed, the Game
 * Master's options, the hopeless character's remedies), the race and the class (the closed ones greyed with the
 * requirement they miss), the starting book and today's spells, the languages, the name. Each button is one action to
 * the Engine; what is legal is the Engine's answer, never the phone's.
 */
import clsx from 'clsx';
import { useState, type ReactNode } from 'react';
import type { SceltaCreazione, VistaCreazione } from '@tabletop-ai-gm/shared';
import { t } from '../../lingua';
import { conSegno } from '../../lib/tiri';
import { azioneCreazione, useCreazione } from './stato';

const pulsante = 'min-h-12 rounded-2xl px-4 text-base font-semibold active:scale-[0.98] disabled:opacity-50';
export const primario = clsx(pulsante, 'bg-candela text-notte');
export const secondario = clsx(pulsante, 'border border-bordo-chiaro text-pergamena-2');

export function Titolo({ children }: { children: ReactNode }) {
  return <h2 className="font-titolo text-2xl leading-tight font-semibold text-pergamena">{children}</h2>;
}

/** The scores: the rolls so far, the values to place, the options, the remedies, «these are my scores». */
export function PassoCaratteristiche({ b }: { b: VistaCreazione }) {
  const c = b.caratteristiche;
  const occupato = useCreazione((s) => s.occupato);
  return (
    <section data-testid="creazione-passo-caratteristiche" className="flex flex-col gap-3">
      <Titolo>{t('telefono.creazione.car.titolo')}</Titolo>
      <p className="text-pergamena-2">{t('telefono.creazione.car.metodo', { metodo: c.metodo.nome })}</p>
      {c.punteggi ? (
        <ul className="grid grid-cols-2 gap-2" data-testid="creazione-punteggi">
          {c.nomi.map((x) => (
            <li key={x.id} data-testid={`creazione-punteggio-${x.id}`} className="rounded-xl border border-bordo bg-notte-2 px-3 py-2">
              <span className="block text-sm text-pergamena-2">{x.nome}</span>
              <span className="font-titolo text-2xl text-pergamena tabular-nums">{c.punteggi![x.id]}</span>{' '}
              <span className="text-pergamena-2">({conSegno(c.bonus?.[x.id] ?? 0)})</span>
            </li>
          ))}
        </ul>
      ) : (
        c.tiri.length > 0 && (
          <p className="text-pergamena-2" data-testid="creazione-tiri-fatti">
            {c.tiri.map((x) => `${x.caratteristica ? c.nomi.find((n) => n.id === x.caratteristica)?.nome : '•'} ${x.punteggio} (${x.dadi.join('+')})`).join(' · ')}
          </p>
        )
      )}
      {c.da_assegnare && <Assegna nomi={c.nomi} valori={c.da_assegnare} />}
      {c.punteggi && c.senza_speranza && (
        <div className="flex flex-col gap-2 rounded-xl border border-sangue/50 bg-sangue/10 p-3" data-testid="creazione-senza-speranza">
          <p className="text-pergamena">{t('telefono.creazione.car.senza_speranza')}</p>
          <div className="flex flex-wrap gap-2">
            {c.senza_speranza.map((r) => (
              <button key={r} type="button" data-testid={`creazione-rimedio-${r}`} disabled={occupato} className={secondario} onClick={() => void azioneCreazione({ tipo: 'rimedio', rimedio: r })}>
                {t(`telefono.creazione.car.rimedio_${r}`)}
              </button>
            ))}
          </div>
        </div>
      )}
      {c.punteggi && c.opzioni.some((o) => o.tipo !== 'riordino') && <Opzioni b={b} />}
      {c.punteggi && (
        <button type="button" data-testid="creazione-conferma" disabled={occupato} className={primario} onClick={() => void azioneCreazione({ tipo: 'conferma', passo: 'caratteristiche' })}>
          {t('telefono.creazione.car.conferma')}
        </button>
      )}
    </section>
  );
}

/** Placing the rolled values (or a fixed array): one select per characteristic, each value used once. */
function Assegna({ nomi, valori }: { nomi: Array<{ id: string; nome: string }>; valori: number[] }) {
  const [scelte, setScelte] = useState<Record<string, string>>({});
  const occupato = useCreazione((s) => s.occupato);
  const completo = nomi.every((n) => scelte[n.id] !== undefined && scelte[n.id] !== '');
  return (
    <div className="flex flex-col gap-2" data-testid="creazione-assegna">
      <p className="text-pergamena">{t('telefono.creazione.car.assegna', { valori: valori.join(', ') })}</p>
      {nomi.map((n) => (
        <label key={n.id} className="flex items-center justify-between gap-3 text-pergamena-2">
          {n.nome}
          <select data-testid={`creazione-assegna-${n.id}`} value={scelte[n.id] ?? ''} onChange={(e) => setScelte((s) => ({ ...s, [n.id]: e.target.value }))} className="min-h-11 rounded-lg border border-bordo-chiaro bg-notte px-2 text-pergamena">
            <option value="">—</option>
            {valori.map((v, i) => (
              <option key={i} value={`${i}`}>
                {v}
              </option>
            ))}
          </select>
        </label>
      ))}
      <button
        type="button"
        disabled={occupato || !completo}
        className={primario}
        onClick={() => void azioneCreazione({ tipo: 'assegna', valori: Object.fromEntries(nomi.map((n) => [n.id, valori[Number(scelte[n.id])]!])) })}
      >
        {t('telefono.creazione.car.assegna_fatto')}
      </button>
    </div>
  );
}

/** The Game Master's options the campaign allows: move points, swap two scores. */
function Opzioni({ b }: { b: VistaCreazione }) {
  const c = b.caratteristiche;
  const usabili = c.opzioni.filter((o) => o.tipo !== 'riordino');
  const [opzione, setOpzione] = useState(usabili[0]?.id ?? '');
  const [da, setDa] = useState(c.nomi[0]?.id ?? '');
  const [a, setA] = useState(c.nomi[1]?.id ?? '');
  const occupato = useCreazione((s) => s.occupato);
  const scelta = usabili.find((o) => o.id === opzione);
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-bordo bg-notte-2 p-3" data-testid="creazione-opzioni">
      <p className="text-sm tracking-wide text-candela uppercase">{t('telefono.creazione.car.opzioni')}</p>
      <select data-testid="creazione-opzione" value={opzione} onChange={(e) => setOpzione(e.target.value)} className="min-h-11 rounded-lg border border-bordo-chiaro bg-notte px-2 text-pergamena">
        {usabili.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nome}
            {o.restanti !== null ? ` (${t('telefono.creazione.car.restanti', { n: o.restanti })})` : ''}
          </option>
        ))}
      </select>
      <div className="flex flex-wrap items-center gap-2 text-pergamena-2">
        <select data-testid="creazione-opzione-da" aria-label={t('telefono.creazione.car.da')} value={da} onChange={(e) => setDa(e.target.value)} className="min-h-11 rounded-lg border border-bordo-chiaro bg-notte px-2 text-pergamena">
          {c.nomi.map((n) => (
            <option key={n.id} value={n.id}>
              {n.nome}
            </option>
          ))}
        </select>
        <span>{scelta?.tipo === 'scambio' ? '⇄' : '→'}</span>
        <select data-testid="creazione-opzione-a" aria-label={t('telefono.creazione.car.a')} value={a} onChange={(e) => setA(e.target.value)} className="min-h-11 rounded-lg border border-bordo-chiaro bg-notte px-2 text-pergamena">
          {c.nomi.map((n) => (
            <option key={n.id} value={n.id}>
              {n.nome}
            </option>
          ))}
        </select>
        <button type="button" data-testid="creazione-opzione-applica" disabled={occupato || !scelta} className={secondario} onClick={() => void azioneCreazione({ tipo: 'opzione', opzione, da, a })}>
          {t('telefono.creazione.car.applica')}
        </button>
      </div>
    </div>
  );
}

/** A race or a class: one card each, the closed ones greyed with the reason (the server refuses them anyway). */
export function PassoScelta({ passo, voci }: { passo: 'razza' | 'classe'; voci: SceltaCreazione[] }) {
  const occupato = useCreazione((s) => s.occupato);
  return (
    <section data-testid={`creazione-passo-${passo}`} className="flex flex-col gap-3">
      <Titolo>{t(`telefono.creazione.${passo}.titolo`)}</Titolo>
      <ul className="flex flex-col gap-2">
        {voci.map((v) => (
          <li key={v.id}>
            <button
              type="button"
              data-testid={`creazione-${passo}-${v.id}`}
              data-ammessa={v.ammessa}
              aria-disabled={!v.ammessa}
              disabled={occupato}
              onClick={() => void azioneCreazione({ tipo: 'scegli', passo, id: v.id })}
              className={clsx(
                'flex min-h-16 w-full flex-col items-start gap-0.5 rounded-carta border px-4 py-3 text-left',
                v.ammessa ? 'border-bordo bg-notte-2 active:bg-notte-3' : 'border-bordo/60 bg-notte-2/40 text-cenere',
              )}
            >
              <span className={clsx('font-titolo text-xl font-semibold', v.ammessa ? 'text-pergamena' : 'text-cenere line-through')}>{v.nome}</span>
              {v.motivo && <span className="text-sm">{v.motivo}</span>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The starting book (the fixed spells and the ones to choose) and today's prepared spells. */
export function PassoIncantesimi({ b }: { b: VistaCreazione }) {
  const s = b.incantesimi!;
  const occupato = useCreazione((x) => x.occupato);
  const dalMaster = s.come !== 'scelta';
  const [scelti, setScelti] = useState<string[]>(() => (dalMaster ? s.libro.filter((x) => !s.fissi.some((f) => f.id === x)) : []));
  const [preparati, setPreparati] = useState<string[]>([]);
  const libro = [...s.fissi.map((f) => f.id), ...scelti];
  const nome = (id: string) => s.fissi.find((x) => x.id === id)?.nome ?? s.scelte.find((x) => x.id === id)?.nome ?? id;
  const daPreparare = s.fissi.length || s.a_scelta ? libro : s.scelte.map((x) => x.id);
  const giorno = s.slot.reduce((a, n) => a + n, 0);
  const commuta = (l: string[], id: string, max: number): string[] => (l.includes(id) ? l.filter((x) => x !== id) : l.length < max ? [...l, id] : l);
  return (
    <section data-testid="creazione-passo-incantesimi" className="flex flex-col gap-3">
      <Titolo>{t('telefono.creazione.incantesimi.titolo')}</Titolo>
      {(s.fissi.length > 0 || s.a_scelta > 0) && (
        <>
          <p className="text-pergamena-2">{t('telefono.creazione.incantesimi.libro', { fissi: s.fissi.map((f) => f.nome).join(', ') || '—', n: s.a_scelta })}</p>
          {dalMaster && !s.libro.length && <p className="text-candela">{t('telefono.creazione.incantesimi.aspetta_master')}</p>}
          <ul className="flex flex-col gap-1.5">
            {s.scelte.map((x) => (
              <li key={x.id}>
                <label className="flex min-h-11 items-center gap-3 text-pergamena">
                  <input type="checkbox" data-testid={`creazione-libro-${x.id}`} disabled={dalMaster || occupato} checked={scelti.includes(x.id)} onChange={() => setScelti((l) => commuta(l, x.id, s.a_scelta))} className="size-5" />
                  {x.nome} <span className="text-sm text-cenere">{t('telefono.creazione.incantesimi.livello', { n: x.livello })}</span>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
      {giorno > 0 && (
        <>
          <p className="text-pergamena-2">{t('telefono.creazione.incantesimi.oggi', { n: giorno })}</p>
          <ul className="flex flex-col gap-1.5">
            {daPreparare.map((id) => (
              <li key={id}>
                <label className="flex min-h-11 items-center gap-3 text-pergamena">
                  <input type="checkbox" data-testid={`creazione-prepara-${id}`} disabled={occupato} checked={preparati.includes(id)} onChange={() => setPreparati((l) => commuta(l, id, giorno))} className="size-5" />
                  {nome(id)}
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
      <button
        type="button"
        data-testid="creazione-conferma"
        disabled={occupato || (dalMaster && !s.libro.length)}
        className={primario}
        onClick={() => void azioneCreazione({ tipo: 'incantesimi', libro: s.fissi.length || s.a_scelta ? libro : [], preparati })}
      >
        {t('telefono.creazione.incantesimi.conferma')}
      </button>
    </section>
  );
}

/** The race's own languages and up to the bonus more (a slot may stay open). */
export function PassoLingue({ b }: { b: VistaCreazione }) {
  const l = b.lingue!;
  const [extra, setExtra] = useState<string[]>([]);
  const occupato = useCreazione((s) => s.occupato);
  return (
    <section data-testid="creazione-passo-lingue" className="flex flex-col gap-3">
      <Titolo>{t('telefono.creazione.lingue.titolo')}</Titolo>
      <p className="text-pergamena-2">{t('telefono.creazione.lingue.proprie', { lingue: l.proprie.map((x) => x.nome).join(', ') || '—' })}</p>
      <p className="text-pergamena-2">{l.extra ? t('telefono.creazione.lingue.extra', { n: l.extra }) : t('telefono.creazione.lingue.nessuna')}</p>
      {l.extra > 0 && (
        <ul className="flex flex-col gap-1.5">
          {l.scelte.map((x) => (
            <li key={x.id}>
              <label className="flex min-h-11 items-center gap-3 text-pergamena">
                <input
                  type="checkbox"
                  data-testid={`creazione-lingua-${x.id}`}
                  checked={extra.includes(x.id)}
                  onChange={() => setExtra((e) => (e.includes(x.id) ? e.filter((y) => y !== x.id) : e.length < l.extra ? [...e, x.id] : e))}
                  className="size-5"
                />
                {x.nome}
              </label>
            </li>
          ))}
        </ul>
      )}
      <button type="button" data-testid="creazione-conferma" disabled={occupato} className={primario} onClick={() => void azioneCreazione({ tipo: 'lingue', lingue: [...l.proprie.map((x) => x.id), ...extra] })}>
        {t('telefono.creazione.lingue.conferma')}
      </button>
    </section>
  );
}

/** The name (required) and what the player says of the PC. */
export function PassoDescrizione({ b }: { b: VistaCreazione }) {
  const [d, setD] = useState(b.descrizione);
  const occupato = useCreazione((s) => s.occupato);
  const campo = (k: keyof typeof d, max: number, multi = false) => {
    const props = {
      'data-testid': `creazione-${k}`,
      value: d[k],
      maxLength: max,
      onChange: (e: { target: { value: string } }) => setD((x) => ({ ...x, [k]: e.target.value })),
      className: 'rounded-lg border border-bordo-chiaro bg-notte px-3 py-2 text-pergamena',
    };
    return (
      <label className="flex flex-col gap-1 text-sm text-pergamena-2">
        {t(`telefono.creazione.descrizione.${k}`)}
        {multi ? <textarea rows={3} {...props} /> : <input {...props} className={clsx(props.className, 'min-h-12')} />}
      </label>
    );
  };
  return (
    <section data-testid="creazione-passo-descrizione" className="flex flex-col gap-3">
      <Titolo>{t('telefono.creazione.descrizione.titolo')}</Titolo>
      {campo('nome', 60)}
      {campo('pronomi', 20)}
      {campo('aspetto', 400, true)}
      {campo('concetto', 400, true)}
      <button type="button" data-testid="creazione-conferma" disabled={occupato || !d.nome.trim()} className={primario} onClick={() => void azioneCreazione({ tipo: 'descrizione', ...d })}>
        {t('telefono.creazione.descrizione.conferma')}
      </button>
    </section>
  );
}
