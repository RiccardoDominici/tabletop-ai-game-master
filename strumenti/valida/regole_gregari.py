"""Minions (docs/prove.md §2, «Minions»): the nameless foes of a scene, with a stat line by creature type.

- campagna.yaml → `gregari`: a list of types {tipo, nome, parole, scheda}. `tipo` is a snake_case id, unique;
  `nome` is how the cards call one; `parole` are the words that name one in a PC's action (absent: a warning, the
  Engine then knows it only by its name); `scheda` is an NPC sheet of the campaign's rule set, checked like one.
- scena.yaml or scene/*.yaml → `gregari`: [{tipo, quanti}], the minions of that scene (quanti 1–20, default 1).
- The Engine reads the same keys in apps/server/src/campagna/gregari.ts; this module checks the sheets before a
  session runs them.

Every code is SCHEDA.gregari, except the heuristic SCHEDA.nemici_senza_statistiche: a scene that names a foe the
campaign has stats for, but brings no minion of that type and no named NPC with the word.
The sheets are checked by the functions the NPC checks use: regole_schede._scheda against the SRD, and
regole_set._schede against the campaign's own rule set (regole/regole.yaml), so no sheet rule is repeated here.
"""

from __future__ import annotations

import copy
import re

from . import regole_schede, regole_set
from .carica import Campagna
from .esito import Esito

RE_TIPO = re.compile(r"^[a-z][a-z0-9_]*$")
CHIAVI_TIPO = {"tipo", "nome", "parole", "scheda"}
CHIAVI_SCENA = {"tipo", "quanti"}
# Campi di una scena che nominano ciò che il giocatore vede: un nemico nominato qui deve avere statistiche.
CAMPI_PUBBLICI_SCENA = ("descrizione", "apertura", "taglio")


def _intero(v, minimo: int, massimo: int) -> bool:
    return isinstance(v, int) and not isinstance(v, bool) and minimo <= v <= massimo


def _norma(testo: str) -> str:
    """Parole minuscole separate da uno spazio, con uno spazio prima e dopo: il confronto per parola intera
    diventa una ricerca di sottostringa («guardia» trova «la guardia.» e non «guardiano»)."""
    return " " + " ".join(re.findall(r"[^\W_]+", testo.lower())) + " "


def _dove_tipo(tipo, i: int) -> str:
    return f"gregari {tipo}" if isinstance(tipo, str) and tipo else f"campagna.yaml gregari[{i}]"


def _tipi(c: Campagna, e: Esito) -> dict[str, dict]:
    """I tipi validi di campagna.yaml, per id. Un tipo ripetuto vale il primo (come nel Motore)."""
    grezzi = c.campagna.get("gregari")
    if grezzi is None:
        return {}
    if not isinstance(grezzi, list):
        e.errore("SCHEDA.gregari", "campagna.yaml", "gregari è un elenco di tipi: {tipo, nome, parole, scheda}")
        return {}
    if grezzi and not regole_schede.dadi_attivi(c):
        e.avviso("SCHEDA.gregari", "campagna.yaml", "i gregari servono solo con i dadi: in questa campagna non tirano nulla")
    tipi: dict[str, dict] = {}
    for i, g in enumerate(grezzi, 1):
        if not isinstance(g, dict):
            e.errore("SCHEDA.gregari", f"campagna.yaml gregari[{i}]", "ogni gregario è una mappa {tipo, nome, parole, scheda}")
            continue
        tipo = g.get("tipo")
        dove = _dove_tipo(tipo, i)
        for k in sorted(set(g) - CHIAVI_TIPO):
            e.errore("SCHEDA.gregari", dove, f"chiave sconosciuta {k!r} (ammesse: {sorted(CHIAVI_TIPO)})")
        valido = _tipo_valido(c, e, dove, g)
        if not valido:
            continue
        if tipo in tipi:
            e.errore("SCHEDA.gregari", dove, f"tipo «{tipo}» ripetuto: ogni tipo ha una sola scheda")
            continue
        tipi[tipo] = g
    return tipi


