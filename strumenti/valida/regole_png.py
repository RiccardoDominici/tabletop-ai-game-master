"""Scheda PNG obbligatoria (manuale §3) e controlli incrociati: sa/non_sa, menzogne, credenze false,
atteggiamento verso ogni PG, voce. Le regole di scena (voci e iniziali uniche tra i presenti) stanno
in regole_scena.py."""

from __future__ import annotations

import re

from . import costanti as K
from .carica import Campagna
from .esito import Esito
from .testo import TEMI_GENERICI, frasi, massimo_da_stile, n_parole, problemi_di_prosa


def controlla(c: Campagna, e: Esito) -> None:
    fronti = {f.get("id") for f in c.fronti}
    for pid, (nome_file, d) in c.png.items():
        dove = nome_file
        stem = nome_file.rsplit("/", 1)[-1].removesuffix(".yaml")
        if d.get("id") != stem:
            e.errore("PNG.id", dove, f"id {d.get('id')!r} diverso dal nome del file {stem!r}")
        if not re.fullmatch(r"[a-z0-9_]+", str(pid)):
            e.errore("PNG.id", dove, "id in ascii minuscolo: diventa l'etichetta [id] del protocollo")
        if not str(pid).startswith("png_"):
            e.avviso("PNG.id", dove, "per convenzione l'id inizia con png_")
        for campo in ("nome", "pronuncia", "livello", "ruolo", "fronte", "desiderio", "paura", "statistiche"):
            if not d.get(campo):
                e.errore("PNG.campo", dove, f"manca {campo}")
        livello = d.get("livello")
        if livello and livello not in K.LIVELLI_PNG:
            e.errore("PNG.livello", dove, f"livello {livello} fuori elenco {sorted(K.LIVELLI_PNG)}")
        pieno = livello in ("supporto", "principale")
        if d.get("fronte") and d["fronte"] not in fronti:
            e.errore("PNG.fronte", dove, f"fronte inesistente {d['fronte']}")
        # `nascosto` (richiesta 2 del 9 novembre): booleano; ha senso solo su un PNG presente in una scena.
        if "nascosto" in d:
            if not isinstance(d["nascosto"], bool):
                e.errore("PNG.nascosto", dove, "nascosto deve essere true o false")
            elif d["nascosto"] and not any(pid in (s.get("png_presenti") or []) for _, s in c.scene):
                e.avviso("PNG.nascosto", dove, "nascosto: true, ma non è presente in nessuna scena: il flag non serve")

        asp = d.get("aspetto") or {}
        lettura = asp.get("lettura") or ""
        if not lettura:
            e.errore("PNG.campo", dove, "manca aspetto.lettura")
        else:
            nf, nw = len(frasi(lettura)), n_parole(lettura)
            if not (1 <= nf <= 2 and nw <= 35):
                e.errore("PNG.lettura", dove, f"aspetto.lettura di {nf} frasi e {nw} parole (max 2 e 35)")
            for regola, det in problemi_di_prosa(lettura):
                e.errore(f"PROSA.{regola}", f"{dove} aspetto.lettura", det)
        if len(asp.get("invarianti") or []) < 3:
            e.errore("PNG.invarianti", dove, "servono almeno tre invarianti per la coerenza delle immagini")

        pers = d.get("personalita") or {}
        sup, sot = pers.get("superficie") or [], pers.get("sotto_pressione") or []
        if len(sup) < 2:
            e.errore("PNG.personalita", dove, "almeno due tratti di superficie")
        if not sot or set(sot) & set(sup):
            e.errore("PNG.personalita", dove, "almeno un tratto sotto pressione, diverso da quelli di superficie")

        seg = d.get("segreto") or {}
        for campo in ("testo", "chi_altro_sa", "se_rivelato"):
            if campo not in seg:
                e.errore("PNG.segreto", dove, f"manca segreto.{campo}")

        _voce(c, e, dove, d)
        _conoscenza(c, e, dove, d, pieno)

        att = d.get("atteggiamento_pg") or {}
        for p in c.pg_ids:
            a = att.get(p)
            if not a:
                e.errore("PNG.atteggiamento", dove, f"manca l'atteggiamento verso {p}")
            elif a.get("stato") not in K.STATI_ATTEGGIAMENTO or not a.get("perche") or not a.get("vuole"):
                e.errore("PNG.atteggiamento", dove, f"atteggiamento verso {p} incompleto (stato, perche, vuole)")
        for i in d.get("info_chiave") or []:
            if i not in c.indizi:
                e.errore("PNG.info_chiave", dove, f"indizio inesistente {i}")
        for ev in d.get("evoluzione") or []:
            if not (isinstance(ev, dict) and ev.get("se") and ev.get("allora")):
                e.errore("PNG.evoluzione", dove, "l'evoluzione si scrive come {se, allora}")
        if d.get("registro_attivita") not in ([], None):
            e.errore("PNG.registro_attivita", dove, "registro_attivita lo scrive solo il Motore: deve essere []")
        alias = d.get("alias")
        if alias is None:
            e.avviso("PNG.alias", dove, "manca `alias`: i soprannomi con cui i giocatori lo chiameranno (nano, ostessa…)", rigoroso=True)
        elif not (isinstance(alias, list) and all(isinstance(x, str) for x in alias)):
            e.errore("PNG.alias", dove, "alias è una lista di parole")
        else:
            generici = sorted({a.lower() for a in alias} & (K.ALIAS_GENERICI | TEMI_GENERICI))
            if generici:
                e.avviso("PNG.alias", dove, f"alias generici {generici}: il PNG entrerebbe nella pertinenza di ogni azione "
                                            "su chiunque. Usa il mestiere o il ruolo (custode, ostessa, scrivano)", rigoroso=True)
    # Un soprannome di due PNG: il server non sa a chi parla l'azione.
    di_chi: dict[str, list[str]] = {}
    for pid, (_, d) in c.png.items():
        for a in d.get("alias") or [] if isinstance(d.get("alias"), list) else []:
            if isinstance(a, str):
                di_chi.setdefault(a.lower(), []).append(pid)
    for a, chi in sorted(di_chi.items()):
        if len(set(chi)) > 1:
            e.errore("PNG.alias", "png/", f"l'alias «{a}» è di più PNG ({', '.join(sorted(set(chi)))}): il Motore non sa a chi parla l'azione")


