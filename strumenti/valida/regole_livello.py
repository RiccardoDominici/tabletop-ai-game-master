"""Livello della campagna dalla durata in sessioni (brief.yaml → sessioni; docs/strati.md, fase D1).

La tabella dei livelli sta in strumenti/strati.py, ed è l'unica: qui si legge e basta. Per ora:
  - un brief senza `sessioni` è un avviso (le campagne scritte prima della fase D1 non lo avevano);
  - un valore sbagliato, o un `livello:` forzato senza il motivo in decisioni.altre, è un errore;
  - una one-shot non cambia niente;
  - un livello sopra la one-shot è un errore chiaro: il framework non lo sa ancora preparare né giocare
    (fasi D2–D5), e una campagna a metà che sembra pronta è peggio di un «non ancora».
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

from .carica import Campagna
from .esito import Esito

_STRUMENTI = Path(__file__).resolve().parent.parent       # strumenti/, dove sta strati.py
if str(_STRUMENTI) not in sys.path:
    sys.path.append(str(_STRUMENTI))

import strati  # noqa: E402

log = logging.getLogger(__name__)


def controlla(c: Campagna, e: Esito) -> None:
    if c.brief is None:
        e.avviso("LIVELLO.sessioni", "brief.yaml", "manca il brief: si assume una one-shot (sessioni: 1)")
        return
    s = strati.livello_del_brief(c.brief)
    for regola, msg in s.problemi:
        if regola == "sessioni":
            e.avviso("LIVELLO.sessioni", "brief.yaml", f"{msg}: per ora si assume una one-shot")
        else:
            e.errore(f"LIVELLO.{regola}", "brief.yaml", msg)
    lv = s.livello
    if lv is None:
        return
    log.info("%s: livello %s (%s sessioni%s)", c.cartella.name, lv.nome, s.sessioni, ", forzato" if s.forzato else "")
    if not lv.supportato:
        e.errore("LIVELLO.non_supportato", "brief.yaml",
                 f"livello «{lv.nome}» ({s.sessioni} sessioni{', forzato' if s.forzato else ''}): il framework non lo sa "
                 f"ancora preparare né giocare (fase {lv.fase} di docs/strati.md). Oggi si gioca solo la one-shot: "
                 "sessioni: 1. Gli strati che servirebbero: python3 strumenti/strati.py --tabella")
