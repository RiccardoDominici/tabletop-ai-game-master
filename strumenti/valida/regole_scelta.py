"""La scelta che costa (passo 1 della skill; manuale R10, A4): brief.yaml → decisioni.strade.

Ogni strada della scelta finale ha un prezzo che pesa su qualcuno. Nella prova di nozze-neve (nota 17) il
prezzo della terza via, «Adelina perde la voce, che passa a Zelia», passava tutti i controlli del passo 1, ma
era proprio ciò che Zelia voleva: un premio travestito da prezzo. Il revisore l'ha visto subito; qui lo si
cerca in modo meccanico, con un'euristica dichiarata: il prezzo che somiglia al `desiderio` di un PNG (due
radici di parola in comune) è un premio per lui. È un avviso, e in rigoroso un errore solo quando quel PNG è
proprio uno di quelli su cui il prezzo dovrebbe pesare.

Two readings from the blind test A12 (mulino-notte, NOTE_SULLA_SKILL.md W5):
- The bearer's loss is not a likeness. «Ermete perde il mulino» shares «mulin» with Ermete's desire «Tenere il
  mulino», but says its opposite. A root shared with the bearer's desire counts only when its clause (split on
  punctuation) has no word of loss or negation (`perdita` in lingue/<code>/prosa.yaml).
- The villain's win is a price. A price that resembles the desire of the villain (`preparazione.cattivo.png`, or the
  sheet whose name the villain's `nome` begins with) is the PCs' loss, not a reward in disguise: no warning for him.

    decisioni:
      strade:
        - {strada: "La verità a tutti", prezzo: "Ottavia perde l'osteria", pesa_su: [png_ottavia]}
"""

from __future__ import annotations

import re

from .carica import Campagna
from .esito import Esito

_STOP = {"della", "delle", "dello", "degli", "nella", "nelle", "sulla", "sulle",
         # articulated prepositions (the Italian «dalla/dal» cases of L6); short ones never make a root anyway
         "dalla", "dal", "dallo", "dagli", "dalle", "del", "dei", "nel", "allo", "alla",
         "quando", "perché", "quello",
         "quella", "questo", "questa", "sono", "dopo", "prima", "anche", "ancora", "tutti", "tutte", "altro",
         "altra", "mentre", "senza", "verso", "sempre", "fuori", "dentro", "essere", "avere", "fare"}


def radici(testo: str) -> set[str]:
    return {w[:5] for w in re.findall(r"[a-zàèéìòù]+", str(testo).lower()) if len(w) >= 5 and w not in _STOP}


def _negata(parola: str, perdita: tuple[str, ...]) -> bool:
    """A word of loss or negation (an entry is a whole word, a word beginning, or a phrase)."""
    return any(parola == p or (len(p) > 3 and parola.startswith(p)) for p in perdita if " " not in p)


def radici_affermate(testo: str, perdita: tuple[str, ...]) -> set[str]:
    """The roots of the clauses that say no loss and no negation: the ones that can make a likeness for the bearer."""
    out: set[str] = set()
    for frase in re.split(r"[,.;:!?…]+", str(testo).lower()):
        parole = re.findall(r"[a-zàèéìòù']+", frase)
        if any(_negata(p, perdita) for p in parole) or any(" " in p and p in frase for p in perdita):
            continue
        out |= radici(frase)
    return out


def cattivo(c: Campagna) -> str | None:
    """The villain's sheet: `preparazione.cattivo.png`, or the sheet whose name the villain's `nome` begins with."""
    prep = c.campagna.get("preparazione") if isinstance(c.campagna, dict) else None
    catt = (prep or {}).get("cattivo") if isinstance(prep, dict) else None
    if not isinstance(catt, dict):
        return None
    if isinstance(catt.get("png"), str):
        return catt["png"]
    nome = str(catt.get("nome") or "").lower()
    for pid, (_, d) in c.png.items():
        n = str(d.get("nome") or "").strip().lower()
        if n and (nome.startswith(n) or (n.split()[0] and nome.split()[:1] == n.split()[:1])):
            return pid
    return None


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
    perdita = c.prosa.perdita
    villain = cattivo(c)
    for k, s in enumerate(strade, 1):
        dove = f"brief.yaml strada {k} «{str(s.get('strada', '?'))[:40]}»"
        for campo in ("strada", "prezzo", "pesa_su"):
            if not s.get(campo):
                e.errore("SCELTA.forma", dove, f"manca {campo}")
        pesa = set(s.get("pesa_su") or []) if isinstance(s.get("pesa_su"), list) else set()
        for pid in sorted(x for x in pesa if str(x).startswith(("png_", "pg_")) and x not in c.png and x not in c.pg_ids):
            e.errore("SCELTA.forma", dove, f"pesa_su cita {pid}, che non esiste")
        prezzo = radici(s.get("prezzo") or "")
        affermato = radici_affermate(s.get("prezzo") or "", perdita)
        for pid, des in sorted(desideri.items()):
            # The bearer: only what the price affirms (its loss is the opposite of a reward). Anyone else: all of it.
            comuni = (affermato if pid in pesa else prezzo) & des
            if len(comuni) < 2:
                continue
            if pid == villain and pid not in pesa:
                continue  # the villain's win is the PCs' price, not a reward in disguise
            if pid in pesa:
                e.avviso("SCELTA.premio", dove, f"il prezzo pesa su {pid}, ma somiglia al suo desiderio ({sorted(comuni)}): "
                                                "per lui è un premio, non un prezzo", rigoroso=True)
            else:
                e.avviso("SCELTA.premio", dove, f"il prezzo somiglia al desiderio di {pid} ({sorted(comuni)}): se qualcuno lo "
                                                "vorrebbe, è un premio travestito")
