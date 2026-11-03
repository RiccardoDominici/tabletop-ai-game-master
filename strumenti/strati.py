"""Strati di una campagna: la durata in sessioni decide quanto si prepara (docs/strati.md).

Una tabella sola, letta dal validatore (strumenti/valida/regole_livello.py) e citata dalla skill del
Preparatore: nessun altro file ripete le soglie o le misure.

Il principio (docs/strati.md, «Principi»): un solo framework, con strati che si accendono. La one-shot è
lo strato più interno, il pacchetto di sessione che il Motore sa già giocare; una campagna più lunga non è
un altro programma, aggiunge strati esterni (arco, campagna, mondo) sopra lo stesso pacchetto. E ciò che è
lontano resta un abbozzo finché non si avvicina (risoluzione progressiva): per questo ogni livello dice
che cosa si prepara PRIMA del gioco e che cosa TRA le sessioni.

Le soglie (1, 2–6, 7–20, 21+) sono una prima scelta: la ricerca (docs/ricerca-durata.md §5.1) non dà numeri,
e vanno corrette dopo le prove. Le misure vengono dalle stesse fonti:
  - one-shot: 1 scena per 20–40 minuti, 3–5 per due o tre ore (manuale C11); i fronti come oggi (C2);
  - arco: un fronte d'arco con 3–6 tappe, 2–3 atti, 4–6 PNG ricorrenti (Dungeon World: pochi fronti bastano);
  - campagna: 2–4 regioni, 3–5 fazioni con orologio, tre conflitti maggiori (DMG 2024), fine dichiarata;
  - saga: una zona piena e le altre abbozzo, 3–5 archi, fasi di gioco (DMG 2024: «months, even years»).

Uso:
    python3 strumenti/strati.py campagne/<id>      il livello del brief e che cosa comporta
    python3 strumenti/strati.py --tabella          la tabella dei livelli
"""

from __future__ import annotations

import argparse
import logging
import sys
from dataclasses import dataclass, field
from pathlib import Path

log = logging.getLogger("strati")

APERTA = "aperta"                 # una campagna senza fine dichiarata: vale come saga
ORE_PER_SESSIONE = 2.5            # predefinito del brief (docs/strati.md, «Il brief»)
ORE_SCENA_BREVE = 1.0             # sotto quest'ora una one-shot ha una scena sola (C11: 20–40 minuti)


@dataclass(frozen=True)
class Misura:
    """Un intervallo di quantità attese (massimo None = senza limite)."""
    minimo: int
    massimo: int | None

    def __str__(self) -> str:
        if self.massimo is None:
            return f"{self.minimo}+"
        return str(self.minimo) if self.minimo == self.massimo else f"{self.minimo}–{self.massimo}"


@dataclass(frozen=True)
class Livello:
    nome: str                          # one-shot | arco | campagna | saga
    sessioni: Misura                   # quante sessioni lo fanno scattare
    prima: tuple[str, ...]             # strati preparati prima del gioco
    tra_le_sessioni: tuple[str, ...]   # strati preparati tra una sessione e l'altra
    misure: dict[str, Misura]          # quantità attese per gli strati preparati prima
    supportato: bool                   # il framework lo sa già preparare e giocare?
    fase: str                          # la fase di docs/strati.md che lo rende giocabile
    perche: str                        # perché questo livello ha questi strati


