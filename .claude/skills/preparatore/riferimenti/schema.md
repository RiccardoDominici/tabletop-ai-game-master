# Schema dei file di una campagna

Forma che il validatore (`strumenti/valida_campagna.py`) e il server si aspettano. Tra parentesi, la
regola del manuale (docs/manuale-master.md) o del repertorio (docs/repertorio.md). Il validatore
controlla tutto ciò che qui è marcato **[V]**; con `--rigoroso` anche ciò che è marcato **[R]**.

```
campagne/<id>/
  brief.yaml                 il brief e le decisioni (lo legge solo chi prepara)
  stile.yaml                 carta di stile e C1
  campagna.yaml              canone, orologi, rivelazioni, colli di bottiglia, nodi, sessione, preparazione
  scena.yaml                 la prima scena: è quella che il server di F0 gioca
  scene/<id_scena>.yaml      le altre scene (facoltative)
  png/png_<nome>.yaml        una scheda per PNG; il nome del file è l'id
  pg.yaml                    situazione comune e personaggi pregenerati
  repertorio/narrazione.yaml battute del narratore
  repertorio/png_<nome>.yaml battute di ogni PNG
  repertorio/parole_segrete.yaml
  README.md, autovalutazione.md
```

## stile.yaml (C1, E14)
| Campo | Vincolo |
|---|---|
| `id`, `titolo` | |
| `premessa` | una frase [V] |
| `tono`, `tema`, `registro_narratore` | presenti [V] |
| `regole_prosa` | lista; va per intero al selettore del modo B: nessun segreto, nemmeno come divieto [V contesto B]. Il divieto della parola-soluzione sta nel `come_si_trova` dell'indizio |
| `stile_immagini` | il contenuto di `[STILE]`, in inglese; non contiene `[STILE]` [V] |
| `tavolozza_musicale` | `{tag: [...], strumenti: "..."}`; tag solo da `esplorazione_tesa, taverna_calda, rito_sacro, inseguimento, combattimento_epico, lutto` [V] |
| `linee`, `veli` | liste non vuote [V] |
| `audio` | facoltativo: `{tonalita, modo, tempo, strumenti, umore_base, epoca, motivo}`, vedi «Audio» sotto [V] |

## campagna.yaml
Chiavi di primo livello: `id`, `canone`, `orologi`, `rivelazioni`, `colli_di_bottiglia`,
`colli_di_bottiglia_nota`, `nodi`, `sessione`, `preparazione`. Il server toglie `preparazione` dal
contesto del narratore (E2): lì vanno destini, cronologia del cattivo, segreti astratti e archi.

**canone** (E10): `- {id: f_<nome>, noto_ai_pg: true|false, stato: confermato, entita: [...], testo: "..."}`.
- Gli id sono unici e nella forma `f_…` [V].
- Ogni `f_…` citato in un altro punto esiste [V]; ogni fatto è citato almeno una volta (avviso).
- Un fatto è un'affermazione sola. Le schede lo citano per id, non lo riscrivono.

**orologi**: gli orologi che il narratore vede (uno per pericolo attivo in una scena).
```yaml
- id: o_<nome>
  nome: "Il paese vuole un colpevole"     # l'ostacolo, non l'azione (C2)
  pericolo: p_<nome>
  segmenti: 6                              # 4, 6 o 8 [V]
  pieni_all_inizio: 0
  segno_almeno_ogni: 2                     # il Motore scrive «mostralo in questa risposta» [V intero >= 1]
  parte_dopo: [<id battuta o indizio>]     # facoltativo, proposta: l'orologio parte quando ne esce uno [V esistono]
  segni: ["…", "…", …]                     # uno per segmento, in ordine [V]
  avanza_quando: ["…"]                     # [V presente]
  al_completo: "…"                         # cosa vuole il pericolo e cosa costa ogni risposta
```

**rivelazioni** (C4): `- {id: r_<nome>, chiave: true, conclusione: "…", indizi: [i_…]}`.
- Una conclusione chiave ha almeno 3 indizi, in almeno 2 nodi, di almeno 2 tipi [V].
- Ogni indizio sostiene una conclusione sola, ed è elencato nella sua [V].

