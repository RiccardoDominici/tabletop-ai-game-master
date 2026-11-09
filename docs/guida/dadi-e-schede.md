# Dadi e schede

In questa pagina: come funzionano le prove e i dadi, cosa vedi sul proiettore e sul telefono, e come si scrivono le schede dei personaggi.
Prima leggi: [Una serata di gioco](una-serata.md). La fonte di tutto è `docs/prove.md`: qui c'è la versione semplice.

## In breve

- **Il programma tira, il modello no.** Un arbitro veloce (Haiku) decide solo *che cosa* si tira: per esempio una
  prova di Persuasione, o un tiro per colpire con la balestra. Il codice calcola tutto il resto dalle schede e dalle
  regole: difficoltà, modificatori, dadi, esito.
- **Il narratore riceve l'esito come un fatto.** Per esempio: «Ida Ferraro: Persuasione (Carisma) verso Bertoldo:
  18 contro CD 15 → RIUSCITA.» Il narratore racconta la conseguenza e non la può cambiare.
- **Ogni tiro ha la sua carta**, sul proiettore e sul telefono. Un tiro privato compare solo sul telefono del suo giocatore.

Le regole sono quelle dell'SRD 5.2 di D&D (licenza CC-BY-4.0), salvo che la campagna abbia un suo set di regole
(vedi in fondo).

Parole che servono:
- **CD** (classe difficoltà): il numero da raggiungere in una prova;
- **CA** (classe armatura): il numero da raggiungere per colpire qualcuno;
- **modificatore**: quanto si aggiunge al dado;
- **PF** (punti ferita): quanti colpi regge un personaggio.

## Quando si tira

Si tira solo quando l'esito è incerto e interessante: quando fallire è possibile e conta (SRD 5.2, «D20 Tests»).
- Un'azione banale non tira: riesce e basta.
- Un'azione impossibile non tira: non riesce.

Senza schede numeriche dei personaggi non si tira mai: il narratore risolve con «sì, ma…» (vedi
«Una campagna senza dadi», più sotto).

## Cosa vedi

**Sul proiettore** compare una colonna di carte, a destra, una per tiro. Su ogni carta:
- chi tira, che cosa, e contro chi;
- il d20 (due d20 con vantaggio o svantaggio: quello scartato è attenuato);
- il modificatore e il totale;
- la CD o la CA da battere, e l'esito;
- per gli attacchi, il danno e, se serve, «a terra».

Il d20 gira per circa 1,2 secondi, poi compaiono il totale e l'esito. Finita la narrazione, le carte si stringono e
spariscono.

**Sul telefono**:
- la carta della tua azione, anche se è privata, la vede solo il tuo telefono;
- «Tiri del turno» mostra le carte pubbliche dell'ultimo turno;
- i tuoi punti ferita stanno sotto il nome del personaggio.

Il narratore, dei PNG, sa solo come stanno («ferito ma regge», «a terra»), mai i numeri. Dei personaggi dei
giocatori sente i numeri, che i giocatori vedono comunque sul telefono.

Vuoi vedere com'è fatta una carta? Con il server avviato apri `http://localhost:4610/schermo?carte=prova`
(oppure `?carte=galleria`, o `/telefono?carte=prova`): la pagina mostra carte d'esempio e non si collega alla
partita (`docs/prove.md`, §5).

## Le regole che il Motore usa

Tutto viene da `docs/prove.md`, §1, che cita l'SRD 5.2.

**La prova.** d20 + modificatore della caratteristica + bonus di competenza, se il personaggio è competente.
- Modificatore: (punteggio − 10) diviso 2, arrotondato per difetto. Per esempio, Carisma 16 dà +3.
- Bonus di competenza: +2 dal livello 1 al 4, +3 dal 5 all'8, e così via fino a +9.

**Le difficoltà** (quando la scena non ne indica una):

| CD | Difficoltà |
|---|---|
| 5 | molto facile |
| 10 | facile |
| 15 | media |
| 20 | difficile |
| 25 | molto difficile |
| 30 | quasi impossibile |

**Vantaggio e svantaggio.** Si tirano due d20 e si tiene il più alto (vantaggio) o il più basso (svantaggio).
Più vantaggi non si sommano; un vantaggio e uno svantaggio insieme si annullano.

**Il 20 e l'1 naturali** contano solo nei tiri per colpire: il 20 è sempre un colpo critico (i dadi del danno si
tirano due volte), l'1 manca sempre. Nelle prove e nei tiri salvezza non contano.

**Gli attacchi.** Il tiro si confronta con la CA del bersaglio. Un'arma a distanza ha svantaggio se un nemico che vede
il tiratore gli sta entro un metro e mezzo.
- A 0 PF un PNG muore o è fuori combattimento.
- A 0 PF un personaggio dei giocatori perde i sensi. Oggi resta «a terra, privo di sensi» e non agisce finché non lo
  curano: i tiri salvezza contro la morte non ci sono ancora.

**Convincere un PNG («Influenzare»).**
- Se il PNG è ben disposto, non si tira: va. Se è maldisposto, non si tira: non va.
- Se è esitante, si tira contro CD 15, oppure contro la sua Intelligenza se è più alta, oppure contro la CD scritta
  nella sua scheda (`influenza.cd`).