def _voce(c: Campagna, e: Esito, dove: str, d: dict) -> None:
    v = d.get("voce") or {}
    tts = v.get("tts") or {}
    vid = tts.get("voce_id")
    if not vid:
        e.errore("PNG.voce", dove, "manca voce.tts.voce_id")
    elif vid == c.voce_narratore:
        e.errore("PNG.voce", dove, "un PNG non usa la voce del narratore")
    elif c.voci_registrate is not None and vid not in c.voci_registrate:
        e.errore("PNG.voce", dove, f"voce {vid} assente dal registro delle voci")
    for campo in ("registro", "stile", "gesto", "mai_dice", "battuta_campione"):
        if not v.get(campo):
            e.errore("PNG.voce", dove, f"manca voce.{campo}")
    if v.get("stile") and massimo_da_stile(v["stile"]) is None:
        e.avviso("PNG.voce_stile", dove, "dallo stile non si legge quante parole per frase («Frasi di tre-otto parole»): "
                                         "le sue battute hanno il tetto predefinito di sedici")
    if v.get("registro") and not re.search(r"\b(tu|voi|lei)\b", v["registro"].lower()):
        e.errore("PNG.voce", dove, "il registro dice tu, voi o lei")
    if len(v.get("tic") or []) > 2:
        e.errore("PNG.voce", dove, "al massimo due tic")
    campione = v.get("battuta_campione") or ""
    if campione:
        if len(frasi(campione)) > 2:
            e.errore("PROSA.frasi_battuta", f"{dove} battuta_campione", "al massimo due frasi (D3)")
        for regola, det in problemi_di_prosa(campione):
            e.errore(f"PROSA.{regola}", f"{dove} battuta_campione", det)
    segnali = [m.get("segnale") for m in d.get("mente_su") or [] if isinstance(m, dict)]
    if v.get("gesto") and v["gesto"] in segnali:
        e.errore("PNG.segnale", dove, "il gesto abituale coincide con il segnale di una menzogna: il segnale non si leggerebbe")


def _conoscenza(c: Campagna, e: Esito, dove: str, d: dict, pieno: bool) -> None:
    sa, non_sa = list(d.get("sa") or []), list(d.get("non_sa") or [])
    if pieno and len(sa) < 3:
        e.errore("PNG.sa", dove, f"sa ha {len(sa)} fatti (almeno 3)")
    if len(non_sa) < 3:
        e.errore("PNG.non_sa", dove, f"non_sa ha {len(non_sa)} voci (almeno 3)")
    for f in sa + non_sa:
        if f not in c.canone:
            e.errore("PNG.fatto", dove, f"fatto inesistente nel canone: {f}")
    comuni = set(sa) & set(non_sa)
    if comuni:
        e.errore("PNG.sa_non_sa", dove, f"sa e non_sa in comune: {sorted(comuni)}")
    for cr in d.get("crede_a_torto") or []:
        if isinstance(cr, str):
            e.avviso("PNG.crede_a_torto", dove, "credenza falsa senza `contraddice`: non si può verificare", rigoroso=True)
            continue
        f = cr.get("contraddice")
        if f not in c.canone:
            e.errore("PNG.crede_a_torto", dove, f"la credenza contraddice un fatto inesistente: {f}")
        elif f in sa:
            e.errore("PNG.crede_a_torto", dove, f"{f} è nel suo sa: sarebbe una menzogna, non una credenza")
    mente = [m for m in d.get("mente_su") or [] if isinstance(m, dict)]
    if pieno and not mente:
        e.errore("PNG.mente_su", dove, "un PNG di supporto o principale mente su almeno una cosa")
    ids = [m.get("id") for m in mente if m.get("id")]
    if len(ids) != len(set(ids)):
        e.errore("PNG.mente_su", dove, "id delle menzogne ripetuti")
    for m in mente:
        arg = m.get("argomento", "?")
        for campo in ("argomento", "verita", "versione", "perche", "segnale", "cede_se"):
            if not m.get(campo):
                e.errore("PNG.mente_su", dove, f"menzogna «{arg}»: manca {campo}")
        if m.get("verita") and m["verita"] not in sa:
            e.errore("PNG.mente_su", dove, f"menzogna «{arg}»: la verità {m['verita']} non è nel suo sa")
        if not m.get("id"):
            e.avviso("PNG.mente_su", dove, f"menzogna «{arg}» senza id: il repertorio la cita in menzogna_detta", rigoroso=True)
        for regola, det in problemi_di_prosa(m.get("versione") or ""):
            e.errore(f"PROSA.{regola}", f"{dove} versione «{arg}»", det)
