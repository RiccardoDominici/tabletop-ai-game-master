"""Controlli incrociati del manuale (§2, §3, §4, §5, E1) sulla cartella di una campagna.

Non è il validatore di F1: è una verifica di bottega per la scena di prova.
Uso: python3 -I controlli.py /percorso/campagne/prova-f0
Stampa ogni controllo con OK / ERRORE / AVVISO e termina con il conteggio degli errori.
"""
import re
import sys
from pathlib import Path

import yaml

VOCI_REGISTRATE = {"vincent", "nadine", "lucian", "tabitha"}
VOCE_NARRATORE = "narratore"
TAG_MUSICA = {"esplorazione_tesa", "taverna_calda", "rito_sacro", "inseguimento", "combattimento_epico", "lutto"}
SCOPI = {"rivelare_indizio", "far_avanzare_fronte", "mettere_alla_prova", "sviluppare_rapporto", "dare_la_scena", "decompressione"}
TIPI_INDIZIO = {"png", "oggetto", "luogo", "evento", "documento", "visione"}
STATI = {"ostile", "indifferente", "amichevole"}
VIETATE = [
    "brivido lungo la schiena", "sangue gelato", "gelato nelle vene", "l'aria è densa", "l'aria è carica",
    "silenzio assordante", "come se il tempo si fosse fermato", "non potete fare a meno di",
    "sentite che qualcosa non va", "aura di mistero", "danza di ombre",
    "inquietante", "misterios", "terrificante", "mozzafiato", "epic",
]

errori = 0
avvisi = 0


def ok(msg):
    print(f"  OK      {msg}")


def errore(msg):
    global errori
    errori += 1
    print(f"  ERRORE  {msg}")


def avviso(msg):
    global avvisi
    avvisi += 1
    print(f"  AVVISO  {msg}")


def verifica(cond, msg_ok, msg_err):
    (ok if cond else errore)(msg_ok if cond else msg_err)
    return cond


def frasi(testo):
    """Divide un testo in frasi sul punto, punto esclamativo, punto interrogativo."""
    pezzi = re.split(r"(?<=[.!?])\s+", testo.strip())
    return [p for p in pezzi if p]


def parole(frase):
    return len(re.findall(r"[\wàèéìòùÀÈÉÌÒÙ']+", frase))


def controlla_prosa(etichetta, testo, max_frasi=None):
    """Regole N1, N5, N11 su un testo da leggere ad alta voce."""
    fs = frasi(testo)
    lunghezze = [parole(f) for f in fs]
    if max_frasi is not None:
        verifica(len(fs) <= max_frasi, f"{etichetta}: {len(fs)} frasi (max {max_frasi})",
                 f"{etichetta}: {len(fs)} frasi, oltre il massimo di {max_frasi}")
    lunghe = [(f, n) for f, n in zip(fs, lunghezze) if n > 20]
    verifica(not lunghe, f"{etichetta}: tutte le frasi <= 20 parole (max {max(lunghezze)})",
             f"{etichetta}: frasi oltre 20 parole: {lunghe}")
    basso = testo.lower()
    trovate = [v for v in VIETATE if v in basso]
    verifica(not trovate, f"{etichetta}: nessuna espressione vietata", f"{etichetta}: espressioni vietate {trovate}")
    if re.search(r"\d", testo):
        errore(f"{etichetta}: contiene cifre (N11: numeri in lettere)")
    if re.search(r"[()\[\]]", testo):
        errore(f"{etichetta}: contiene parentesi (N11)")
    return lunghezze


def carica(percorso):
    with open(percorso, encoding="utf-8") as f:
        return yaml.safe_load(f)