LIVELLI: tuple[Livello, ...] = (
    Livello(
        "one-shot", Misura(1, 1),
        prima=("sessione: situazione, scene, PNG, PG, canone, cronologia, indizi, repertorio, immagini, audio",),
        tra_le_sessioni=(),
        misure={"scene": Misura(1, 5), "png": Misura(3, 8), "fronti": Misura(2, 3), "pericoli_per_fronte": Misura(2, 3)},
        supportato=True, fase="oggi",
        perche="Una sera sola: si prepara tutto, e niente resta da preparare dopo. È la skill di oggi."),
    Livello(
        "arco", Misura(2, 6),
        prima=("sessione 1 completa, come una one-shot",
               "arco: premessa, fronte d'arco con le tappe che avanzano tra le sessioni, atti, domanda drammatica e finali possibili",
               "PNG ricorrenti e fili aperti",
               "le sessioni dopo la prima come abbozzo di una riga"),
        tra_le_sessioni=("registro della sessione giocata", "stato minimo (fatti, PNG, fili)", "sessione N+1 completa"),
        misure={"tappe": Misura(3, 6), "atti": Misura(2, 3), "png_ricorrenti": Misura(4, 6), "sessioni_complete": Misura(1, 1),
                "scene_per_sessione": Misura(1, 5)},
        supportato=False, fase="D2–D4",
        perche="Poche sessioni legate: serve una spina dorsale (il fronte d'arco) ma non un mondo. Si scrive solo la prima "
               "sessione: le altre dipendono da ciò che i PG faranno."),
    Livello(
        "campagna", Misura(7, 20),
        prima=("bibbia breve: regioni, fazioni con obiettivo e orologio, tre conflitti maggiori, fine dichiarata",
               "crescita dei PG a tappe", "archi abbozzati, il primo completo", "sessione 1 completa"),
        tra_le_sessioni=("registro e stato completo", "turno delle fazioni", "arco successivo quando il corrente chiude",
                         "sessione N+1 completa"),
        misure={"regioni": Misura(2, 4), "fazioni": Misura(3, 5), "conflitti": Misura(3, 3), "archi": Misura(2, 4),
                "archi_completi": Misura(1, 1), "sessioni_complete": Misura(1, 1)},
        supportato=False, fase="D5",
        perche="Mesi di gioco: le fazioni devono muoversi da sole e la fine dev'essere dichiarata, o la campagna si "
               "sgonfia. Il dettaglio resta sull'arco corrente."),
    Livello(
        "saga", Misura(21, None),
        prima=("mondo: storia, geografia, culture, credenze, cronologia lunga", "una zona piena, le altre abbozzo",
               "fasi di gioco (tier dei PG) con archi a blocchi", "tutto ciò che prepara il livello campagna"),
        tra_le_sessioni=("come il livello campagna", "il dettaglio di una zona quando i PG ci arrivano"),
        misure={"zone_piene": Misura(1, 1), "zone": Misura(3, None), "archi": Misura(3, 5), "fasi": Misura(2, 4),
                "fazioni": Misura(3, 5)},
        supportato=False, fase="D5",
        perche="Anni di gioco o nessuna fine: un mondo intero non si scrive in anticipo. Si scrive lo scheletro e una "
               "zona; il resto si risolve quando i PG si avvicinano."),
)
PER_NOME = {lv.nome: lv for lv in LIVELLI}


def livello_da_sessioni(sessioni: int | str) -> Livello:
    """Il livello che corrisponde a un numero di sessioni (o a «aperta»)."""
    if sessioni == APERTA:
        return PER_NOME["saga"]
    if not isinstance(sessioni, int) or isinstance(sessioni, bool) or sessioni < 1:
        raise ValueError(f"sessioni è un intero da 1 in su, o «{APERTA}»: {sessioni!r}")
    for lv in LIVELLI:
        if lv.sessioni.minimo <= sessioni and (lv.sessioni.massimo is None or sessioni <= lv.sessioni.massimo):
            return lv
    raise AssertionError("la tabella dei livelli non copre tutti gli interi")  # pragma: no cover


@dataclass
class Scelta:
    """Il livello di un brief, con da dove viene e i problemi trovati leggendolo."""
    livello: Livello | None
    sessioni: int | str | None
    ore_per_sessione: float
    forzato: bool = False              # `livello:` scritto nel brief, diverso da quello delle sessioni
    motivo: str | None = None          # il motivo di un livello forzato (da decisioni.altre)
    problemi: list[tuple[str, str]] = field(default_factory=list)   # (regola, messaggio)

    @property
    def scene_attese(self) -> Misura | None:
        """Scene attese per sessione: per una one-shot dipendono dalle ore (C11)."""
        if self.livello is None:
            return None
        if self.livello.nome == "one-shot":
            return Misura(1, 1) if self.ore_per_sessione < ORE_SCENA_BREVE else Misura(3, 5)
        return self.livello.misure.get("scene_per_sessione")


