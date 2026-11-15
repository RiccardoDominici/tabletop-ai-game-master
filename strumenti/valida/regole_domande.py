"""World questions of the scene sheets (docs/prove.md §9): the optional `domande` list of scena.yaml and scene/*.yaml.

Each question names the fact that asks it (a gate of `avanza_quando`, same grammar as the clock gates, checked by
regole_campagna.QUANDO_PORTE), then either its odds (`tiro: {dado, almeno}`) or an NPC's own check
(`prova_png: {png, prova, difficolta}`), then the two answers the narrator gets (`se_si`, `se_no`). The Engine reads
the same keys in apps/server/src/mondo/domande.ts; this module checks the sheets before a session runs them.

Every code is DOMANDE.<campo>. The NPC check is validated against the campaign's own rule set when there is one
(regole/regole.yaml, loaded by carica into c.regole, the same object regole_set.py checks), against the SRD otherwise.
"""

from __future__ import annotations

from . import srd
from .carica import Campagna
from .esito import Esito
from .regole_campagna import QUANDO_PORTE
from .regole_schede import dadi_attivi
from .regole_set import attivo

# Keys a question may carry; anything else is an unknown key.
CHIAVI_DOMANDA = {"id", "domanda", "quando", "temi", "ids", "turni", "prove", "tiro", "prova_png", "se_si", "se_no"}
CHIAVI_TIRO = {"dado", "almeno", "visibile"}
CHIAVI_PROVA_PNG = {"png", "prova", "difficolta", "visibile"}
# The kinds of an NPC's check, as the panel's «Chiedi una prova» writes them.
TIPI_PROVA = ("abilita", "caratteristica", "salvezza")
# The SRD difficulty scale (docs/prove.md §2); a rule set brings its own in difficolta[].
DIFFICOLTA_SRD = ("molto_facile", "facile", "media", "difficile", "molto_difficile", "quasi_impossibile")


def _intero(v, minimo: int, massimo: int) -> bool:
    return isinstance(v, int) and not isinstance(v, bool) and minimo <= v <= massimo


def _testi_non_vuoti(v) -> bool:
    return isinstance(v, list) and bool(v) and all(isinstance(x, str) and x.strip() for x in v)


def _ids_del_set(c: Campagna, campo: str) -> set[str]:
    """The ids of a list of the campaign's rule set (`abilita`, `caratteristiche`, `difficolta`); empty if absent."""
    voci = c.regole.get(campo) if isinstance(c.regole, dict) else None
    if not isinstance(voci, list):
        return set()
    return {o["id"] for o in voci if isinstance(o, dict) and isinstance(o.get("id"), str)}


def controlla(c: Campagna, e: Esito) -> None:
    """Every `domande` entry of every scene sheet. Ids are unique across the whole campaign, not per scene."""
    viste: set[str] = set()
    for nome, dati in c.scene:
        if not isinstance(dati, dict) or "domande" not in dati:
            continue
        lista = dati["domande"]
        if not isinstance(lista, list):
            e.errore("DOMANDE.domande", nome, "domande è un elenco di domande (ciascuna una mappa)")
            continue
        for i, d in enumerate(lista):
            if not isinstance(d, dict):
                e.errore("DOMANDE.domande", f"{nome} domande[{i}]", "ogni domanda è una mappa")
                continue
            qid = d.get("id")
            # The error location names the question by its id, or by its position when it has none.
            dove = f"{nome} {qid if isinstance(qid, str) and qid else f'domande[{i}]'}"
            _domanda(c, e, dove, d, viste)


def _domanda(c: Campagna, e: Esito, dove: str, d: dict, viste: set[str]) -> None:
    for k in sorted(set(d) - CHIAVI_DOMANDA):
        e.errore("DOMANDE.domande", dove, f"chiave sconosciuta {k!r} (ammesse: {sorted(CHIAVI_DOMANDA)})")
    _id(e, dove, d, viste)
    if not (isinstance(d.get("domanda"), str) and d["domanda"].strip()):
        e.errore("DOMANDE.domanda", dove, "domanda è un testo non vuoto (le parole del Game Master)")
    _quando(c, e, dove, d)
    for campo in ("temi", "ids", "prove"):
        if campo in d and not _testi_non_vuoti(d[campo]):
            e.errore(f"DOMANDE.{campo}", dove, f"{campo} è una lista di testi non vuota")
    if "turni" in d and not _intero(d["turni"], 1, 10**9):
        e.errore("DOMANDE.turni", dove, "turni è un intero >= 1")
    _quando_ids(c, e, dove, d)
    # Exactly one way to answer: the odds of «yes» or an NPC's own check.
    if ("tiro" in d) == ("prova_png" in d):
        e.errore("DOMANDE.tiro", dove, "serve uno tra tiro {dado, almeno} e prova_png {png, prova}, non entrambi e non nessuno")
    elif "tiro" in d:
        _tiro(e, dove, d["tiro"])
    else:
        _prova_png(c, e, dove, d["prova_png"])
    for campo in ("se_si", "se_no"):
        if not (isinstance(d.get(campo), str) and d[campo].strip()):
            e.errore(f"DOMANDE.{campo}", dove, f"{campo} è un testo non vuoto: il narratore deve avere una risposta in entrambi i casi")


