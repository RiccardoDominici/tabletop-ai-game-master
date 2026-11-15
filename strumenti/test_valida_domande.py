"""Test delle domande al mondo (scena.yaml: domande[], classe DOMANDE, strumenti/valida/regole_domande.py).

I fixture sono inventati: `test_valida_fixtures/mini` (SRD, senza regole/) e il set di prova `pbta` del motore
(apps/server/test/fixtures, con regole/regole.yaml). Ogni test ne fa una copia, scrive UNA domanda e controlla
i codici DOMANDE.

    python3 -m pytest -q strumenti/test_valida_domande.py
"""

from __future__ import annotations

import copy
import shutil
import sys
from pathlib import Path

import yaml

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI))

from valida import regole_domande  # noqa: E402
from valida.carica import carica  # noqa: E402
from valida.esito import Esito  # noqa: E402

RADICE = QUI.parent
MINI = QUI / "test_valida_fixtures" / "mini"
PBTA = RADICE / "apps" / "server" / "test" / "fixtures" / "campagne" / "pbta"


def copia(sorgente: Path, tmp_path: Path) -> Path:
    dest = tmp_path / sorgente.name
    shutil.copytree(sorgente, dest)
    return dest


def errori_domande(cartella: Path) -> list[str]:
    """Errori della classe DOMANDE, come «codice messaggio». Solo il controllo delle domande."""
    esito = Esito()
    c = carica(cartella, esito)
    regole_domande.controlla(c, esito)
    return [f"{v.codice} {v.messaggio}" for v in esito.errori if v.codice.startswith("DOMANDE.")]


def tiene(cartella: Path, codice: str) -> bool:
    return any(r.startswith(codice + " ") for r in errori_domande(cartella))


def scrivi_domande(cartella: Path, domande: list[dict], file: str = "scena.yaml") -> None:
    """Sostituisce la lista `domande` della scena indicata, lasciando il resto della scheda."""
    percorso = cartella / file
    dati = yaml.safe_load(percorso.read_text(encoding="utf-8"))
    dati["domande"] = domande
    percorso.write_text(yaml.safe_dump(dati, allow_unicode=True, sort_keys=False), encoding="utf-8")


def domanda_tiro(**mod) -> dict:
    """Una domanda valida a tiro (odds di «sì» su 3+ con un d6), con le chiavi del fatto «azione»."""
    d = {
        "id": "d_guardia_sveglia",
        "domanda": "La guardia alla porta è sveglia?",
        "quando": "azione",
        "temi": ["guardia", "porta"],
        "tiro": {"dado": 6, "almeno": 3},
        "se_si": "La guardia è sveglia.",
        "se_no": "La guardia sonnecchia.",
    }
    d.update(mod)
    return d


def domanda_png(prova_png: dict, **mod) -> dict:
    """Una domanda valida con la prova di un PNG al posto del tiro."""
    d = domanda_tiro(prova_png=prova_png, **mod)
    d.pop("tiro")
    return d


def senza(d: dict, *chiavi: str) -> dict:
    d = copy.deepcopy(d)
    for k in chiavi:
        d.pop(k)
    return d


PROVA_IRMA = {"png": "png_irma", "prova": "abilita:intuizione", "difficolta": "media"}


# --- i casi validi --------------------------------------------------------------------------------

def test_nessuna_domanda_non_fa_nulla(tmp_path: Path) -> None:
    assert errori_domande(copia(MINI, tmp_path)) == []


def test_domanda_a_tiro_valida(tmp_path: Path) -> None:
    dest = copia(MINI, tmp_path)
    scrivi_domande(dest, [domanda_tiro()])
    assert errori_domande(dest) == []


def test_domanda_indizio_valida(tmp_path: Path) -> None:
    dest = copia(MINI, tmp_path)
    scrivi_domande(dest, [senza(domanda_tiro(quando="indizio", ids=["i_cera"]), "temi")])
    assert errori_domande(dest) == []


def test_prova_di_png_valida_sul_srd(tmp_path: Path) -> None:
    dest = copia(MINI, tmp_path)
    scrivi_domande(dest, [domanda_png({"png": "png_bruno", "prova": "caratteristica:saggezza",
                                        "difficolta": "difficile", "visibile": True})])
    assert errori_domande(dest) == []


