"""Test del validatore (strumenti/valida_campagna.py).

La campagna `test_valida_fixtures/mini` è valida anche in modo rigoroso. Ogni test ne fa una copia,
rompe UNA cosa e controlla che esca l'errore della classe giusta (e che la copia intatta non ne abbia).

    python3 -m pytest -q strumenti/test_valida_campagna.py
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

import pytest
import yaml

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI))

from valida import valida  # noqa: E402

MINI = QUI / "test_valida_fixtures" / "mini"
VOCI = QUI.parent / "assets" / "voci" / "voci.yaml"
RADICE = QUI.parent


# --- strumenti per i test ------------------------------------------------------------------------

@pytest.fixture
def camp(tmp_path: Path) -> Path:
    dest = tmp_path / "mini"
    shutil.copytree(MINI, dest)
    return dest


def leggi(cartella: Path, rel: str):
    return yaml.safe_load((cartella / rel).read_text(encoding="utf-8"))


def scrivi(cartella: Path, rel: str, dati) -> None:
    (cartella / rel).write_text(yaml.safe_dump(dati, allow_unicode=True, sort_keys=False), encoding="utf-8")


def modifica(cartella: Path, rel: str, funzione) -> None:
    dati = leggi(cartella, rel)
    funzione(dati)
    scrivi(cartella, rel, dati)


def battuta(dati: dict, bid: str) -> dict:
    return next(b for b in dati["battute"] if b["id"] == bid)


def errori(cartella: Path, rigoroso: bool = False) -> set[str]:
    esito, _ = valida(cartella, rigoroso=rigoroso, voci=VOCI if VOCI.exists() else None)
    return esito.codici()


def classi(cartella: Path, rigoroso: bool = False) -> set[str]:
    return {c.split(".")[0] for c in errori(cartella, rigoroso)}


# --- campagne valide ------------------------------------------------------------------------------

def test_mini_valida_anche_in_modo_rigoroso(camp):
    assert errori(camp) == set()
    assert errori(camp, rigoroso=True) == set()


def test_prova_f0_valida():
    prova = RADICE / "campagne" / "prova-f0"
    if not prova.exists():
        pytest.skip("campagne/prova-f0 assente")
    assert errori(prova) == set()


def test_cli_codici_di_uscita(camp):
    script = QUI / "valida_campagna.py"
    ok = subprocess.run([sys.executable, "-I", str(script), str(camp)], capture_output=True, text=True)
    assert ok.returncode == 0, ok.stdout
    (camp / "stile.yaml").unlink()
    ko = subprocess.run([sys.executable, "-I", str(script), str(camp)], capture_output=True, text=True)
    assert ko.returncode == 1 and "STRUTTURA.file_mancante" in ko.stdout
    assert subprocess.run([sys.executable, "-I", str(script)], capture_output=True).returncode == 2


# --- STRUTTURA ------------------------------------------------------------------------------------

def test_struttura_file_mancante(camp):
    (camp / "pg.yaml").unlink()
    assert "STRUTTURA.file_mancante" in errori(camp)


def test_struttura_yaml_illeggibile(camp):
    (camp / "scena.yaml").write_text("id: [non chiusa\n", encoding="utf-8")
    assert "STRUTTURA.yaml" in errori(camp)


# --- STILE ----------------------------------------------------------------------------------------

def test_stile_premessa_in_due_frasi(camp):
    modifica(camp, "stile.yaml", lambda d: d.update(premessa="Una lanterna sparisce. Il paese aspetta."))
    assert "STILE.premessa" in errori(camp)


def test_stile_tag_musicale_fuori_vocabolario(camp):
    modifica(camp, "stile.yaml", lambda d: d["tavolozza_musicale"].update(tag=["jazz_notturno"]))
    assert "STILE.musica" in errori(camp)


# --- CANONE ---------------------------------------------------------------------------------------

def test_canone_fatto_inesistente(camp):
    modifica(camp, "png/png_irma.yaml", lambda d: d["sa"].append("f_inesistente"))
    assert "CANONE.riferimento" in errori(camp)


def test_canone_id_duplicato(camp):
    modifica(camp, "campagna.yaml", lambda d: d["canone"].append(dict(d["canone"][0])))
    assert "CANONE.duplicato" in errori(camp)


# --- PNG ------------------------------------------------------------------------------------------

def test_png_sa_e_non_sa_si_sovrappongono(camp):
    modifica(camp, "png/png_bruno.yaml", lambda d: d["non_sa"].append("f_bruno_visto"))
    assert "PNG.sa_non_sa" in errori(camp)


def test_png_mente_su_cio_che_non_sa(camp):
    modifica(camp, "png/png_bruno.yaml", lambda d: d["mente_su"][0].update(verita="f_lanterna_cantina"))
    assert "PNG.mente_su" in errori(camp)


def test_png_credenza_falsa_che_e_una_menzogna(camp):
    modifica(camp, "png/png_irma.yaml", lambda d: d["crede_a_torto"][0].update(contraddice="f_lanterna_cantina"))
    assert "PNG.crede_a_torto" in errori(camp)


def test_png_atteggiamento_mancante(camp):
    modifica(camp, "png/png_irma.yaml", lambda d: d["atteggiamento_pg"].pop("pg_tobia"))
    assert "PNG.atteggiamento" in errori(camp)


def test_png_voce_del_narratore(camp):
    modifica(camp, "png/png_irma.yaml", lambda d: d["voce"]["tts"].update(voce_id="narratore"))
    assert "PNG.voce" in errori(camp)


def test_png_segnale_uguale_al_gesto(camp):
    modifica(camp, "png/png_irma.yaml", lambda d: d["voce"].update(gesto=d["mente_su"][0]["segnale"]))
    assert "PNG.segnale" in errori(camp)


def test_png_alias_solo_in_rigoroso(camp):
    modifica(camp, "png/png_bruno.yaml", lambda d: d.pop("alias"))
    assert "PNG.alias" not in errori(camp)
    assert "PNG.alias" in errori(camp, rigoroso=True)


# --- SCENA ----------------------------------------------------------------------------------------

def test_scena_sensi_non_tre(camp):
    modifica(camp, "scena.yaml", lambda d: d["sensi"].pop())
    assert "SCENA.sensi" in errori(camp)


def test_scena_due_png_con_la_stessa_voce(camp):
    modifica(camp, "png/png_bruno.yaml", lambda d: d["voce"]["tts"].update(voce_id="nadine"))
    assert "SCENA.voci" in errori(camp)


def test_scena_apertura_troppo_lunga(camp):
    modifica(camp, "scena.yaml", lambda d: d.update(apertura=d["apertura"].replace(" Dalla", " Fa freddo. Dalla")))
    assert "SCENA.apertura" in errori(camp)


def test_scena_uscita_verso_nodo_inesistente(camp):
    modifica(camp, "scena.yaml", lambda d: d["uscite"][0].update(verso="n_luna"))
    assert "SCENA.uscite" in errori(camp)


# --- INDIZI ---------------------------------------------------------------------------------------

def test_indizi_meno_di_tre(camp):
    def togli(d):
        d["rivelazioni"][0]["indizi"].remove("i_bruno_racconta")
    modifica(camp, "campagna.yaml", togli)
    assert "INDIZI.tre_indizi" in errori(camp)


def test_indizio_essenziale_dietro_un_tiro(camp):
    modifica(camp, "scena.yaml", lambda d: d["indizi"][0].update(tiro="Percezione CD 12"))
    assert "INDIZI.dietro_un_tiro" in errori(camp)


def test_collo_di_bottiglia_con_due_soluzioni(camp):
    modifica(camp, "campagna.yaml", lambda d: d["colli_di_bottiglia"][0]["soluzioni"].pop())
    assert "INDIZI.collo" in errori(camp)


# --- FRONTI ---------------------------------------------------------------------------------------

def test_fronti_orologio_di_cinque_segmenti(camp):
    def cinque(d):
        o = d["orologi"][0]
        o["segmenti"] = 5
        o["segni"].append("Un altro segno, di troppo.")
    modifica(camp, "campagna.yaml", cinque)
    assert "FRONTI.segmenti" in errori(camp)


def test_fronti_un_segno_per_segmento(camp):
    modifica(camp, "campagna.yaml", lambda d: d["orologi"][0]["segni"].pop())
    assert "FRONTI.segni" in errori(camp)


def test_fronti_presagi_del_fronte_di_campagna(camp):
    modifica(camp, "campagna.yaml", lambda d: d["preparazione"]["fronti"][0]["pericoli"][0]["presagi"].pop())
    assert "FRONTI.presagi" in errori(camp)


# --- GRAFO ----------------------------------------------------------------------------------------

def test_grafo_nodo_irraggiungibile(camp):
    modifica(camp, "campagna.yaml", lambda d: d["nodi"].append({"id": "n_isola", "tipo": "luogo", "collegamenti": ["n_locanda"]}))
    assert "GRAFO.irraggiungibile" in errori(camp)


def test_grafo_vicolo_cieco(camp):
    modifica(camp, "campagna.yaml", lambda d: d["nodi"][2].pop("prossima_sessione"))
    assert "GRAFO.vicolo_cieco" in errori(camp)


# --- SESSIONE -------------------------------------------------------------------------------------

def test_sessione_inizio_oltre_sei_frasi(camp):
    modifica(camp, "campagna.yaml", lambda d: d["sessione"].update(
        riassunto_iniziale=d["sessione"]["riassunto_iniziale"] + " Il paese dorme ancora."))
    assert "SESSIONE.inizio_lungo" in errori(camp)


# --- PG -------------------------------------------------------------------------------------------

def test_pg_id_non_valido(camp):
    modifica(camp, "pg.yaml", lambda d: d["personaggi"][0].update(id="Lia"))
    assert "PG.id" in errori(camp)


def test_pg_nominato_nella_situazione_comune(camp):
    modifica(camp, "pg.yaml", lambda d: d.update(situazione_comune="Lia vi ha portati al passo della Volpe."))
    assert "PG.situazione_comune" in errori(camp)


# --- PROSA ----------------------------------------------------------------------------------------

def test_prosa_frase_troppo_lunga(camp):
    lunga = "[narratore] " + " ".join(["la neve cade piano sui tetti della valle"] * 3) + "."
    modifica(camp, "repertorio/narrazione.yaml", lambda d: battuta(d, "nar_stallo").update(testo=[lunga]))
    assert "PROSA.frase_lunga" in errori(camp)


def test_prosa_nome_di_pg_nella_battuta(camp):
    modifica(camp, "repertorio/narrazione.yaml",
             lambda d: battuta(d, "tr_sala").update(testo=["[narratore] Lia, nella sala il camino scoppietta piano."]))
    assert "PROSA.nome_pg" in errori(camp)


def test_prosa_cifre(camp):
    modifica(camp, "repertorio/narrazione.yaml",
             lambda d: battuta(d, "tr_sala").update(testo=["[narratore] Nella sala ci sono 3 boccali vuoti sul bancone."]))
    assert "PROSA.cifre" in errori(camp)


# --- REPERTORIO -----------------------------------------------------------------------------------

def test_repertorio_riferimento_inesistente(camp):
    modifica(camp, "repertorio/png_irma.yaml",
             lambda d: battuta(d, "irma_lanterna_cera")["richiede"].update(indizi_rivelati=["i_fantasma"]))
    assert "REPERTORIO.riferimento" in errori(camp)


def test_repertorio_esempio_di_voce_che_mente(camp):
    modifica(camp, "repertorio/png_irma.yaml", lambda d: battuta(d, "irma_lanterna_versione").update(solo_esempio=True))
    assert "REPERTORIO.flag" in errori(camp)


def test_repertorio_quando_che_dice_chi_mente(camp):
    modifica(camp, "repertorio/png_bruno.yaml",
             lambda d: battuta(d, "bruno_notte_versione").update(quando="Bruno mente su cosa ha visto"))
    assert "REPERTORIO.quando" in errori(camp)


def test_repertorio_da_pg_inesistente(camp):
    modifica(camp, "repertorio/png_bruno.yaml",
             lambda d: battuta(d, "bruno_notte_promessa")["richiede"].update(da_pg=["pg_nessuno"]))
    assert "REPERTORIO.riferimento" in errori(camp)


# --- COPERTURA ------------------------------------------------------------------------------------

def test_copertura_menzogna_senza_segnale(camp):
    modifica(camp, "repertorio/png_irma.yaml", lambda d: battuta(d, "irma_lanterna_versione")["testo"].pop(0))
    assert "COPERTURA.segnale" in errori(camp)


def test_copertura_segno_di_orologio_mancante(camp):
    modifica(camp, "repertorio/narrazione.yaml", lambda d: d["battute"].remove(battuta(d, "nar_segno_3")))
    assert "COPERTURA.segno" in errori(camp)


def test_copertura_confessione_mancante(camp):
    def togli(d):
        d["battute"].remove(battuta(d, "irma_lanterna_cera"))
    modifica(camp, "repertorio/png_irma.yaml", togli)
    modifica(camp, "repertorio/parole_segrete.yaml",
             lambda d: [v.update(pubblica_dopo=[x for x in v["pubblica_dopo"] if x != "irma_lanterna_cera"]) for v in d["parole"]])
    assert "COPERTURA.confessione" in errori(camp)


def test_copertura_indizio_senza_rivelazione(camp):
    modifica(camp, "repertorio/narrazione.yaml", lambda d: d["battute"].remove(battuta(d, "nar_botte")))
    assert "COPERTURA.indizio" in errori(camp)


def test_copertura_cancello_e_privata_solo_in_rigoroso(camp):
    modifica(camp, "repertorio/png_bruno.yaml", lambda d: battuta(d, "bruno_notte_promessa").pop("richiede"))
    assert not {"COPERTURA.cancello", "COPERTURA.privata"} & errori(camp)
    assert {"COPERTURA.cancello", "COPERTURA.privata"} <= errori(camp, rigoroso=True)


def test_copertura_voce_senza_esempi(camp):
    modifica(camp, "repertorio/png_bruno.yaml",
             lambda d: d.update(battute=[b for b in d["battute"] if not b.get("solo_esempio")]))
    assert "COPERTURA.voce" in errori(camp)


def test_copertura_temi_generici_in_rigoroso(camp):
    modifica(camp, "repertorio/narrazione.yaml", lambda d: battuta(d, "nar_botte")["temi"].append("porta"))
    assert "COPERTURA.temi" not in errori(camp)
    assert "COPERTURA.temi" in errori(camp, rigoroso=True)


# --- SEGRETI --------------------------------------------------------------------------------------

def test_segreti_nel_catalogo(camp):
    modifica(camp, "repertorio/png_irma.yaml",
             lambda d: battuta(d, "irma_lanterna_versione").update(quando="un PG chiede a Irma del pegno"))
    assert "SEGRETI.catalogo" in errori(camp)


def test_segreti_detti_dal_narratore_prima_del_tempo(camp):
    modifica(camp, "repertorio/narrazione.yaml",
             lambda d: battuta(d, "tr_sala").update(testo=["[narratore] Nella sala si parla già di un fagotto, a mezzanotte."]))
    assert "SEGRETI.confini" in errori(camp)


def test_segreti_in_un_esempio_di_voce(camp):
    modifica(camp, "repertorio/png_irma.yaml",
             lambda d: battuta(d, "irma_offerta").update(testo=["[png_irma] Soldi? Me li darà il mercante."]))
    assert "SEGRETI.esempio_di_voce" in errori(camp)


def test_segreti_in_un_campo_pubblico(camp):
    modifica(camp, "scena.yaml", lambda d: d.update(apertura=d["apertura"].replace("la lanterna è sparita", "la lanterna è nella botte")))
    assert "SEGRETI.campo_pubblico" in errori(camp)


def test_segreti_rivelazione_non_elencata(camp):
    modifica(camp, "repertorio/parole_segrete.yaml",
             lambda d: d["parole"][2].update(pubblica_dopo=["i_bruno_racconta"]))  # tolta bruno_notte_promessa
    assert "SEGRETI.pubblica_dopo" in errori(camp)


def test_segreti_file_assente_con_repertorio(camp):
    (camp / "repertorio" / "parole_segrete.yaml").unlink()
    assert "SEGRETI.assente" in errori(camp)


def test_segreti_regex_non_valida(camp):
    modifica(camp, "repertorio/parole_segrete.yaml", lambda d: d["parole"][0].update(regex="lanterna(["))
    assert "SEGRETI.regex" in errori(camp)


def test_segreti_regex_che_non_protegge_niente(camp):
    from valida import valida as _v
    modifica(camp, "repertorio/parole_segrete.yaml", lambda d: d["parole"][2].update(regex="zzzz_nessuna_parola"))
    esito, _ = _v(camp)
    assert "SEGRETI.regex_inerte" in {v.codice for v in esito.avvisi}


# --- IMMAGINI -------------------------------------------------------------------------------------

def test_immagini_ritratto_senza_stile(camp):
    modifica(camp, "png/png_irma.yaml", lambda d: d["aspetto"].update(prompt_immagine="thin innkeeper woman, firelight"))
    assert "IMMAGINI.ritratto" in errori(camp)


def test_immagini_tratto_segreto_solo_in_rigoroso(camp):
    modifica(camp, "png/png_bruno.yaml", lambda d: d["aspetto"]["invarianti"].append("un fagotto sotto il mantello"))
    assert "IMMAGINI.segreto" not in errori(camp)
    assert "IMMAGINI.segreto" in errori(camp, rigoroso=True)


def test_copioni_misura_il_catalogo(camp, tmp_path):
    from valida import copioni
    from valida.esito import Esito
    cartella = tmp_path / "copioni"
    cartella.mkdir()
    scrivi(cartella, "prova.yaml", {"turni": [[{"pg": "pg_lia", "azione": "scendo in cantina e guardo le botti"}],
                                              [{"pg": "pg_tobia", "azione": "chiedo a Bruno se ha visto qualcosa stanotte"}]]})
    esito, c = valida(camp)
    righe = copioni.controlla(c, Esito(), cartella)
    assert "nar_botte" in righe[0] and "bruno_notte_versione" in righe[1]
    assert copioni.catalogo(c, "una frase senza parole utili") == []


def test_ogni_classe_ha_almeno_un_test():
    """Promemoria: una classe di errore nuova vuole il suo test qui sopra."""
    from valida.esito import CLASSI
    testo = Path(__file__).read_text(encoding="utf-8")
    for classe in CLASSI:
        assert f'"{classe}.' in testo, f"nessun test per la classe {classe}"