- Un PNG amichevole verso quel personaggio dà vantaggio; uno ostile dà svantaggio.
- Le abilità sono Persuasione, Inganno, Intimidire, Intrattenere, e Addestrare animali con le bestie.

**Aiutare.** Chi aiuta un compagno gli dà vantaggio sulla sua prova. Le prove di gruppo non esistono nell'SRD 5.2:
chi collabora scrive che aiuta.

**Le prove passive** valgono 10 + il modificatore.

**Le regole della casa** (dichiarate in `docs/prove.md`, §1, perché l'SRD 5.2 non ha una regola generale):
- contro un PNG si tira contro il suo valore passivo, per esempio la tua Furtività contro la sua Percezione passiva.
  Tira solo il giocatore;
- tra due personaggi dei giocatori tirano tutti e due, e vince il più alto. A parità nessuno prevale;
- afferrare e spingere sono semplificati in Atletica contro il valore passivo.

**Le reazioni dei PNG.** Se colpisci un PNG ostile che resta in piedi, può rispondere subito: il Motore tira il suo
attacco dopo la tua azione, nello stesso turno.

## Le schede

Le schede sono facoltative: una campagna senza schede gioca senza dadi. Le tre campagne di esempio (`prova-f0`,
`ponte-lanterne`, `nozze-neve`) hanno le schede dei personaggi e dei PNG, e le prove delle scene.

### La scheda di un personaggio dei giocatori

Sta in `pg.yaml`, dentro ogni personaggio, sotto `scheda`. Un esempio vero, da `campagne/nozze-neve/pg.yaml`:

```yaml
    scheda:
      caratteristiche: {forza: 8, destrezza: 13, costituzione: 12, intelligenza: 10, saggezza: 10, carisma: 16}
      competenze: [intrattenere, persuasione, inganno, storia]
      tiri_salvezza: [destrezza, carisma]
      armatura: {tipo: armatura di cuoio}
      pf: 8
      attacchi:
      - {nome: Stocco, caratteristica: destrezza, danno: 1d8, tipo_danno: perforante}
```

| Campo | Cosa contiene |
|---|---|
| `caratteristiche` | tutte e sei: `forza`, `destrezza`, `costituzione`, `intelligenza`, `saggezza`, `carisma`. Per i personaggi dei giocatori, punteggi da 1 a 20. |
| `competenze` | le abilità in cui il personaggio è competente (elenco più sotto) |
| `maestrie` | facoltativo: abilità con la competenza doppia |
| `tiri_salvezza` | le caratteristiche in cui è competente nei tiri salvezza |
| `armatura` | il tipo di armatura (elenco più sotto), con `scudo: true` se ha lo scudo; oppure `ca: 14` senza armatura |
| `pf` | i punti ferita massimi |
| `attacchi` | ogni arma: `nome`, `caratteristica`, `danno` (per esempio `1d8`), `tipo_danno`, e `distanza: true` per le armi a distanza. Facoltativi: `competente` (vero se manca) e `bonus` (per un'arma magica). |

Il livello resta quello del personaggio (`livello`, da 1 a 20).

### La scheda di un PNG

Sta nel file del PNG, `png/<id>.yaml`, sotto `scheda`. È come quella dei personaggi, con qualche differenza:
- serve `gs` (il grado di sfida, per esempio `1/2`) oppure `livello`: decide il bonus di competenza;
- i punteggi delle caratteristiche vanno da 1 a 30. L'Intelligenza decide la CD per convincerlo;
- le `competenze` contano per i valori passivi (per esempio la Percezione contro la Furtività);
- `influenza: {cd: 12}`, facoltativo, fissa la CD per convincerlo.

L'atteggiamento verso ogni personaggio (`atteggiamento_pg.<pg>.stato`: `ostile`, `indifferente`, `amichevole`) dà
svantaggio o vantaggio nelle prove sociali.

### Cosa non scrivere

I modificatori li calcola il codice: caratteristiche, abilità, tiri salvezza, valori passivi, tiri per colpire, danni
e CA dall'armatura. Né il file né il modello scrivono un modificatore.
- Una `ca` diversa da quella dell'armatura è un avviso, e vale quella calcolata.
- Una scheda incompleta non ferma la partita: un punteggio che manca vale 10, e ogni errore finisce come avviso nel log.

### Le abilità e le armature

Le 18 abilità, con l'id da scrivere nelle schede (`apps/server/src/campagna/regole-srd.ts`):
`acrobazia`, `addestrare_animali`, `arcano`, `atletica`, `furtivita`, `indagare`, `inganno`, `intimidire`,
`intrattenere`, `intuizione`, `medicina`, `natura`, `percezione`, `persuasione`, `rapidita_di_mano`, `religione`,
`sopravvivenza`, `storia`.

Le armature, con i nomi italiani dell'SRD 5.2.1: Armatura imbottita, di cuoio, di cuoio borchiato, di pelle;
Giaco di maglia; Corazza a scaglie, di piastre, ad anelli, a strisce; Mezza armatura; Cotta di maglia;
Armatura a piastre.

## Le prove della scena

Chi prepara la campagna può fissare prima le CD degli ostacoli di una scena, in `scena.yaml` o `scene/*.yaml`,
sotto `prove`. Esempio da `docs/prove.md`, §2:

```yaml
prove:
  - id: p_cassetta
    quando: "un PG apre di nascosto il lucchetto della cassetta del pedaggio"
    abilita: rapidita_di_mano
    cd: 15
    indizio: i_lettera
    se_fallisce: "il lucchetto scatta rumoroso"
```

| Campo | Cosa contiene |
|---|---|
| `id` | comincia con `p_` |
| `quando` | quando vale la prova, in pubblico, al massimo 15 parole: lo legge l'arbitro |
| `abilita` | l'abilità da tirare; oppure `caratteristica: forza`, oppure `salvezza: destrezza` |
| `cd` | da 5 a 30 |
| `indizio` | facoltativo: l'indizio che la prova fa trovare. Non può essere un indizio essenziale: per quelli il validatore dà errore |
| `se_fallisce` | facoltativo: il prezzo del fallimento, per il narratore |

Quando c'è una prova della scena adatta all'azione, vince lei sulla scelta dell'arbitro.

Nel repertorio, una battuta può uscire solo dopo una prova riuscita: `richiede: {prova: persuasione}`. Vale un'abilità,
una caratteristica, l'id `p_…` di una prova della scena, il nome di un attacco, o i tipi `prova`, `salvezza`,
`attacco`, `contrapposta`. Il Motore confronta le parole esatte: un nome con la maiuscola non basta.

## Una campagna senza dadi

Due modi:
- scrivere in `campagna.yaml` `regole: {dadi: false}` (alcuni brief lo chiedono);
- non dare una scheda a nessun personaggio dei giocatori.

In tutti e due i casi il narratore risolve le azioni senza tiri, con «sì, ma…». Il log del server lo dice all'avvio
(`apps/server/src/prove/motore.ts`).

## Controllare le schede

Il validatore controlla schede e prove insieme al resto della campagna:

```bash
python3 -I strumenti/valida_campagna.py campagne/nozze-neve
```

Controlla la campagna `nozze-neve`. Finisce senza errori se tutto va bene (gli avvisi non contano). Tra le cose che
controlla: le sei caratteristiche e i loro punteggi, abilità e tiri salvezza validi, armatura o CA, PF maggiori di 0,
attacchi con un danno come `1d8`, `gs` o `livello` sui PNG, le prove della scena e `richiede.prova`
(`strumenti/valida/regole_schede.py`).

## Dadi onesti

- I dadi vengono da un generatore crittografico, con un seme nuovo a ogni sessione, salvato nell'archivio della partita.
- Ogni dado tirato e ogni azione risolta finiscono nel log del server, con dadi, modificatore, totale, CD ed esito.
- Dopo un riavvio la partita riprende con gli stessi PF. Ricominciare da capo rimette i PF pieni, con un seme nuovo.
- Per rifare la stessa sequenza di dadi (per esempio in una prova) c'è `CANTASTORIE_SEME_DADI=<esadecimale>`.

## Cosa non c'è ancora

Da `docs/prove.md`, §7:
- il combattimento vero: iniziativa e ordine dei turni, attacchi dei PNG non provocati, tiri salvezza contro la morte,
  condizioni (prono, afferrato…), attacchi multipli, incantesimi;
- nel pannello del master, i PF di personaggi e PNG con cura, danno e riposo a mano: oggi i PF dei PNG sono solo nei
  log e nell'archivio;
- l'atteggiamento di un PNG che cambia durante la storia: il vantaggio non lo segue ancora.

## Un set di regole diverso dall'SRD

Una campagna può avere un suo set di regole, ricavato dal tuo manuale (`docs/regole.md`):
- il manuale va nella cartella `manuali/`, che non entra mai in git;
- il set sta in `campagne/<id>/regole/`: `regole.yaml` (la struttura), `riassunto.md` (per i giocatori) ed
  `estratti/` (i passi del manuale);
- il Motore sa tirare in tre modi: d20 contro una CD, 2d6 a fasce (come nei giochi «alla PbtA»), e un tiro sotto una
  soglia con d100 o d20;
- la carta del tiro dice la regola applicata;
- sul telefono, «Regole» mostra il riassunto e permette di chiedere una regola.

Senza `regole/regole.yaml` vale l'SRD 5.2 di questa pagina. Un `regole.yaml` rotto non ferma la partita: si torna
all'SRD e il log lo dice. Come si fa, passo per passo: [Il tuo manuale di regole](il-tuo-manuale.md). Lo schema
completo, e le regole sulla licenza dei manuali, sono in `docs/regole.md`.

## Crediti

Questo lavoro include materiale dal System Reference Document 5.2 («SRD 5.2») di Wizards of the Coast LLC,
https://www.dndbeyond.com/srd, con licenza Creative Commons Attribution 4.0 International.

## Problemi?

Vai a [Problemi comuni](problemi-comuni.md).
