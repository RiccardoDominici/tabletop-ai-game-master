"""Nomi di mostri di gioco nei prompt delle immagini (avviso IMMAGINI.mostro).

Il generatore di immagini non conosce i nomi dei mostri di gioco: un hobgoblin diventa un orso. Il validatore
avvisa se un nome della lista (lingue/<codice>/prosa.yaml, `mostri_di_gioco`) compare in un prompt.

    python3 -m pytest -q strumenti/test_mostri_di_gioco.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from valida import regole_immagini as R  # noqa: E402
from valida.lingua import carica_prosa, lingue_disponibili  # noqa: E402


class _Esito:
    def __init__(self) -> None:
        self.avvisi: list[tuple[str, str]] = []
        self.errori: list[tuple[str, str]] = []

    def avviso(self, codice: str, dove: str, messaggio: str, rigoroso: bool = False) -> None:
        self.avvisi.append((dove, messaggio))

    def errore(self, codice: str, dove: str, messaggio: str) -> None:
        self.errori.append((dove, messaggio))


class _Campagna:
    def __init__(self, codice: str = "it") -> None:
        self.prosa = carica_prosa(codice)


def _controlla(testo: str, codice: str = "it") -> list[str]:
    e = _Esito()
    R._mostri(e, _Campagna(codice), "Scena", "prompt", testo)
    return [messaggio for _, messaggio in e.avvisi]


def test_lista_presente_in_entrambe_le_lingue() -> None:
    for codice in lingue_disponibili():
        prosa = carica_prosa(codice)
        assert {"hobgoblin", "owlbear", "bugbear", "kobold"} <= prosa.mostri_di_gioco, codice


def test_un_nome_di_gioco_nel_prompt_avvisa() -> None:
    avvisi = _controlla("a big hobgoblin with a bear pelt, gnawing a bone")
    assert len(avvisi) == 1
    assert "hobgoblin" in avvisi[0]
    assert "descrivi l'aspetto" in avvisi[0]


def test_maiuscole_e_nessun_falso_positivo() -> None:
    # Una descrizione senza nomi di gioco non avvisa.
    assert _controlla("a tall, broad humanoid with mud-brown skin and a flat snout") == []
    # Maiuscole: avvisa lo stesso.
    assert len(_controlla("A HOBGOBLIN stands by the fire")) == 1


def test_hobgoblin_non_avvisa_anche_per_goblin() -> None:
    """La parola intera: «goblin» dentro «hobgoblin» non conta a parte."""
    avvisi = _controlla("a hobgoblin")
    assert len(avvisi) == 1
    assert "«hobgoblin»" in avvisi[0] and "«goblin»" not in avvisi[0]


def test_testo_vuoto_non_avvisa() -> None:
    assert _controlla("") == []