def test_prova_di_png_valida_sul_set_della_campagna(tmp_path: Path) -> None:
    # pbta ha un set proprio (caratteristiche vigore, astuzia, fascino, sangue_freddo; difficoltà normale, rischiosa).
    dest = copia(PBTA, tmp_path)
    scrivi_domande(dest, [domanda_png({"png": "png_ruggero", "prova": "caratteristica:astuzia",
                                        "difficolta": "rischiosa"})])
    assert errori_domande(dest) == []


# --- gli errori -----------------------------------------------------------------------------------

def test_id_senza_prefisso_d(tmp_path: Path) -> None:
    dest = copia(MINI, tmp_path)
    scrivi_domande(dest, [domanda_tiro(id="guardia_sveglia")])
    assert tiene(dest, "DOMANDE.id")


def test_id_ripetuto_in_un_altro_file_della_campagna(tmp_path: Path) -> None:
    dest = copia(MINI, tmp_path)
    scrivi_domande(dest, [domanda_tiro()])
    # Same id in a second scene sheet: ids are unique across the whole campaign.
    (dest / "scene").mkdir()
    altra = {"id": "altra_scena", "nome": "Altra scena", "domande": [domanda_tiro()]}
    (dest / "scene" / "altra.yaml").write_text(yaml.safe_dump(altra, allow_unicode=True, sort_keys=False), encoding="utf-8")
    assert tiene(dest, "DOMANDE.id")


def test_quando_lascia_scena(tmp_path: Path) -> None:
    dest = copia(MINI, tmp_path)
    scrivi_domande(dest, [senza(domanda_tiro(quando="lascia_scena"), "temi")])
    assert tiene(dest, "DOMANDE.quando")


def test_azione_senza_temi(tmp_path: Path) -> None:
    dest = copia(MINI, tmp_path)
    scrivi_domande(dest, [senza(domanda_tiro(), "temi")])
    assert tiene(dest, "DOMANDE.temi")


def test_tiro_e_prova_png_insieme(tmp_path: Path) -> None:
    dest = copia(MINI, tmp_path)
    scrivi_domande(dest, [domanda_tiro(prova_png=PROVA_IRMA)])
    assert tiene(dest, "DOMANDE.tiro")


def test_ne_tiro_ne_prova_png(tmp_path: Path) -> None:
    dest = copia(MINI, tmp_path)
    scrivi_domande(dest, [senza(domanda_tiro(), "tiro")])
    assert tiene(dest, "DOMANDE.tiro")


def test_tiro_con_almeno_maggiore_del_dado(tmp_path: Path) -> None:
    dest = copia(MINI, tmp_path)
    scrivi_domande(dest, [domanda_tiro(tiro={"dado": 6, "almeno": 7})])
    assert tiene(dest, "DOMANDE.tiro")


def test_png_inesistente(tmp_path: Path) -> None:
    dest = copia(MINI, tmp_path)
    scrivi_domande(dest, [domanda_png({"png": "png_nessuno", "prova": "abilita:intuizione"})])
    assert tiene(dest, "DOMANDE.prova_png")


def test_abilita_sconosciuta_sul_srd(tmp_path: Path) -> None:
    dest = copia(MINI, tmp_path)
    scrivi_domande(dest, [domanda_png({"png": "png_irma", "prova": "abilita:cucina"})])
    assert tiene(dest, "DOMANDE.prova_png")


def test_difficolta_sconosciuta_sul_srd(tmp_path: Path) -> None:
    dest = copia(MINI, tmp_path)
    scrivi_domande(dest, [domanda_png({"png": "png_irma", "prova": "abilita:intuizione", "difficolta": "impossibile"})])
    assert tiene(dest, "DOMANDE.difficolta")


def test_difficolta_srd_non_vale_sul_set_della_campagna(tmp_path: Path) -> None:
    dest = copia(PBTA, tmp_path)
    scrivi_domande(dest, [domanda_png({"png": "png_ruggero", "prova": "caratteristica:astuzia", "difficolta": "media"})])
    assert tiene(dest, "DOMANDE.difficolta")


def test_salvezza_non_esiste_sul_set_della_campagna(tmp_path: Path) -> None:
    dest = copia(PBTA, tmp_path)
    scrivi_domande(dest, [domanda_png({"png": "png_ruggero", "prova": "salvezza:vigore"})])
    assert tiene(dest, "DOMANDE.prova_png")


def test_se_no_mancante(tmp_path: Path) -> None:
    dest = copia(MINI, tmp_path)
    scrivi_domande(dest, [senza(domanda_tiro(), "se_no")])
    assert tiene(dest, "DOMANDE.se_no")