def _id(e: Esito, dove: str, d: dict, viste: set[str]) -> None:
    qid = d.get("id")
    if not (isinstance(qid, str) and qid.startswith("d_") and len(qid) > 2):
        e.errore("DOMANDE.id", dove, "id è un testo che inizia con d_ (es. d_guardia_sveglia)")
        return
    if qid in viste:
        e.errore("DOMANDE.id", dove, f"id {qid!r} ripetuto: ogni domanda ha un id unico in tutta la campagna")
        return
    viste.add(qid)


def _quando(c: Campagna, e: Esito, dove: str, d: dict) -> None:
    """The fact that asks the question, and the keys that fact requires (as in avanza_quando)."""
    q = d.get("quando")
    if q == "lascia_scena":
        e.errore("DOMANDE.quando", dove, "lascia_scena non si chiede: una domanda appartiene alla sua scena "
                                         "(cambio_scena vuol dire «all'arrivo in questa scena»)")
        return
    if q not in QUANDO_PORTE:
        e.errore("DOMANDE.quando", dove, f"quando {q!r}: uno tra {sorted(set(QUANDO_PORTE) - {'lascia_scena'})}")
        return
    for k in sorted(QUANDO_PORTE[q] - set(d)):
        e.errore(f"DOMANDE.{k}", dove, f"quando: {q} vuole {k}")


def _quando_ids(c: Campagna, e: Esito, dove: str, d: dict) -> None:
    """A battuta or an indizio must exist: its ids are checked against the campaign's repertoire and clues."""
    q = d.get("quando")
    ids = d.get("ids")
    if not _testi_non_vuoti(ids):
        return
    for x in ids:
        if q == "battuta" and x not in c.per_id:
            e.errore("DOMANDE.ids", dove, f"battuta inesistente {x}")
        if q == "indizio" and x not in c.indizi:
            e.errore("DOMANDE.ids", dove, f"indizio inesistente {x}")


def _tiro(e: Esito, dove: str, t) -> None:
    """The odds of «yes»: a die of 2–100 and the faces that say yes (same check as regole_campagna.controlla_porte)."""
    ok = isinstance(t, dict) and not set(t) - CHIAVI_TIRO and _intero(t.get("dado"), 2, 100) \
        and _intero(t.get("almeno"), 1, t.get("dado")) and isinstance(t.get("visibile", False), bool)
    if not ok:
        e.errore("DOMANDE.tiro", dove, "tiro è {dado: 2–100, almeno: 1–dado, visibile: true|false}")


def _prova_png(c: Campagna, e: Esito, dove: str, p) -> None:
    """An NPC's own check: the NPC must have a sheet, the campaign must roll dice, and the check must be in the set."""
    if not isinstance(p, dict):
        e.errore("DOMANDE.prova_png", dove, "prova_png è {png: …, prova: abilita:…}")
        return
    for k in sorted(set(p) - CHIAVI_PROVA_PNG):
        e.errore("DOMANDE.prova_png", dove, f"chiave sconosciuta {k!r} (ammesse: {sorted(CHIAVI_PROVA_PNG)})")
    png = p.get("png")
    if not isinstance(png, str) or png not in c.png:
        e.errore("DOMANDE.prova_png", dove, f"PNG inesistente {png!r}")
    else:
        dati = c.png[png][1]
        if not dadi_attivi(c) or not isinstance(dati, dict) or "scheda" not in dati:
            e.errore("DOMANDE.prova_png", dove, "una prova del PNG vuole i dadi e la scheda del PNG")
    _prova(c, e, dove, p.get("prova"))
    if "difficolta" in p:
        # The set's own scale when the campaign has a set, the SRD scale otherwise.
        ammesse = _ids_del_set(c, "difficolta") if attivo(c) else set(DIFFICOLTA_SRD)
        if not (isinstance(p["difficolta"], str) and p["difficolta"] in ammesse):
            e.errore("DOMANDE.difficolta", dove, f"difficolta {p['difficolta']!r}: uno tra {sorted(ammesse)}")
    if "visibile" in p and not isinstance(p["visibile"], bool):
        e.errore("DOMANDE.visibile", dove, "visibile è true o false")


def _prova(c: Campagna, e: Esito, dove: str, cosa) -> None:
    """`abilita:<id>`, `caratteristica:<id>` or `salvezza:<id>`, with the id known to the rules in force."""
    tipo, _, id_ = cosa.partition(":") if isinstance(cosa, str) else ("", "", "")
    if tipo not in TIPI_PROVA or not id_:
        e.errore("DOMANDE.prova_png", dove, "prova è abilita:<id>, caratteristica:<id> o salvezza:<id>")
        return
    if attivo(c):
        # A rule set has no saving throws unless it lists them: only its abilities and characteristics count.
        if tipo == "salvezza":
            e.errore("DOMANDE.prova_png", dove, f"prova {cosa!r}: il set di regole della campagna non ha salvezze")
            return
        ammesse = _ids_del_set(c, "abilita" if tipo == "abilita" else "caratteristiche")
        fonte = "del set di regole"
    else:
        ammesse = set(srd.ABILITA if tipo == "abilita" else srd.CARATTERISTICHE)
        fonte = "dell'SRD"
    if id_ not in ammesse:
        e.errore("DOMANDE.prova_png", dove, f"prova {cosa!r}: {id_!r} non è {tipo} {fonte}")
