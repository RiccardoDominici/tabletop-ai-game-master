"""The facts a line carries (docs/repertorio.md, «Facts a line carries»): `attori`, `menzionati`, `richiede.stati` and
`richiede.esito` (the outcome a line tells: colpito, mancato, a_terra, fugge, with chi and bersaglio).

The Engine checks them against the coherence ledger before a line enters the catalogue (apps/server/src/repertorio/
fatti-battuta.ts), so the small local reader, which only relays, never sees a line that contradicts what is true now.
Here: their form (NPC ids with a sheet, the four state classes; `stati` in an alternative of `oppure` is the schema's
REPERTORIO.oppure) as errors,
and, as warnings that strict mode turns into errors:
- an NPC a narrator row names that no tag covers: the Engine then only asks it to be in play, not in the scene, so a
  line where it acts while it is away would still be offered. The Preparer tags every such NPC;
- a line that tells an attack's outcome with no `richiede.esito`, in a scene where a fight can happen (minions, or a
  present NPC with an attack), and that can come out in a fight (not a filler, stall line, closing or example). The
  words are the server's for the scriptwriter (sceneggiatore/valida.ts, `esitoDiAttacco`): only a launch verb alone
  stays a warning, because «parte», «vola» are ordinary prose too.
"""

from __future__ import annotations

import re

from .carica import Campagna
from .esito import Esito
from .lingua import parole_attacco, parole_frase

CLASSI_STATO = ("in_gioco", "a_terra", "morto", "fuggito", "ferito")   # ferito: in play and hurt
TUTTI = "tutti"   # richiede.stati: every PC (apps/server/src/repertorio/fatti-battuta.ts)
TIPI_ESITO = ("colpito", "mancato", "ferito", "a_terra", "fugge", "nessuno")


def _ids(v) -> list | None:
    """A list of strings, or None when it is not one."""
    return list(v) if isinstance(v, list) and all(isinstance(x, str) for x in v) else None


def _nomi_png(c: Campagna) -> dict[str, set[str]]:
    """How a row may name each NPC: its name, its first name, its `alias` (lowercase, three letters at least)."""
    out: dict[str, set[str]] = {}
    for pid, (_, d) in c.png.items():
        nome = str(d.get("nome") or "")
        parole = {nome, nome.split()[0] if nome else "", *[str(a) for a in (d.get("alias") or [])]}
        out[pid] = {p.lower() for p in parole if len(p) > 2}
    return out


def _nomina(riga: str, parole: set[str]) -> bool:
    t = riga.lower()
    return any(re.search(rf"(?<![\w]){re.escape(p)}(?![\w])", t) for p in parole)


def _posizione(w: list[str], voce: list[str]) -> int:
    """Where the entry (stems: a word counts if it starts like this) appears in the words; -1 if not (as the server)."""
    for i in range(len(w) - len(voce) + 1):
        if all(w[i + k].startswith(v) for k, v in enumerate(voce)):
            return i
    return -1


def esito_di_attacco(testo: str, codice: str) -> tuple[str, bool] | None:
    """An attack's outcome told in the text, as the server reads it (sceneggiatore/valida.ts, `esitoDiAttacco`): a
    sentence with a weapon or a spell and a hit, miss or launch word, or a «no» right before the weapon. Returns the
    words found and whether the match is strong (a hit or miss word, or the «no»): a launch verb alone («parte»,
    «vola») is also an ordinary word of prose («dalla parte dei Morlacchi»), so it only earns a warning."""
    p = parole_attacco(codice)
    debole: str | None = None
    for frase in re.split(r"[.!?;:…]+", testo):
        w = parole_frase(frase)
        for arma in p["armi"]:
            i = _posizione(w, arma)
            if i < 0:
                continue
            if (i > 0 and w[i - 1] in p["nessun"]) or (i > 1 and w[i - 2] in p["nessun"]):
                return " ".join(w[max(0, i - 2):i + len(arma)]), True
            colpo = next((v for v in p["colpo"] if _posizione(w, v) >= 0), None)
            if colpo:
                return f"{' '.join(w[i:i + len(arma)])} … {' '.join(colpo)}", True
            lancio = next((v for v in p["lancio"] if _posizione(w, v) >= 0), None)
            if lancio and debole is None:
                debole = f"{' '.join(w[i:i + len(arma)])} … {' '.join(lancio)}"
    return (debole, False) if debole else None


def _scene_di_scontro(c: Campagna) -> set[str]:
    """The scenes where a fight can happen: minions on the sheet, or a present NPC with an attack on its sheet."""
    out = set()
    for _, s in c.scene:
        armati = any(pid in c.png and ((c.png[pid][1].get("scheda") or {}).get("attacchi")) for pid in (s.get("png_presenti") or []))
        if isinstance(s.get("id"), str) and (s.get("gregari") or armati):
            out.add(s["id"])
    return out


def _fuori_dallo_scontro(b: dict) -> bool:
    """A line the Engine never offers during a fight: voice examples, fillers and stall lines (a stall is a window with
    no actions outside a fight), closings of the evening."""
    return bool(b.get("solo_esempio") or b.get("riempitivo") or "stallo" in b or b.get("tipo") == "chiusura")


def _scene(b: dict) -> set[str] | None:
    """The scenes of a line (None = every scene)."""
    s = b.get("scena")
    if s is None:
        return None
    return {s} if isinstance(s, str) else {x for x in s if isinstance(x, str)}


