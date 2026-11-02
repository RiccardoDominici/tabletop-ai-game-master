"""Prova facoltativa dei `temi` su copioni di azioni (esperimenti/copioni/<id campagna>/*.yaml).

Simula il prefiltro del Motore (repertorio versione 2, apps/server/src/repertorio/stato.ts →
catalogo): una battuta selezionabile entra nel catalogo di un'azione se un suo `tema` compare
nell'azione (parola intera, o prefisso per i temi di almeno cinque lettere, come temaPresente del
server). Non c'è una risposta «giusta» scritta a mano: si misura il rumore, cioè quante battute
entrano per ogni azione. Un catalogo largo è ciò che ha fatto perdere il repertorio nell'A/B n. 1.

Come il Motore, e a differenza della prima versione (nota 16 della prova cieca):
  - `scena`: una battuta legata a un'altra scena non entra. La scena di un copione si scrive in
    cima (`scena: <id>`); senza, vale la scena iniziale. Un turno può cambiare scena: `- {scena: <id>}`;
  - cancelli sull'azione: `richiede.privata` vuole un'azione privata (`privata: true` nel copione),
    le altre battute rispondono solo alle pubbliche; `richiede.da_pg` vuole un'azione di quei PG;
  - cancelli di stato, con uno stato ottimista: una battuta entrata nel catalogo di un turno conta
    come usata dal turno dopo, e i suoi `rivela_indizi` come rivelati. Così `battute_usate` e
    `indizi_rivelati` si aprono quando potrebbero aprirsi davvero. `richiede.orologio`,
    `battute_non_usate` e `indizi_non_rivelati` si considerano soddisfatti: il conto resta un tetto;
  - `richiede.oppure`: basta una alternativa.
Non conta, perché non dipende dai temi: le battute che entrano perché l'azione nomina il PNG che parla
(nome o alias). Quelle si riportano a parte, per sapere quanto pesano.
"""

from __future__ import annotations

import re
import statistics
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path

import yaml

from .carica import Campagna
from .esito import Esito

TETTO = 8  # battute nel catalogo di una sola azione oltre cui si avvisa


def _norm(t: str) -> str:
    t = unicodedata.normalize("NFKD", t.lower())
    return "".join(ch for ch in t if not unicodedata.combining(ch)).replace("’", "'")


def tema_presente(azione: str, temi: list[str]) -> bool:
    """Come temaPresente del server: parola intera, o prefisso per i temi di almeno cinque lettere."""
    t = _norm(azione)
    for tema in temi or []:
        n = _norm(str(tema))
        if len(n) < 3:
            continue
        if re.search(rf"(?<![\w]){re.escape(n)}(?![\w])", t):
            return True
        if len(n) >= 5 and re.search(rf"(?<![\w]){re.escape(n)}", t):
            return True
    return False


@dataclass
class Stato:
    """Ciò che è potuto succedere prima di questo turno, nel caso più largo."""
    scena: str | None
    usate: set[str] = field(default_factory=set)
    rivelati: set[str] = field(default_factory=set)


def _blocchi(r: dict) -> list[dict]:
    base = {k: v for k, v in (r or {}).items() if k != "oppure"}
    alternative = [a for a in (r or {}).get("oppure") or [] if isinstance(a, dict)]
    return [{**base, **a} for a in alternative] if alternative else [base]


def _risponde(b: dict, azione: dict, stato: Stato) -> bool:
    """Cancelli della battuta per quest'azione, con lo stato ottimista."""
    if b.get("scena") and stato.scena and b["scena"] != stato.scena:
        return False
    for r in _blocchi(b.get("richiede") or {}):
        if bool(r.get("privata")) != bool(azione.get("privata")):
            continue
        if r.get("da_pg") and azione.get("pg") not in r["da_pg"]:
            continue
        if not set(r.get("battute_usate") or []) <= stato.usate:
            continue
        if not set(r.get("indizi_rivelati") or []) <= stato.rivelati:
            continue
        return True
    return False


def _candidata(b: dict) -> bool:
    return not (b.get("solo_esempio") or b.get("riempitivo") or b.get("tipo") in ("segno_orologio", "finale"))


def catalogo(c: Campagna, azione: str | dict, stato: Stato | None = None) -> list[str]:
    """Battute che entrano nel catalogo di un'azione per i loro temi."""
    a = azione if isinstance(azione, dict) else {"azione": azione}
    st = stato or Stato(scena=(c.scena_iniziale() or {}).get("id"))
    return [b["id"] for b in c.battute
            if _candidata(b) and _risponde(b, a, st) and tema_presente(a.get("azione", ""), b.get("temi") or [])]


def per_nome(c: Campagna, azione: dict, stato: Stato, gia: list[str]) -> list[str]:
    """Battute in più perché l'azione nomina il PNG che parla (pngNominati del server)."""
    t = _norm(azione.get("azione", ""))
    nominati = set()
    for pid, (_, d) in c.png.items():
        nome = str(d.get("nome") or "")
        parole = {nome, nome.split()[0] if nome else "", *(d.get("alias") or [])}
        if any(len(_norm(p)) > 2 and re.search(rf"(?<![\w]){re.escape(_norm(p))}(?![\w])", t) for p in parole if p):
            nominati.add(pid)
    return [b["id"] for b in c.battute if _candidata(b) and b["id"] not in gia and b.get("chi") in nominati
            and _risponde(b, azione, stato)]


def controlla(c: Campagna, e: Esito, cartella_copioni: Path) -> list[str]:
    righe, misure, extra = [], [], []
    scene = {s.get("id") for _, s in c.scene}
    iniziale = (c.scena_iniziale() or {}).get("id")
    for f in sorted(Path(cartella_copioni).rglob("*.yaml")):
        cop = yaml.safe_load(f.read_text(encoding="utf-8")) or {}
        stato = Stato(scena=cop.get("scena") or iniziale)
        if stato.scena not in scene:
            righe.append(f"{f.stem}: scena {stato.scena} inesistente, copione saltato")
            continue
        for n, turno in enumerate(cop.get("turni") or [], 1):
            entrate: set[str] = set()
            for a in turno or []:
                if not isinstance(a, dict):
                    continue
                if "scena" in a and "azione" not in a:  # cambio di scena dentro il copione
                    stato.scena = a["scena"]
                    continue
                cat = catalogo(c, a, stato)
                nomi = per_nome(c, a, stato, cat)
                misure.append(len(cat))
                extra.append(len(nomi))
                entrate |= set(cat) | set(nomi)
                righe.append(f"{f.stem} T{n} {a.get('pg', '?')}: {len(cat)} battute (+{len(nomi)} per nome) — {', '.join(cat)[:100]}")
                if len(cat) > TETTO:
                    e.avviso("COPERTURA.catalogo", f"{f.stem} T{n} {a.get('pg')}", f"{len(cat)} battute per una sola azione (tetto {TETTO})")
            # Dal turno dopo, ciò che è entrato può essere uscito: si aprono i cancelli che ne dipendono.
            stato.usate |= entrate
            stato.rivelati |= {i for b in c.battute if b.get("id") in entrate for i in (b.get("effetti") or {}).get("rivela_indizi") or []}
    if misure:
        righe.append(f"catalogo per azione (temi): media {statistics.mean(misure):.1f}, massimo {max(misure)}, su {len(misure)} azioni")
        righe.append(f"in più perché l'azione nomina chi parla: media {statistics.mean(extra):.1f}, massimo {max(extra)}")
    return righe
