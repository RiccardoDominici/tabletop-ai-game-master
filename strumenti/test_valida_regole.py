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
BX = FIXTURE / "bx"
ENGINE_COMBATTIMENTO = RADICE / "apps" / "server" / "src" / "regole" / "combattimento.ts"
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

@pytest.mark.parametrize("sorgente", [PBTA, SOGLIA, BX], ids=["pbta", "soglia", "bx"])
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


@pytest.mark.parametrize(
    "rompi, codice",
    [
        (lambda d: d["risoluzione"].update(critico=30), "REGOLE.critico"),
        (lambda d: d["risoluzione"].update(disastro=20), "REGOLE.disastro"),
        (lambda d: d["risoluzione"].update(critici="prove"), "REGOLE.critici"),
        (lambda d: d.setdefault("attacchi", {}).update(danno_critico="triplo"), "REGOLE.attacchi"),
        (lambda d: d.setdefault("attacchi", {}).update(danno_minimo=-1), "REGOLE.attacchi"),
    ],
    ids=["critico", "disastro", "critici", "danno-critico", "danno-minimo"],
)
def test_critici_e_danni_del_set_d20(tmp_path: Path, rompi, codice: str) -> None:
    """I naturali del d20 e il danno del critico sono del set (prima il Motore applicava l'SRD a tutti)."""
    dest = copia(BX, tmp_path)
    modifica(dest, "regole/regole.yaml", rompi)
    assert tiene(dest, codice), regole_di(dest)


TABELLA_BF = [{"da": 3, "mod": -3}, {"da": 4, "mod": -2}, {"da": 6, "mod": -1}, {"da": 9, "mod": 0},
              {"da": 13, "mod": 1}, {"da": 16, "mod": 2}, {"da": 18, "mod": 3}]


@pytest.mark.parametrize("tabella", [[], [{"da": 3}], [{"da": 9, "mod": 0}, {"da": 4, "mod": -2}]], ids=["vuota", "senza-mod", "non-cresce"])
def test_modificatore_tabella_rotta(tmp_path: Path, tabella) -> None:
    dest = copia(BX, tmp_path)
    modifica(dest, "regole/regole.yaml", lambda d: d.update(modificatore={"tipo": "tabella", "tabella": tabella}))
    assert tiene(dest, "REGOLE.modificatore"), regole_di(dest)


def test_modificatore_tabella_e_schede_coi_punteggi(tmp_path: Path) -> None:
    """Con la tabella la scheda scrive il punteggio: valori sotto la prima riga sono bonus scritti per sbaglio (avviso)."""
    dest = copia(BX, tmp_path)
    modifica(dest, "regole/regole.yaml", lambda d: d.update(modificatore={"tipo": "tabella", "tabella": TABELLA_BF}))
    assert not tiene(dest, "REGOLE.modificatore"), regole_di(dest)
    modifica(dest, "pg.yaml", lambda d: d["personaggi"][0]["scheda"]["caratteristiche"].update(forza=1))
    esito = Esito(rigoroso=True)
    regole_set.controlla(carica(dest, esito), esito)
    assert any(v.codice == "REGOLE.scheda" and "sotto la tabella" in v.messaggio for v in esito.errori)


def test_abilita_sotto_soglia_e_attacco_automatico(tmp_path: Path) -> None:
    """Percentuali e «x su 6» come soglia della scheda; l'arma che colpisce sempre."""
    dest = copia(BX, tmp_path)
    modifica(dest, "regole/regole.yaml", lambda d: d.setdefault("abilita", []).extend([
        {"id": "scalare", "nome": "Scalare", "soglia": {"dado": 100}}, {"id": "porte", "nome": "Porte", "soglia": {"dado": 6, "predefinita": 1}}]))
    modifica(dest, "pg.yaml", lambda d: d["personaggi"][0]["scheda"].update(abilita={"scalare": 80, "porte": 2})
             or d["personaggi"][0]["scheda"]["attacchi"][0].update(automatico=True))
    assert not any(r.startswith(("REGOLE.abilita", "REGOLE.scheda")) for r in regole_di(dest)), regole_di(dest)
    modifica(dest, "pg.yaml", lambda d: d["personaggi"][0]["scheda"].update(abilita={"scalare": 80, "porte": 9})
             or d["personaggi"][0]["scheda"]["attacchi"][0].update(automatico="sì"))
    assert any("porte = 9" in r for r in regole_di(dest)) and any("automatico" in r for r in regole_di(dest)), regole_di(dest)
    modifica(dest, "regole/regole.yaml", lambda d: d["abilita"].append({"id": "x", "nome": "X", "soglia": {"dado": 8}}))
    assert any("abilita.x.soglia" in r for r in regole_di(dest)), regole_di(dest)


