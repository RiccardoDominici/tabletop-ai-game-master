/**
 * «Audio» nel pannello del master: cosa suona sul proiettore (musica del luogo, umore scelto,
 * strati d'ambiente), un pulsante per ogni umore del catalogo più «auto» (torna alla musica del
 * luogo) e un pulsante per ogni effetto. L'umore cambia subito sul proiettore, senza aspettare
 * l'isteresi della musica. Nomi di umori ed effetti non sono spoiler: si mostrano sempre.
 */
import clsx from 'clsx';
import type { AudioMaster, StatoMaster } from '@tabletop-ai-gm/shared';
import { useInCorso } from '../store/master';
import { nomeEffetto, nomeTraccia, nomeUmore } from './audio';
import { inviaComando } from './sessione';
import { Riquadro } from './Riquadro';
import { t } from '../lingua';

const PULSANTE = 'min-h-9 rounded-lg border px-2.5 text-sm font-semibold transition-colors disabled:opacity-60';

export function SezioneAudio({ stato }: { stato: StatoMaster }) {
  const audio = stato.audio;
  if (!audio || (audio.umori.length === 0 && audio.effetti.length === 0 && !audio.musica && audio.ambienti.length === 0)) return null;
  return (
    <Riquadro titolo={t('master.audio.titolo')} zona="audio" data-testid="master-audio">
      <dl className="mb-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
        <dt className="text-cenere">{t('master.audio.musica')}</dt>
        <dd data-testid="master-audio-musica" className="truncate">
          {audio.umore ? t('master.audio.umore', { nome: nomeUmore(audio.umore) }) : nomeTraccia(audio.musica)}
          {audio.umore && <span className="text-cenere"> ({t('master.audio.luogo', { nome: nomeTraccia(audio.musica) })})</span>}
        </dd>
        <dt className="text-cenere">{t('master.audio.ambienti')}</dt>
        <dd className="truncate">{audio.ambienti.map(nomeTraccia).join(', ') || '—'}</dd>
      </dl>
      {audio.umori.length > 0 && <Umori audio={audio} />}
      {audio.effetti.length > 0 && <Effetti effetti={audio.effetti} />}
    </Riquadro>
  );
}

function Umori({ audio }: { audio: AudioMaster }) {
  const inCorso = useInCorso('umore');
  const scegli = (umore: string | null) =>
    void inviaComando({ tipo: 'umore', umore }, umore ? t('master.audio.descr_umore', { nome: nomeUmore(umore) }) : t('master.audio.descr_umore_auto'));
  return (
    <div className="mb-2">
      <p className="mb-1 text-xs tracking-wide text-cenere uppercase">{t('master.audio.umore_titolo')}</p>
      <div className="flex flex-wrap gap-1.5">
        <BottoneUmore attivo={audio.umore === null} disabilitato={inCorso} onClick={() => scegli(null)} testid="master-umore-auto" titolo={t('master.audio.torna_luogo')}>
          {t('master.umore.auto')}
        </BottoneUmore>
        {audio.umori.map((tag) => (
          <BottoneUmore key={tag} attivo={audio.umore === tag} disabilitato={inCorso} onClick={() => scegli(tag)} testid={`master-umore-${tag}`} titolo={t('master.audio.cambia_subito')}>
            {nomeUmore(tag)}
          </BottoneUmore>
        ))}
      </div>
    </div>
  );
}

function BottoneUmore(p: { attivo: boolean; disabilitato: boolean; onClick: () => void; testid: string; titolo: string; children: string }) {
  return (
    <button
      type="button"
      data-testid={p.testid}
      aria-pressed={p.attivo}
      disabled={p.disabilitato}
      onClick={p.onClick}
      title={p.titolo}
      className={clsx(PULSANTE, p.attivo ? 'border-candela bg-candela/15 text-candela' : 'border-bordo bg-notte-3 text-pergamena-2 enabled:hover:border-candela/60')}
    >
      {p.children}
    </button>
  );
}

function Effetti({ effetti }: { effetti: string[] }) {
  return (
    <div>
      <p className="mb-1 text-xs tracking-wide text-cenere uppercase">{t('master.audio.effetti')}</p>
      <div className="flex flex-wrap gap-1.5">
        {effetti.map((id) => (
          <BottoneEffetto key={id} id={id} />
        ))}
      </div>
    </div>
  );
}

function BottoneEffetto({ id }: { id: string }) {
  const inCorso = useInCorso(`effetto:${id}`);
  return (
    <button
      type="button"
      data-testid={`master-effetto-${id}`}
      disabled={inCorso}
      onClick={() => void inviaComando({ tipo: 'effetto', id }, t('master.audio.descr_effetto', { nome: nomeEffetto(id) }))}
      title={t('master.audio.suona')}
      className={clsx(PULSANTE, 'border-bordo bg-notte-3 text-pergamena-2 enabled:hover:border-lago/70 enabled:hover:text-lago')}
    >
      ♪ {nomeEffetto(id)}
    </button>
  );
}
