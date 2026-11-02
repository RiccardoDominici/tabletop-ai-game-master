"""Controlli del repertorio (docs/repertorio.md) sulla cartella di una campagna.

Verifica: schema; riferimenti di `richiede` ed `effetti`; copertura minima; assenza di segreti
nei campi che vede il selettore (`id`, `quando`, `temi`); confini di conoscenza dei PNG
(lessico segreto fuori dal loro `sa`); segnali nelle menzogne; regole di lettura ad alta voce.
Stampa anche le statistiche per il rapporto (conteggi, lunghezze, righe da pre-generare).

Uso: python3 -I controlli_repertorio.py /percorso/campagne/prova-f0
"""
import re
import statistics
import sys
from collections import Counter, defaultdict
from pathlib import Path

import yaml

TIPI = {"menzogna", "verita", "confessione", "reazione", "rifiuto", "richiesta", "saluto",
        "indizio", "segno_orologio", "momento", "transizione", "finale"}
CAMPI = {"id", "chi", "tipo", "quando", "temi", "richiede", "testo", "varianti", "effetti", "max_usi",
         "solo_esempio", "riempitivo"}  # versione 2: esempi di voce e battute di riempimento
# Tipi che devono restare selezionabili (non esempi, non riempitivi).
TIPI_ESSENZIALI = {"menzogna", "confessione", "indizio", "segno_orologio", "finale"}
# Tipi ammessi come riempitivo (escono solo allo stallo).
TIPI_RIEMPITIVO = {"momento", "indizio", "transizione", "richiesta"}
CAMPI_RICHIEDE = {"indizi_rivelati", "indizi_non_rivelati", "battute_usate", "battute_non_usate", "orologio"}
CAMPI_EFFETTI = {"rivela_indizi", "menzogna_detta", "fatti_noti", "avanza_orologio"}
VIETATE = [
    "brivido lungo la schiena", "sangue gelato", "gelato nelle vene", "l'aria è densa", "l'aria è carica",
    "silenzio assordante", "come se il tempo si fosse fermato", "non potete fare a meno di",
    "sentite che qualcosa non va", "aura di mistero", "danza di ombre",
    "inquietante", "misterios", "terrificante", "mozzafiato", "epic",
]
# Parole che nel `quando` svelerebbero la struttura dei segreti (chi mente, chi nasconde).
QUANDO_VIETATE = [r"\bment(e|o|ire|isce|ito|iva|ono)\b", r"\bbugi", r"menzogn", r"confess", r"segret",
                  r"nascond", r"\bverità\b"]
# Lessico che porta un segreto (fatti con noto_ai_pg: false, segreti delle schede). Scritto a mano:
# il lessico «solo nei fatti nascosti» calcolato in automatico segnalava parole comuni (acqua, vuoto).
# Una parola è lecita solo se il contesto della battuta la rende pubblica (vedi `contesto`).
SEGRETI = {}  # caricato da repertorio/parole_segrete.yaml in main()