def test_critici_validi_e_null(tmp_path: Path) -> None:
    dest = copia(BX, tmp_path)
    modifica(dest, "regole/regole.yaml", lambda d: d["risoluzione"].update(critico=None, disastro=None, critici="tutti")
             or d.setdefault("attacchi", {}).update(danno_critico="normale", danno_minimo=1))
    assert not any(r.startswith("REGOLE.") for r in regole_di(dest) if any(k in r for k in ("critic", "disastro", "attacchi"))), regole_di(dest)


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


# --- richiede.prova: gli id del set, non quelli di D&D --------------------------------------------

def _richiede(cartella: Path, prova: str) -> None:
    def cambia(d: dict) -> None:
        d["battute"][0].setdefault("richiede", {})["prova"] = prova
    modifica(cartella, "repertorio/png_bertoldo.yaml", cambia)


def test_richiede_prova_del_set_passa(tmp_path: Path) -> None:
    """Il fixture pbta ha `prova: convincere`, una mossa del suo set: deve passare, e così un id p_… di scena."""
    assert not tiene(PBTA, "REGOLE.richiede_prova")
    dest = copia(PBTA, tmp_path)
    _richiede(dest, "p_guado")
    assert not tiene(dest, "REGOLE.richiede_prova")


@pytest.mark.parametrize("prova", ["persuadere", "scassinare", "atletica"], ids=["abilita-di-dd", "mossa-inesistente", "abilita-srd"])
def test_richiede_prova_fuori_dal_set_non_passa(tmp_path: Path, prova: str) -> None:
    dest = copia(PBTA, tmp_path)
    _richiede(dest, prova)
    assert tiene(dest, "REGOLE.richiede_prova")


def test_richiede_prova_di_dd_con_il_set_soglia_non_passa(tmp_path: Path) -> None:
    """Il set soglia ha `persuadere`, ma `convincere` è una mossa del set pbta: fuori dal suo vocabolario."""
    dest = copia(SOGLIA, tmp_path)
    _richiede(dest, "convincere")
    assert tiene(dest, "REGOLE.richiede_prova")


# --- combattimento: la sezione combattimento: di regole.yaml (docs/combattimento.md, classe REGOLE) ----

def _combattimento(cartella: Path, rompi) -> None:
    modifica(cartella, "regole/regole.yaml", lambda d: rompi(d["combattimento"]))