**colli_di_bottiglia** (C4): `- {id: cb_<nome>, ostacolo: "…", soluzioni: [≥3]}` [V]. Una soluzione che
richiede una conoscenza privata lo dice: «Solo se la propone chi la conosce».

**nodi** (C5): `- {id, tipo: luogo|png|evento, nome, scheda | abbozzo, collegamenti: [...], indizi: [...]}`.
- Facoltativi: `noto_ai_pg: true` (un luogo che i PG conoscono dall'inizio: non chiede tre indizi in
  entrata), `immagine: {prompt_luogo}` (un luogo senza scheda che ha un'immagine; vedi immagini.md) e
  `audio` (come nelle scene, vedi «Audio» sotto).
- `nome` e `abbozzo` vanno al selettore del modo B: niente segreti [V contesto B].
- Ogni collegamento esiste [V].
- Tutto è raggiungibile dal nodo della scena iniziale [V].
- Nessun vicolo cieco, salvo `prossima_sessione: true` [V].
- Gli indizi dei nodi senza scheda hanno la stessa forma di quelli delle scene.

**sessione** (C9–C13):
- `riassunto_iniziale`: al massimo 4 frasi; insieme all'apertura della scena iniziale al massimo 6 frasi,
  con una media tra 8 e 14 parole per frase [V];
- `cinque_stanze`: le chiavi `ingresso_o_guardiano`, `enigma_o_sfida_sociale`,
  `trucco_o_battuta_d_arresto`, `climax`, `ricompensa_o_colpo_di_scena` [V];
- `scene_potenziali`: id di scene con scheda (da 3 a 6: con meno, solo avviso);
- `chiusura` [V].

**preparazione**:
- `fronti` (C2):
  - un fronte `livello: campagna`, con 3–5 presagi in tutto il fronte [V];
  - uno o due fronti `livello: avventura`, con 1–3 presagi in tutto il fronte [V];
  - per ogni fronte, 2–3 pericoli e 1–3 `domande_di_posta` [V];
  - ogni pericolo ha `tipo`, `impulso` (un verbo solo), `destino_incombente`, `presagi: [{testo, segno_visibile}]` (almeno uno), `mosse`, `cast`, `orologio` [V];
  - gli orologi dei pericoli che non sono in scena vanno in `fronti[].orologi_extra: [{id, nome, segmenti}]`.
- `cattivo` (C3): `obiettivo`, `cronologia_se_i_pg_non_intervengono`, `risorse: [{cosa, a_cosa_serve}]`,
  `reazioni: [{intrusione, reazione}]`, `stato_di_quiete`, `chiamata_all_azione` [V].
- `segreti_astratti` (C6): circa 10, di una o due frasi ciascuno [V], senza luogo fisso.
- `archi` (C8): `campagna_tre_atti: [3]` e `pg: {pg_<nome>: {tu, bisogno, vai, cerca, trova, paga, ritorna, cambia}}` per ogni PG [V].
- `cronologia` e `logistica`: i conti del mondo, vedi sotto [R].

### Cronologia e logistica (preparazione)
I conti che il validatore rifà (classe `MONDO`). Stanno in `preparazione`, quindi il narratore non li
vede in nessun modo: possono contenere segreti.
```yaml
cronologia:
  eventi:                                  # in ordine di tempo [V MONDO.ordine]; almeno 3 [R]
    - id: t_<nome>
      quando: {anni_fa: 40}                # oppure {giorni_fa: 3, ora: "21:00"}, {ora: "18:00"}, {giorno: 1, ora: "01:30"}
      cosa: "una frase"
      fatti: [f_…]                         # i fatti che l'evento fonda [V esistono]
      segno: {orologio: o_…, n: 3}         # facoltativo: a che segno è l'orologio in quel momento [V crescono col tempo]
  documenti:                               # ogni indizio di tipo documento ha la sua voce [R]
    - {id: doc_<nome>, cosa: "la riga del registro", indizio: i_…, datato: {…come quando…}, prova: [t_…]}
logistica:
  durate:   [{id: d_<nome>, cosa: "…", minuti: 75, fatti: [f_…]}]
  capienze: [{id: c_<nome>, cosa: "la barca", posti: 20}]
  gruppi:   [{id: g_<nome>, cosa: "i vecchi del Ricovero", persone: 8}]
  verifiche:                               # ogni affermazione di tempo o di posti della storia [V]
    - {tra: [t_a, t_b], ci_sta: [d_x], perche: "…"}             # somma delle durate ≤ intervallo
    - {tra: [t_a, t_b], non_ci_sta: [d_x, d_x], perche: "…"}    # somma > intervallo
    - {capienza: c_x, porta: [g_a], perche: "…"}                 # somma delle persone ≤ posti
    - {capienza: c_x, non_porta: [g_a, g_b], perche: "…"}        # somma > posti
```
- `quando` si legge dal giorno della sessione: `giorno: 0` è oggi (predefinito), `giorno: 1` è
  domani, `giorni_fa` e `anni_fa` vanno indietro; `ora` va da `"00:00"` a `"24:00"`. Senza ora, due
  eventi dello stesso giorno non si confrontano; una verifica di tempo vuole due eventi con l'ora.
- La data di un documento non precede gli eventi che prova [V MONDO.documento].

## Scheda scena (§4): scena.yaml, scene/*.yaml
```yaml
id: scena_<nome>
nodo: n_<nome>                 # esiste in campagna.nodi [V]
nome: "…"
descrizione: "pianta del luogo + CHI SENTE COSA"   # rende verificabile «in privato»; va al selettore: niente segreti
scopo: {tipo: rivelare_indizio, rif: i_…}           # tipo da: rivelare_indizio, far_avanzare_fronte,
                                                    #   mettere_alla_prova, sviluppare_rapporto, dare_la_scena, decompressione [V]
domanda_drammatica: "…?"       # da sì o no [V]
posta: {si_guadagna: {cosa, per_chi: [...]}, si_perde: {cosa, per_chi: [...]}}   # tocca PG o PNG [V]
intensita: 1-5                 # [V]
sensi: [3 dettagli]            # esattamente 3, almeno 2 non visivi [V sul numero]
elementi_interattivi: [{cosa, dove, azioni}]        # almeno 3 [V]; una cosa nascosta lo scrive in azioni: «NASCOSTA: …»
png_presenti: [png_…]          # esistono [V]; voci diverse e non simili [V]; iniziali diverse [V]
orologi_attivi: [o_…]          # esistono [V]
indizi:                        # [V forma; vedi sotto]
  - {id: i_…, conclusione: r_…, tipo: png|oggetto|luogo|evento|documento|visione, nodo: n_…|png_…,
     essenziale: true|false, tiro: "nessuno", modi: 1, come_si_trova: "…"}
uscite: [{verso: n_…, segnalata_da: [i_…, …]}]      # almeno 2 (salvo climax: true) [V]; 3 indizi per nodo (avviso)
mossa_morbida_pronta: "…"      # prosa §5 [V]
apertura: "…?"                 # al massimo 3 frasi, chiude con un invito [V]
musica: {tag: …, transizione: "…"}                  # tag e tag citati nella transizione dal vocabolario [V]
immagine: {invarianti: [...], prompt_luogo: "… in inglese"}   # [V]
taglio: "…"                    # tutti gli esiti, anche «se i PG esitano»; va al selettore: niente segreti
esiti: [{id, descrizione, finale: <id battuta>}]    # si scrive con i finali (passo 9); ogni finale esiste [V]
climax: true                   # facoltativo: ammette meno di due uscite
audio: {musica: [...], ambiente: [...], umore_iniziale: …}   # facoltativo, vedi «Audio» sotto [V]
```
Il contesto del modo B prende da ogni scheda scena nome, descrizione, domanda, intensità, sensi,
elementi senza «NASCOSTA», PNG presenti e taglio: il validatore ci cerca le regex segrete
(`SEGRETI.contesto_b`). Due schede con lo stesso `nodo` sono un avviso: lo stesso luogo in un altro
momento è un nodo `evento` (mestiere.md §9).

Indizi: un essenziale ha `tiro: "nessuno"` (F3) [V]. `modi` è il numero di modi distinti scritti in
`come_si_trova`: il repertorio deve avere una battuta di rivelazione per ognuno [V]. Se manca, conta
come 1 [R avvisa].

## Scheda PNG (§3): png/png_<nome>.yaml
```yaml
id: png_<nome>                 # = nome del file, ascii minuscolo [V]; diventa l'etichetta [png_<nome>]
nome: "…"                      # iniziale diversa dagli altri PNG della scena [V]
pronuncia: "…"                 # con l'accento: la usa il TTS
alias: [soprannomi]            # come lo chiameranno i giocatori: nano, ostessa, forestiero [R]; mai generici
                               #   (vecchio, ragazza) [R], mai lo stesso di un altro PNG [V]
livello: comparsa|supporto|principale               # supporto e principale: obblighi pieni [V]
ruolo: "…"
fronte: fronte_…               # esiste [V]
aspetto:
  lettura: "1-2 frasi, max 35 parole, da leggere a voce" [V]
  invarianti: [≥3 tratti fissi, in italiano, VISIBILI a prima vista] [V]
  prompt_immagine: "… in inglese …, [STILE]"        # [V]; [STILE] una volta sola
  prompt_ritratto: "…, [STILE]" # facoltativo: se c'è, il ritratto usa questo; stesse regole [V]
  situazioni: [{id, prompt, dopo: [i_… | id battuta]}]   # i tratti che si vedono solo più tardi; dopo [R]
                               #   dopo: la compare il primo id che esce; ognuno rende pubblico il tratto [V]
personalita: {superficie: [≥2], sotto_pressione: [≥1, diversi], contraddizione: "…"}   # [V]
desiderio: "verbo + oggetto, in tensione con un altro PNG o un fronte"
paura: "…"
segreto: {testo, chi_altro_sa: [...], se_rivelato}   # [V]
voce:
  tts: {voce_id: <da assets/voci/voci.yaml, non «narratore»>, eta_apparente, altezza, velocita, timbro}   # [V]
  registro: "tu | voi | lei, e con chi cambia"        # [V]
  stile: "Frasi di N-M parole …"   # numeri da uno a venti: il validatore ne ricava il tetto per frase (avviso se non li trova)
  tic: [al massimo 2]          # [V]
  gesto: "…"                   # diverso da ogni segnale [V]
  mai_dice: [...]
  battuta_campione: "al massimo 2 frasi"   # [V]
sa: [f_…]                      # ≥3 per supporto e principale [V]
non_sa: [f_…]                  # ≥3, uno che i PG chiederanno; disgiunto da sa [V]
crede_a_torto: [{testo: "…", contraddice: f_…}]    # il fatto contraddetto NON è in sa [V]; senza contraddice [R]
mente_su:
  - id: <prefisso>_<argomento>  # [R]; è il valore di menzogna_detta nel repertorio
    argomento: "…"
    verita: f_…                # in sa [V]
    versione: "…"              # la bugia, sempre la stessa
    perche: "…"
    segnale: "gesto fisico breve"   # diverso dal gesto abituale [V]
    cede_se: "condizione osservabile. Oppure condizione osservabile."
atteggiamento_pg: {pg_<nome>: {stato: ostile|indifferente|amichevole, perche, vuole}}   # per OGNI PG [V]
relazioni: {...}
info_chiave: [i_…]             # esistono [V]
iniziative: ["Se …, allora fa …"]
evoluzione: [{se, allora}]     # [V]
statistiche: "…"
registro_attivita: []          # [V]
tema: {carattere, strumento, modo, registro}   # facoltativo: il motivo del PNG, vedi «Audio» sotto [V]
```

## pg.yaml
```yaml
situazione_comune: "…"         # non nomina nessun PG [V presente]
personaggi:
  - id: pg_<nome>              # [V forma]
    nome, pronuncia, pronomi, specie, classe, livello: 1
    aspetto: "…"
    concetto: "due frasi"      # [V]
    aggancio: "…"              # pubblico, come nome e aspetto: niente segreti [V]
    cosa_sai_fare: [...]
    conoscenze_private: [{testo: "…", fatti: [f_…]}]   # solo al telefono del giocatore (T9) [V riferimenti]
```
Nome diverso dal nome di ogni PNG [V].

## Repertorio: vedi riferimenti/repertorio.md
Campi della battuta: `id, chi, tipo, quando, temi, richiede, testo, varianti, effetti, max_usi,
solo_esempio, riempitivo, scena, audio` [V]. Nient'altro [V]. `audio: {umore, effetto}` è un segnale
automatico (vedi «Audio» sotto e repertorio.md §6). `richiede.oppure` è descritto ma il server non lo
applica ancora: oggi è un errore (repertorio.md §4).

## Audio (facoltativo): stile.audio, scene e nodi audio, png.tema
La pipeline dell'audio (`strumenti/audio/`, contratto in `docs/audio.md`) ricava musica, ambienti, effetti
e temi dai campi pubblici. Questi campi servono solo dove la deduzione sbaglia: controllala con
`strumenti/audio/.venv/bin/python strumenti/audio/genera_audio.py campagne/<id> --dry-run`. I valori sono
quelli di `strumenti/audio/vocabolario.py`; il validatore rifiuta tutto il resto (classe `AUDIO`), perché
la pipeline lo ignorerebbe in silenzio. Nessuna parola segreta in questi campi [V].

```yaml
# stile.yaml
audio:
  tonalita: "re dorico"          # una nota (do…si, C…B) e, se vuoi, un modo
  modo: dorico                   # ionio, dorico, frigio, lidio, misolidio, eolio (o maggiore, minore)
  tempo: 88                      # battiti al minuto, da 40 a 200
  strumenti: [fisarmonica, clarinetto]   # o un testo; «niente percussioni» le vieta
  umore_base: esplorazione_tesa  # uno dei sei tag di musica
  epoca: antica                  # antica, moderna, futura
  motivo: {metro: 4, note: [[0, 1], [2, 1], [4, 2], [2, 1], [1, 1], [0, 2]]}   # gradi e durate [V come la pipeline]

# scena (o nodo di campagna.yaml)
audio:
  musica: [notte, pioggia, ponte]   # umore, energia (bassa, media, alta), ora (alba, giorno, imbrunire,
                                    #   notte), meteo, ambientazione, o parole inglesi libere
  ambiente: [pioggia, {tag: fiume, volume: 0.6}]   # strati in loop; volume tra 0 e 1
  umore_iniziale: esplorazione_tesa

# png
tema: {carattere: [burbero], strumento: fagotto, modo: dorico, registro: basso}

# battuta del repertorio: segnale automatico quando esce (docs/audio.md, «Segnali automatici»)
audio: {effetto: campana, umore: lutto}   # uno o tutti e due; nient'altro (errore di caricamento) [V]
```
- **Segnali delle battute**: `umore` è uno dei sei tag di musica, o `auto` (torna alla musica del luogo);
  `effetto` è un tag di EFFETTI: campana, porta, catena, tuono, monete, chiave (`sfx_campana` vale lo
  stesso). Il segnale parte con la **prima frase** della battuta, che deve nominare quel suono [V avviso];
  l'effetto suona solo se il catalogo della campagna lo ha (`audio/manifest.json`) [V avviso]. Il Motore
  applica al massimo un cambio d'umore automatico al minuto per scena.
- **`umore_iniziale`** di una scena è l'umore con cui la scena comincia: uno dei sei tag, mai `auto` [V].
- **Ambienti**: pioggia, temporale, fiume, acqua, vento, neve, fuoco, folla, taverna, campane, canto, notte,
  stalla, gocce, mare, bosco, mulino.
- **Ambientazioni** (per `musica`): taverna, chiesa, ponte, fiume, borgo, piazza, mulino, montagna, casa,
  bosco, strada, sotterraneo, castello, mare, mercato, palazzo. **Meteo**: sereno, pioggia, temporale, neve,
  vento, nebbia, gelo.
- **Caratteri** (per `tema`): caldo, gioviale, burbero, solenne, nervoso, freddo, malinconico, fiero,
  pacato, timido. **Registri**: basso, medio, alto. **Strumenti da motivo**: quelli melodici di
  `STRUMENTI_TEMA` (flauto, clarinetto, fisarmonica, violino, violoncello, arpa, liuto, organo…).
- Il tema viene dalla persona pubblica, mai da ciò che il PNG nasconde: un carattere che la lettura, la
  personalità e la voce non giustificano è un avviso, il modo frigio su un PNG che mente un avviso
  rigoroso (mestiere.md §10).

## Letture del manuale adottate
Dove il manuale è ambiguo, il validatore e questa skill leggono così.

1. **Presagi (C2).** «1–3» e «3–5» si contano sul totale del fronte, e ogni pericolo ne ha almeno uno.
2. **Orologi (C2).** Ogni pericolo ha il suo orologio. Quelli in scena stanno in `orologi`, gli altri in `fronti[].orologi_extra`.
3. **Apertura (C9, §4, N2).** `apertura` ha al massimo 3 frasi; `riassunto_iniziale` al massimo 4; insieme al massimo 6.
4. **Musica.** Solo i sei tag del §4. Il vocabolario di architettura.md non è ancora riconciliato.
5. **Scopo (C12).** `{tipo, rif}`, con tipo in snake_case dall'elenco chiuso.
6. **Fatti.** `sa`, `non_sa` e `mente_su.verita` sono id del canone. `crede_a_torto` ha la forma `{testo, contraddice}`.
7. **Indizi.** Un indizio ha una sola conclusione. `nodo` può essere un PNG, perché i PNG sono nodi (C5).
8. **Uscite.** `segnalata_da` è una lista.
9. **Segnale.** È un gesto fisico, diverso dal gesto abituale (D6).
10. **Senza dadi** (F0): `cede_se` si scrive solo con condizioni di finzione, e `tiro: "nessuno"`.
11. **Scene.** La prima è `scena.yaml`, e il server F0 gioca solo quella. Le altre sono `scene/*.yaml`.
12. **Riferimenti liberi.** `relazioni` e `chi_altro_sa` possono citare entità senza scheda.
13. **Confessioni** (dopo il giudizio A/B n. 2):
    - `richiede.privata: true` vuol dire che l'azione dev'essere segnata privata dal telefono;
    - `richiede.da_pg: [...]` vuol dire che l'azione dev'essere di quel PG.

    Il server deve ancora applicarli; il validatore li esige [R].
14. **Alias** dei PNG: il server li usa per capire a chi parlano le azioni (repertorio, pertinenza).
15. **Menzogne.** `mente_su[].id` è il valore di `effetti.menzogna_detta`.
16. **Più scene.** Una battuta valida solo in una scena ha `scena: <id>`.
17. **Eccezioni al catalogo.** `parole_segrete[].ammessa_nel_catalogo` vale solo per una battuta che
    il Motore elenca soltanto dopo che un giocatore ha scritto la parola segreta. Va motivata nella nota.
18. **Contesto del modo B.** Vale ciò che il compilatore del server manda davvero
    (`strumenti/contesto_modo_b.ts`), non una lista scritta a mano: `da_togliere_dal_contesto` non serve
    più, e il validatore lo ignora.
19. **Voci simili.** `simile_a` in `assets/voci/voci.yaml` è simmetrico; due voci simili contano come due
    voci uguali.
20. **Tempo della cronologia.** Il giorno della sessione è il giorno zero; un evento senza ora non si
    ordina con gli altri dello stesso giorno.
