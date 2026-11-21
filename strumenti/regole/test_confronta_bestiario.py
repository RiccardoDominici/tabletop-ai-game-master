"""The bestiary check against a manual's stat blocks (strumenti/regole/confronta_bestiario.py), on invented blocks: the
reading of the printed values and the comparison both ways. The check against the real PDF is test_bestiario_bf.py.

    python3 -m pytest -q strumenti/regole
"""

from __future__ import annotations

import sys
from pathlib import Path

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI))

import blocchi_mostri as B  # noqa: E402
import confronta_bestiario as C  # noqa: E402


def _blocco(**campi) -> B.Blocco:
    base = {"Armor Class": "14", "Hit Dice": "2*", "No. of Attacks": "2 claws, 1 bite", "Damage": "1d3 claw, 1d4 bite",
            "Movement": "30'", "No. Appearing": "1d6", "Save As": "Fighter: 2", "Morale": "9", "Treasure Type": "B", "XP": "100"}
    base.update(campi)
    return B.Blocco(10, "Clawbeast", None, base)


VOCE = {"id": "artigliatore", "manuale": "Clawbeast", "pagina": 10, "difesa": 14, "dadi_vita": "2*",
        "attacchi": [{"id": "artiglio", "nome": "Artiglio", "danno": "1d3"}, {"id": "morso", "nome": "Morso", "danno": "1d4"}],
        "per_round": [["artiglio", "artiglio", "morso"]], "movimento": "30'", "numero": "1d6",
        "salva_come": {"classe": "guerriero", "livello": 2}, "morale": 9, "tesoro": "B", "px": 100}


def test_letture_dei_valori_stampati() -> None:
    assert C.attacchi_stampati("2 claws, 1 bite") == [3]
    assert C.attacchi_stampati("1 gore or 1 trample") == [1, 1]
    assert C.attacchi_stampati("1 bite + swallow on natural 19 or 20") == [1]
    assert C.attacchi_stampati("Special") is None
    assert C.salva_come_stampato("Fighter: 9 (as Hit Dice)") == ("guerriero", 9, 9)
    assert C.salva_come_stampato("Normal Man") == ("guerriero", 0, 0)
    assert C.salva_come_stampato("Fighter:1-2") == ("guerriero", 1, 2)
    assert C._formule("1d4 claw, 1d6+1 bite, 1 point sting") == {"1d4", "1d6+1", "1"}
    assert B.numero("1,225") == 1225 and B.tra_parentesi("30** (AB +15)") == 15 and B.tra_parentesi("15 (11)") == 11


def test_una_voce_giusta_non_ha_differenze() -> None:
    assert C.differenze_voce(VOCE, _blocco()) == []


def test_un_soffio_stampato_coi_dadi_e_un_potere() -> None:
    # «30d8 breath» as a line with a power of the set (its own dice by hit dice): no difference; a second missing die is.
    b = _blocco(**{"No. of Attacks": "2 claws, 1 bite or breath", "Damage": "1d3 claw, 1d4 bite or 2d8 breath"})
    v = {**VOCE, "attacchi": [*VOCE["attacchi"], {"id": "soffio", "nome": "Soffio", "potere": "soffio_brina", "usi": 2}],
         "per_round": [["artiglio", "artiglio", "soffio"], ["artiglio", "artiglio", "morso"]]}
    assert C.differenze_voce(v, b) == []
    senza = {**v, "attacchi": [VOCE["attacchi"][0], v["attacchi"][2]], "per_round": [["artiglio", "artiglio", "soffio"]]}
    assert any("attacchi[].danno" in x for x in C.differenze_voce(senza, b))


def test_ogni_numero_sbagliato_si_vede() -> None:
    v = {**VOCE, "difesa": 15, "px": 75, "per_round": [["artiglio", "morso"]], "morale": 8}
    d = " | ".join(C.differenze_voce(v, _blocco()))
    assert "difesa is 15" in d and "px is 75" in d and "per_round" in d and "morale is 8" in d


def test_le_eccezioni_dichiarate_con_un_motivo() -> None:
    b = _blocco(**{"Save As": "N/A"})
    assert C.differenze_voce({**VOCE, "salva_come": None}, b) == []
    senza = {**VOCE, "difesa": 99, "controllo": {"ignora": ["difesa"]}}
    assert any("without a motivo" in x for x in C.differenze_voce(senza, _blocco()))
    con = {**VOCE, "difesa": 99, "controllo": {"ignora": ["difesa"], "motivo": "the manual prints a text"}}
    assert C.differenze_voce(con, _blocco()) == []


def test_in_tutti_e_due_i_sensi() -> None:
    blocchi = [_blocco(), B.Blocco(11, "Raider", None, {"Armor Class": "12"})]
    d = C.confronta([VOCE, {"id": "fantasma", "manuale": "Ghostly", "pagina": 12}], blocchi)
    assert any("«Raider» has no entry" in x for x in d)
    assert any("fantasma: manuale «Ghostly» is not a stat block" in x for x in d)
