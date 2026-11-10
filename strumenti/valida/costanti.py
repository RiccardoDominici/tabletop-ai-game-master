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
                "indizio", "segno_orologio", "momento", "transizione", "finale", "chiusura"}
CAMPI_BATTUTA = {"id", "chi", "tipo", "quando", "temi", "richiede", "testo", "varianti", "effetti",
                 "max_usi", "solo_esempio", "riempitivo", "scena", "audio"}
CAMPI_RICHIEDE = {"indizi_rivelati", "indizi_non_rivelati", "battute_usate", "battute_non_usate",
                  "orologio", "privata", "da_pg", "oppure", "prova"}
# `richiede.oppure: [{…}, {…}]`: la battuta è disponibile se valgono le condizioni di base E almeno una
# delle alternative (docs/repertorio.md, «Cancelli con oppure»). Il server oggi ignora le chiavi che non
# conosce: una battuta con `oppure` uscirebbe con le sole condizioni di base, cioè con il cancello
# aperto. Finché il server non lo applica, usarlo è un errore; quando lo applica, mettere True.
OPPURE_NEL_SERVER = True  # il Motore applica richiede.oppure (apps/server/src/repertorio/condizioni.ts)
CAMPI_EFFETTI = {"rivela_indizi", "menzogna_detta", "fatti_noti", "avanza_orologio"}
# Tipi che devono restare selezionabili: non possono essere esempi di voce.
TIPI_ESSENZIALI = {"menzogna", "confessione", "indizio", "segno_orologio", "finale"}
# Tipi ammessi come riempitivo (escono solo allo stallo).
TIPI_RIEMPITIVO = {"momento", "indizio", "transizione", "richiesta"}
# Categorie di reazione che ogni PNG dovrebbe avere, come esempio di voce o battuta: id che finisce così.
CATEGORIE_REAZIONE = ["domanda_gentile", "accusa", "minaccia", "offerta", "aiuto"]
