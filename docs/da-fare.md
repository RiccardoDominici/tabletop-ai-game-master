# Da fare (aggiornato il 2 novembre 2026, sera)

Lista viva delle cose aperte, con chi le ha in mano. Le decisioni prese sono nei documenti di progetto.

## In corso
- **Prova alla cieca della skill Preparatore**: un agente nuovo scrive `campagne/ponte-lanterne` seguendo solo la skill.
- **Immagini vere di prova-f0**: luoghi a 1920x1080, ritratti 3:4, situazioni (es. Sebastiano senza cappuccio).
- **Server** (fatto il 2 novembre sera): riga «X sta parlando» sul proiettore, pannello del master (`/master`),
  `richiede.privata`/`da_pg`, `alias` dalle schede, `modi` e `mente_su[].id`, campagne con più scene, immagini di
  situazione dopo la rivelazione. Restano aperti:
  - skill e validatore: documentare `aspetto.situazioni[].dopo` (il collegamento esplicito alla rivelazione); oggi il
    Motore lo ricava per somiglianza e in ponte-lanterne non lo trova per `studio_cassa` di Vischi (solo a comando);
  - in modalità A (improvvisa) gli indizi non hanno id: le situazioni escono solo a comando del master;

## Dopo
- **Skill e validatore** (raccogliere insieme alle note della prova alla cieca, `NOTE_SULLA_SKILL.md`):
  - il validatore non legge `aspetto.prompt_ritratto` né `nodi[].immagine`: aggiungere controlli su `[STILE]`, lingua, segreti;
  - `SKILL.md` descrive ancora prova-f0 com'era prima del passaggio al rigoroso (confessioni senza cancello, cicatrice nel ritratto).
- **Custode dei segreti** (`esperimenti/giudizio-ab-2/conclusioni.md`): controllo sì/no per le battute che rivelano
  un segreto, quando si riprende la qualità della narrazione.
- **Filtri F1** (agency, battute riferite, lunghezza, canone, chiusura con invito): quando si riprende la narrazione,
  con le API definitive.
- **Voce**: in pausa fino alla fase finale, con un'API strutturata che permetta di regolare l'intonazione.
  Il codice del pre-render delle battute è pronto (`apps/server/src/strumenti/prerender.ts`).
- **Musica** (F5): prova di generazione locale (ACE-Step o Stable Audio 3 con login Hugging Face) o biblioteca CC0/CC-BY;
  allineare il vocabolario dei tag tra manuale §4 e architettura.
- **Telefoni veri in stanza**: HTTPS per il microfono (tunnel, mkcert o Tailscale), trascrizione con Whisper.