def _motivo_forzato(brief: dict, nome: str) -> str | None:
    """Il motivo di un `livello:` forzato: una voce di decisioni.altre che nomina il livello."""
    decisioni = brief.get("decisioni") if isinstance(brief.get("decisioni"), dict) else {}
    altre = decisioni.get("altre") if isinstance(decisioni.get("altre"), list) else []
    for voce in altre:
        testo = str(voce).lower()
        if "livello" in testo or nome in testo:
            return str(voce)
    return None


def livello_del_brief(brief: dict | None) -> Scelta:
    """Dal brief al livello: `sessioni` (obbligatorio), `ore_per_sessione`, e un `livello:` forzato col motivo."""
    brief = brief if isinstance(brief, dict) else {}
    ore = brief.get("ore_per_sessione", ORE_PER_SESSIONE)
    s = Scelta(None, brief.get("sessioni"), ORE_PER_SESSIONE)
    if not (isinstance(ore, (int, float)) and not isinstance(ore, bool) and 0 < ore <= 12):
        s.problemi.append(("forma", f"ore_per_sessione {ore!r}: un numero di ore da 0 a 12 (predefinito {ORE_PER_SESSIONE})"))
    else:
        s.ore_per_sessione = float(ore)
    if "sessioni" not in brief:
        s.problemi.append(("sessioni", "il brief non dice quante sessioni dura la campagna (sessioni: 1 per una one-shot)"))
        return s
    try:
        dalle_sessioni = livello_da_sessioni(s.sessioni)
    except ValueError as err:
        s.problemi.append(("forma", str(err)))
        return s
    s.livello = dalle_sessioni
    forzato = brief.get("livello")
    if forzato is not None and forzato != dalle_sessioni.nome:
        if forzato not in PER_NOME:
            s.problemi.append(("forma", f"livello {forzato!r} fuori da {list(PER_NOME)}"))
            return s
        s.motivo = _motivo_forzato(brief, forzato)
        if s.motivo is None:
            s.problemi.append(("forzato", f"livello «{forzato}» al posto di «{dalle_sessioni.nome}» ({s.sessioni} sessioni) "
                                          "senza il motivo in decisioni.altre"))
        s.livello, s.forzato = PER_NOME[forzato], True
    log.debug("livello %s da %s sessioni (forzato: %s)", s.livello.nome, s.sessioni, s.forzato)
    return s


def descrivi(lv: Livello) -> str:
    misure = ", ".join(f"{k} {v}" for k, v in lv.misure.items())
    righe = [f"{lv.nome} ({lv.sessioni} sessioni) — {'supportato' if lv.supportato else 'non ancora supportato, fase ' + lv.fase}",
             f"  perché: {lv.perche}", "  prima del gioco:", *[f"    - {x}" for x in lv.prima]]
    if lv.tra_le_sessioni:
        righe += ["  tra le sessioni:", *[f"    - {x}" for x in lv.tra_le_sessioni]]
    righe.append(f"  misure: {misure}")
    return "\n".join(righe)


def main() -> int:
    import yaml

    ap = argparse.ArgumentParser(description="Il livello di una campagna dal suo brief (docs/strati.md).")
    ap.add_argument("cartella", nargs="?", type=Path)
    ap.add_argument("--tabella", action="store_true", help="stampa la tabella dei livelli")
    a = ap.parse_args()
    if a.tabella or not a.cartella:
        print("\n\n".join(descrivi(lv) for lv in LIVELLI))
        return 0
    percorso = a.cartella / "brief.yaml"
    brief = yaml.safe_load(percorso.read_text(encoding="utf-8")) if percorso.exists() else {}
    s = livello_del_brief(brief)
    for regola, msg in s.problemi:
        print(f"problema ({regola}): {msg}")
    if s.livello:
        print(descrivi(s.livello))
        print(f"  scene attese per sessione: {s.scene_attese}  (ore per sessione: {s.ore_per_sessione})")
    return 1 if s.problemi else 0


if __name__ == "__main__":
    sys.exit(main())
