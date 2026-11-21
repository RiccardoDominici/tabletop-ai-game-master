"""Stat blocks of a manual's monster section, read from the PDF's layout (positions and fonts of the text).

    python3 strumenti/regole/blocchi_mostri.py manuali/basic-fantasy-rpg-r142.pdf --da 66 --a 166 [--json]

Many old-school manuals print each monster as a heading followed by a column of «Label: value» lines (Armor Class,
Hit Dice, No. of Attacks, …), sometimes with several variants side by side under bold column headers (Giant, Huge,
Large). This module finds those blocks by position, not by reading order: the plain text of a two-column page splits
labels from their values (pdftotext prints the labels of a block, then its values, then the next column).

It is the independent check of a bestiary copied into a rule set (campagne/<id>/regole/mostri.yaml): the entries are
transcribed from the manual by hand or by an agent, and test_bestiario_bf.py compares them with what this parser reads,
block by block. Nothing here writes data into a campaign. The manual itself stays in manuali/ (never in git).

Layout assumptions, all parameters of `Formato` (the defaults are Basic Fantasy r142's):
- a heading is a span in a heading font of at least `titolo_min` points;
- the labels and their values are body spans of `corpo` points; a label ends with «:»;
- variant headers are bold spans of the same size on the line just above the first label;
- the page has two text columns split at its middle; a block's values stop at the other column unless the block is wide.
Printed page = PDF page (1-based) − `scarto` (Basic Fantasy: PDF page = printed page + 4).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path

ETICHETTE_BF = (
    "Armor Class:", "Hit Dice:", "No. of Attacks:", "Damage:", "Movement:", "No. Appearing:",
    "Save As:", "Morale:", "Treasure Type:", "XP:",
)


@dataclass
class Formato:
    etichette: tuple[str, ...] = ETICHETTE_BF
    prima: str = "Armor Class:"
    ultima: str = "XP:"
    titolo_font: str = "Black"
    titolo_min: float = 10.5
    corpo: float = 9.0
    grassetto: str = "Bold"
    scarto: int = 4
    margine_alto: float = 70.0
    colonna: float = 242.0  # from the left margin to the start of the right column, minus a few points


@dataclass
class Span:
    x0: float
    y0: float
    x1: float
    size: float
    font: str
    testo: str

    @property
    def centro(self) -> float:
        return (self.x0 + self.x1) / 2


@dataclass
class Blocco:
    pagina: int  # printed page
    titolo: str
    colonna: str | None  # the variant's header (Giant, Huge…), or None for a single-column block
    campi: dict[str, str] = field(default_factory=dict)

    @property
    def chiave(self) -> str:
        """How an entry names this block (`manuale:` of mostri.yaml): «Title» or «Title | Column»."""
        return f"{self.titolo} | {self.colonna}" if self.colonna else self.titolo


def _spans(pagina) -> list[Span]:
    out: list[Span] = []
    for b in pagina.get_text("dict")["blocks"]:
        for riga in b.get("lines", []):
            for s in riga["spans"]:
                t = " ".join(s["text"].split())
                if t:
                    out.append(Span(s["bbox"][0], s["bbox"][1], s["bbox"][2], round(s["size"], 1), s["font"], t))
    return out


def _stessa_riga(a: Span, b: Span, tolleranza: float = 2.5) -> bool:
    return abs(a.y0 - b.y0) <= tolleranza


def _etichetta(s: Span, f: Formato) -> str | None:
    return s.testo if s.testo in f.etichette and abs(s.size - f.corpo) < 0.6 else None


def _colonne_del_blocco(spans: list[Span], primo: Span, destra: float, f: Formato) -> list[Span]:
    """The bold variant headers on the line just above the block's first label, within its width."""
    sopra = [s for s in spans if f.grassetto in s.font and abs(s.size - f.corpo) < 0.6
             and 4 < primo.y0 - s.y0 < 16 and s.x0 > primo.x0 + 20 and s.x0 < destra]
    if not sopra:
        return []
    y = min(s.y0 for s in sopra)
    return sorted([s for s in sopra if abs(s.y0 - y) < 2.5], key=lambda s: s.x0)


def _testo_riga(pezzi: list[Span]) -> str:
    return " ".join(p.testo for p in sorted(pezzi, key=lambda p: p.x0)).strip()


def _per_colonne(pezzi: list[Span], colonne: list[Span]) -> list[str]:
    """Split a value line among the variant columns. A span shared by all of them goes to every one: written between
    dashes (– 1 bite –), or alone on a line with fewer spans than columns and centred on the middle of all the columns
    (the roc's «2 claws, 1 bite» under Normal, Large and Giant)."""
    out = [[] for _ in colonne]
    tutti: list[Span] = []
    mezzo = sum(c.centro for c in colonne) / len(colonne)
    for p in sorted(pezzi, key=lambda p: p.x0):
        condiviso = len(pezzi) < len(colonne) and abs(p.centro - mezzo) < 8
        if (p.testo.startswith("–") and p.testo.endswith("–")) or condiviso:
            tutti.append(p)
            continue
        i = min(range(len(colonne)), key=lambda k: abs(colonne[k].centro - p.centro))
        out[i].append(p)
    comune = " ".join(t.testo.strip("– ").strip() for t in tutti)
    return [(_testo_riga(o) or comune).strip() for o in out]


