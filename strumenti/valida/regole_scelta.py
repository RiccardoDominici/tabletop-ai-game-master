"""La scelta che costa (passo 1 della skill; manuale R10, A4): brief.yaml → decisioni.strade.

Ogni strada della scelta finale ha un prezzo che pesa su qualcuno. Nella prova di nozze-neve (nota 17) il
prezzo della terza via, «Adelina perde la voce, che passa a Zelia», passava tutti i controlli del passo 1, ma
era proprio ciò che Zelia voleva: un premio travestito da prezzo. Il revisore l'ha visto subito; qui lo si
cerca in modo meccanico, con un'euristica dichiarata: il prezzo che somiglia al `desiderio` di un PNG (due
radici di parola in comune) è un premio per lui. È un avviso, e in rigoroso un errore solo quando quel PNG è
proprio uno di quelli su cui il prezzo dovrebbe pesare.

    decisioni:
      strade:
        - {strada: "La verità a tutti", prezzo: "Ottavia perde l'osteria", pesa_su: [png_ottavia]}
"""

from __future__ import annotations

import re

from .carica import Campagna
from .esito import Esito

_STOP = {"della", "delle", "dello", "degli", "nella", "nelle", "sulla", "sulle", "quando", "perché", "quello",
         "quella", "questo", "questa", "sono", "dopo", "prima", "anche", "ancora", "tutti", "tutte", "altro",
         "altra", "mentre", "senza", "verso", "sempre", "fuori", "dentro", "essere", "avere", "fare"}


def radici(testo: str) -> set[str]:
    return {w[:5] for w in re.findall(r"[a-zàèéìòù]+", str(testo).lower()) if len(w) >= 5 and w not in _STOP}


def controlla(c: Campagna, e: Esito) -> None:
    if c.brief is None:
        return
    decisioni = c.brief.get("decisioni") if isinstance(c.brief.get("decisioni"), dict) else {}
    strade = decisioni.get("strade")
    if strade is None:
        e.avviso("SCELTA.strade", "brief.yaml", "decisioni.strade: le strade della scelta finale, ognuna col prezzo e su chi "
                                                "pesa (passo 1); senza, nessuno controlla che il prezzo non sia un premio")
        return
    strade = [s for s in strade if isinstance(s, dict)] if isinstance(strade, list) else []
    if len(strade) < 2:
        e.errore("SCELTA.forma", "brief.yaml", f"{len(strade)} strade: una scelta ne ha almeno due, ognuna con il suo prezzo")
    desideri = {pid: radici(d.get("desiderio") or "") for pid, (_, d) in c.png.items()}
    for k, s in enumerate(strade, 1):
        dove = f"brief.yaml strada {k} «{str(s.get('strada', '?'))[:40]}»"
        for campo in ("strada", "prezzo", "pesa_su"):
            if not s.get(campo):
                e.errore("SCELTA.forma", dove, f"manca {campo}")
        pesa = set(s.get("pesa_su") or []) if isinstance(s.get("pesa_su"), list) else set()
        for pid in sorted(x for x in pesa if str(x).startswith(("png_", "pg_")) and x not in c.png and x not in c.pg_ids):
            e.errore("SCELTA.forma", dove, f"pesa_su cita {pid}, che non esiste")
        prezzo = radici(s.get("prezzo") or "")
        for pid, des in sorted(desideri.items()):
            comuni = prezzo & des
            if len(comuni) < 2:
                continue
            if pid in pesa:
                e.avviso("SCELTA.premio", dove, f"il prezzo pesa su {pid}, ma somiglia al suo desiderio ({sorted(comuni)}): "
                                                "per lui è un premio, non un prezzo", rigoroso=True)
            else:
                e.avviso("SCELTA.premio", dove, f"il prezzo somiglia al desiderio di {pid} ({sorted(comuni)}): se qualcuno lo "
                                                "vorrebbe, è un premio travestito")
