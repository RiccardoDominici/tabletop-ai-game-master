"""Prompt delle immagini, allineati a strumenti/immagini/campagna.py (che li compone):
    stile.stile_immagini                 il frammento [STILE], in inglese
    scena.immagine.prompt_luogo          luogo, in inglese; immagine.invarianti
    png aspetto.prompt_immagine          ritratto, in inglese, con il segnaposto [STILE]
    png aspetto.invarianti               tratti fissi, accodati al ritratto
    png aspetto.prompt_ritratto          facoltativo: il ritratto, se c'è, al posto di prompt_immagine
    png aspetto.situazioni [{id, prompt, dopo}] facoltative: lo stesso PNG in un'altra situazione, da
                                         mostrare dopo la rivelazione `dopo` (id di indizi o battute)
    campagna nodi[].immagine.prompt_luogo i luoghi senza scheda scena
Le immagini vanno sul proiettore: sono pubbliche dal primo turno. Un tratto nascosto (una cicatrice
sotto il cappuccio) non va nel ritratto né nelle invarianti, ma in una situazione da mostrare dopo.
"""

from __future__ import annotations

import re

from .carica import Campagna
from .esito import Esito


def _sembra_inglese(t: str) -> bool:
    parole = re.findall(r"[a-z]+", t.lower())
    italiane = {"il", "lo", "la", "gli", "le", "di", "del", "della", "con", "che", "una", "uno", "nel", "sul"}
    return bool(parole) and sum(w in italiane for w in parole) / len(parole) < 0.08


def _regex_segrete(c: Campagna) -> list[tuple[re.Pattern, str]]:
    out = []
    for v in (c.parole_segrete or {}).get("parole") or []:
        try:
            out.append((re.compile(v["regex"]), v.get("parola", v["regex"])))
        except (re.error, KeyError, TypeError):
            pass  # lo segnala regole_segreti
    return out


def _segreti(e: Esito, dove: str, testo: str, regex: list[tuple[re.Pattern, str]], cosa: str) -> None:
    """Un'immagine sempre visibile (luogo, ritratto, invarianti) non mostra niente di segreto [R]."""
    basso = testo.lower()
    for rx, parola in regex:
        if rx.search(basso):
            e.avviso("IMMAGINI.segreto", dove, f"{cosa} mostra «{parola}» dal primo turno: spostalo in aspetto.situazioni "
                                               "o toglilo dal luogo", rigoroso=True)
    if re.search(r"\(si vede solo|nascost|hidden|under the hood|secret", basso):
        e.avviso("IMMAGINI.segreto", dove, f"{cosa}: un tratto nascosto sul proiettore si vede subito", rigoroso=True)


def _prompt(e: Esito, dove: str, campo: str, testo: str, con_stile: bool) -> None:
    """Lingua e segnaposto [STILE] di un prompt (strumenti/immagini/campagna.py, con_stile)."""
    n = testo.count("[STILE]")
    if con_stile and n != 1:
        e.errore("IMMAGINI.ritratto", dove, f"{campo}: il segnaposto [STILE] compare {n} volte (una sola)")
    elif not con_stile and n > 1:
        e.errore("IMMAGINI.luogo", dove, f"{campo}: [STILE] più di una volta")
    if not _sembra_inglese(testo.replace("[STILE]", "")):
        e.avviso("IMMAGINI.lingua", dove, f"{campo} in inglese: il generatore lo capisce meglio")


# Battute che contano come momento della storia anche senza rivelare un fatto: una situazione può
# comparire dopo di loro (Tullio alla catena dopo il terzo tocco).
TIPI_MOMENTO = {"momento", "segno_orologio", "finale", "confessione"}


def tratto_pubblicato(c: Campagna, x: str) -> set[str]:
    """Fatti nascosti che l'id x (indizio o battuta) rende pubblici quando esce.

    Per una battuta: i suoi fatti_noti, i fatti delle parole segrete che la elencano in pubblica_dopo, e
    quelli degli indizi che rivela. Per un indizio: i fatti delle parole segrete che lo elencano.
    """
    ids = {x}
    b = c.per_id.get(x)
    out = set()
    if b:
        eff = b.get("effetti") or {}
        ids |= set(eff.get("rivela_indizi") or [])
        out |= set(eff.get("fatti_noti") or [])
    for v in (c.parole_segrete or {}).get("parole") or []:
        if isinstance(v, dict) and ids & set(v.get("pubblica_dopo") or []):
            out |= set(v.get("fatti") or [])
    return out & c.fatti_nascosti()


