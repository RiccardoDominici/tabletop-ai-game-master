# Simultaneous actions: how they talk to each other and to the narration

Request from Riccardo (2 November 2026): "if I write 'I'm going ahead' and Paolo writes 'me too, I'm going ahead', and then my action changes or doesn't go ahead, Paolo must know it and be able to cancel". In general: players' actions are born in parallel while the narration keeps arriving; the system must understand how they connect and warn whoever is affected, without making everyone wait and without filling the phones with notices.

## Principles

1. **You can always write**, even while the narrator is speaking. The invitation gives priority to whoever is called, but does not block the others. What arrives during a narration goes into the next window.
2. **The table sees the intentions.** Public actions in the queue are visible on the other phones, with author and text: this way people coordinate ("me too"), as at a real table. Private actions are not visible.
3. **The Engine decides, the model advises.** The connections between actions are proposed by a small classifier (rules + Haiku), but the Engine manages states, order and notices.
4. **First written, first arrives.** In exclusive conflicts (the same key, the same door) whoever sent first wins; the other one knows **before** the resolution, while they can still change their mind.
5. **Few notices, only when needed.** A notice is sent only if someone's action is really affected: broken dependency, lost conflict, scene changed in a way that makes it doubtful or impossible.

## The action

Fields: `id`, `autore`, `testo`, `privata`, `inviata_alle`, `versione_vista` (the last narration the player had received when they **started** writing: the phone fixes it at the first keystroke), `dipende_da`, `in_conflitto_con`, `stato`, `motivo` (short sentence for the player when the state changes for external causes).

States:

| State | Meaning | Editable |
|---|---|---|
| `in_coda` | sent, waiting for the window to close | yes |
| `da_confermare` | something has affected it: the player chooses «Confermo» (Confirm) / «Cambio» (Change) / «Ritiro» (Withdraw) | yes |
| `ritirata` | withdrawn by its author | — |
| `chiusa` | entered the group the narrator is resolving | no |
| `risolta` | the narrator has resolved it | — |
| `superata` | not executed: the scene or another action has made it impossible (with `motivo`) | can be rewritten |
| `sospesa` | was `da_confermare` and the time ran out (frantic pace), or the Game Master resolved: excluded from the turn, the player knows it | can be rewritten |

## The three cases

