"""Vocabolari chiusi del manuale e del repertorio. Valgono per ogni campagna, non per una sola."""

# §4 musica.tag: vocabolario chiuso del manuale. docs/architettura.md ne elenca uno diverso, non ancora
# riconciliato: si usa questo (vedi «Letture del manuale adottate» nella skill).
TAG_MUSICA = {"esplorazione_tesa", "taverna_calda", "rito_sacro", "inseguimento", "combattimento_epico", "lutto"}

# C12, scopo della scena: elenco chiuso, in forma {tipo, rif}.
SCOPI = {"rivelare_indizio", "far_avanzare_fronte", "mettere_alla_prova", "sviluppare_rapporto",
         "dare_la_scena", "decompressione"}

# C4, tipi di indizio.
TIPI_INDIZIO = {"png", "oggetto", "luogo", "evento", "documento", "visione"}

# §3, atteggiamento verso un PG.
STATI_ATTEGGIAMENTO = {"ostile", "indifferente", "amichevole"}

# §3, livelli di PNG; supporto e principale hanno gli obblighi pieni (sa >= 3, mente_su >= 1).
LIVELLI_PNG = {"comparsa", "supporto", "principale"}

# C2, orologi: 4, 6 o 8 segmenti.
SEGMENTI_AMMESSI = {4, 6, 8}

# C8, cerchio di Harmon per gli archi dei PG.
PASSI_HARMON = ["tu", "bisogno", "vai", "cerca", "trova", "paga", "ritorna", "cambia"]

# C10, le cinque stanze.
CINQUE_STANZE = ["ingresso_o_guardiano", "enigma_o_sfida_sociale", "trucco_o_battuta_d_arresto",
                 "climax", "ricompensa_o_colpo_di_scena"]

# docs/repertorio.md
TIPI_BATTUTA = {"menzogna", "verita", "confessione", "reazione", "rifiuto", "richiesta", "saluto",
                "indizio", "segno_orologio", "momento", "transizione", "finale"}
CAMPI_BATTUTA = {"id", "chi", "tipo", "quando", "temi", "richiede", "testo", "varianti", "effetti",
                 "max_usi", "solo_esempio", "riempitivo", "scena"}
CAMPI_RICHIEDE = {"indizi_rivelati", "indizi_non_rivelati", "battute_usate", "battute_non_usate",
                  "orologio", "privata", "da_pg", "oppure"}
# `richiede.oppure: [{…}, {…}]`: la battuta è disponibile se valgono le condizioni di base E almeno una
# delle alternative (docs/repertorio.md, «Cancelli con oppure»). Il server oggi ignora le chiavi che non
# conosce: una battuta con `oppure` uscirebbe con le sole condizioni di base, cioè con il cancello
# aperto. Finché il server non lo applica, usarlo è un errore; quando lo applica, mettere True.
OPPURE_NEL_SERVER = False
CAMPI_EFFETTI = {"rivela_indizi", "menzogna_detta", "fatti_noti", "avanza_orologio"}
# Tipi che devono restare selezionabili: non possono essere esempi di voce.
TIPI_ESSENZIALI = {"menzogna", "confessione", "indizio", "segno_orologio", "finale"}
# Tipi ammessi come riempitivo (escono solo allo stallo).
TIPI_RIEMPITIVO = {"momento", "indizio", "transizione", "richiesta"}
# Categorie di reazione che ogni PNG dovrebbe avere, come esempio di voce o battuta: id che finisce così.
CATEGORIE_REAZIONE = ["domanda_gentile", "accusa", "minaccia", "offerta", "aiuto"]
# Soprannomi che valgono per mezzo paese: un PNG con uno di questi `alias` entra nella pertinenza di
# ogni azione su un vecchio, una ragazza, un uomo (nota 11 della prova cieca).
ALIAS_GENERICI = {"uomo", "donna", "vecchio", "vecchia", "vecchi", "vecchie", "ragazzo", "ragazza", "ragazzi",
                  "bambino", "bambina", "signore", "signora", "tizio", "tizia", "tipo", "amico", "amica", "gente",
                  "persona", "lui", "lei", "giovane", "anziano", "anziana", "uno", "una", "qualcuno"}
# Parole che nel `quando` direbbero al selettore chi mente, nasconde o confessa.
QUANDO_VIETATE = [r"\bment(e|o|ire|isce|ito|iva|ono)\b", r"\bbugi", r"menzogn", r"confess", r"segret",
                  r"nascond", r"\bverità\b"]
# Indizi di privatezza o di un PG preciso dentro `cede_se`: la confessione deve avere il cancello strutturale.
CEDE_PRIVATO = r"privat|non (può|puo) sentire|non sente|da solo a solo|sottovoce|lontano da(lle orecchie)?|senza testimoni"

# Lunghezze (§5 e prompt del narratore).
MAX_PAROLE_FRASE = 20            # N1, testi da leggere delle schede
MAX_PAROLE_NARRATORE = 16        # prompt §2, battute del narratore
MAX_PAROLE_PNG = 16
MEDIA_NARRATORE = (8, 14)        # N1
MAX_FRASI_NARRATORE_BATTUTA = 4  # N2
MAX_PAROLE_BATTUTA = 70
MAX_FRASI_PNG = 2                # D3
MAX_FRASI_PNG_RIVELAZIONE = 4    # D3, eccezione della rivelazione
