"""Combat section of a rule set: the `combattimento:` block of regole.yaml (docs/combattimento.md §2, schema in
docs/regole.md §2). Checks marked [V] in the spec are errors; everything else is left to the defaults.

The closed lists below mirror apps/server/src/regole/combattimento.ts. If the Engine adds an effect, add it
here too: the test `test_effetti_come_il_motore` fails when they diverge.
"""

from __future__ import annotations

import re

from .esito import Esito

EFFETTI = (
    "svantaggio_attacchi", "vantaggio_attacchi", "svantaggio_prove", "svantaggio_salvezze",
    "attacchi_contro_vantaggio", "attacchi_contro_svantaggio", "critico_contro",
    "fallisce_salvezze_forza_destrezza", "perde_turno", "non_si_muove",
)
INIZIATIVE = ("individuale", "per_schieramento", "nessuna")
DADI_INIZIATIVA = (4, 6, 8, 10, 12, 20)
FASI_PNG = ("attacco", "attacco_distanza", "attacco_mischia", None)
MODELLI_DANNO = ("pf", "ferite", "stress")
A_ZERO_PG = ("tiri_morte", "fuori_gioco", "morte")
A_ZERO_PNG = ("morte", "fuori_gioco")
RE_SNAKE = re.compile(r"^[a-z0-9_]+$")


def _ogg(v) -> dict | None:
    return v if isinstance(v, dict) else None


def _intero(v) -> bool:
    return isinstance(v, int) and not isinstance(v, bool)


def _err(e: Esito, dove: str, msg: str) -> None:
    e.errore("REGOLE.combattimento", dove, msg)


def _iniziativa(ini: dict, car: set[str], e: Esito, dove: str) -> None:
    if ini.get("tipo") is not None and ini["tipo"] not in INIZIATIVE:
        _err(e, dove, f"iniziativa.tipo «{ini['tipo']}»: individuale, per_schieramento o nessuna")
    if ini.get("dado") is not None and ini["dado"] not in DADI_INIZIATIVA:
        _err(e, dove, f"iniziativa.dado {ini['dado']}: 4, 6, 8, 10, 12 o 20")
    car_ini = ini.get("caratteristica")
    if car_ini is not None and car_ini not in car:
        _err(e, dove, f"iniziativa.caratteristica «{car_ini}» non è del set")
    if ini.get("ogni_round") is not None and not isinstance(ini["ogni_round"], bool):
        _err(e, dove, "iniziativa.ogni_round: true o false")


def _fasi(fasi, e: Esito, dove: str) -> None:
    if not isinstance(fasi, list) or not fasi:
        _err(e, dove, "fasi: almeno una fase")
        return
    viste: set[str] = set()
    for i, x in enumerate(fasi, start=1):
        o = _ogg(x) or {}
        fid = o.get("id")
        if not isinstance(fid, str) or not RE_SNAKE.match(fid):
            _err(e, dove, f"fasi[{i}]: serve un id snake_case")
            continue
        if fid in viste:
            _err(e, dove, f"fasi: id ripetuto «{fid}»")
        viste.add(fid)
        if o.get("png") not in FASI_PNG:
            _err(e, dove, f"fasi.{fid}.png «{o.get('png')}»: attacco, attacco_distanza, attacco_mischia o vuoto")


def _danni(d: dict, e: Esito, dove: str) -> None:
    if d.get("modello") is not None and d["modello"] not in MODELLI_DANNO:
        _err(e, dove, f"danni.modello «{d['modello']}»: pf, ferite o stress")
    az = _ogg(d.get("a_zero")) or {}
    if az.get("pg") is not None and az["pg"] not in A_ZERO_PG:
        _err(e, dove, f"danni.a_zero.pg «{az['pg']}»: tiri_morte, fuori_gioco o morte")
    if az.get("png") is not None and az["png"] not in A_ZERO_PNG:
        _err(e, dove, f"danni.a_zero.png «{az['png']}»: morte o fuori_gioco")
    tm = d.get("tiri_morte")
    if tm is not None:
        valori = [_ogg(tm).get(k) if _ogg(tm) else None for k in ("cd", "successi", "fallimenti")]
        if not all(_intero(v) and v > 0 for v in valori):
            _err(e, dove, "danni.tiri_morte: cd, successi e fallimenti sono numeri interi positivi")
        # Le regole dell'SRD sul 20 e sull'1 naturali: del set (assenti = SRD).
        for k in ("venti_rialza", "uno_doppio"):
            if _ogg(tm) and k in _ogg(tm) and not isinstance(_ogg(tm)[k], bool):
                _err(e, dove, f"danni.tiri_morte.{k}: true o false")


def _condizioni(cond, e: Esito, dove: str) -> set[str]:
    """Le condizioni: id unici, effetti solo dall'elenco chiuso. Ritorna gli id."""
    if cond is None:
        return set()
    if not isinstance(cond, list):
        _err(e, dove, "condizioni: un elenco")
        return set()
    ids: set[str] = set()
    for i, x in enumerate(cond, start=1):
        o = _ogg(x) or {}
        cid = o.get("id")
        if not isinstance(cid, str) or not RE_SNAKE.match(cid):
            _err(e, dove, f"condizioni[{i}]: serve un id snake_case")
            continue
        if cid in ids:
            _err(e, dove, f"condizioni: id ripetuto «{cid}»")
        ids.add(cid)
        for eff in o.get("effetti") or []:
            if eff not in EFFETTI:
                _err(e, dove, f"condizioni.{cid}: effetto «{eff}» non ammesso (elenco chiuso: {', '.join(EFFETTI)})")
    return ids


def controlla(r: dict, car: set[str], e: Esito, dove: str = "regole/regole.yaml") -> None:
    """La sezione combattimento: di un set non SRD. Senza la sezione non c'è nulla da controllare (default)."""
    if "combattimento" not in r or r["combattimento"] is None:
        return
    c = _ogg(r["combattimento"])
    if c is None:
        _err(e, dove, "combattimento: una mappa (vedi docs/regole.md §2)")
        return
    if c.get("iniziativa") is not None:
        ini = _ogg(c["iniziativa"])
        if ini is None:
            _err(e, dove, "iniziativa: una mappa")
        else:
            _iniziativa(ini, car, e, dove)
    if "fasi" in c:
        _fasi(c["fasi"], e, dove)
    if c.get("danni") is not None:
        d = _ogg(c["danni"])
        if d is None:
            _err(e, dove, "danni: una mappa")
        else:
            _danni(d, e, dove)
    ids = _condizioni(c.get("condizioni"), e, dove)
    cz = c.get("condizione_a_zero")
    if cz is not None and cz not in ids:
        _err(e, dove, f"condizione_a_zero «{cz}» non è tra le condizioni")
    fine = c.get("fine")
    if fine is not None and (_ogg(fine) is None or ("morale" in fine and not isinstance(fine["morale"], bool))):
        _err(e, dove, "fine.morale: true o false")
