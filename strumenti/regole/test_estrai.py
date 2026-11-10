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

def _pdf(percorso: Path, pagine: list[list], indice: list[tuple[str, int]] | None = None) -> Path:
    """Scrive un PDF per lista di pagine. Una riga è un testo (corpo, 11 pt) oppure (testo, dimensione) per un titolo
    in grassetto. `indice`: (titolo, pagina dalla 1) dei segnalibri, nell'ordine dato."""
    n = len(pagine)
    radice = 5 + 2 * n
    oggetti: dict[int, bytes] = {
        1: b"<< /Type /Catalog /Pages 2 0 R" + (b" /Outlines %d 0 R" % radice if indice else b"") + b" >>",
        2: b"<< /Type /Pages /Kids [" + b" ".join(b"%d 0 R" % (5 + 2 * i) for i in range(n)) + b"] /Count %d >>" % n,
        3: b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
        4: b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    }
    for i, righe in enumerate(pagine):
        pagina_obj, contenuto_obj = 5 + 2 * i, 6 + 2 * i
        oggetti[pagina_obj] = (b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> "
                               b"/Contents %d 0 R >>" % contenuto_obj)
        corpo = b""
        y = 790.0
        for riga in righe:
            testo, dimensione, fonte = (riga, 11, "F1") if isinstance(riga, str) else (riga[0], riga[1], "F2")
            y -= dimensione + 6
            corpo += (b"BT /%s %d Tf 1 0 0 1 72 %.1f Tm (" % (fonte.encode(), dimensione, y)
                      + testo.encode("cp1252").replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)") + b") Tj ET\n")
        oggetti[contenuto_obj] = b"<< /Length %d >>\nstream\n" % len(corpo) + corpo + b"endstream"
    if indice:
        voci = list(range(radice + 1, radice + 1 + len(indice)))
        oggetti[radice] = b"<< /Type /Outlines /First %d 0 R /Last %d 0 R /Count %d >>" % (voci[0], voci[-1], len(voci))
        for k, (titolo, pag) in enumerate(indice):
            prev = b" /Prev %d 0 R" % voci[k - 1] if k else b""
            nxt = b" /Next %d 0 R" % voci[k + 1] if k + 1 < len(voci) else b""
            dest = b"/Dest [%d 0 R /XYZ 0 842 null]" % (5 + 2 * (pag - 1))
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


# --- i casi del bug BFRPG: indice fuori ordine, titoli senza forma, nessun indice -----------------

def test_indice_fuori_ordine_non_fa_perdere_gli_altri_titoli(tmp_path: Path) -> None:
    """Una voce dell'indice che nel testo viene dopo (pagina 3) non deve far perdere quelle che seguono l'indice
    ma stanno prima nel testo. Il vecchio matching in sequenza le perdeva tutte."""
    pagine = [["Alpha", "Testo alfa."], ["Beta", "Testo beta."], ["Late table", "Testo tabella."]]
    indice = [("Late table", 3), ("Alpha", 1), ("Beta", 2)]
    sezioni = estrai.estrai(_pdf(tmp_path / "fuori.pdf", pagine, indice=indice))
    assert [(s.titolo, s.pagina) for s in sezioni] == [("Alpha", 1), ("Beta", 2), ("Late table", 3)]


def test_titoli_in_grassetto_senza_indice_e_senza_forma(tmp_path: Path) -> None:
    """Titoli che non hanno forma («Dwarves», «Using the Dice»): li riconosce il font, grassetto e più grande."""
    pagine = [
        [("Dwarves", 14), "Dwarves are stout folk who dwell under the hills.", "They dig deep and remember grudges."],
        ["Elves", "Elves love the forest and the moon.", ("Using the Dice", 14), "Roll a d20 for every check."],
        [("Halflings", 14), "Halflings are small and quick with a sling."],
    ]
    sezioni = estrai.estrai(_pdf(tmp_path / "stile.pdf", pagine))
    assert [(s.titolo, s.pagina) for s in sezioni] == [("Dwarves", 1), ("Using the Dice", 2), ("Halflings", 3)]
    # «Elves» non è un titolo (corpo, come il resto): sta nella sezione di Dwarves.
    assert "Elves love the forest and the moon." in sezioni[0].testo
    assert sezioni[1].testo == "Roll a d20 for every check."


def test_senza_indice_e_senza_titoli_si_taglia_ogni_due_pagine(tmp_path: Path) -> None:
    """Ultima risorsa: testo uniforme, nessun titolo: una sezione ogni due pagine, con la pagina di partenza."""
    # Frasi diverse su ogni riga: una riga uguale su più pagine sarebbe un'intestazione, e il testo andrebbe via.
    # (le cifre si normalizzano: per distinguere le righe servono parole diverse)
    nomi = ["Alfa", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", "Iota", "Kappa", "Lambda", "Mu", "Nu", "Xi", "Omicron"]
    pagine = [[f"Il vicolo {nomi[3 * (i - 1) + j]} ha una storia sua." for j in range(3)] for i in range(1, 6)]
    sezioni = estrai.estrai(_pdf(tmp_path / "uniforme.pdf", pagine))
    assert [(s.titolo, s.pagina) for s in sezioni] == [("Pagine 1–2", 1), ("Pagine 3–4", 3), ("Pagina 5", 5)]
    assert "Il vicolo Eta ha" in sezioni[1].testo and "Alfa" not in sezioni[1].testo


# --- il manuale reale, se c'è (manuali/ è fuori da git: senza file il test si salta) -------------------

BFRPG = Path(__file__).resolve().parents[2] / "manuali" / "basic-fantasy-rpg-r142.pdf"


@pytest.mark.skipif(not BFRPG.exists(), reason="manuale locale assente (manuali/ è fuori da git)")
def test_bfrpg_non_si_fonde_in_una_sezione() -> None:
    """Basic Fantasy RPG, 208 pagine con un indice di 519 voci: deve dare centinaia di sezioni, non una."""
    sezioni = estrai.estrai(BFRPG)
    assert len(sezioni) >= 300
    assert sezioni[-1].pagina is not None and sezioni[-1].pagina >= 200
