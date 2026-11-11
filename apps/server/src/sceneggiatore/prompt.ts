/**
 * Il prompt dello sceneggiatore (docs/sceneggiatore.md): Claude Code scrive battute nel formato del
 * repertorio, come il Preparatore, ma una scena alla volta e mentre si gioca. Il Motore le controlla
 * (sceneggiatore/valida.ts) prima di metterle nel repertorio: qui le regole si dicono, là si applicano.
 * Il prompt è prompts/<lingua>/sceneggiatore.md e le sezioni del messaggio stanno in
 * lingue/<lingua>/testi-modelli.yaml (modelli.sceneggiatore): la lingua è quella della campagna.
 */
import { testo } from '../lingua';
import { prompt } from '../lingua/motore';
import type { RichiestaSceneggiatore } from './protocollo';

/** Il prompt di sistema dello sceneggiatore, nella lingua dei contenuti. */
export const promptSceneggiatore = (): string => prompt('sceneggiatore');

export function messaggioSceneggiatore(rq: RichiestaSceneggiatore, contesto: string, paroleSegrete: string[], esempi: string): string {
  const t = (k: string, v: Record<string, string | number> = {}): string => testo(`modelli.sceneggiatore.${k}`, v);
  const compito =
    rq.tipo === 'chiusura'
      ? t('chiusura')
      : rq.tipo === 'subito' && rq.azione
        ? t('subito', { nome: rq.azione.nome, id_pg: rq.azione.id_pg, testo: rq.azione.testo, privata: rq.azione.privata ? t('privata') : '' })
        : t('prossime', { quante: rq.quante });
  return [
    t('contesto', { contesto }),
    t('scena', { titolo: rq.scena.titolo, id: rq.scena.id, presenti: rq.scena.png_presenti.join(', ') || t('nessuno') }),
    t('stato', {
      indizi: rq.stato.indizi_rivelati.join(', ') || t('nessuno'),
      fatti: rq.stato.fatti_noti.join(', ') || t('nessuno'),
      orologi: Object.entries(rq.stato.orologi).map(([k, v]) => `${k} ${v}`).join(', ') || t('trattino'),
    }),
    t('segrete', { elenco: paroleSegrete.map((p) => `- ${p}`).join('\n') || t('nessuna') }),
    t('trascrizione', { righe: rq.trascrizione.join('\n') || t('nessuna') }),
    rq.gia_usati
      ? t('gia_usati', {
          attacchi: rq.gia_usati.attacchi.map((x) => `«${x}»`).join(', ') || t('trattino'),
          immagini: rq.gia_usati.immagini.map((x) => `«${x}»`).join(', ') || t('trattino'),
          tic: Object.entries(rq.gia_usati.tic).map(([png, x]) => `${png} «${x.join('», «')}»`).join('; ') || t('nessuno'),
        })
      : '',
    esempi ? t('esempi', { esempi }) : '',
    t('compito', { compito, prefisso: rq.prefisso }),
  ]
    .filter(Boolean)
    .join('\n\n');
}
