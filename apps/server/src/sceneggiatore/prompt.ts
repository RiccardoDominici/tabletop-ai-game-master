/**
 * Il prompt dello sceneggiatore (docs/sceneggiatore.md): Claude Code scrive battute nel formato del
 * repertorio, come il Preparatore, ma una scena alla volta e mentre si gioca. Il Motore le controlla
 * (sceneggiatore/valida.ts) prima di metterle nel repertorio: qui le regole si dicono, là si applicano.
 */
import type { RichiestaSceneggiatore } from './protocollo';

export const PROMPT_SCENEGGIATORE = `Sei lo SCENEGGIATORE di una partita di Dungeons & Dragons dal vivo, in italiano. Mentre i giocatori parlano scrivi battute pronte, nel formato del repertorio. Al tavolo un modello locale piccolo sceglierà fra le tue battute; una voce sintetica le leggerà. Non usi strumenti: rispondi SOLO con un blocco YAML.

Formato (una lista «battute»):
battute:
  - id: <il prefisso dato, poi un numero>
    chi: narratore | <id esatto di un PNG presente>
    tipo: reazione | momento | richiesta | rifiuto | saluto
    quando: "<l'azione dei giocatori a cui risponde, in terza persona: «un PG chiede a Gaspare del cassetto»>"
    temi: [<3-6 parole che un giocatore scriverebbe, minuscole>]
    testo:
      - "[narratore] <frase>"
      - "[png_id] <parole dette dal PNG>"

Regole:
- Ogni battuta risponde a un'azione PROBABILE del prossimo turno (o a quella data), senza nomi di PG.
- Da una a tre righe per battuta, frasi da cinque a dodici parole, presente indicativo, cose precise.
- Il PNG parla con la voce della sua scheda (registro, stile, lessico), dice solo ciò che sa o vede, mai ciò che sta in mai_dice.
- Niente fatti di trama nuovi, niente indizi, confessioni o segreti: le rivelazioni sono già preparate. Le PAROLE SEGRETE elencate non si dicono mai.
- Niente richiede, effetti, varianti: il Motore li rifiuta.`;

export function messaggioSceneggiatore(rq: RichiestaSceneggiatore, contesto: string, paroleSegrete: string[], esempi: string): string {
  const compito =
    rq.tipo === 'subito' && rq.azione
      ? `Scrivi UNA battuta che risponde a questa azione, adesso (il tavolo sta aspettando): ${rq.azione.nome} (${rq.azione.id_pg}): «${rq.azione.testo}». Se l'azione si rivolge a un PNG presente, risponde lui; altrimenti il narratore dice l'effetto.`
      : `Scrivi ${rq.quante} battute per le azioni più probabili del prossimo turno, diverse fra loro: chi parla con chi, cosa toccano, cosa chiedono. Almeno una per ogni PNG presente.`;
  return [
    `## Campagna e scena (ciò che sa il narratore)\n${contesto}`,
    `## Scena in corso: ${rq.scena.titolo} (${rq.scena.id}); PNG presenti: ${rq.scena.png_presenti.join(', ') || 'nessuno'}`,
    `## Stato\nindizi rivelati: ${rq.stato.indizi_rivelati.join(', ') || 'nessuno'}\nfatti noti ai PG: ${rq.stato.fatti_noti.join(', ') || 'nessuno'}\norologi: ${Object.entries(rq.stato.orologi).map(([k, v]) => `${k} ${v}`).join(', ') || '—'}`,
    `## Parole segrete (MAI nelle tue battute)\n${paroleSegrete.map((p) => `- ${p}`).join('\n') || '(nessuna)'}`,
    `## Ultime righe sentite al tavolo\n${rq.trascrizione.join('\n') || '(nessuna)'}`,
    esempi ? `## Esempi di battute di questa campagna\n${esempi}` : '',
    `## Compito\n${compito}\nPrefisso degli id: ${rq.prefisso}. Rispondi solo con il blocco YAML.`,
  ]
    .filter(Boolean)
    .join('\n\n');
}
