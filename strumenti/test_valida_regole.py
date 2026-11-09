"""Test dei controlli sul set di regole della campagna (strumenti/valida/regole_set.py, classe REGOLE).

I fixture sono quelli del motore (apps/server/test/fixtures/campagne/pbta e soglia): ciascun set valido sta
in regole/, con riassunto ed estratti. Ogni test ne fa una copia, rompe UNA cosa e controlla il codice.

    python3 -m pytest -q strumenti/test_valida_regole.py
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

import pytest
import yaml

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI))

from valida import regole_set  # noqa: E402
from valida.carica import carica  # noqa: E402
from valida.esito import Esito  # noqa: E402
from valida import valida  # noqa: E402

RADICE = QUI.parent
FIXTURE = RADICE / "apps" / "server" / "test" / "fixtures" / "campagne"
PBTA = FIXTURE / "pbta"
SOGLIA = FIXTURE / "soglia"
MINI = QUI / "test_valida_fixtures" / "mini"


def copia(sorgente: Path, tmp_path: Path) -> Path:
    dest = tmp_path / sorgente.name
    shutil.copytree(sorgente, dest)
    return dest


def regole_di(cartella: Path) -> list[str]:
    """Errori REGOLE del set, con messaggio: solo la parte di set, senza il resto della campagna."""
    esito = Esito()
    c = carica(cartella, esito)
    regole_set.controlla(c, esito)
    return [f"{v.codice} {v.messaggio}" for v in esito.errori if v.codice.startswith("REGOLE.")]


def tiene(cartella: Path, codice: str) -> bool:
    return any(r.startswith(codice + " ") or r.startswith(codice + ":") for r in regole_di(cartella))


def modifica(cartella: Path, rel: str, funzione) -> None:
    file = cartella / rel
    dati = yaml.safe_load(file.read_text(encoding="utf-8"))
    funzione(dati)
    file.write_text(yaml.safe_dump(dati, allow_unicode=True, sort_keys=False), encoding="utf-8")


# --- i set validi ---------------------------------------------------------------------------------

@pytest.mark.parametrize("sorgente", [PBTA, SOGLIA], ids=["pbta", "soglia"])
def test_i_set_del_motore_sono_validi(sorgente: Path) -> None:
    assert regole_di(sorgente) == []


def test_senza_regole_non_fa_nulla(tmp_path: Path) -> None:
    assert regole_di(copia(MINI, tmp_path)) == []


def test_set_srd_non_viene_controllato_come_set(tmp_path: Path) -> None:
    dest = copia(PBTA, tmp_path)
    modifica(dest, "regole/regole.yaml", lambda d: d.update(id="srd-5.2", caratteristiche="rotto"))
    assert regole_di(dest) == []


# --- schema ---------------------------------------------------------------------------------------

@pytest.mark.parametrize(
    "rompi, codice",
    [
        (lambda d: d.pop("nome"), "REGOLE.nome"),
        (lambda d: d["fonte"].pop("titolo"), "REGOLE.fonte"),
        (lambda d: d["licenza"].update(libera="sì"), "REGOLE.licenza"),
        (lambda d: d["licenza"].pop("nome"), "REGOLE.licenza"),
        (lambda d: d.update(id="Due Sei"), "REGOLE.id"),
        (lambda d: d["risoluzione"].update(tipo="a_caso"), "REGOLE.risoluzione"),
        (lambda d: d["caratteristiche"].append({"id": "Fascino", "nome": "x"}), "REGOLE.caratteristiche"),
        (lambda d: d["caratteristiche"].append({"id": "vigore", "nome": "doppio"}), "REGOLE.caratteristiche"),
        (lambda d: d.update(modificatore={"tipo": "soglia"}), "REGOLE.modificatore"),
        (lambda d: d.update(difficolta_predefinita="inesistente"), "REGOLE.difficolta_predefinita"),
        (lambda d: d.update(vantaggio={"tipo": "dado_bonus"}), "REGOLE.vantaggio"),
        (lambda d: d.update(sociale={"caratteristica": "lucidita"}), "REGOLE.sociale"),
        (lambda d: d["mosse"][0].update(caratteristica="forza"), "REGOLE.mosse"),
        (lambda d: d["mosse"][0]["esiti"].pop("fallimento"), "REGOLE.mosse"),
        (lambda d: d.setdefault("abilita", []).append({"id": "x", "nome": "x", "caratteristica": "nope"}), "REGOLE.abilita"),
    ],
    ids=["nome", "fonte", "licenza-libera-testo", "licenza-senza-nome", "id", "tipo", "car-id-maiuscolo", "car-doppia",
         "soglia-su-2d6", "predefinita", "dado-bonus-su-2d6", "sociale", "mossa-car", "mossa-esiti", "abilita-car"],
)
def test_schema_del_set(tmp_path: Path, rompi, codice: str) -> None:
    dest = copia(PBTA, tmp_path)
    modifica(dest, "regole/regole.yaml", rompi)
    assert tiene(dest, codice), regole_di(dest)


def test_sotto_soglia_richiede_dado_20_o_100_e_divisore(tmp_path: Path) -> None:
    dest = copia(SOGLIA, tmp_path)
    modifica(dest, "regole/regole.yaml", lambda d: d["risoluzione"].update(dado=50))
    assert tiene(dest, "REGOLE.dado")
    dest2 = copia(SOGLIA, tmp_path / "b")
    modifica(dest2, "regole/regole.yaml", lambda d: d["difficolta"][1].pop("divisore"))
    assert tiene(dest2, "REGOLE.difficolta")


def test_d20_cd_richiede_la_cd(tmp_path: Path) -> None:
    dest = copia(PBTA, tmp_path)
    modifica(dest, "regole/regole.yaml", lambda d: d.update(risoluzione={"tipo": "d20_cd", "dado": 20}))
    assert tiene(dest, "REGOLE.difficolta")  # le difficoltà del fixture non hanno valore (la CD)


# --- licenza --------------------------------------------------------------------------------------

def test_licenza_non_libera_vuole_il_gitignore_della_cartella(tmp_path: Path) -> None:
    dest = copia(PBTA, tmp_path)
    modifica(dest, "regole/regole.yaml", lambda d: d["licenza"].update(libera=False, nome="proprietaria"))
    assert tiene(dest, "REGOLE.licenza_gitignore")
    (dest / "regole" / ".gitignore").write_text("# non libero\n*\n", encoding="utf-8")
    assert not tiene(dest, "REGOLE.licenza_gitignore")


# --- riassunto ed estratti ------------------------------------------------------------------------

def test_estratto_senza_parole_non_si_trova(tmp_path: Path) -> None:
    dest = copia(PBTA, tmp_path)
    (dest / "regole" / "estratti" / "pressione.md").write_text("---\ntitolo: Pressione\nparole: []\n---\nTesto.\n", encoding="utf-8")
    assert tiene(dest, "REGOLE.parole")


def test_estratto_senza_intestazione_o_vuoto(tmp_path: Path) -> None:
    dest = copia(PBTA, tmp_path)
    (dest / "regole" / "estratti" / "pressione.md").write_text("Solo testo, nessuna intestazione.\n", encoding="utf-8")
    assert tiene(dest, "REGOLE.estratto")
    (dest / "regole" / "estratti" / "pressione.md").write_text("---\ntitolo: P\nparole: [x]\n---\n", encoding="utf-8")
    assert tiene(dest, "REGOLE.estratto")


def test_riassunto_troppo_lungo_e_avviso_non_errore(tmp_path: Path) -> None:
    dest = copia(PBTA, tmp_path)
    (dest / "regole" / "riassunto.md").write_text(" ".join(["parola"] * 420) + "\n", encoding="utf-8")
    assert not tiene(dest, "REGOLE.riassunto")  # è un avviso
    esito = Esito()
    regole_set.controlla(carica(dest, esito), esito)
    assert any(v.codice == "REGOLE.riassunto" for v in esito.avvisi)


# --- schede e prove nel vocabolario del set -------------------------------------------------------

def test_scheda_con_le_caratteristiche_del_set(tmp_path: Path) -> None:
    dest = copia(PBTA, tmp_path)
    modifica(dest, "png/png_bertoldo.yaml", lambda d: d["scheda"]["caratteristiche"].pop("vigore"))
    assert tiene(dest, "REGOLE.scheda")
    dest2 = copia(PBTA, tmp_path / "b")
    modifica(dest2, "png/png_bertoldo.yaml", lambda d: d["scheda"]["caratteristiche"].update(forza=2))
    assert tiene(dest2, "REGOLE.scheda")  # «forza» è di D&D, non del set


def test_scheda_pf_positivi_e_abilita_del_set(tmp_path: Path) -> None:
    dest = copia(PBTA, tmp_path)
    modifica(dest, "png/png_bertoldo.yaml", lambda d: d["scheda"].update(pf=0))
    assert tiene(dest, "REGOLE.scheda")
    dest2 = copia(SOGLIA, tmp_path / "b")
    modifica(dest2, "png/png_bertoldo.yaml", lambda d: d["scheda"].update(abilita={"combattere": 40, "volare": 10}))
    assert tiene(dest2, "REGOLE.scheda")  # «volare» non è un'abilità del set soglia


def test_prova_della_scena_nel_vocabolario_del_set(tmp_path: Path) -> None:
    dest = copia(PBTA, tmp_path)
    modifica(dest, "scena.yaml", lambda d: d["prove"][0].update(mossa="scassinare"))
    assert tiene(dest, "REGOLE.prove")
    dest2 = copia(SOGLIA, tmp_path / "b")
    modifica(dest2, "scena.yaml", lambda d: d.update(prove=[{"id": "p_x", "quando": "q", "abilita": "combattere", "difficolta": "leggera", "se_fallisce": "s"}]))
    assert tiene(dest2, "REGOLE.prove")


# --- integrazione: il validatore intero con un set -----------------------------------------------

def test_con_un_set_le_schede_srd_non_si_controllano(tmp_path: Path) -> None:
    """Una campagna con set non SRD: le caratteristiche di D&D nelle schede danno errori REGOLE, non SCHEDA."""
    dest = copia(MINI, tmp_path)
    shutil.copytree(PBTA / "regole", dest / "regole")
    esito, _ = valida(dest, rigoroso=False, voci=None, contesto_b=False)
    codici = {v.codice for v in esito.errori}
    assert any(c.startswith("REGOLE.scheda") for c in codici), sorted(codici)
    assert not any(c.startswith("SCHEDA.") and c != "SCHEDA.mancante" for c in codici), sorted(codici)


def test_il_set_srd_con_i_passi_della_campagna_non_rompe_le_schede(tmp_path: Path) -> None:
    dest = copia(MINI, tmp_path)
    (dest / "regole").mkdir()
    (dest / "regole" / "regole.yaml").write_text("id: srd-5.2\nnome: SRD\nfonte: {titolo: SRD 5.2}\nlicenza: {nome: CC-BY-4.0, libera: true}\n", encoding="utf-8")
    assert regole_di(dest) == []
