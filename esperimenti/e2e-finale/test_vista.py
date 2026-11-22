"""The evidence view (vista.py, vista_eventi.py) on an invented run: which records it keeps and where they go.

    python3 -m pytest -q esperimenti/e2e-finale/test_vista.py
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from vista import componi  # noqa: E402
from vista_eventi import APERTURA, eventi_per_turno, riga_evento, scelto  # noqa: E402

TAVOLO = """# Al tavolo

Ciò che i giocatori hanno sentito.

## Apertura

**Narratore:** Il mulino è fermo.

## Turno 1

**Ada** (giocatore): Apro la porta.

**Narratore:** La porta cigola.

## Turno 3

**Narratore:** Il lupo ringhia.
"""


def ev(msg: str, level: int = 30, **campi) -> dict:
    return {"level": level, "time": "2026-01-01T00:00:00Z", "app": "x", "modulo": "regia", "msg": msg, **campi}


EVENTI = [
    ev("world: gates and consequences loaded", porte=[]),          # before the first turn: the opening
    ev("socket: connesso"),                                          # plumbing: left out
    ev("finestra: aperta", turno=1),
    ev("prove: tiri del turno", turno=1, tiri=["Ada: Forza 12 contro CD 10, riuscita"], tavolo=["Ada: Forza 12, riuscita"],
       fatti=[], fatti_privati=[], attesa_ms=3, tardive=["a1"]),
    ev("repertorio: catalogo del turno", turno=1, battute=["x"]),   # the reader's catalogue: left out
    ev("finestra: aperta", turno=2),
    ev("combattimento: inizia", modulo="combattimento"),            # untagged: the latest turn seen (2)
    ev("exploration: a wandering encounter", chi=["lupo"]),         # a rule module of R6: kept
    ev("sceneggiatore: battuta detta a finestra aperta", turno=1),  # late record of turn 1: does not pull turn back
    ev("combat: morale checked", esito="resta"),                     # untagged after it: still turn 2
    ev("repertorio: [usa] rifiutato", level=40, turno=3, battuta="b1"),
]


def test_selection_keeps_engine_state_and_warnings_and_drops_plumbing() -> None:
    assert scelto(ev("coherence: block of the call"))
    assert scelto(ev("light: put out"))
    assert scelto(ev("anything at all", level=40))
    assert not scelto(ev("socket: connesso"))
    assert not scelto(ev("repertorio: catalogo del turno"))
    assert not scelto(ev("prove: azione risolta (set del manuale)"))


def test_untagged_records_go_to_the_highest_turn_seen() -> None:
    per = eventi_per_turno(EVENTI)
    assert [e["msg"] for e in per[APERTURA]] == ["world: gates and consequences loaded"]
    assert [e["msg"] for e in per[2]] == ["combattimento: inizia", "exploration: a wandering encounter", "combat: morale checked"]
    assert [e["msg"] for e in per[3]] == ["repertorio: [usa] rifiutato"]


def test_record_line_drops_plumbing_fields_and_marks_warnings() -> None:
    assert riga_evento(EVENTI[3]) == ('- `prove: tiri del turno` {"tiri": ["Ada: Forza 12 contro CD 10, riuscita"], '
                                      '"tavolo": ["Ada: Forza 12, riuscita"], "fatti": [], "fatti_privati": []}')
    assert riga_evento(EVENTI[-1]) == '- WARN `repertorio: [usa] rifiutato` {"battuta": "b1"}'


def test_view_keeps_the_table_and_adds_a_section_for_an_engine_only_turn() -> None:
    vista = componi("prova-run", TAVOLO, EVENTI)
    assert vista.startswith("# Evidence view: prova-run\n# Al tavolo\n")
    # Turn 2 had no section at the table: it gets one, between 1 and 3, so its fight records are not lost.
    assert vista.index("## Turno 1") < vista.index("## Turno 2") < vista.index("## Turno 3")
    assert "*(nothing at the table this turn)*" in vista
    assert vista.count("**Engine log for this turn:**") == 4
    # A tavolo.md without cards (before A32) gets them from the log.
    assert "*Carte dei dadi sul proiettore:* Ada: Forza 12, riuscita" in vista


def test_command_line_on_a_results_folder(tmp_path: Path) -> None:
    (tmp_path / "log-server").mkdir()
    (tmp_path / "tavolo.md").write_text(TAVOLO, encoding="utf-8")
    righe = [json.dumps(e) for e in EVENTI] + ["{not json"]  # a log cut by a kill
    (tmp_path / "log-server" / "server.jsonl").write_text("\n".join(righe), encoding="utf-8")
    out = subprocess.run([sys.executable, "-I", str(Path(__file__).with_name("vista.py")), str(tmp_path)],
                         capture_output=True, text=True, check=True)
    assert out.stdout.startswith(f"# Evidence view: {tmp_path.name}")
    assert "`exploration: a wandering encounter`" in out.stdout