def _tipo_valido(c: Campagna, e: Esito, dove: str, g: dict) -> bool:
    """Controlla id, nome, parole e scheda di un tipo. Ritorna False se l'id non è valido (il tipo non si può usare)."""
    tipo = g.get("tipo")
    ok = isinstance(tipo, str) and bool(RE_TIPO.match(tipo))
    if not ok:
        e.errore("SCHEDA.gregari", dove, f"tipo {tipo!r}: un id in snake_case (goblin, lupo_notturno)")
    nome = g.get("nome")
    if not (isinstance(nome, str) and nome.strip()):
        e.errore("SCHEDA.gregari", dove, "nome è un testo non vuoto (come lo chiamano le schede e il narratore)")
    if "parole" not in g:
        e.avviso("SCHEDA.gregari", dove, "senza parole il Motore riconosce il gregario solo dal nome")
    else:
        parole = g["parole"]
        if not (isinstance(parole, list) and parole and all(isinstance(p, str) and p.strip() for p in parole)):
            e.errore("SCHEDA.gregari", dove, "parole è un elenco non vuoto di testi non vuoti (le parole che lo nominano)")
    scheda = g.get("scheda")
    if not isinstance(scheda, dict):
        e.errore("SCHEDA.gregari", dove, "manca scheda: una scheda PNG del set della campagna (gs, caratteristiche, CA, PF, attacchi)")
    elif ok:
        _scheda_del_tipo(c, e, dove, str(tipo), scheda)
    return ok


def _scheda_del_tipo(c: Campagna, e: Esito, dove: str, tipo: str, scheda: dict) -> None:
    """The type's sheet, checked as an NPC sheet: by the campaign's rule set when it has one, by the SRD otherwise.
    Findings are collected in a scratch Esito first, then re-coded as SCHEDA.gregari."""
    grezza = Esito(rigoroso=e.rigoroso)
    if regole_set.attivo(c):
        _scheda_del_set(c, grezza, dove, tipo, scheda)
    else:
        regole_schede._scheda(c, grezza, dove, scheda, png=True, pg=None)
    _inoltra(e, grezza, dove)


def _scheda_del_set(c: Campagna, e: Esito, dove: str, tipo: str, scheda: dict) -> None:
    """Il controllo di regole_set per le schede PNG, sul solo gregario: la campagna vista con una sola scheda PNG.
    Gli errori del set (caratteristiche, abilità, attacchi) vengono riportati da regole_set per la campagna stessa;
    qui si leggono con un esito di scarto, solo per costruire car/abi/tabella/soglie."""
    r = c.regole
    scarto = Esito()
    car = {o["id"] for o in regole_set._voci(r.get("caratteristiche"), "caratteristiche", "regole.yaml", scarto, obbligatorio=False)}
    abi = regole_set._abilita(r, car, scarto, "regole.yaml")
    vista = copy.copy(c)
    vista.pg = {"personaggi": []}
    vista.png = {f"gregario {tipo}": (dove, {"scheda": scheda})}
    regole_set._schede(vista, e, car, abi, regole_schede.dadi_attivi(c), regole_set.tabella_modificatori(r), regole_set.soglie_abilita(r))


def _inoltra(e: Esito, grezza: Esito, dove: str) -> None:
    """Riporta gli esiti dei controlli delle schede sotto il codice SCHEDA.gregari, con il codice originale in fondo."""
    for v in grezza.voci:
        testo = f"{v.messaggio} ({v.codice})"
        if v.gravita == "errore":
            e.errore("SCHEDA.gregari", dove, testo)
        else:
            e.avviso("SCHEDA.gregari", dove, testo)