**1. Dependencies** («anch'io» (me too), «lo seguo» (I follow him/her), «lo aiuto» (I help him/her), «copro Corrado» (I cover for Corrado))
- At sending, the classifier links the action to those in the queue it refers to (`dipende_da`).
- If an action that other actions depend on is **withdrawn, changed, overridden or suspended**, every dependent action goes to `da_confermare` with a notice to its author:
  «Ginestra ha ritirato "vado avanti". La tua "anch'io vado avanti" dipendeva da quella: confermi, cambi o ritiri?» (English: "Ginestra withdrew "I'm going ahead". Your "me too, I'm going ahead" depended on it: do you confirm, change or withdraw?")
- If the change does not affect the meaning of the dependent action (the classifier says so), no notice.
- Propagation follows the chain (A → B → C), once only per chain.

**2. Exclusive conflicts** (two take the same thing, two go in directions that exclude each other)
- The classifier flags `in_conflitto_con` and whether it is **exclusive**.
- Whoever sent first wins. If the window is still open, the second one immediately receives:
  «Corrado ha già scritto di prendere la chiave: vuoi cambiare azione?» (English: "Corrado has already written to take the key: do you want to change action?") («Tengo» (Keep) / «Cambio» (Change) / «Ritiro» (Withdraw)).
- If the second one keeps the action, the narrator receives the order and resolves the first one first; the second one gets the outcome (also `superata` with the reason, if there was nothing left to take).
- **Non-exclusive** conflicts (two attack the same enemy, two speak to the same NPC): no notice, the narrator resolves them together.

**3. Actions made stale by the narration**
- An action is *stale* if `versione_vista` is earlier than a narration that arrived after it (during writing, or while waiting in the queue).
- When each narration ends, the classifier re-examines the stale actions against what has just happened:
  - **still valid** → stays `in_coda`, no notice;
  - **doubtful** → `da_confermare`: «Nel frattempo la porta si è chiusa. Confermi "entro nella stanza"?» (English: "Meanwhile the door has closed. Do you confirm "I enter the room"?");
  - **impossible** → `superata` with the reason, and an invitation to rewrite.

## The window

Reviewed after the requests of 9 November (docs/richieste-2026-11-09.md; details in docs/f0-contratti.md, «Turno» (Turn)).

- It opens after the invitation. Sending means "I'm done" (there is no "Ready"): it closes when all the invitees have a live action and none is `da_confermare`, after 2.5 s of settling for an "anch'io" or a correction (every send, withdrawal or confirmation restarts it, and whoever is typing extends it, up to a maximum of 8 s). A disconnected phone is not waited for.
- **Calm pace** (normal): no deadline. A `da_confermare` choice waits for the person who must make it; the Game Master has «Risolvi ora» (Resolve now), and then the `da_confermare` become `sospese`.
- **Frantic pace** (requested by the narration with `[ritmo] concitato`, or by the scene or the Game Master): the window closes by itself 25 s after opening. It **does not close** while there are `da_confermare` actions or an invitee is writing (indicator in the last 3 s): it extends briefly, up to a maximum of 8 s. When the time runs out, the `da_confermare` become `sospese` (excluded, with a notice), so nobody holds up the table.
- A queued action never starts a countdown.
- The narrator receives the closed actions **in order of sending**, with the connections: who depends on whom, who won which conflict.

## The classifier («arbitro» (arbiter))

- **Rules first** (instant): names of other PCs, "anch'io", "lo/la seguo", "insieme a" (together with), "aiuto…" (help…), "copro…" (I cover…) with only one candidate action → certain dependency, no model.
- **Then Haiku**: a short call with structured output (JSON with a schema), asynchronous: it does not block sending. It receives the public actions in the queue, the new or changed action, the latest narration and the public summary of the scene. It returns: `dipende_da`, `conflitti [{con, esclusivo, chi_vince}]`, and for the stale actions `valida | dubbia | impossibile` with a one-sentence reason, written for the player.
- **Private actions** enter the classifier only for their author and for exclusive conflicts, and the notices to the others do not reveal their content: "someone else got there first".
- Measurement: a set of 30–40 hand-written cases (dependencies, conflicts, stale actions, false alarms) with the right answer, to measure precision and recall before putting it into play.

## Phone

- «Al tavolo» (At the table) section: the other players' public actions in the queue, with their state.
- Your own action: state, and `motivo` when it changes for external causes.
- Full-screen notice for `da_confermare`, with three buttons (and a countdown only at frantic pace); vibration where available.
- Only «Invia» (Send) and «Ritira» (Withdraw): whoever has sent sees «Azione inviata» (Action sent) and, below it, «Aspettiamo: …» (Waiting for: …).
- Outcomes for those who were overridden: private, brief, with a «Riscrivi» (Rewrite) button.

## Choices after the research (`docs/ricerca-azioni.md`)

- **Intentions stay visible**, unlike WEGO games where orders are blind: at a real table people talk, and "anch'io" presupposes knowing what the other one wrote. Private actions stay hidden.
- **One action per player per window**: a new send replaces it (edit); they do not accumulate.
- **Recheck at resolution time**: the narrator resolves in order of sending; an action that is no longer possible at that point "switches off" (`superata`, with the reason); both are not cancelled.
- **True ties** (sends within 1 s): the order rotates among the players, so no seat always wins.
- **Whoever does not write, waits**: the narrator never invents a PC's action.
- **Atomic closing**: closing the window and moving to `chiusa` in a single step under lock (there are known bugs when the last two send at the same instant).
- **Never lose written text**: an action `superata` or `sospesa` returns to the input box, ready to edit.
- **Words of notices**: no «Conflitto!» (Conflict!); say what happened and what can be done. «In attesa» (Waiting) and «da decidere» (to be decided) stay distinct: only the second one asks for a choice.

## Verification

- Deterministic tests on the scenarios (fake classifier): dependency and withdrawal, chain A→B→C, exclusive conflict with the second one changing, stale action valid/doubtful/impossible, frantic deadline → `sospesa`, private action; turn without deadline (calm), settling, disconnected invitee, «Risolvi ora» (Resolve now).
- Set of cases for the real classifier (Haiku), with precision and recall.
- End-to-end test with three phones (Playwright) on the same scenarios, with screenshots of the notices.