def blocchi_della_pagina(pagina, numero_pdf: int, titolo_prima: dict[str, str], f: Formato) -> list[Blocco]:
    """The stat blocks of one page. `titolo_prima` carries the last heading seen per column across pages."""
    spans = [s for s in _spans(pagina) if s.y0 > f.margine_alto]
    # The split between the two text columns: the left margin (it changes between odd and even pages) + a column's width.
    sinistra = min((s.x0 for s in spans), default=0.0)
    meta = sinistra + f.colonna
    titoli = [s for s in spans if f.titolo_font in s.font and s.size >= f.titolo_min]
    etichette = [s for s in spans if _etichetta(s, f)]
    out: list[Blocco] = []
    for primo in [s for s in etichette if s.testo == f.prima]:
        lato = "sx" if primo.x0 < meta else "dx"
        # The block's labels: same x, from the first label down to the last one.
        colonna_etichette = sorted([s for s in etichette if abs(s.x0 - primo.x0) < 3 and s.y0 >= primo.y0 - 1], key=lambda s: s.y0)
        righe: list[Span] = []
        for s in colonna_etichette:
            righe.append(s)
            if s.testo == f.ultima:
                break
        fondo = righe[-1].y0
        # The right edge: the other column's labels, or the page's middle when the other column is body text.
        altre = [s for s in etichette if s.x0 > primo.x0 + 40 and primo.y0 - 2 <= s.y0 <= fondo + 2]
        if altre:
            destra = min(s.x0 for s in altre) - 2
        elif lato == "sx":
            testo_a_destra = [s for s in spans if s.x0 >= meta and primo.y0 - 2 <= s.y0 <= fondo + 2 and abs(s.size - f.corpo) >= 0.6]
            destra = meta if testo_a_destra else pagina.rect.width
        else:
            destra = pagina.rect.width
        colonne = _colonne_del_blocco(spans, primo, destra, f)
        # The heading: the nearest one above in the same column, else the last one before this column.
        sopra = [t for t in titoli if t.y0 < primo.y0 and ((t.x0 < meta) == (lato == "sx"))]
        if sopra:
            titolo = max(sopra, key=lambda t: t.y0).testo
        elif lato == "dx" and [t for t in titoli if t.x0 < meta]:
            titolo = max([t for t in titoli if t.x0 < meta], key=lambda t: t.y0).testo
        else:
            titolo = titolo_prima.get("ultimo", "?")
        valori: list[dict[str, list[str]]] = [dict() for _ in (colonne or [None])]
        for i, et in enumerate(righe):
            prossima = righe[i + 1].y0 if i + 1 < len(righe) else et.y0 + 11
            # This label's value spans, and the wrapped lines below it before the next label.
            pezzi = [s for s in spans if s.x0 > et.x1 + 1 and s.x0 < destra and abs(s.size - f.corpo) < 0.6
                     and not _etichetta(s, f) and et.y0 - 2.5 <= s.y0 < prossima - 2.5 and s not in colonne]
            per_y: dict[float, list[Span]] = {}
            for p in pezzi:
                k = next((y for y in per_y if abs(y - p.y0) < 2.5), p.y0)
                per_y.setdefault(k, []).append(p)
            for y in sorted(per_y):
                parti = _per_colonne(per_y[y], colonne) if colonne else [_testo_riga(per_y[y])]
                for v, testo in zip(valori, parti):
                    if testo:
                        v.setdefault(et.testo, []).append(testo)
        stampata = numero_pdf - f.scarto
        for k, v in enumerate(valori):
            campi = {et.rstrip(":"): " ".join(t) for et, t in v.items()}
            out.append(Blocco(stampata, titolo, colonne[k].testo if colonne else None, campi))
    if titoli:
        titolo_prima["ultimo"] = max(titoli, key=lambda t: (t.x0 >= meta, t.y0)).testo
    return out


def leggi(pdf: Path, da: int, a: int, f: Formato | None = None) -> list[Blocco]:
    """Every stat block from PDF page `da` to `a` (1-based, inclusive)."""
    import fitz  # PyMuPDF: lazy, the rest of strumenti/ does not need it

    f = f or Formato()
    doc = fitz.open(pdf)
    titolo: dict[str, str] = {}
    out: list[Blocco] = []
    for n in range(da, a + 1):
        out.extend(blocchi_della_pagina(doc[n - 1], n, titolo, f))
    return out


# --- reading the values (shared by the check) -----------------------------------------------------------------------

_NUM = re.compile(r"-?\d[\d,]*")


def numero(v: str | None) -> int | None:
    """The first whole number of a value («1,225» → 1225, «15 (11)» → 15)."""
    m = _NUM.search(v or "")
    return int(m.group().replace(",", "")) if m else None


def tra_parentesi(v: str | None) -> int | None:
    """The number in brackets («15 (11)» → 11, «9** (+8)» → 8, «30** (AB +15)» → 15), or None."""
    m = re.search(r"\(\s*(?:AB\s*)?\+?(-?\d+)\s*\)", v or "")
    return int(m.group(1)) if m else None


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("pdf", type=Path)
    p.add_argument("--da", type=int, required=True, help="first PDF page (1-based)")
    p.add_argument("--a", type=int, required=True, help="last PDF page (1-based)")
    p.add_argument("--json", action="store_true")
    o = p.parse_args(argv)
    blocchi = leggi(o.pdf, o.da, o.a)
    if o.json:
        json.dump([asdict(b) | {"chiave": b.chiave} for b in blocchi], sys.stdout, ensure_ascii=False, indent=1)
        print()
    else:
        for b in blocchi:
            print(f"p. {b.pagina}  {b.chiave}")
            for k, v in b.campi.items():
                print(f"    {k}: {v}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