def controlla(c: Campagna, e: Esito) -> None:
    nomi = _nomi_png(c)
    codice = c.lingua or "it"
    scontro = _scene_di_scontro(c)
    for b in c.battute:
        dove = f"{b.get('_file', '?')} {b.get('id', '?')}"
        coperti: set[str] = set()
        for campo in ("attori", "menzionati"):
            if campo not in b:
                continue
            ids = _ids(b[campo])
            if ids is None:
                e.errore("REPERTORIO.fatti", dove, f"{campo}: una lista di id di PNG")
                continue
            for pid in ids:
                if pid not in c.png:
                    e.errore("REPERTORIO.fatti", dove, f"{campo}: {pid} non è un PNG con scheda")
            coperti |= set(ids)
        doppi = set(_ids(b.get("attori")) or []) & set(_ids(b.get("menzionati")) or [])
        if doppi:
            e.errore("REPERTORIO.fatti", dove, f"{sorted(doppi)} sia in attori sia in menzionati: o agisce o se ne parla")
        richiede = b.get("richiede") or {}
        stati = richiede.get("stati")
        if stati is not None:
            if not isinstance(stati, dict):
                e.errore("REPERTORIO.fatti", dove, "richiede.stati: un blocco {id_png: stato o [stati]}")
            else:
                for pid, v in stati.items():
                    classi = [v] if isinstance(v, str) else v
                    # `tutti`: every PC (as in the attitudes): a prepared line cannot name them.
                    if pid not in c.png and pid not in c.pg_ids and pid != TUTTI:
                        e.errore("REPERTORIO.fatti", dove, f"richiede.stati: {pid} non è un PNG con scheda, né un PG, né «{TUTTI}»")
                    if not isinstance(classi, list) or not classi or any(x not in CLASSI_STATO for x in classi):
                        e.errore("REPERTORIO.fatti", dove, f"richiede.stati.{pid}: uno o più di {', '.join(CLASSI_STATO)}")
                    coperti.add(pid)
        esito = richiede.get("esito")
        if esito is not None:
            e_d = {"tipo": esito} if isinstance(esito, str) else esito
            if not isinstance(e_d, dict) or e_d.get("tipo") not in TIPI_ESITO or set(e_d) - {"tipo", "chi", "bersaglio"}:
                e.errore("REPERTORIO.fatti", dove, f"richiede.esito: {{tipo: {' | '.join(TIPI_ESITO)}, chi?, bersaglio?}}")
            else:
                for k in ("chi", "bersaglio"):
                    v = e_d.get(k)
                    if v is not None and v not in c.png and v not in c.pg_ids:
                        e.errore("REPERTORIO.fatti", dove, f"richiede.esito.{k}: {v} non è un PNG con scheda né un PG")
                if e_d.get("tipo") == "fugge" and not (e_d.get("chi") or e_d.get("bersaglio")):
                    e.errore("REPERTORIO.fatti", dove, "richiede.esito fugge: chi fugge (chi o bersaglio)")
        # Who speaks is covered by its own label; a narrator row that names someone else needs a tag.
        parlanti = {b.get("chi")} | {m.group(1) for r in (b.get("testo") or []) if (m := re.match(r"^\[([a-z0-9_]+)\]", str(r)))}
        versioni = [b.get("testo") or []] + [v for v in (b.get("varianti") or []) if isinstance(v, list)]
        scoperti = sorted(
            pid for pid, parole in nomi.items()
            if pid not in coperti and pid not in parlanti
            and any(str(r).startswith("[narratore]") and _nomina(str(r), parole) for v in versioni for r in v)
        )
        if scoperti:
            # Strict: the Engine checks presence only for a tagged NPC (repertorio/fatti-battuta.ts); untagged, a line
            # where the NPC acts would still be offered while it is away.
            e.avviso("REPERTORIO.png_non_segnato", dove,
                     f"una riga del narratore nomina {', '.join(scoperti)} senza segno: in «attori» se agisce o è lì, in "
                     "«menzionati» se se ne parla soltanto, in «richiede.stati» se la battuta ne dà per vero lo stato",
                     rigoroso=True)
        # A line that tells an attack's outcome says which (richiede.esito), as the scriptwriter's lines must in a fight
        # (sceneggiatore/valida.ts): without it the Engine could offer «the dart misses» in the turn the dart hit (final
        # round, attempt 5, PR T15). Required (strict) where a fight can happen and the line can come out in it.
        if esito is None and not _fuori_dallo_scontro(b):
            sc = _scene(b)
            in_scontro = bool(scontro if sc is None else (sc & scontro))
            for v in versioni:
                trovato = next((t for r in v if (t := esito_di_attacco(re.sub(r"^\[[^\]]*\]\s*", "", str(r)), codice))), None)
                if trovato and in_scontro:
                    parole, forte = trovato
                    e.avviso("REPERTORIO.esito_mancante", dove,
                             f"la battuta racconta l'esito di un attacco («{parole}») senza richiede.esito, in una scena dove si "
                             "può combattere: il Motore la offrirebbe anche quando la carta dice il contrario. Scrivi "
                             "richiede.esito (colpito, mancato, ferito, a_terra, fugge; nessuno se non racconta un esito), o "
                             "togli l'esito" + ("" if forte else " (solo un verbo di lancio: se qui è un'altra parola, ignora)"),
                             rigoroso=forte)
                    break
