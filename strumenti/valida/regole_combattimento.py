"""Combat section of a rule set: the `combattimento:` block of regole.yaml (docs/combattimento.md §2, schema in
docs/regole.md §2). Checks marked [V] in the spec are errors; everything else is left to the defaults.

The closed lists below mirror apps/server/src/regole/combattimento.ts. If the Engine adds an effect, add it
here too: the test `test_effetti_come_il_motore` fails when they diverge.
"""

from __future__ import annotations

import re

from .esito import Esito
from .regole_effetti import formula_valida

EFFETTI = (
    "svantaggio_attacchi", "vantaggio_attacchi", "svantaggio_prove", "svantaggio_salvezze",
    "attacchi_contro_vantaggio", "attacchi_contro_svantaggio", "critico_contro",
    "fallisce_salvezze_forza_destrezza", "perde_turno", "non_si_muove", "fuori_combattimento", "colpito_automaticamente",
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
    # Ties of individual initiative: the fixed order (default) or at the same moment (Basic Fantasy p. 51).
    if ini.get("pari") is not None and ini["pari"] not in ("ordine", "simultanei"):
        _err(e, dove, "iniziativa.pari: ordine o simultanei")
    elif ini.get("pari") == "simultanei" and ini.get("tipo", "individuale") != "individuale":
        e.avviso("REGOLE.combattimento", dove, "iniziativa.pari: simultanei vale solo con l'iniziativa individuale (per schieramento i pari si ritirano)")


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


def _danni(d: dict, e: Esito, dove: str, salvezze: set[str] | None = None) -> None:
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
        for k in ("venti_rialza", "uno_doppio", "perde_incantesimi"):
            if _ogg(tm) and k in _ogg(tm) and not isinstance(_ogg(tm)[k], bool):
                _err(e, dove, f"danni.tiri_morte.{k}: true o false")
        # Basic Fantasy's «Save vs. Death» (p. 188): the PC's own save, a dying window of rounds (prove/morte.ts).
        o = _ogg(tm) or {}
        if "abilita" in o and o["abilita"] not in (salvezze or set()):
            _err(e, dove, f"danni.tiri_morte.abilita «{o['abilita']}»: un tiro salvezza del set (un'abilità con salvezza)")
        if "finestra" in o and not formula_valida(o["finestra"]):
            _err(e, dove, "danni.tiri_morte.finestra: i round come formula (2d10) o un numero")


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
        # The numbers a condition carries (regole/combattimento.ts ValoriCondizione) and the group they do not stack in.
        valori = o.get("valori")
        if valori is not None and not isinstance(valori, dict):
            _err(e, dove, f"condizioni.{cid}.valori: {{attacchi, contro, iniziativa, sorpresa}}")
        for k, v in (valori or {}).items() if isinstance(valori, dict) else []:
            if k not in ("attacchi", "contro", "iniziativa", "sorpresa"):
                _err(e, dove, f"condizioni.{cid}.valori.{k}: attacchi, contro, iniziativa o sorpresa")
            elif not (isinstance(v, int) and not isinstance(v, bool) and v != 0 and abs(v) <= 10 and (k != "sorpresa" or v >= 1)):
                _err(e, dove, f"condizioni.{cid}.valori.{k}: un intero da −10 a 10, non 0 (sorpresa: una faccia da 1)")
        if "gruppo" in o and not (isinstance(o["gruppo"], str) and o["gruppo"].strip()):
            _err(e, dove, f"condizioni.{cid}.gruppo: una parola")
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
            salvezze = {o["id"] for o in r.get("abilita") or [] if isinstance(o, dict) and o.get("salvezza")}
            _danni(d, e, dove, salvezze)
    ids = _condizioni(c.get("condizioni"), e, dove)
    cz = c.get("condizione_a_zero")
    if cz is not None and cz not in ids:
        _err(e, dove, f"condizione_a_zero «{cz}» non è tra le condizioni")
    fine = c.get("fine")
    mo = _ogg(fine).get("morale") if _ogg(fine) else None
    if fine is not None and (_ogg(fine) is None or ("morale" in fine and not isinstance(mo, (bool, dict)))):
        _err(e, dove, "fine.morale: true o false, o {quando, resa}")
    elif isinstance(mo, dict):
        # Morale as the manual times it (regole/combattimento.ts): when, and the condition of a surrender.
        quando = mo.get("quando")
        ammessi = {"prima_opposizione", "primo_caduto", "meta"}
        if quando is not None and not (isinstance(quando, list) and quando and all(q in ammessi for q in quando)):
            _err(e, dove, f"fine.morale.quando: un elenco tra {', '.join(sorted(ammessi))}")
        resa = mo.get("resa")
        ids = {x.get("id") for x in c.get("condizioni") or [] if isinstance(x, dict)}
        if resa is not None and not (isinstance(resa, dict) and resa.get("condizione") in ids):
            _err(e, dove, "fine.morale.resa.condizione: una condizione del set")
        agg = mo.get("aggiustamento")
        if agg is not None and not (isinstance(agg, int) and not isinstance(agg, bool) and 1 <= agg <= 10):
            _err(e, dove, "fine.morale.aggiustamento: l'aggiustamento più grande del master, un intero da 1 (Basic Fantasy: 2)")
    # Subduing damage (Basic Fantasy pp. 55–56): {parole, attacco, danno: meta | normale, a_mani_nude: {danno, parole}, sveglia}.
    nl = c.get("non_letale")
    if nl is not None:
        if not (isinstance(nl, dict) and isinstance(nl.get("parole"), list) and nl["parole"] and all(isinstance(p, str) for p in nl["parole"])):
            _err(e, dove, "non_letale.parole: le parole di un attacco per tramortire («col piatto»)")
        elif not isinstance(nl.get("attacco", 0), int) or isinstance(nl.get("attacco", 0), bool):
            _err(e, dove, "non_letale.attacco: un intero (−4)")
        elif nl.get("danno", "meta") not in ("meta", "normale"):
            _err(e, dove, "non_letale.danno: meta o normale")
        elif "a_mani_nude" in nl and not (isinstance(nl["a_mani_nude"], dict) and formula_valida(nl["a_mani_nude"].get("danno"))):
            _err(e, dove, "non_letale.a_mani_nude: {danno: \"1d3\", parole: [pugno, …]}")
        # Woken by someone after a while (p. 55: 2d10 rounds): {dopo: a duration, parole: [sveglio, scuoto]}.
        sv = nl.get("svegliare") if isinstance(nl, dict) else None
        if sv is not None and not (isinstance(sv, dict) and isinstance(sv.get("parole"), list) and sv["parole"] and all(isinstance(p, str) for p in sv["parole"]) and isinstance(sv.get("dopo", {}), dict)):
            _err(e, dove, "non_letale.svegliare: {dopo: {round: \"2d10\"}, parole: [sveglio, scuoto]}")
    # Missiles that miss into a melee (Basic Fantasy p. 55): {alleati: n ≥ 1}.
    nm = c.get("nella_mischia")
    if nm is not None and not (isinstance(nm, dict) and isinstance(nm.get("alleati"), int) and not isinstance(nm.get("alleati"), bool) and nm["alleati"] >= 1):
        _err(e, dove, "nella_mischia: {alleati: quanti alleati in mischia può colpire un tiro mancato, da 1}")
    # Surprise (B/X, docs/combattimento.md §1): {dado, fino_a, condizione}; the condition is one of the set's.
    so = c.get("sorpresa")
    if so is not None:
        o = _ogg(so)
        if o is None or o.get("dado") not in (4, 6, 8, 10, 12, 20):
            _err(e, dove, "sorpresa.dado: 4, 6, 8, 10, 12 o 20")
        elif not isinstance(o.get("fino_a"), int) or isinstance(o.get("fino_a"), bool) or not 1 <= o["fino_a"] < o["dado"]:
            _err(e, dove, "sorpresa.fino_a: un intero da 1 a dado − 1")
        elif o.get("condizione") not in ids:
            _err(e, dove, f"sorpresa.condizione «{o.get('condizione')}» non è tra le condizioni")
