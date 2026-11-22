/**
 * The draft's next roll (docs/creazione.md): with manual rolls, one box per die — the player rolls the real dice and types
 * what each shows (the phone adds them up, the server checks count and faces); with automatic rolls, one button and
 * the Engine rolls. The same card for the scores, each level's hit die and the starting money.
 */
import { useEffect, useRef, useState } from 'react';
import type { DadiDaTirare } from '@tabletop-ai-gm/shared';
import { t } from '../../lingua';
import { conSegno } from '../../lib/tiri';
import { azioneCreazione, useCreazione } from './stato';

export function DadiDaInserire({ tiro, manuale }: { tiro: DadiDaTirare; manuale: boolean }) {
  const occupato = useCreazione((s) => s.occupato);
  // A new roll (another score, the next level) starts with empty boxes.
  const chiave = `${tiro.per}|${tiro.numero}d${tiro.facce}`;
  return <Carta key={chiave} tiro={tiro} manuale={manuale} occupato={occupato} />;
}

function Carta({ tiro, manuale, occupato }: { tiro: DadiDaTirare; manuale: boolean; occupato: boolean }) {
  const [campi, setCampi] = useState<string[]>(() => Array.from({ length: tiro.numero }, () => ''));
  const primo = useRef<HTMLInputElement>(null);
  useEffect(() => primo.current?.focus(), []);
  const valori = campi.map((c) => Number(c));
  const pieni = campi.every((c) => c.trim() !== '');
  const totale = pieni ? valori.reduce((a, b) => a + b, 0) + tiro.bonus : null;
  const dadi = `${tiro.numero}d${tiro.facce}`;
  return (
    <form
      data-testid="creazione-tiro"
      className="flex flex-col gap-3 rounded-carta border-2 border-candela/70 bg-notte-2 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!manuale) void azioneCreazione({ tipo: 'tira', valori: null });
        else if (pieni) void azioneCreazione({ tipo: 'tira', valori });
      }}
    >
      <p className="font-titolo text-2xl font-semibold text-pergamena" data-testid="creazione-tiro-per">
        {tiro.per}
      </p>
      <p className="text-lg text-pergamena-2">
        {manuale ? t('telefono.creazione.dadi.tira_manuale', { dadi }) : t('telefono.creazione.dadi.tira_motore_come', { dadi })}
        {tiro.bonus !== 0 && <span className="ml-1">{t('telefono.creazione.dadi.bonus', { bonus: conSegno(tiro.bonus) })}</span>}
      </p>
      {manuale && (
        <div className="flex flex-wrap items-end gap-3">
          {campi.map((c, i) => (
            <label key={i} className="flex flex-col gap-1 text-sm text-pergamena-2">
              {tiro.numero > 1 ? t('telefono.creazione.dadi.dado_n', { n: i + 1 }) : t('telefono.creazione.dadi.dado')}
              <input
                ref={i === 0 ? primo : undefined}
                data-testid={`creazione-dado-${i}`}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={3}
                value={c}
                aria-label={t('telefono.creazione.dadi.aria', { n: i + 1, facce: tiro.facce })}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 3);
                  setCampi((x) => x.map((y, k) => (k === i ? v : y)));
                }}
                className="h-14 w-20 rounded-xl border-2 border-pergamena-2/60 bg-notte text-center font-titolo text-2xl text-pergamena tabular-nums focus:border-candela focus:outline-none"
              />
            </label>
          ))}
          {totale !== null && (
            <p className="pb-3 font-titolo text-xl text-candela" data-testid="creazione-tiro-totale">
              {t('telefono.creazione.dadi.totale', { totale })}
            </p>
          )}
        </div>
      )}
      <button
        type="submit"
        data-testid="creazione-tira"
        disabled={occupato || (manuale && !pieni)}
        className="min-h-14 rounded-2xl bg-candela text-lg font-bold text-notte active:scale-[0.98] disabled:opacity-50"
      >
        {manuale ? t('telefono.creazione.dadi.fatto') : t('telefono.creazione.dadi.tira_motore')}
      </button>
    </form>
  );
}
