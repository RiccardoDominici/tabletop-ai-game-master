"""Vincoli pubblici: ciò che chiunque percepisce di un indizio, scritto perché l'improvvisazione non lo
contraddica (giudizio cieco di nozze-neve, esperimenti/giudizio-nozze-neve/conclusioni.md, problema 3).

Nel caotico di nozze-neve il campanaccio della Duchessa «suona forte» quattro volte, e l'indizio essenziale
è proprio che quel campanaccio è muto; la lettera passa sotto la giacca di un altro, la nonna si inventa una
sorella. Il fatto osservabile non era segreto (segreto era il perché), ma nessuno lo aveva detto al narratore,
e la parte pubblica della scena invitava a far suonare i campanacci. Quindi:
  - indizi[].vincolo_pubblico: ogni indizio fisico (tipo oggetto, luogo, evento) dice in una frase che cosa
    percepisce chiunque, senza il perché («il campanaccio grande della Duchessa non suona»), oppure, se anche
    quello è segreto, che lo descrive solo la battuta («la pietra intorno al leone la descrive la battuta»);
  - scena → vincoli_pubblici: [...]: altri fatti percepibili che l'improvvisazione tende a contraddire.
Entrano nel contesto del narratore e del selettore (lo fa il server): nessuna parola segreta, quindi, e la
scena non deve dire il contrario (un'euristica dichiarata: un «non <verbo>» del vincolo contro una frase
pubblica che usa quel verbo sugli stessi nomi, senza «tranne»).
"""

from __future__ import annotations

import re

from .carica import Campagna
from .esito import Esito
from .testo import frasi

FISICI = {"oggetto", "luogo", "evento"}
ECCEZIONI = r"\b(tranne|eccetto|salvo|meno che|tutti meno|tutte meno)\b"
_STOP = {"della", "delle", "dello", "degli", "nella", "nelle", "sulla", "sulle", "quando", "quello", "quella",
         "questo", "questa", "sono", "dopo", "prima", "anche", "ancora", "tutti", "tutte", "sempre", "mentre"}


def _regex_segrete(c: Campagna) -> list[tuple[re.Pattern, str]]:
    out = []
    for v in (c.parole_segrete or {}).get("parole") or []:
        for chiave in ("regex", "regex_en"):
            try:
                if isinstance(v, dict) and v.get(chiave):
                    out.append((re.compile(str(v[chiave])), v.get("parola", v[chiave])))
            except re.error:
                pass  # lo segnala regole_segreti
    return out


def _negazioni(vincolo: str) -> list[tuple[str, set[str]]]:
    """Per ogni «non <verbo>» del vincolo: la radice del verbo e le radici dei nomi della stessa frase."""
    out = []
    for f in frasi(vincolo) or [vincolo]:
        basso = f.lower()
        for m in re.finditer(r"\bnon (?:si |è |ha |c'è )?([a-zàèéìòù]{4,})", basso):
            verbo = m.group(1)[:4]
            nomi = {w[:5] for w in re.findall(r"[a-zàèéìòù]+", basso) if len(w) >= 5 and w not in _STOP and not w.startswith(verbo)}
            out.append((verbo, nomi))
    return out


def _testi_pubblici(s: dict) -> list[tuple[str, str]]:
    out = [("descrizione", f) for f in frasi(str(s.get("descrizione") or ""))]
    out += [("sensi", str(x)) for x in s.get("sensi") or []]
    out += [("mossa_morbida_pronta", str(s.get("mossa_morbida_pronta") or "")), ("apertura", str(s.get("apertura") or ""))]
    for el in s.get("elementi_interattivi") or []:
        if isinstance(el, dict) and "NASCOST" not in str(el.get("azioni", "")):
            out.append(("elementi_interattivi", f"{el.get('cosa', '')}: {el.get('azioni', '')}"))
    return out


def _contraddizioni(e: Esito, dove_scena: str, s: dict, chi: str, vincolo: str) -> None:
    for verbo, nomi in _negazioni(vincolo):
        for campo, testo in _testi_pubblici(s):
            basso = testo.lower()
            # Negato se un «non» sta nelle due parole prima («non può parlare»).
            positivo = [m for m in re.finditer(rf"\b{verbo}[a-zàèéìòù]*", basso)
                        if not re.search(r"\bnon\b(\s+\S+)?\s*$", basso[max(0, m.start() - 20):m.start()])]
            parole = {w[:5] for w in re.findall(r"[a-zàèéìòù]+", basso) if len(w) >= 5}
            if positivo and nomi & parole and not re.search(ECCEZIONI, basso):
                e.avviso("VINCOLI.contraddetto", f"{dove_scena} {campo}", f"«{testo[:70]}» dice il contrario del vincolo di {chi} "
                                                                           f"(«{vincolo[:60]}»): il narratore lo seguirebbe")


def controlla(c: Campagna, e: Esito) -> None:
    regex = _regex_segrete(c)

    def segreti(dove: str, testo: str) -> None:
        for rx, parola in regex:
            if rx.search(testo.lower()):
                e.errore("VINCOLI.segreto", dove, f"«{parola}» nel vincolo pubblico: va al narratore e al selettore, quindi "
                                                  "dice ciò che si percepisce, non il perché")

    for nome, s in c.scene:
        for ind in s.get("indizi") or []:
            if not isinstance(ind, dict):
                continue
            iid, vincolo = ind.get("id", "?"), ind.get("vincolo_pubblico")
            if not vincolo:
                if ind.get("tipo") in FISICI:
                    e.avviso("VINCOLI.mancante", f"{nome} {iid}", "indizio fisico senza vincolo_pubblico: che cosa percepisce chiunque "
                                                                   "(senza il perché), perché l'improvvisazione non lo contraddica", rigoroso=True)
                continue
            segreti(f"{nome} {iid} vincolo_pubblico", str(vincolo))
            _contraddizioni(e, nome, s, iid, str(vincolo))
        for k, vincolo in enumerate(s.get("vincoli_pubblici") or [], 1):
            segreti(f"{nome} vincoli_pubblici #{k}", str(vincolo))
            _contraddizioni(e, nome, s, f"vincoli_pubblici #{k}", str(vincolo))
    # Indizi dei nodi senza scheda (campagna.yaml): stesse regole, senza scena da confrontare.
    for nid, n in c.nodi.items():
        for ind in n.get("indizi") or []:
            if not isinstance(ind, dict):
                continue
            if ind.get("vincolo_pubblico"):
                segreti(f"campagna.yaml nodo {nid} {ind.get('id')} vincolo_pubblico", str(ind["vincolo_pubblico"]))
            elif ind.get("tipo") in FISICI:
                e.avviso("VINCOLI.mancante", f"campagna.yaml nodo {nid} {ind.get('id')}", "indizio fisico senza vincolo_pubblico",
                         rigoroso=True)
