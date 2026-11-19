"""A character who acts in the lines needs an NPC sheet (docs/repertorio.md, «Facts a line carries»).

The Engine tracks presence and state only for the characters that have a sheet: `attori`, `menzionati`,
`richiede.stati`, `chi` and the `[png_x]` labels already must name one (REPERTORIO.fatti, REPERTORIO.chi). What no tag
can catch is a character the campaign declares but never gave a sheet, who then acts in the narrator's prose. In the
final round of 18 November 2026 (docs/coerenza.md) torre-mozza's boy stood up, carried a pick to the goblin and
confessed in narrator rows, with no sheet: the Engine could not know whether he was there, and his confession was
heard as the answer to a question put to a dead goblin.

The data that declare a character (never a word list of this module): the keys of an NPC's `relazioni` and the
entries of `segreto.chi_altro_sa` that are neither a sheet's id, name, first name or alias, nor a PC. The forms that
name one in a line:
- the name and its first word, in the line's id (split on «_»), `temi`, `quando` and narrator rows; after a genitive
  preposition or with the possessive ending («il giaciglio di Tonio», «Tecla's house») it is a mention and does not
  count (lingue/<code>/motore.yaml, `sceneggiatore.genitivo` and `possessivo`);
- the head noun of each `relazioni` description with its article («il ragazzo del pane» → «il ragazzo»; the articles
  are the language pack's, lingue/<code>/motore.yaml `nomi.articoli`), in `quando` and narrator rows. A form with a
  preposition in front («gli stivali del ragazzo») is a mention and does not count; a noun of three letters or less
  («il più piccolo») is not a noun.
Only narrator material is read: an NPC's own rows that speak of the character are mentions. One entry per character,
with the first lines found. A warning, in strict mode too for now: when the check was added, three example campaigns
(nozze-neve, ponte-lanterne, prova-f0) still had such characters, and an error would fail their strict validation
before they get their sheets. The Preparer treats it as an error for a new campaign (its skill says so).
"""

from __future__ import annotations

import re

from .carica import Campagna
from .esito import Esito
from .lingua import articoli, genitivo

MAX_ESEMPI = 3


def _noti(c: Campagna) -> set[str]:
    """How the sheets and the PCs are named (lowercase): id, name, first name, alias."""
    out: set[str] = set(c.pg_ids) | {"narratore", str(c.voce_narratore or "").lower()}
    for pid, (_, d) in c.png.items():
        nome = str(d.get("nome") or "").strip()
        out |= {pid.lower(), nome.lower(), (nome.split()[0] if nome else "").lower()}
        out |= {str(a).lower() for a in (d.get("alias") or []) if isinstance(a, str)}
    return {x for x in out if x}


def _senza_scheda(c: Campagna) -> dict[str, dict]:
    """The declared characters with no sheet: name → {da: sheets that name it, descrizioni: relazioni texts}."""
    noti = _noti(c)
    out: dict[str, dict] = {}

    def aggiungi(nome: object, pid: str, descrizione: object = None) -> None:
        if not isinstance(nome, str) or not nome.strip() or nome.strip().lower() in noti:
            return
        voce = out.setdefault(nome.strip(), {"da": [], "descrizioni": []})
        if pid not in voce["da"]:
            voce["da"].append(pid)
        if isinstance(descrizione, str) and descrizione.strip():
            voce["descrizioni"].append(descrizione.strip())

    for pid, (_, d) in c.png.items():
        rel = d.get("relazioni")
        if isinstance(rel, dict):
            for k, v in rel.items():
                aggiungi(k, pid, v)
        seg = d.get("segreto")
        if isinstance(seg, dict) and isinstance(seg.get("chi_altro_sa"), list):
            for k in seg["chi_altro_sa"]:
                aggiungi(k, pid)
    return out


def _forme(nome: str, descrizioni: list[str], art: frozenset[str]) -> tuple[set[str], set[str]]:
    """(name forms, description forms) in lowercase. A description form is «<article> <noun>» from its first words."""
    nomi = {nome.lower(), nome.split()[0].lower()}
    descr: set[str] = set()
    for t in descrizioni:
        parole = re.findall(r"[\w]+'?|'", t.lower())
        if len(parole) >= 2 and parole[0].rstrip("'") in art and len(parole[1]) > 3:
            sep = "" if parole[0].endswith("'") else " "
            descr.add(f"{parole[0]}{sep}{parole[1]}")
    return {n for n in nomi if len(n) > 2}, descr


def _cerca(testo: str, forme: set[str], gen: tuple[frozenset[str], str] = (frozenset(), "")) -> str | None:
    """The first form the text has as a word; with `gen`, an occurrence after a genitive preposition or before the
    possessive ending is skipped."""
    t = testo.lower()
    prep, poss = gen
    for f in sorted(forme):
        for m in re.finditer(rf"(?<![\w']){re.escape(f)}(?![\w])", t):
            prima = re.findall(r"[\w']+", t[: m.start()])
            if prima and prima[-1] in prep:
                continue
            if poss and t[m.end():].startswith(poss):
                continue
            return f
    return None


def _righe_narratore(b: dict) -> list[str]:
    versioni = [b.get("testo") or []] + [v for v in (b.get("varianti") or []) if isinstance(v, list)]
    return [str(r) for v in versioni for r in v if str(r).startswith("[narratore]")]


def _prova(b: dict, nomi: set[str], descr: set[str], gen: tuple[frozenset[str], str]) -> str | None:
    """Where the line names the character, as a short quote for the message; None if it does not."""
    if b.get("chi") == "narratore":
        # A narrator line is about whoever its id, `temi` or `quando` name; an NPC's line only by its narrator rows.
        bid = str(b.get("id") or "")
        if set(bid.lower().split("_")) & nomi:
            return f"id {bid}"
        temi = {str(x).lower() for x in (b.get("temi") or [])}
        if temi & nomi:
            return f"temi {sorted(temi & nomi)}"
        quando = str(b.get("quando") or "")
        if _cerca(quando, nomi, gen) or _cerca(quando, descr):
            return f"quando «{quando}»"
    for r in _righe_narratore(b):
        if _cerca(r, nomi, gen) or _cerca(r, descr):
            return f"«{r[len('[narratore] '):][:70]}»"
    return None


def controlla(c: Campagna, e: Esito) -> None:
    art, gen = articoli(c.lingua or "it"), genitivo(c.lingua or "it")
    for nome, voce in sorted(_senza_scheda(c).items()):
        nomi, descr = _forme(nome, voce["descrizioni"], art)
        esempi = [f"{b.get('id', '?')} ({p})" for b in c.battute if (p := _prova(b, nomi, descr, gen))]
        if not esempi:
            continue
        e.avviso("PNG.senza_scheda", ", ".join(voce["da"]),
                 f"«{nome}» non ha una scheda PNG ma agisce nelle righe del narratore: {'; '.join(esempi[:MAX_ESEMPI])}"
                 f"{' e altre ' + str(len(esempi) - MAX_ESEMPI) if len(esempi) > MAX_ESEMPI else ''}. Il Motore non ne "
                 "conosce presenza e stato: scrivigli una scheda minima (png/, con `nascosto: true` se non si vede "
                 "subito), mettilo nei `png_presenti` delle scene dove sta, e segna le battute con «attori» o «menzionati»")