# Menzogne registrate: id -> (png, argomento della scheda, parole del segnale da trovare nel testo).
MENZOGNE = {
    "ott_segale": ("png_ottavia", "da dove viene la segale", ["fazzoletto"]),
    "ott_cane": ("png_ottavia", "il cane", ["fazzoletto"]),
    "bal_testimoni": ("png_baldrin", "chi ha visto il forestiero al pozzo", ["occhi", "voce"]),
    "seb_mestiere": ("png_sebastiano", "il suo mestiere", ["maniche", "toss"]),
    "seb_guerra": ("png_sebastiano", "la guerra e da dove viene", ["mani", "toss"]),
}
# Ogni condizione di cede_se -> battuta di confessione e ciò che deve richiedere (sottoinsieme).
CONFESSIONI = {
    "ott_segale": [("ott_segale_chicco", {"indizi_rivelati": ["i_speroni_neri"]}),
                   ("ott_segale_passato", {})],
    "ott_cane": [("ott_cane_croste", {"indizi_rivelati": ["i_cane_croste"]}),
                 ("ott_cane_dopo", {"indizi_rivelati": ["i_ottavia_confessione"]})],
    "bal_testimoni": [("bal_testimoni_nomi", {"battute_usate": ["bal_testimoni_versione"]}),
                      ("bal_testimoni_sano", {"indizi_rivelati": ["i_baldrin_sano"]})],
    "seb_mestiere": [("seb_mestiere_promessa", {}), ("seb_mestiere_malato", {})],
    "seb_guerra": [("seb_guerra_roccalba", {})],
}
# Modi di trovare ogni indizio (da `come_si_trova`): quante battute di rivelazione servono.
MODI_INDIZIO = {
    "i_speroni_neri": 2,      # aprire un sacco; spezzare una pagnotta
    "i_cane_croste": 3,       # guardare il cane; parlargli con la magia; mossa morbida proattiva
    "i_preghiera_pane": 1,
    "i_baldrin_sano": 1,
    "i_carbonai_sani": 1,
    "i_sebastiano_avverte": 1,
    "i_polvere_nera": 1,      # toccarla o annusarla (Baldrin che la mostra è una reazione a parte)
    "i_libretto": 1,
    "i_tecla_corvo": 2,       # domanda sui malati; domanda sulla notte al pozzo
    "i_sebastiano_tecla": 1,
    "i_nodo_bende": 1,
    "i_parole_da_medico": 1,
    "i_cicatrice": 2,         # cappuccio abbassato (uscita o confessione); candela alla grata
    "i_registro_conti": 1,
    "i_sacchi_marchio": 1,
    "i_baldrin_testimoni": 2,  # le due condizioni di cede_se
    "i_ottavia_confessione": 2,  # le due condizioni di cede_se
    "i_pozzo_acqua": 1,
    "i_tecla_racconta": 1,
}
# Finali richiesti da `taglio`: il paese se ne va con il forestiero, con Ottavia, o senza nessuno.
FINALI = {"con il forestiero": ["fin_consegnato_pane", "fin_consegnato_ceste"],
          "con Ottavia": ["fin_ottavia"],
          "senza nessuno": ["fin_nessuno_prove", "fin_nessuno_offerta", "fin_nessuno_fuga"]}
REAZIONI = ["domanda_gentile", "accusa", "minaccia", "offerta", "aiuto"]
NOMI_PG_EXTRA = []  # i nomi dei PG si leggono da pg.yaml
# Parole del lessico segreto ammesse in un punto preciso, con il motivo.
AMMESSE = {
    ("seb_guerra_roccalba", "(sebastiano|forestiero)[^.]{0,60}(compagnia|roccalba|grifo)|(compagnia|roccalba|grifo)[^.]{0,60}(sebastiano|forestiero)"):
        "il trigger è una parola del giocatore, che `richiede` non sa esprimere: il server la elenca solo nei turni in cui le azioni nominano uno dei suoi temi",
    ("nar_segno_2", r"\bcorvo"): "è l'insulto che un ragazzo grida al forestiero; richiama, senza svelarlo, il racconto di Tecla",
}
LIMITE_NARR = 16     # parole per frase del narratore (prompt §2)
LIMITE_PNG = {"png_baldrin": 9}   # stile «frasi di due-sei parole», con un margine
LIMITE_PNG_DEFAULT = 16

errori = 0
avvisi = 0


def ok(m):
    print(f"  OK      {m}")


def errore(m):
    global errori
    errori += 1
    print(f"  ERRORE  {m}")


def avviso(m):
    global avvisi
    avvisi += 1
    print(f"  AVVISO  {m}")


def frasi(testo):
    pezzi = re.split(r"(?<=[.!?»])\s+(?=[A-ZÀÈÉÌÒÙ«])", testo.strip())
    return [p for p in pezzi if p]


def parole(t):
    return re.findall(r"[a-zàèéìòù']+", t.lower())


def radici(testo):
    """Radici grezze (prime cinque lettere) delle parole di almeno quattro lettere."""
    out = set()
    for w in parole(testo):
        w = w.strip("'")
        if "'" in w:
            w = w.split("'")[-1]
        if len(w) >= 4:
            out.add(w[:5])
    return out


def carica(p):
    with open(p, encoding="utf-8") as f:
        return yaml.safe_load(f)


def stringhe(x):
    """Tutte le stringhe dentro una struttura YAML."""
    if isinstance(x, str):
        yield x
    elif isinstance(x, dict):
        for v in x.values():
            yield from stringhe(v)
    elif isinstance(x, list):
        for v in x:
            yield from stringhe(v)