def main(cartella):
    cartella = Path(cartella)
    stile = carica(cartella / "stile.yaml")
    camp = carica(cartella / "campagna.yaml")
    scena = carica(cartella / "scena.yaml")
    pg = carica(cartella / "pg.yaml")
    png = {}
    for p in sorted((cartella / "png").glob("*.yaml")):
        dati = carica(p)
        png[dati["id"]] = (p, dati)

    canone = {f["id"]: f for f in camp["canone"]}
    pg_ids = [p["id"] for p in pg["personaggi"]]
    orologi = {o["id"]: o for o in camp["orologi"]}
    rivelazioni = {r["id"]: r for r in camp["rivelazioni"]}
    nodi = {n["id"]: n for n in camp["nodi"]}

    # Tutti gli indizi: scheda scena + nodi senza scheda.
    indizi = {}
    for i in scena["indizi"]:
        indizi[i["id"]] = i
    for n in camp["nodi"]:
        for i in n.get("indizi", []) or []:
            i = dict(i)
            i.setdefault("nodo", n["id"])
            indizi[i["id"]] = i

    print("\n== Canone ==")
    ids_canone = [f["id"] for f in camp["canone"]]
    verifica(len(ids_canone) == len(set(ids_canone)), f"{len(ids_canone)} fatti, id unici", "id dei fatti duplicati")
    for f in camp["canone"]:
        for campo in ("id", "testo", "noto_ai_pg", "stato"):
            if campo not in f:
                errore(f"{f.get('id')}: manca {campo}")

    print("\n== Carta di stile (C1, E14) ==")
    for campo in ("premessa", "tono", "tema", "linee", "veli", "stile_immagini", "tavolozza_musicale", "registro_narratore"):
        verifica(campo in stile and stile[campo], f"stile.{campo} presente", f"stile.{campo} mancante")
    verifica(len(frasi(stile["premessa"])) == 1, "premessa in una frase", "premessa: più di una frase")
    tag_fuori = set(stile["tavolozza_musicale"]["tag"]) - TAG_MUSICA
    verifica(not tag_fuori, "tavolozza: tag dal vocabolario", f"tavolozza: tag fuori vocabolario {tag_fuori}")

    print("\n== Schede PNG (§3) ==")
    voci_usate = {}
    iniziali = {}
    for pid, (percorso, d) in png.items():
        print(f" -- {pid}")
        verifica(percorso.stem == pid, "id = nome del file", f"id {pid} diverso dal file {percorso.name}")
        verifica(re.fullmatch(r"[a-z0-9_]+", pid) is not None, "id ascii minuscolo", f"id non ascii minuscolo: {pid}")
        for campo in ("nome", "pronuncia", "livello", "ruolo", "fronte", "desiderio", "paura", "statistiche"):
            verifica(d.get(campo), f"{campo} presente", f"{campo} mancante")
        iniziali.setdefault(d["nome"][0].upper(), []).append(pid)
        fronti_ids = [f["id"] for f in camp["preparazione"]["fronti"]]
        verifica(d["fronte"] in fronti_ids, "fronte esistente", f"fronte inesistente {d['fronte']}")
        # aspetto
        lettura = d["aspetto"]["lettura"]
        n = parole(lettura)
        nf = len(frasi(lettura))
        verifica(n <= 35 and 1 <= nf <= 2, f"aspetto.lettura {nf} frasi, {n} parole", f"aspetto.lettura {nf} frasi, {n} parole (max 2 e 35)")
        controlla_prosa("aspetto.lettura", lettura)
        verifica(len(d["aspetto"].get("invarianti", [])) >= 3, "invarianti presenti", "invarianti mancanti o scarse")
        verifica("[STILE]" in d["aspetto"]["prompt_immagine"], "prompt_immagine con [STILE]", "prompt_immagine senza [STILE]")
        # personalità
        sup = d["personalita"]["superficie"]
        sot = d["personalita"]["sotto_pressione"]
        verifica(len(sup) >= 2, f"superficie {len(sup)} tratti", "superficie < 2 tratti")
        verifica(len(sot) >= 1 and not (set(sot) & set(sup)), "sotto_pressione diverso dalla superficie", "sotto_pressione mancante o uguale alla superficie")
        # segreto
        for campo in ("testo", "chi_altro_sa", "se_rivelato"):
            verifica(campo in d["segreto"], f"segreto.{campo} presente", f"segreto.{campo} mancante")
        # voce
        v = d["voce"]
        vid = v["tts"]["voce_id"]
        verifica(vid in VOCI_REGISTRATE, f"voce_id {vid} registrata", f"voce_id {vid} non registrata")
        verifica(vid != VOCE_NARRATORE, "voce_id diversa dal narratore", "voce_id = narratore")
        voci_usate.setdefault(vid, []).append(pid)
        for campo in ("registro", "stile", "gesto", "mai_dice", "battuta_campione"):
            verifica(v.get(campo), f"voce.{campo} presente", f"voce.{campo} mancante")
        verifica(any(r in v["registro"].lower() for r in ("tu", "voi", "lei")), "registro indica tu/voi/lei", "registro senza tu/voi/lei")
        verifica(len(v.get("tic", [])) <= 2, f"tic {len(v.get('tic', []))} (max 2)", "più di 2 tic")
        controlla_prosa("battuta_campione", v["battuta_campione"])
        verifica(len(frasi(v["battuta_campione"])) <= 2, "battuta_campione <= 2 frasi (D3)", "battuta_campione oltre 2 frasi")
        verifica(v["gesto"] not in [m["segnale"] for m in d["mente_su"]], "gesto diverso dal segnale delle menzogne", "il gesto coincide con un segnale: il segnale non si legge")
        # sa / non_sa
        sa, non_sa = d["sa"], d["non_sa"]
        verifica(len(sa) >= 3, f"sa {len(sa)} voci", "sa < 3")
        verifica(len(non_sa) >= 3, f"non_sa {len(non_sa)} voci", "non_sa < 3")
        mancanti = [x for x in sa + non_sa if x not in canone]
        verifica(not mancanti, "sa e non_sa citano fatti del canone", f"fatti inesistenti: {mancanti}")
        comuni = set(sa) & set(non_sa)
        verifica(not comuni, "sa e non_sa disgiunti", f"sa e non_sa in comune: {comuni}")
        # crede_a_torto
        for c in d.get("crede_a_torto", []):
            fatto = c["contraddice"]
            verifica(fatto in canone, f"credenza falsa contraddice {fatto}", f"credenza falsa: fatto inesistente {fatto}")
            verifica(fatto not in sa, f"{fatto} non è in sa (credenza in buona fede)", f"{fatto} è in sa: sarebbe una menzogna, non una credenza")
        # mente_su
        verifica(len(d["mente_su"]) >= 1, f"mente_su {len(d['mente_su'])} voci", "mente_su vuoto")
        for m in d["mente_su"]:
            for campo in ("argomento", "verita", "versione", "perche", "segnale", "cede_se"):
                verifica(m.get(campo), f"mente_su[{m.get('argomento')}].{campo}", f"mente_su[{m.get('argomento')}]: manca {campo}")
            verifica(m["verita"] in sa, f"verità {m['verita']} sta in sa", f"verità {m['verita']} NON sta in sa: si mente solo su ciò che si sa")
            controlla_prosa(f"versione[{m['argomento']}]", m["versione"])
        # atteggiamento_pg
        att = d["atteggiamento_pg"]
        mancano = [p for p in pg_ids if p not in att]
        verifica(not mancano, "atteggiamento_pg copre tutti i PG", f"atteggiamento_pg: mancano {mancano}")
        for p, a in att.items():
            verifica(a.get("stato") in STATI and a.get("perche") and a.get("vuole"), f"atteggiamento {p}: {a.get('stato')}", f"atteggiamento {p} incompleto")
        # info_chiave, evoluzione
        mancanti = [i for i in d.get("info_chiave", []) if i not in indizi]
        verifica(not mancanti, "info_chiave citano indizi esistenti", f"info_chiave inesistenti: {mancanti}")
        for e in d.get("evoluzione", []):
            verifica("se" in e and "allora" in e, "evoluzione se/allora", f"evoluzione senza se/allora: {e}")
        verifica(d.get("registro_attivita") == [], "registro_attivita vuoto", "registro_attivita non vuoto")

    print("\n== Controlli di scena sui PNG ==")
    doppie = {k: v for k, v in voci_usate.items() if len(v) > 1}
    verifica(not doppie, f"voce_id unici: {voci_usate}", f"voce_id ripetuti: {doppie}")
    doppie = {k: v for k, v in iniziali.items() if len(v) > 1}
    verifica(not doppie, f"iniziali diverse: {sorted(iniziali)}", f"iniziali uguali: {doppie}")

    print("\n== Scheda scena (§4) ==")
    verifica(scena["scopo"]["tipo"] in SCOPI, f"scopo {scena['scopo']['tipo']} dall'elenco C12", "scopo fuori elenco")
    verifica(scena["scopo"]["rif"] in indizi, "scopo: indizio esistente", "scopo: indizio inesistente")
    verifica(scena["domanda_drammatica"].strip().endswith("?"), "domanda drammatica", "domanda drammatica senza punto interrogativo")
    pp = scena["posta"]
    tutti = set(pg_ids) | set(png)
    verifica(any(x in tutti for x in pp["si_guadagna"]["per_chi"] + pp["si_perde"]["per_chi"]), "posta riguarda PG o PNG", "posta non riguarda PG o PNG")
    verifica(1 <= scena["intensita"] <= 5, f"intensità {scena['intensita']}", "intensità fuori 1-5")
    verifica(len(scena["sensi"]) == 3, "sensi: esattamente 3", f"sensi: {len(scena['sensi'])}")
    verifica(len(scena["elementi_interattivi"]) >= 3, f"elementi interattivi {len(scena['elementi_interattivi'])}", "elementi interattivi < 3")
    mancanti = [p for p in scena["png_presenti"] if p not in png]
    verifica(not mancanti, "png_presenti esistono", f"png_presenti inesistenti {mancanti}")
    mancanti = [o for o in scena["orologi_attivi"] if o not in orologi]
    verifica(not mancanti, "orologi_attivi esistono", f"orologi inesistenti {mancanti}")
    for i in scena["indizi"]:
        for campo in ("id", "conclusione", "come_si_trova", "tiro", "tipo", "nodo"):
            if campo not in i:
                errore(f"indizio {i.get('id')}: manca {campo}")
        verifica(i["conclusione"] in rivelazioni, f"{i['id']} -> {i['conclusione']}", f"{i['id']}: conclusione inesistente")
        if i.get("essenziale"):
            verifica(i["tiro"] == "nessuno", f"{i['id']} essenziale senza tiro (F3)", f"{i['id']} essenziale dietro un tiro (F3)")
    verifica(len(scena["uscite"]) >= 2, f"uscite {len(scena['uscite'])}", "uscite < 2")
    for u in scena["uscite"]:
        verifica(u["verso"] in nodi, f"uscita verso {u['verso']}", f"uscita verso nodo inesistente {u['verso']}")
        mancanti = [x for x in u["segnalata_da"] if x not in indizi]
        verifica(u["segnalata_da"] and not mancanti, f"uscita {u['verso']} segnalata da {len(u['segnalata_da'])} indizi", f"uscita {u['verso']}: indizi inesistenti {mancanti}")
    verifica(scena["mossa_morbida_pronta"], "mossa morbida pronta", "mossa morbida mancante")
    controlla_prosa("mossa_morbida_pronta", scena["mossa_morbida_pronta"], max_frasi=4)
    verifica(scena["musica"]["tag"] in TAG_MUSICA, f"musica.tag {scena['musica']['tag']}", "musica.tag fuori vocabolario")
    citati = set(re.findall(r"[a-z]+_[a-z]+", scena["musica"]["transizione"]))
    verifica(citati <= TAG_MUSICA, f"transizione cita solo tag del vocabolario {sorted(citati)}", f"transizione: tag fuori vocabolario {citati - TAG_MUSICA}")
    verifica(scena["immagine"]["invarianti"], "immagine: invarianti del luogo", "immagine: invarianti mancanti")
    verifica(scena["taglio"], "taglio presente", "taglio mancante")

    print("\n== Apertura e inizio forte (C9, N1, N2) ==")
    l_ape = controlla_prosa("apertura", scena["apertura"], max_frasi=3)
    l_ria = controlla_prosa("riassunto_iniziale", camp["sessione"]["riassunto_iniziale"], max_frasi=4)
    tot = l_ria + l_ape
    media = sum(tot) / len(tot)
    verifica(len(tot) <= 6, f"inizio di sessione {len(tot)} frasi (max 6)", f"inizio di sessione {len(tot)} frasi, oltre 6")
    verifica(8 <= media <= 14, f"media parole per frase {media:.1f} (8-14)", f"media parole per frase {media:.1f} fuori 8-14")
    verifica(scena["apertura"].strip().endswith("?"), "l'apertura chiude con un invito", "l'apertura non chiude con una domanda")

    print("\n== Rivelazioni, regola dei tre indizi (C4) ==")
    for r in camp["rivelazioni"]:
        ii = [indizi[x] for x in r["indizi"] if x in indizi]
        mancanti = [x for x in r["indizi"] if x not in indizi]
        verifica(not mancanti, f"{r['id']}: indizi esistenti", f"{r['id']}: indizi inesistenti {mancanti}")
        nodi_r = {i["nodo"] for i in ii}
        tipi_r = {i["tipo"] for i in ii}
        bad_tipi = tipi_r - TIPI_INDIZIO
        if bad_tipi:
            errore(f"{r['id']}: tipi di indizio fuori elenco {bad_tipi}")
        dettaglio = f"{len(ii)} indizi, {len(nodi_r)} nodi, {len(tipi_r)} tipi"
        if r.get("chiave"):
            verifica(len(ii) >= 3 and len(nodi_r) >= 2 and len(tipi_r) >= 2, f"{r['id']}: {dettaglio}", f"{r['id']}: {dettaglio} (servono 3/2/2)")
        else:
            ok(f"{r['id']} (non chiave): {dettaglio}")
        for i in ii:
            if i["conclusione"] != r["id"]:
                errore(f"{i['id']} elencato in {r['id']} ma sostiene {i['conclusione']}")
    orfani = [i for i in indizi if not any(i in r["indizi"] for r in camp["rivelazioni"])]
    verifica(not orfani, "ogni indizio sostiene una rivelazione", f"indizi orfani: {orfani}")
    for c in camp["colli_di_bottiglia"]:
        verifica(len(c["soluzioni"]) >= 3, f"{c['id']}: {len(c['soluzioni'])} soluzioni", f"{c['id']}: meno di 3 soluzioni")

    print("\n== Nodi (C5) e grafo ==")
    for n in camp["nodi"]:
        for x in n.get("collegamenti", []):
            if x not in nodi:
                errore(f"{n['id']}: collegamento a nodo inesistente {x}")
    visti, coda = {"n_osteria"}, ["n_osteria"]
    while coda:
        x = coda.pop(0)
        for y in nodi[x].get("collegamenti", []):
            if y in nodi and y not in visti:
                visti.add(y)
                coda.append(y)
    non_raggiunti = set(nodi) - visti
    verifica(not non_raggiunti, f"tutti i {len(nodi)} nodi raggiungibili da n_osteria", f"nodi non raggiungibili: {non_raggiunti}")
    vicoli = [n["id"] for n in camp["nodi"] if not n.get("collegamenti") and not n.get("prossima_sessione")]
    verifica(not vicoli, "nessun vicolo cieco", f"vicoli ciechi: {vicoli}")
    # quanti indizi segnalano ciascuna uscita di scena
    for u in scena["uscite"]:
        n_ind = len(u["segnalata_da"])
        (ok if n_ind >= 3 else avviso)(f"nodo {u['verso']} segnalato da {n_ind} indizi (C5 chiede >=3 per i nodi necessari)")

    print("\n== Fronti e orologi (C2) ==")
    for f in camp["preparazione"]["fronti"]:
        npres = sum(len(p["presagi"]) for p in f["pericoli"])
        lim = (3, 5) if f["livello"] == "campagna" else (1, 3)
        verifica(lim[0] <= npres <= lim[1], f"{f['id']}: {npres} presagi ({lim[0]}-{lim[1]})", f"{f['id']}: {npres} presagi, fuori {lim}")
        verifica(2 <= len(f["pericoli"]) <= 3, f"{f['id']}: {len(f['pericoli'])} pericoli", f"{f['id']}: pericoli fuori 2-3")
        verifica(1 <= len(f["domande_di_posta"]) <= 3, f"{f['id']}: {len(f['domande_di_posta'])} domande di posta", f"{f['id']}: domande di posta fuori 1-3")
        for p in f["pericoli"]:
            for campo in ("tipo", "impulso", "destino_incombente", "presagi", "mosse", "cast", "orologio"):
                if campo not in p:
                    errore(f"{p['id']}: manca {campo}")
            verifica(len(p["impulso"].split()) == 1, f"{p['id']}: impulso '{p['impulso']}' è un verbo", f"{p['id']}: impulso non è un verbo solo")
            for pr in p["presagi"]:
                verifica(pr.get("segno_visibile"), f"{p['id']}: presagio con segno visibile", f"{p['id']}: presagio senza segno visibile")
            extra = {o["id"]: o for o in f.get("orologi_extra", [])}
            o = orologi.get(p["orologio"]) or extra.get(p["orologio"])
            verifica(o is not None and o["segmenti"] in (4, 6, 8), f"{p['id']}: orologio {p['orologio']} da {o and o['segmenti']}", f"{p['id']}: orologio mancante o di misura non ammessa")
    for o in camp["orologi"]:
        verifica(len(o["segni"]) == o["segmenti"], f"{o['id']}: un segno per segmento", f"{o['id']}: {len(o['segni'])} segni per {o['segmenti']} segmenti")
        for k, s in enumerate(o["segni"], 1):
            controlla_prosa(f"{o['id']} segno {k}", s)

    print("\n== Cattivo (C3), segreti (C6), archi (C8) ==")
    c = camp["preparazione"]["cattivo"]
    for campo in ("obiettivo", "cronologia_se_i_pg_non_intervengono", "risorse", "reazioni", "stato_di_quiete", "chiamata_all_azione"):
        verifica(c.get(campo), f"cattivo.{campo}", f"cattivo.{campo} mancante")
    sg = camp["preparazione"]["segreti_astratti"]
    verifica(8 <= len(sg) <= 12, f"{len(sg)} segreti astratti (circa 10)", f"{len(sg)} segreti astratti")
    for s in sg:
        if len(frasi(s)) > 2:
            errore(f"segreto oltre 2 frasi: {s}")
    archi = camp["preparazione"]["archi"]["pg"]
    passi = ["tu", "bisogno", "vai", "cerca", "trova", "paga", "ritorna", "cambia"]
    for p in pg_ids:
        verifica(p in archi and all(k in archi[p] for k in passi), f"arco di {p} sul cerchio di Harmon", f"arco di {p} incompleto")

    print("\n== PG ==")
    verifica(len(pg_ids) == 4 and len(set(pg_ids)) == 4, "4 PG con id unici", "PG non 4 o id duplicati")
    for p in pg["personaggi"]:
        for campo in ("id", "nome", "pronomi", "specie", "classe", "livello", "concetto", "aggancio", "conoscenze_private"):
            if not p.get(campo):
                errore(f"{p['id']}: manca {campo}")
        verifica(p["livello"] == 1, f"{p['id']} livello 1", f"{p['id']} livello {p['livello']}")
        verifica(len(frasi(p["concetto"])) == 2, f"{p['id']}: concetto in due frasi", f"{p['id']}: concetto in {len(frasi(p['concetto']))} frasi")
        for k in p["conoscenze_private"]:
            mancanti = [x for x in k.get("fatti", []) if x not in canone]
            if mancanti:
                errore(f"{p['id']}: conoscenza privata cita fatti inesistenti {mancanti}")
    nomi_pg = {p["nome"].split()[-1] if p["nome"].startswith("Sorella") else p["nome"].split()[0] for p in pg["personaggi"]}
    nomi_png = {d["nome"].split()[0] for _, d in png.values()}
    verifica(not (nomi_pg & nomi_png), "nomi di PG e PNG distinti", f"nomi in comune {nomi_pg & nomi_png}")

    print("\n== Riferimenti a fatti ovunque ==")
    testo_tutto = (cartella / "campagna.yaml").read_text() + (cartella / "scena.yaml").read_text()
    for _, (percorso, _) in png.items():
        testo_tutto += percorso.read_text()
    testo_tutto += (cartella / "pg.yaml").read_text()
    citati = set(re.findall(r"\bf_[a-z_]+\b", testo_tutto))
    mancanti = citati - set(canone)
    verifica(not mancanti, f"{len(citati)} id di fatti citati, tutti nel canone", f"fatti citati ma non nel canone: {mancanti}")
    non_usati = set(canone) - citati_fuori_canone(cartella, png)
    if non_usati:
        avviso(f"fatti del canone mai citati altrove: {sorted(non_usati)}")

    print(f"\nRisultato: {errori} errori, {avvisi} avvisi")
    return errori


def citati_fuori_canone(cartella, png):
    """Id dei fatti citati fuori dalla sezione canone (schede, scena, pg, resto della campagna)."""
    testo = (cartella / "scena.yaml").read_text() + (cartella / "pg.yaml").read_text()
    for _, (percorso, _) in png.items():
        testo += percorso.read_text()
    camp = (cartella / "campagna.yaml").read_text()
    camp = camp.split("# OROLOGI")[1] if "# OROLOGI" in camp else camp
    testo += camp
    return set(re.findall(r"\bf_[a-z_]+\b", testo))


if __name__ == "__main__":
    sys.exit(1 if main(sys.argv[1]) else 0)
