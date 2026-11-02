/**
 * Riassunto PUBBLICO della scena per l'arbitro: luogo, elementi visibili, PNG presenti (aspetto),
 * PG al tavolo. Niente segreti: elementi NASCOSTI esclusi, e le frasi con parole segrete
 * (parole_segrete.yaml) tolte come nel contesto della modalità repertorio.
 */
import type { Campagna, DatiYaml } from '../campagna/tipi';
import { togliFrasiSegrete, type ParolaSegreta } from '../repertorio/segreti';

export function riassuntoPubblico(c: Campagna, parole: ParolaSegreta[]): string {
  const pulisci = (t: unknown): string => (typeof t === 'string' ? togliFrasiSegrete(t, parole) : '');
  const s = c.scena.dati;
  const righe: string[] = [`Luogo: ${c.scena.titolo}.`];
  const descrizione = pulisci(s['descrizione']);
  if (descrizione) righe.push(descrizione);
  const elementi = ((s['elementi_interattivi'] as DatiYaml[] | undefined) ?? []).filter((e) => !/NASCOST/i.test(JSON.stringify(e)));
  if (elementi.length) {
    righe.push('Cose con cui si può agire:');
    for (const e of elementi) {
      const t = [pulisci(e['cosa']), pulisci(e['dove'])].filter(Boolean).join(', ');
      if (t) righe.push(`- ${t}`);
    }
  }
  righe.push('PNG presenti:');
  for (const p of c.png.filter((x) => c.scena.png_presenti.includes(x.id))) {
    const aspetto = pulisci((p.dati['aspetto'] as DatiYaml | undefined)?.['lettura']);
    righe.push(`- ${p.nome}${aspetto ? `: ${aspetto}` : ''}`);
  }
  righe.push('PG al tavolo (i giocatori):');
  for (const p of c.pg) righe.push(`- ${p.nome} (${p.id}): ${pulisci(p.descrizione)}`);
  if (c.situazioneComune) righe.push(`Situazione: ${pulisci(c.situazioneComune)}`);
  return righe.join('\n');
}