def riga_split(r):
    m = re.match(r"^\[([a-z_]+)\] (.+)$", r)
    return (m.group(1), m.group(2)) if m else (None, None)


def main(cartella):
    cartella = Path(cartella)
    camp = carica(cartella / "campagna.yaml")
    scena = carica(cartella / "scena.yaml")
    pg = carica(cartella / "pg.yaml")
    stile = carica(cartella / "stile.yaml")
    png = {}
    for p in sorted((cartella / "png").glob("*.yaml")):
        d = carica(p)
        png[d["id"]] = d
    canone = {f["id"]: f for f in camp["canone"]}
    VOCI = carica(cartella / "repertorio" / "parole_segrete.yaml")["parole"]
    for v in VOCI:
        SEGRETI[v["regex"]] = v["nota"]
    indizi = {i["id"]: i for i in scena["indizi"]}
    for n in camp["nodi"]:
        for i in n.get("indizi", []) or []:
            indizi[i["id"]] = i
    orologi = {o["id"]: o for o in camp["orologi"]}
    nomi_pg = [p["nome"].replace("Sorella ", "").split()[0] for p in pg["personaggi"]]

    def testo_sa(pid):
        d = png[pid]
        x = [canone[f]["testo"] for f in d["sa"]] + [m["versione"] for m in d["mente_su"]]
        x += [c["testo"] for c in d.get("crede_a_torto", [])]
        return " ".join(x).lower()

    def segreti_in(testo, contesto):
        """Pattern segreti presenti in `testo` e non resi pubblici dal `contesto`."""
        testo, contesto = testo.lower(), contesto.lower()
        return [p for p in SEGRETI if re.search(p, testo) and not re.search(p, contesto)]

    # --- carica il repertorio -------------------------------------------------------------
    battute = []
    for p in sorted((cartella / "repertorio").glob("*.yaml")):
        if p.name == "parole_segrete.yaml":
            continue  # dati per il server e per la metrica, non battute
        dati = carica(p)
        verifica_chiavi = set(dati) - {"battute"}
        if verifica_chiavi:
            errore(f"{p.name}: chiavi in più al primo livello {verifica_chiavi}")
        for b in dati["battute"]:
            b["_file"] = p.name
            battute.append(b)
    per_id = {}
    print(f"\n== Schema ({len(battute)} battute) ==")
    for b in battute:
        bid = b.get("id", "?")
        if bid in per_id:
            errore(f"id duplicato: {bid}")
        per_id[bid] = b
        if not re.fullmatch(r"[a-z0-9_]+", bid):
            errore(f"{bid}: id non ascii minuscolo")
        extra = set(b) - CAMPI - {"_file"}
        if extra:
            errore(f"{bid}: campi non previsti {extra}")
        for campo in ("id", "chi", "tipo", "quando", "temi", "testo", "max_usi"):
            if campo not in b:
                errore(f"{bid}: manca {campo}")
        if b.get("tipo") not in TIPI:
            errore(f"{bid}: tipo {b.get('tipo')} fuori elenco")
        if b.get("chi") != "narratore" and b.get("chi") not in png:
            errore(f"{bid}: chi {b.get('chi')} inesistente")
        atteso = "narrazione.yaml" if b.get("chi") == "narratore" else f"{b.get('chi')}.yaml"
        if b["_file"] != atteso:
            errore(f"{bid}: sta in {b['_file']}, atteso {atteso}")
        if len(parole(b["quando"])) > 15:
            errore(f"{bid}: quando di {len(parole(b['quando']))} parole (max 15)")
        if not isinstance(b.get("temi"), list) or not b["temi"]:
            errore(f"{bid}: temi vuoti")
        for k in (b.get("richiede") or {}):
            if k not in CAMPI_RICHIEDE:
                errore(f"{bid}: richiede.{k} non previsto")
        for k in (b.get("effetti") or {}):
            if k not in CAMPI_EFFETTI:
                errore(f"{bid}: effetti.{k} non previsto")
        for flag in ("solo_esempio", "riempitivo"):
            if flag in b and b[flag] is not True:
                errore(f"{bid}: {flag} deve essere true, oppure assente")
        if b.get("solo_esempio") and b.get("riempitivo"):
            errore(f"{bid}: non può essere insieme solo_esempio e riempitivo")
        e_ = b.get("effetti") or {}
        if b.get("solo_esempio") and (b.get("tipo") in TIPI_ESSENZIALI or e_.get("rivela_indizi")
                                       or e_.get("menzogna_detta") or e_.get("avanza_orologio")):
            errore(f"{bid}: è solo_esempio ma porta un indizio, una menzogna o un segno: deve restare selezionabile")
        if b.get("riempitivo") and b.get("tipo") not in TIPI_RIEMPITIVO:
            errore(f"{bid}: riempitivo ammesso solo per {sorted(TIPI_RIEMPITIVO)}")
        if b.get("solo_esempio") and b.get("richiede"):
            avviso(f"{bid}: solo_esempio con condizioni richiede: come esempio di voce non servono")
        nvar = len(b.get("varianti") or [])
        if nvar > 2:
            errore(f"{bid}: {nvar} varianti (max 2)")
        if not (1 <= b["max_usi"] <= 1 + nvar):
            errore(f"{bid}: max_usi {b['max_usi']} con {nvar} varianti: ripeterebbe lo stesso testo")
        if b.get("chi") != "narratore" and not any(r.startswith(f"[{b['chi']}]") for r in b["testo"]):
            errore(f"{bid}: battuta di {b['chi']} senza una sua riga")
        for versione in [b["testo"]] + (b.get("varianti") or []):
            for r in versione:
                tag, _ = riga_split(r)
                if tag is None:
                    errore(f"{bid}: riga senza etichetta: {r[:40]}")
                elif tag != "narratore" and tag not in png:
                    errore(f"{bid}: etichetta sconosciuta [{tag}]")
                elif tag != "narratore" and tag != b["chi"]:
                    avviso(f"{bid}: riga di {tag} in una battuta di {b['chi']}")
    print(f"  {len(per_id)} id unici")

    print("\n== Riferimenti in richiede ed effetti ==")
    for b in battute:
        bid = b["id"]
        r = b.get("richiede") or {}
        for k in ("indizi_rivelati", "indizi_non_rivelati"):
            for i in r.get(k, []):
                if i not in indizi:
                    errore(f"{bid}: richiede.{k} indizio inesistente {i}")
        for k in ("battute_usate", "battute_non_usate"):
            for x in r.get(k, []):
                if x not in per_id:
                    errore(f"{bid}: richiede.{k} battuta inesistente {x}")
                if x == bid:
                    errore(f"{bid}: richiede se stessa")
        if "orologio" in r:
            o = r["orologio"]
            if o["id"] not in orologi:
                errore(f"{bid}: orologio inesistente {o['id']}")
            elif not (0 <= o["min"] <= o["max"] <= orologi[o["id"]]["segmenti"]):
                errore(f"{bid}: estremi dell'orologio fuori misura {o}")
        e = b.get("effetti") or {}
        for i in e.get("rivela_indizi", []):
            if i not in indizi:
                errore(f"{bid}: rivela indizio inesistente {i}")
        for f in e.get("fatti_noti", []):
            if f not in canone:
                errore(f"{bid}: fatto inesistente {f}")
            elif b["chi"] != "narratore" and f not in png[b["chi"]]["sa"]:
                errore(f"{bid}: {b['chi']} rende noto {f}, che non sta nel suo sa")
        if e.get("menzogna_detta"):
            m = e["menzogna_detta"]
            if m not in MENZOGNE:
                errore(f"{bid}: menzogna sconosciuta {m}")
            elif MENZOGNE[m][0] != b["chi"]:
                errore(f"{bid}: menzogna {m} detta da {b['chi']}")
            elif b["tipo"] != "menzogna":
                errore(f"{bid}: menzogna_detta su una battuta di tipo {b['tipo']}")
        if e.get("avanza_orologio") and e["avanza_orologio"] not in orologi:
            errore(f"{bid}: avanza un orologio inesistente")
    # Menzogne: l'argomento esiste nella scheda.
    for m, (pid, arg, _) in MENZOGNE.items():
        if arg not in [x["argomento"] for x in png[pid]["mente_su"]]:
            errore(f"menzogna {m}: argomento «{arg}» assente dalla scheda di {pid}")
    print("  controllati")

    print("\n== Copertura ==")
    cop = []
    # indizi
    for i, n in MODI_INDIZIO.items():
        chi = [b["id"] for b in battute if i in (b.get("effetti") or {}).get("rivela_indizi", [])]
        stato = "OK" if len(chi) >= n else "MANCA"
        cop.append(("indizio", i, f"{len(chi)}/{n}", stato))
        if len(chi) < n:
            errore(f"{i}: {len(chi)} battute di rivelazione, ne servono {n}")
    mancanti = set(indizi) - set(MODI_INDIZIO)
    if mancanti:
        errore(f"indizi senza conteggio dei modi: {mancanti}")
    # menzogne con segnale (testo e varianti)
    for m, (pid, arg, segn) in MENZOGNE.items():
        chi = [b for b in battute if (b.get("effetti") or {}).get("menzogna_detta") == m]
        if not chi:
            errore(f"menzogna {m}: nessuna battuta con la versione")
        for b in chi:
            versione = next(x["versione"] for x in png[pid]["mente_su"] if x["argomento"] == arg)
            for v in [b["testo"]] + (b.get("varianti") or []):
                narr = " ".join(r for r in v if r.startswith("[narratore]")).lower()
                if not all(s in narr for s in segn):
                    errore(f"{b['id']}: una versione della menzogna senza segnale ({segn})")
            princ = " ".join(r for r in b["testo"] if r.startswith(f"[{pid}]"))
            if radici(versione) - radici(princ):
                avviso(f"{b['id']}: la versione non ricalca la scheda: {sorted(radici(versione) - radici(princ))}")
        cop.append(("menzogna", m, f"{len(chi)}", "OK" if chi else "MANCA"))
    # confessioni per cede_se
    for m, lista in CONFESSIONI.items():
        for cid, req in lista:
            b = per_id.get(cid)
            if not b:
                errore(f"cede_se di {m}: manca la confessione {cid}")
                cop.append(("cede_se", f"{m} → {cid}", "0", "MANCA"))
                continue
            if b["tipo"] != "confessione" or b["chi"] != MENZOGNE[m][0]:
                errore(f"{cid}: deve essere una confessione di {MENZOGNE[m][0]}")
            r = b.get("richiede") or {}
            for k, v in req.items():
                if not set(v) <= set(r.get(k, [])):
                    errore(f"{cid}: richiede.{k} deve contenere {v}")
            cop.append(("cede_se", f"{m} → {cid}", "1", "OK"))
    # segni degli orologi attivi
    for oid in scena["orologi_attivi"]:
        o = orologi[oid]
        for k in range(1, o["segmenti"] + 1):
            chi = [b for b in battute if b["tipo"] == "segno_orologio"
                   and (b.get("effetti") or {}).get("avanza_orologio") == oid
                   and (b.get("richiede") or {}).get("orologio", {}).get("min") == k - 1
                   and (b.get("richiede") or {}).get("orologio", {}).get("max") == k - 1]
            if len(chi) != 1:
                errore(f"{oid} segno {k}: {len(chi)} battute (serve 1, con orologio min=max={k - 1})")
            else:
                testo = " ".join(r.split("] ", 1)[1] for r in chi[0]["testo"])
                if radici(o["segni"][k - 1]) - radici(testo):
                    avviso(f"{chi[0]['id']}: il testo non contiene il segno di campagna.yaml")
            cop.append(("segno", f"{oid} {k}", f"{len(chi)}", "OK" if len(chi) == 1 else "MANCA"))
    # finali
    for esito, ids in FINALI.items():
        presenti = [x for x in ids if x in per_id and per_id[x]["tipo"] == "finale"]
        if not presenti:
            errore(f"finale «{esito}» mancante")
        cop.append(("finale", esito, f"{len(presenti)}", "OK" if presenti else "MANCA"))
    # reazioni per PNG
    for pid in png:
        pfx = {"png_ottavia": "ott", "png_baldrin": "bal", "png_sebastiano": "seb"}[pid]
        for cat in REAZIONI:
            ids = [b["id"] for b in battute if b["chi"] == pid and b["tipo"] == "reazione" and b["id"].endswith(cat)]
            if not ids:
                errore(f"{pid}: manca la reazione «{cat}»")
            cop.append(("reazione", f"{pid} {cat}", f"{len(ids)}", "OK" if ids else "MANCA"))
        for tipo in ("saluto", "rifiuto"):
            ids = [b["id"] for b in battute if b["chi"] == pid and b["tipo"] == tipo]
            if not ids:
                errore(f"{pid}: manca il tipo {tipo}")
            cop.append((tipo, pid, f"{len(ids)}", "OK" if ids else "MANCA"))
    trans = [b for b in battute if b["tipo"] == "transizione"]
    if len(trans) < 3:
        errore(f"solo {len(trans)} transizioni")
    cop.append(("transizione", "totale", f"{len(trans)}", "OK"))
    print(f"  {sum(1 for c in cop if c[3] == 'OK')} voci coperte su {len(cop)}")

    print("\n== Segreti nei campi del selettore (id, quando, temi) ==")
    # Una parola segreta è lecita se la battuta richiede un id che la rende pubblica (pubblica_dopo).
    for b in battute:
        r = b.get("richiede") or {}
        prima = set(r.get("indizi_rivelati", [])) | set(r.get("battute_usate", []))
        # la riga dell'elenco come la vede il selettore: id · chi · tipo · quando (più i temi, per prudenza)
        if b.get("solo_esempio"):
            continue  # non entra nell'elenco: il suo testo è controllato sotto, come contesto
        vis = f'{b["id"].replace("_", " ")} · {b["chi"].replace("png_", "")} · {b["tipo"]} · {b["quando"]}'.lower()
        for v in VOCI:
            if re.search(v["regex"], vis) and not (prima & set(v["pubblica_dopo"])) and (b["id"], v["regex"]) not in AMMESSE:
                errore(f"{b['id']}: il selettore vedrebbe «{v['parola']}»: «{vis[:70]}»")
        for q in QUANDO_VIETATE:
            if re.search(q, b["quando"].lower()):
                errore(f"{b['id']}: il quando dice chi mente o nasconde («{q}»)")
    print("  controllati")

    print("\n== Confini di conoscenza nel testo, e completezza di pubblica_dopo ==")
    for b in battute:
        r = b.get("richiede") or {}
        e = b.get("effetti") or {}
        prima = set(r.get("indizi_rivelati", [])) | set(r.get("battute_usate", []))
        qui = prima | set(e.get("rivela_indizi", [])) | {b["id"]}
        for vv in [b["testo"]] + (b.get("varianti") or []):
            for riga in vv:
                tag, testo = riga_split(riga)
                if tag is None:
                    continue
                for v in VOCI:
                    if not re.search(v["regex"], testo.lower()) or (b["id"], v["regex"]) in AMMESSE:
                        continue
                    sa_ok = tag in png and set(v["fatti"]) & set(png[tag]["sa"])
                    if not (qui & set(v["pubblica_dopo"])) and not sa_ok:
                        chi = "il narratore" if tag == "narratore" else tag
                        errore(f"{b['id']}: {chi} dice «{v['parola']}» senza che sia pubblico né nel suo sa: «{testo[:60]}»")
                    if not (prima & set(v["pubblica_dopo"])) and b["id"] not in v["pubblica_dopo"]:
                        errore(f"{b['id']}: rende pubblico «{v['parola']}» ma non è in pubblica_dopo")
    for b in battute:
        if not b.get("solo_esempio"):
            continue
        for vv in [b["testo"]] + (b.get("varianti") or []):
            for riga in vv:
                for v in VOCI:
                    if re.search(v["regex"], riga.lower()):
                        errore(f"{b['id']}: esempio di voce con un segreto («{v['parola']}»): entra nel contesto del selettore")
    for v in VOCI:
        for f in v["fatti"]:
            if f not in canone:
                errore(f"parole_segrete «{v['parola']}»: fatto inesistente {f}")
        for x in v["pubblica_dopo"]:
            if x not in indizi and x not in per_id:
                errore(f"parole_segrete «{v['parola']}»: id inesistente {x}")
    print("  controllati")

    print("\n== Lettura ad alta voce ==")
    lung = defaultdict(list)
    for b in battute:
        for v in [b["testo"]] + (b.get("varianti") or []):
            tot = 0
            n_narr = 0
            for riga in v:
                tag, testo = riga_split(riga)
                if tag is None:
                    continue
                fs = frasi(testo)
                tot += len(parole(testo))
                lim = LIMITE_NARR if tag == "narratore" else LIMITE_PNG.get(tag, LIMITE_PNG_DEFAULT)
                for f in fs:
                    n = len(parole(f))
                    lung[tag].append(n)
                    if n > lim:
                        errore(f"{b['id']}: frase di {n} parole per {tag} (max {lim}): «{f}»")
                if tag == "narratore":
                    n_narr += len(fs)
                else:
                    maxf = 4 if b["tipo"] in ("confessione", "momento", "finale") else 2
                    if len(fs) > maxf:
                        errore(f"{b['id']}: battuta di {tag} con {len(fs)} frasi (max {maxf})")
                bassa = testo.lower()
                for x in VIETATE:
                    if x in bassa:
                        errore(f"{b['id']}: espressione vietata «{x}»")
                if re.search(r"\d", testo):
                    errore(f"{b['id']}: cifre nel testo")
                if re.search(r"[()\[\]]", testo):
                    errore(f"{b['id']}: parentesi nel testo")
                if "…" in testo or "..." in testo:
                    errore(f"{b['id']}: puntini di sospensione")
                for nome in nomi_pg:
                    if re.search(rf"\b{nome}\b", testo):
                        errore(f"{b['id']}: nome di PG «{nome}» nel testo")
            if n_narr > 4:
                errore(f"{b['id']}: {n_narr} frasi di narratore (max 4)")
            if tot > 70:
                errore(f"{b['id']}: {tot} parole in tutto (max 70)")
    improvvisi = sum(1 for b in battute for v in [b["testo"]] + (b.get("varianti") or [])
                     for r in v if "all'improvviso" in r.lower())
    if improvvisi > 1:
        errore(f"«all'improvviso» usato {improvvisi} volte")
    print("  controllati")

    # --- statistiche per il rapporto ---------------------------------------------------
    print("\n== Statistiche ==")
    classe = Counter("solo_esempio" if b.get("solo_esempio") else "riempitivo" if b.get("riempitivo") else "selezionabile"
                     for b in battute)
    print(f"  classi: selezionabili {classe['selezionabile']}, solo_esempio {classe['solo_esempio']}, riempitivo {classe['riempitivo']}")
    conta = Counter((b["chi"], b["tipo"]) for b in battute)
    for chi in sorted({b["chi"] for b in battute}):
        tipi = {t: n for (c, t), n in conta.items() if c == chi}
        print(f"  {chi}: {sum(tipi.values())} battute — " + ", ".join(f"{t} {n}" for t, n in sorted(tipi.items())))
    narr = lung.get("narratore", [])
    if narr and not (8 <= statistics.mean(narr) <= 14):
        errore(f"media delle frasi del narratore {statistics.mean(narr):.1f} parole, fuori 8-14 (N1)")
    for tag, ls in sorted(lung.items()):
        print(f"  frasi {tag}: {len(ls)}, media {statistics.mean(ls):.1f} parole, mediana {statistics.median(ls)}, max {max(ls)}")
    righe = 0
    parole_tot = 0
    for b in battute:
        for v in [b["testo"]] + (b.get("varianti") or []):
            for r in v:
                tag, testo = riga_split(r)
                righe += 1
                parole_tot += len(parole(testo))
    n_var = sum(len(b.get("varianti") or []) for b in battute)
    secondi = parole_tot / 2.5
    print(f"  versioni (testo + varianti): {len(battute) + n_var}; righe da pre-generare: {righe}; parole: {parole_tot}")
    print(f"  audio stimato: {secondi / 60:.1f} minuti (2,5 parole/s); generazione a RTF 0,85–1,0: {secondi * 0.85 / 60:.1f}–{secondi / 60:.1f} minuti")
    print("\n== Copertura (tabella) ==")
    for c in cop:
        print(f"  {c[0]:<12} {c[1]:<45} {c[2]:>5}  {c[3]}")
    print(f"\nRisultato: {errori} errori, {avvisi} avvisi")
    return errori


if __name__ == "__main__":
    sys.exit(1 if main(sys.argv[1]) else 0)
