"""Test dell'estrattore di manuali (strumenti/regole/estrai.py).

Il PDF di prova si costruisce qui, senza file binari nel repository: tre pagine di testo, un'intestazione
che torna su ogni pagina, numeri di pagina, un trattino a capo, e (in un caso) l'indice dei segnalibri.

    python3 -m pytest -q strumenti/regole
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI))

pytest.importorskip("pypdf")

import estrai  # noqa: E402


# --- un PDF minimale, con testo e (facoltativo) indice --------------------------------------------

def _pdf(percorso: Path, pagine: list[list[str]], indice: list[tuple[str, int]] | None = None) -> Path:
    """Scrive un PDF a una pagina per lista di righe. `indice`: (titolo, pagina dalla 1) dei segnalibri."""
    n = len(pagine)
    oggetti: dict[int, bytes] = {
        1: b"<< /Type /Catalog /Pages 2 0 R" + (b" /Outlines %d 0 R" % (4 + 2 * n) if indice else b"") + b" >>",
        2: b"<< /Type /Pages /Kids [" + b" ".join(b"%d 0 R" % (4 + 2 * i) for i in range(n)) + b"] /Count %d >>" % n,
        3: b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    }
    for i, righe in enumerate(pagine):
        pagina_obj, contenuto_obj = 4 + 2 * i, 5 + 2 * i
        oggetti[pagina_obj] = (b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> "
                               b"/Contents %d 0 R >>" % contenuto_obj)
        corpo = b"BT /F1 11 Tf 14 TL 72 760 Td "
        for riga in righe:
            corpo += b"(" + riga.encode("cp1252").replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)") + b") Tj T* "
        corpo += b"ET"
        oggetti[contenuto_obj] = b"<< /Length %d >>\nstream\n" % len(corpo) + corpo + b"\nendstream"
    if indice:
        radice = 4 + 2 * n
        voci = list(range(radice + 1, radice + 1 + len(indice)))
        oggetti[radice] = b"<< /Type /Outlines /First %d 0 R /Last %d 0 R /Count %d >>" % (voci[0], voci[-1], len(voci))
        for k, (titolo, pag) in enumerate(indice):
            prev = b" /Prev %d 0 R" % voci[k - 1] if k else b""
            nxt = b" /Next %d 0 R" % voci[k + 1] if k + 1 < len(voci) else b""
            dest = b"/Dest [%d 0 R /XYZ 0 842 null]" % (4 + 2 * (pag - 1))
            oggetti[voci[k]] = (b"<< /Title (" + titolo.encode("ascii") + b") /Parent %d 0 R " % radice + dest + prev + nxt + b" >>")
    out = bytearray(b"%PDF-1.4\n")
    posizioni = {}
    for num in sorted(oggetti):
        posizioni[num] = len(out)
        out += b"%d 0 obj\n" % num + oggetti[num] + b"\nendobj\n"
    inizio_xref = len(out)
    size = max(oggetti) + 1
    out += b"xref\n0 %d\n0000000000 65535 f \n" % size
    for num in range(1, size):
        out += b"%010d 00000 n \n" % posizioni[num]
    out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (size, inizio_xref)
    percorso.write_bytes(bytes(out))
    return percorso


PAGINE_MANUALE = [
    ["Manuale di prova", "Capitolo 1 Il combattimento", "Ogni colpo richiede una prova di Vigore, e il bersaglio",
     "si difende con la sua armatura: se la prova riesce il danno", "passa, e vale il tiro fatto.", "1"],
    ["Manuale di prova", "1.2 Convincere qualcuno", "Quando cerchi di convincere un PNG tira 2d6 e aggiungi",
     "Fascino. Con 10 o più il PNG fa ciò che chiedi.", "2"],
    ["Manuale di prova", "LA MAGIA", "Chi conosce un incantesimo lo lancia con una prova di Potere.", "3"],
]


# --- PDF ------------------------------------------------------------------------------------------

def test_pdf_sezioni_con_pagina_intestazioni_tolte_e_trattini_ricuciti(tmp_path: Path) -> None:
    sezioni = estrai.estrai(_pdf(tmp_path / "m.pdf", PAGINE_MANUALE))
    titoli = [(s.titolo, s.pagina) for s in sezioni]
    assert titoli == [("Capitolo 1 Il combattimento", 1), ("1.2 Convincere qualcuno", 2), ("LA MAGIA", 3)]
    assert "Manuale di prova" not in "".join(s.testo for s in sezioni)  # intestazione ricorrente tolta
    assert "\n1\n" not in sezioni[0].testo and sezioni[0].testo.endswith("vale il tiro fatto.")  # numero di pagina tolto
    assert "Ogni colpo richiede una prova di Vigore, e il bersaglio si difende con la sua armatura: se la prova riesce il danno passa, e vale il tiro fatto." == sezioni[0].testo


def test_pdf_con_trattino_a_capo_si_ricuce(tmp_path: Path) -> None:
    pagine = [["Capitolo 1 Movimento", "Chi attraversa il fiume a gua-", "do deve tirare una prova.", "1"]]
    sezioni = estrai.estrai(_pdf(tmp_path / "t.pdf", pagine))
    assert sezioni[0].testo == "Chi attraversa il fiume a guado deve tirare una prova."


def test_pdf_con_indice_usa_i_segnalibri_anche_senza_forme_di_titolo(tmp_path: Path) -> None:
    pagine = [["Il combattimento", "Colpire richiede una prova.", "1"], ["Le mosse", "Convincere è una mossa.", "2"]]
    sezioni = estrai.estrai(_pdf(tmp_path / "i.pdf", pagine, indice=[("Il combattimento", 1), ("Le mosse", 2)]))
    assert [(s.titolo, s.pagina) for s in sezioni] == [("Il combattimento", 1), ("Le mosse", 2)]
    assert sezioni[1].testo == "Convincere è una mossa."


def test_pdf_senza_testo_non_da_sezioni(tmp_path: Path) -> None:
    pagine = [["1"], ["2"], ["3"]]  # solo numeri di pagina: nessun testo utile
    assert estrai.estrai(_pdf(tmp_path / "vuoto.pdf", pagine)) == []


# --- md e txt -------------------------------------------------------------------------------------

def test_markdown_titoli_con_cancelletto_e_senza_pagina(tmp_path: Path) -> None:
    file = tmp_path / "m.md"
    file.write_text("# Regole\n\nPremessa del manuale.\n\n## Convincere\n\nTira 2d6.\nCon 10 o più riesce.\n", encoding="utf-8")
    sezioni = estrai.estrai(file)
    assert [(s.titolo, s.pagina) for s in sezioni] == [("Regole", None), ("Convincere", None)]
    assert sezioni[1].testo == "Tira 2d6. Con 10 o più riesce."


def test_txt_titoli_riconosciuti_dalla_forma(tmp_path: Path) -> None:
    file = tmp_path / "m.txt"
    file.write_text("Capitolo 2 Magia\nLanciare un incantesimo costa Potere.\n\nLE PROVE\nSi tira un d20.\n", encoding="utf-8")
    sezioni = estrai.estrai(file)
    assert [s.titolo for s in sezioni] == ["Capitolo 2 Magia", "LE PROVE"]
    assert sezioni[0].testo == "Lanciare un incantesimo costa Potere."


def test_formato_non_previsto_si_rifiuta(tmp_path: Path) -> None:
    file = tmp_path / "m.docx"
    file.write_bytes(b"x")
    with pytest.raises(ValueError, match="formato non previsto"):
        estrai.estrai(file)


# --- riga di comando ------------------------------------------------------------------------------

def test_cli_markdown_e_json(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    file = _pdf(tmp_path / "c.pdf", PAGINE_MANUALE)
    assert estrai.main([str(file)]) == 0
    assert "## 1.2 Convincere qualcuno (p. 2)" in capsys.readouterr().out
    assert estrai.main([str(file), "--json"]) == 0
    import json
    dati = json.loads(capsys.readouterr().out)
    assert dati[2] == {"titolo": "LA MAGIA", "pagina": 3, "testo": "Chi conosce un incantesimo lo lancia con una prova di Potere."}


def test_cli_file_mancante_esce_con_due(tmp_path: Path) -> None:
    assert estrai.main([str(tmp_path / "non-c-e.pdf")]) == 2