@pytest.mark.parametrize(
    "rompi, dettaglio",
    [
        (lambda c: c["iniziativa"].update(tipo="a_turni"), "iniziativa.tipo"),
        (lambda c: c["iniziativa"].update(dado=7), "iniziativa.dado"),
        (lambda c: c["iniziativa"].update(caratteristica="fede"), "iniziativa.caratteristica"),
        (lambda c: c["iniziativa"].update(ogni_round="sempre"), "iniziativa.ogni_round"),
        (lambda c: c.update(fasi=[]), "fasi: almeno una"),
        (lambda c: c["fasi"][0].update(id="Movimento"), "fasi[1]: serve un id"),
        (lambda c: c["fasi"][1].update(png="magia_nera"), "fasi.proiettili.png"),
        (lambda c: c["danni"].update(modello="sangue"), "danni.modello"),
        (lambda c: c["danni"]["a_zero"].update(pg="fuga"), "danni.a_zero.pg"),
        (lambda c: c["danni"]["a_zero"].update(png="svenuto"), "danni.a_zero.png"),
        (lambda c: c["danni"].update(tiri_morte={"cd": 0, "successi": 3, "fallimenti": 3}), "danni.tiri_morte"),
        (lambda c: c["danni"].update(tiri_morte={"cd": 10, "successi": 3, "fallimenti": 3, "venti_rialza": "sì"}), "tiri_morte.venti_rialza"),
        (lambda c: c["condizioni"][0]["effetti"].append("volare"), "effetto «volare»"),
        (lambda c: c["condizioni"].append(dict(c["condizioni"][0])), "id ripetuto"),
        (lambda c: c.update(condizione_a_zero="inesistente"), "condizione_a_zero"),
        (lambda c: c.update(fine={"morale": "sì"}), "fine.morale"),
    ],
    ids=["tipo", "dado", "caratteristica", "ogni-round", "fasi-vuote", "fase-id", "fase-png", "modello",
         "a-zero-pg", "a-zero-png", "tiri-morte", "tiri-morte-venti", "effetto-chiuso", "condizione-doppia", "a-zero-condizione", "morale"],
)
def test_combattimento_del_set_bx(tmp_path: Path, rompi, dettaglio: str) -> None:
    dest = copia(BX, tmp_path)
    _combattimento(dest, rompi)
    assert any("REGOLE.combattimento" in r and dettaglio in r for r in regole_di(dest)), regole_di(dest)


def test_combattimento_bx_valido(tmp_path: Path) -> None:
    assert not tiene(BX, "REGOLE.combattimento")


def test_combattimento_non_mappa(tmp_path: Path) -> None:
    dest = copia(BX, tmp_path)
    modifica(dest, "regole/regole.yaml", lambda d: d.update(combattimento="a turni"))
    assert tiene(dest, "REGOLE.combattimento")


def test_pbta_senza_iniziativa_e_valido(tmp_path: Path) -> None:
    """Un set PbtA senza turni: una riga, iniziativa nessuna."""
    dest = copia(PBTA, tmp_path)
    modifica(dest, "regole/regole.yaml", lambda d: d.update(combattimento={"iniziativa": {"tipo": "nessuna"}}))
    assert regole_di(dest) == []


def test_pbta_senza_sezione_usa_i_default(tmp_path: Path) -> None:
    assert not tiene(PBTA, "REGOLE.combattimento")


def test_morale_del_png_fuori_da_2_12(tmp_path: Path) -> None:
    dest = copia(BX, tmp_path)
    modifica(dest, "png/png_bertoldo.yaml", lambda d: d["scheda"].update(morale=13))
    assert tiene(dest, "REGOLE.scheda")


def test_effetti_come_il_motore() -> None:
    """Gli effetti del validatore e del motore devono coincidere: un effetto nuovo va in entrambi."""
    import re as _re
    from valida.regole_combattimento import EFFETTI
    testo = ENGINE_COMBATTIMENTO.read_text(encoding="utf-8")
    blocco = _re.search(r"export const EFFETTI = \[(.*?)\] as const", testo, _re.S).group(1)
    motore = tuple(_re.findall(r"'([a-z_]+)'", blocco))
    assert tuple(EFFETTI) == motore


def test_parole_chiave_generiche_rifiutate_in_modo_rigoroso(tmp_path: Path) -> None:
    """Parole generiche (porta, passaggio, spalla…) in parole_chiave e nelle parole delle prove della scena: da sole non
    dicono quale prova (e2e finale, D1). L'arbitro a regole le ignora, il validatore le segnala (rigoroso: errore)."""
    dest = copia(BX, tmp_path)
    modifica(dest, "regole/regole.yaml", lambda d: d.update(parole_chiave={"forza": ["sfondo", "porta", "porta bloccata"]}))
    esito = Esito(rigoroso=True)
    regole_set.controlla(carica(dest, esito), esito)
    trovate = [v.messaggio for v in esito.errori if v.codice == "REGOLE.parole_generiche"]
    assert len(trovate) == 1 and "«porta»" in trovate[0] and "bloccata" not in trovate[0], trovate
