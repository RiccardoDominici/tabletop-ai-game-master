/**
 * Scena e luogo: la scena corrente, il luogo sul proiettore (con miniatura), i pulsanti per
 * cambiare luogo (dissolvenza sullo schermo) e, se la campagna ne ha più d'una, le scene.
 * Un clic = un comando; il luogo/la scena corrente sono evidenziati e non si ri-mandano.
 */
import clsx from 'clsx';
import type { LuogoMaster, ScenaMaster, StatoMaster } from '@cantastorie/shared';
import { useInCorso } from '../store/master';
import { inviaComando } from './sessione';
import { Riquadro, Sottotitolo, Vuoto } from './Riquadro';
import { Chip } from './Chip';
import { Miniatura } from './Miniatura';
import { t } from '../lingua';

export function SezioneScena({ stato }: { stato: StatoMaster }) {
  const { tavolo, luoghi, scene } = stato;
  const scenaCorrente = scene.find((s) => s.corrente) ?? null;
  const idLuogo = tavolo.scena.luogo;
  const luogoCorrente = luoghi.find((l) => l.id === idLuogo) ?? null;
  // Un'immagine di situazione copre il luogo sul proiettore: la miniatura mostra ciò che si vede davvero.
  const situazione = stato.situazioni.find((x) => x.in_onda) ?? null;

  return (
    <Riquadro titolo={t('master.scena.titolo')} zona="scena" data-testid="master-scena">
      <div data-testid="master-luogo-corrente" data-luogo={idLuogo} className="flex items-center gap-3">
        <Miniatura url={tavolo.scena.situazione ?? tavolo.scena.immagine} alt={situazione?.nome ?? luogoCorrente?.nome ?? idLuogo} className="h-20 w-36" />
        <div className="min-w-0">
          <p className="text-xs tracking-[0.16em] text-cenere uppercase">{t('master.scena.sul_proiettore')}</p>
          <p className="truncate font-semibold text-pergamena">{luogoCorrente?.nome ?? idLuogo}</p>
          <p className="truncate text-sm text-pergamena-2">
            {t('master.scena.scena', { titolo: scenaCorrente?.titolo ?? tavolo.scena.titolo })}
          </p>
          {situazione && <p className="truncate text-xs text-candela-2">{t('master.scena.ora', { nome: situazione.nome })}</p>}
          {!tavolo.scena.immagine && !situazione && <p className="text-xs text-cenere italic">{t('master.scena.nessuna_immagine')}</p>}
        </div>
      </div>

      <Sottotitolo>{t('master.scena.luoghi')}</Sottotitolo>
      {luoghi.length === 0 ? (
        <Vuoto>{t('master.scena.nessun_luogo')}</Vuoto>
      ) : (
        <ul className="grid grid-cols-2 gap-1.5">
          {luoghi.map((l) => (
            <li key={l.id}>
              <PulsanteLuogo luogo={l} corrente={l.id === idLuogo} />
            </li>
          ))}
        </ul>
      )}

      {scene.length > 1 && (
        <>
          <Sottotitolo>{t('master.scena.scene_campagna')}</Sottotitolo>
          <ul className="flex flex-col gap-1">
            {scene.map((s) => (
              <li key={s.id}>
                <PulsanteScena scena={s} nomeLuogo={luoghi.find((l) => l.id === s.luogo)?.nome ?? s.luogo} />
              </li>
            ))}
          </ul>
        </>
      )}
    </Riquadro>
  );
}

function PulsanteLuogo({ luogo, corrente }: { luogo: LuogoMaster; corrente: boolean }) {
  const inCorso = useInCorso(`luogo:${luogo.id}`);
  return (
    <button
      type="button"
      data-testid={`master-luogo-${luogo.id}`}
      aria-pressed={corrente}
      disabled={corrente || inCorso}
      onClick={() => void inviaComando({ tipo: 'luogo', luogo: luogo.id }, t('master.scena.descr_luogo', { nome: luogo.nome }))}
      title={corrente ? t('master.scena.gia_sul_proiettore') : t('master.scena.metti', { nome: luogo.nome })}
      className={clsx(
        'flex w-full items-center gap-2 rounded-lg border p-1.5 text-left text-sm transition-colors',
        corrente
          ? 'cursor-default border-candela bg-candela/10 shadow-candela'
          : 'border-bordo bg-notte-3 enabled:hover:border-candela/60 enabled:hover:bg-notte-4 disabled:opacity-50',
      )}
    >
      <Miniatura url={luogo.immagine} alt="" className="h-9 w-16" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{luogo.nome}</span>
        <span className="block truncate text-xs text-cenere">
          {luogo.tipo === 'scena' ? t('master.scena.tipo_scena') : t('master.scena.tipo_nodo')}
          {corrente && <strong className="font-semibold text-candela"> · {t('master.scena.in_onda')}</strong>}
        </span>
      </span>
    </button>
  );
}

function PulsanteScena({ scena, nomeLuogo }: { scena: ScenaMaster; nomeLuogo: string }) {
  const inCorso = useInCorso(`scena:${scena.id}`);
  return (
    <button
      type="button"
      data-testid={`master-scena-${scena.id}`}
      aria-pressed={scena.corrente}
      disabled={scena.corrente || inCorso}
      onClick={() => void inviaComando({ tipo: 'scena', scena: scena.id }, t('master.scena.descr_scena', { titolo: scena.titolo }))}
      title={scena.corrente ? t('master.scena.gia_in_corso') : t('master.scena.passa', { titolo: scena.titolo })}
      className={clsx(
        'flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-sm',
        scena.corrente
          ? 'cursor-default border-candela bg-candela/10'
          : 'border-bordo bg-notte-3 enabled:hover:border-candela/60 enabled:hover:bg-notte-4 disabled:opacity-50',
      )}
    >
      <span className="min-w-0 flex-1 truncate font-semibold">{scena.titolo}</span>
      <span className="shrink-0 truncate text-xs text-cenere">{nomeLuogo}</span>
      {scena.corrente && <Chip tono="candela">{t('master.scena.corrente')}</Chip>}
    </button>
  );
}