def _gregari_di_scena(e: Esito, nome: str, s: dict, tipi: dict[str, dict]) -> set[str]:
    """Le voci `gregari` della scena: tipo esistente e quanti 1–20. Ritorna i tipi che la scena porta."""
    voci = s.get("gregari")
    if voci is None:
        return set()
    if not isinstance(voci, list):
        e.errore("SCHEDA.gregari", nome, "gregari della scena è un elenco di {tipo, quanti}")
        return set()
    portati: set[str] = set()
    for i, v in enumerate(voci, 1):
        dove = f"{nome} gregari[{i}]"
        if not isinstance(v, dict):
            e.errore("SCHEDA.gregari", dove, "ogni gregario della scena è una mappa {tipo, quanti}")
            continue
        for k in sorted(set(v) - CHIAVI_SCENA):
            e.errore("SCHEDA.gregari", dove, f"chiave sconosciuta {k!r} (ammesse: tipo, quanti)")
        tipo = v.get("tipo")
        if not (isinstance(tipo, str) and tipo in tipi):
            e.errore("SCHEDA.gregari", dove, f"tipo di gregario inesistente: «{tipo}» (campagna.yaml → gregari)")
        else:
            portati.add(tipo)
        if "quanti" in v and not _intero(v["quanti"], 1, 20):
            e.errore("SCHEDA.gregari", dove, f"quanti {v['quanti']!r}: un intero da 1 a 20")
    return portati


def _testi_pubblici(s: dict) -> list[str]:
    """Il testo che il giocatore sente o legge della scena: descrizione, apertura, taglio, vincoli pubblici,
    cosa e azioni degli elementi interattivi."""
    out = [str(s[k]) for k in CAMPI_PUBBLICI_SCENA if isinstance(s.get(k), str)]
    out += [str(v) for v in s.get("vincoli_pubblici") or [] if isinstance(v, str)]
    for el in s.get("elementi_interattivi") or []:
        if isinstance(el, dict):
            out += [str(el.get("cosa") or ""), str(el.get("azioni") or "")]
    return out


def _nomi_png_presenti(c: Campagna, s: dict) -> str:
    """Nomi e id dei PNG della scena, normalizzati: una parola del nome del PNG vale come gregario già scheda."""
    parti: list[str] = []
    for pid in s.get("png_presenti") or []:
        if not isinstance(pid, str):
            continue
        parti.append(pid)
        d = c.png.get(pid)
        if d and isinstance(d[1].get("nome"), str):
            parti.append(d[1]["nome"])
    return _norma(" ".join(parti))


def _nemici_senza_statistiche(c: Campagna, e: Esito, nome: str, s: dict, tipi: dict[str, dict], portati: set[str]) -> None:
    """Un nemico nominato in scena, di un tipo con statistiche, senza gregari di quel tipo né PNG con la parola."""
    testo = _norma(" ".join(_testi_pubblici(s)))
    png = _nomi_png_presenti(c, s)
    for tipo, g in tipi.items():
        if tipo in portati:
            continue
        parole = [p for p in g.get("parole") or [] if isinstance(p, str)] + [str(g.get("nome") or "")]
        for parola in parole:
            pn = _norma(parola)
            if pn.strip() and pn in testo and pn not in png:
                e.avviso("SCHEDA.nemici_senza_statistiche", nome,
                         f"la scena nomina «{parola.strip()}» ma non ha gregari di quel tipo né un PNG con la scheda: "
                         "chi lo attacca non trova statistiche", rigoroso=True)
                break


def controlla(c: Campagna, e: Esito) -> None:
    """Il tipo di gregario di campagna.yaml, le scene che ne portano, e i nemici nominati senza statistiche."""
    tipi = _tipi(c, e)
    for nome, s in c.scene:
        if not isinstance(s, dict):
            continue
        portati = _gregari_di_scena(e, nome, s, tipi)
        if tipi:
            _nemici_senza_statistiche(c, e, nome, s, tipi, portati)