def _situazione_dopo(c: Campagna, e: Esito, nome: str, pid: str, asp: dict, sit: dict, dopo: list[str]) -> None:
    """`dopo` fa comparire la situazione al primo id che esce: ognuno deve rendere pubblico il tratto.

    Il tratto nascosto si ricava dal lessico dei segreti: sono i fatti che la rivelazione rende pubblici.
    Si controlla che (1) ogni id di `dopo` possa uscire davvero, (2) nessun id la faccia comparire prima
    che il tratto sia pubblico, (3) nessun'altra immagine del PNG, visibile prima, mostri quel tratto.
    """
    sid = sit["id"]
    tratti = {x: tratto_pubblicato(c, x) for x in dopo if x in c.indizi or x in c.per_id}
    for x in tratti:
        b = c.per_id.get(x)
        if b and (b.get("solo_esempio") or b.get("riempitivo")):
            e.errore("IMMAGINI.situazione", nome, f"situazione {sid}: dopo cita {x}, un "
                     f"{'esempio di voce, che non esce mai' if b.get('solo_esempio') else 'riempitivo, che esce a caso allo stallo'}")
    tratto = set().union(*tratti.values()) if tratti else set()
    if not tratto:
        momenti = [x for x in tratti if (c.per_id.get(x) or {}).get("tipo") in TIPI_MOMENTO]
        if tratti and not momenti:
            e.avviso("IMMAGINI.situazione", nome, f"situazione {sid}: {', '.join(tratti)} non rende pubblico nessun fatto "
                                                  "nascosto e non è un momento: se mostra un tratto nascosto, collegala "
                                                  "all'indizio o alla battuta che lo rivela")
        return
    for x, t in tratti.items():
        if not t & tratto:
            e.errore("IMMAGINI.situazione", nome, f"situazione {sid}: {x} la farebbe comparire prima che {sorted(tratto)} "
                                                  "sia pubblico: in dopo vanno solo le rivelazioni del tratto")
    # Lo stesso tratto in un'altra immagine del PNG che si vede prima (le regex sono in italiano: prendono i
    # nomi propri e le invarianti; il resto lo dice la lettura con --dry-run).
    regex = []
    for v in (c.parole_segrete or {}).get("parole") or []:
        if isinstance(v, dict) and set(v.get("fatti") or []) & tratto:
            try:
                regex.append((re.compile(str(v.get("regex", ""))), v.get("parola", "?")))
            except re.error:
                pass
    for altra in asp.get("situazioni") or []:
        if not isinstance(altra, dict) or altra.get("id") == sid:
            continue
        dopo_altra = altra.get("dopo")
        dopo_altra = [dopo_altra] if isinstance(dopo_altra, str) else list(dopo_altra or [])
        if all(tratto_pubblicato(c, y) & tratto for y in dopo_altra) and dopo_altra:
            continue  # anche l'altra compare solo dopo la rivelazione del tratto
        for rx, parola in regex:
            if rx.search(str(altra.get("prompt") or "").lower()):
                e.errore("IMMAGINI.situazione", nome, f"situazione {altra.get('id')} mostra «{parola}», il tratto di {sid}, "
                                                      "prima della sua rivelazione")


def controlla(c: Campagna, e: Esito) -> None:
    stile = c.stile.get("stile_immagini")
    if not stile:
        e.errore("IMMAGINI.stile", "stile.yaml", "manca stile_immagini, il frammento [STILE]")
    elif "[STILE]" in stile:
        e.errore("IMMAGINI.stile", "stile.yaml", "stile_immagini è il contenuto di [STILE], non lo contiene")
    regex = _regex_segrete(c)
    # Luoghi delle scene e dei nodi senza scheda (campagna.yaml → nodi[].immagine).
    for nome, s in c.scene:
        img = s.get("immagine") or {}
        if not img.get("prompt_luogo"):
            e.errore("IMMAGINI.luogo", nome, "manca immagine.prompt_luogo")
        else:
            _prompt(e, nome, "prompt_luogo", img["prompt_luogo"], con_stile=False)
        if not img.get("invarianti"):
            e.errore("IMMAGINI.luogo", nome, "mancano immagine.invarianti")
        _segreti(e, nome, " ".join([str(img.get("prompt_luogo") or ""), *map(str, img.get("invarianti") or [])]), regex,
                 "il luogo")
    for nid, n in c.nodi.items():
        img = n.get("immagine") or {}
        if img.get("prompt_luogo"):
            dove = f"campagna.yaml nodo {nid}"
            _prompt(e, dove, "immagine.prompt_luogo", img["prompt_luogo"], con_stile=False)
            _segreti(e, dove, img["prompt_luogo"], regex, "il luogo")
    # Ritratti e situazioni dei PNG.
    for pid, (nome, d) in c.png.items():
        asp = d.get("aspetto") or {}
        p = asp.get("prompt_immagine") or ""
        if not p:
            e.errore("IMMAGINI.ritratto", nome, "manca aspetto.prompt_immagine")
            continue
        _prompt(e, nome, "prompt_immagine", p, con_stile=True)
        visibile = [p, *[str(x) for x in asp.get("invarianti") or []]]
        if asp.get("prompt_ritratto"):
            # Il generatore preferisce prompt_ritratto a prompt_immagine per il ritratto: stesse regole.
            _prompt(e, nome, "prompt_ritratto", asp["prompt_ritratto"], con_stile=True)
            visibile.append(asp["prompt_ritratto"])
        _segreti(e, nome, " ".join(visibile), regex, "il ritratto o le invarianti")
        for sit in asp.get("situazioni") or []:
            if not (isinstance(sit, dict) and sit.get("id") and sit.get("prompt")):
                e.errore("IMMAGINI.situazione", nome, "ogni situazione ha id e prompt")
                continue
            dopo = sit.get("dopo")
            dopo = [dopo] if isinstance(dopo, str) else list(dopo or [])
            for x in dopo:
                if x not in c.indizi and x not in c.per_id:
                    e.errore("IMMAGINI.situazione", nome, f"situazione {sit['id']}: dopo cita un id che non è né un indizio "
                                                          f"né una battuta: {x}")
            if not dopo:
                e.avviso("IMMAGINI.situazione", nome, f"situazione {sit['id']} senza `dopo`: il Motore la collega a una "
                                                      "rivelazione solo per somiglianza, e può non trovarla", rigoroso=True)
            else:
                _situazione_dopo(c, e, nome, pid, asp, sit, dopo)
            if not _sembra_inglese(sit["prompt"]):
                e.avviso("IMMAGINI.lingua", nome, f"situazione {sit['id']}: prompt in inglese")
