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


def errori(cartella: Path, rigoroso: bool = False, contesto_b: bool = False) -> set[str]:
    """Codici d'errore. Il contesto vero del modo B (node, circa un secondo) solo dove serve."""
    esito, _ = valida(cartella, rigoroso=rigoroso, voci=VOCI if VOCI.exists() else None, contesto_b=contesto_b)
    return esito.codici()


def avvisi(cartella: Path, rigoroso: bool = False, contesto_b: bool = False) -> set[str]:
    esito, _ = valida(cartella, rigoroso=rigoroso, voci=VOCI if VOCI.exists() else None, contesto_b=contesto_b)
    return {v.codice for v in esito.avvisi}


def _node_disponibile() -> bool:
    from valida import contesto_b
    return contesto_b._comando() is not None


serve_node = pytest.mark.skipif(not _node_disponibile(), reason="node/tsx assenti: il contesto del modo B non si compila")


def classi(cartella: Path, rigoroso: bool = False) -> set[str]:
    return {c.split(".")[0] for c in errori(cartella, rigoroso)}


# --- campagne valide ------------------------------------------------------------------------------

def test_mini_valida_anche_in_modo_rigoroso(camp):
    assert errori(camp) == set()
    assert errori(camp, rigoroso=True) == set()


@serve_node
def test_mini_valida_col_contesto_vero_del_modo_b(camp):
    assert errori(camp, rigoroso=True, contesto_b=True) == set()
    assert "SEGRETI.contesto_b_non_controllato" not in avvisi(camp, contesto_b=True)


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


def test_cli_solo_alcune_classi(camp):
    # Nota 5 e 9: i controlli dei passi intermedi guardano solo le classi già scrivibili.
    script = QUI / "valida_campagna.py"
    modifica(camp, "scena.yaml", lambda d: d["sensi"].pop())
    tutto = subprocess.run([sys.executable, "-I", str(script), str(camp), "--senza-node"], capture_output=True, text=True)
    solo = subprocess.run([sys.executable, "-I", str(script), str(camp), "--solo", "STILE,CANONE"], capture_output=True, text=True)
    scena = subprocess.run([sys.executable, "-I", str(script), str(camp), "--solo", "SCENA.sensi"], capture_output=True, text=True)
    sbagliata = subprocess.run([sys.executable, "-I", str(script), str(camp), "--solo", "NIENTE"], capture_output=True, text=True)
    assert tutto.returncode == 1 and solo.returncode == 0 and scena.returncode == 1 and sbagliata.returncode == 2


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


def test_png_alias_generico_in_rigoroso(camp):
    # Nota 11: «vecchio» farebbe entrare il PNG in ogni azione sui vecchi del paese.
    modifica(camp, "png/png_bruno.yaml", lambda d: d["alias"].append("vecchio"))
    assert "PNG.alias" not in errori(camp)
    assert "PNG.alias" in errori(camp, rigoroso=True)


def test_png_alias_di_due_png(camp):
    modifica(camp, "png/png_bruno.yaml", lambda d: d["alias"].append("ostessa"))
    assert "PNG.alias" in errori(camp)


def test_png_stile_senza_numeri_e_un_avviso(camp):
    from valida.testo import limite_da_stile
    # Nota 10: prima «otto-quattordici» non si leggeva e valeva il tetto predefinito.
    assert limite_da_stile("Frasi di otto-quattordici parole, lente.", 16) == 16
    assert limite_da_stile("Frasi di tre-undici parole.", 16) == 14
    assert limite_da_stile("Al massimo sei parole per frase.", 16) == 9
    modifica(camp, "png/png_bruno.yaml", lambda d: d["voce"].update(stile="Parla piano, a frasi brevi."))
    assert "PNG.voce_stile" in avvisi(camp)


# --- SCENA ----------------------------------------------------------------------------------------

def test_scena_sensi_non_tre(camp):
    modifica(camp, "scena.yaml", lambda d: d["sensi"].pop())
    assert "SCENA.sensi" in errori(camp)


def test_scena_orologi_in_scena(camp):
    # Regole del Motore entrando nella scena (scena/orologi.ts): solo orologi attivi, interi sensati.
    modifica(camp, "scena.yaml", lambda d: d.update(orologi_in_scena={"o_processione": {"pieni_almeno": 2, "segno_almeno_ogni": 1}}))
    assert "SCENA.orologi_in_scena" not in errori(camp)
    modifica(camp, "scena.yaml", lambda d: d.update(orologi_in_scena={"o_processione": {"pieni_almeno": 9}, "o_altro": {"segno_almeno_ogni": 0}}))
    assert "SCENA.orologi_in_scena" in errori(camp)


def test_scena_rientro_con_battuta_inesistente(camp):
    modifica(camp, "scena.yaml", lambda d: d.update(rientro="nar_cera"))
    assert "SCENA.rientro" not in errori(camp)
    modifica(camp, "scena.yaml", lambda d: d.update(rientro="tr_mai_scritta"))
    assert "SCENA.rientro" in errori(camp)
    modifica(camp, "scena.yaml", lambda d: d.update(rientro="Di nuovo in piazza, tra le bancarelle."))
    assert "SCENA.rientro" not in errori(camp)


def test_scena_due_png_con_la_stessa_voce(camp):
    modifica(camp, "png/png_bruno.yaml", lambda d: d["voce"]["tts"].update(voce_id="nadine"))
    assert "SCENA.voci" in errori(camp)


def test_scena_due_png_con_voci_simili(camp):
    # nadine (Irma) e tabitha sono simili per assets/voci/voci.yaml (simile_a): mai nella stessa scena.
    modifica(camp, "png/png_bruno.yaml", lambda d: d["voce"]["tts"].update(voce_id="tabitha"))
    assert "SCENA.voci_simili" in errori(camp)


def _seconda_scena(camp: Path, presenti_prima: list[str], presenti_seconda: list[str], taglio: str | None = None) -> None:
    """Copia la scena del mini come scene/scena_due.yaml (nodo n_cappella) e sceglie chi è presente dove."""
    (camp / "scene").mkdir(exist_ok=True)
    due = leggi(camp, "scena.yaml")
    due.update(id="scena_due", nodo="n_cappella", png_presenti=presenti_seconda, indizi=[])
    if taglio:
        due["taglio"] = taglio
    scrivi(camp, "scene/scena_due.yaml", due)
    modifica(camp, "scena.yaml", lambda d: d.update(png_presenti=presenti_prima))


def test_scena_battute_libere_di_un_png_assente(camp, tmp_path):
    # Nota 21: un PNG assente parlava con le sue battute senza `scena`, accanto a una voce simile. Ora il
    # Motore elenca solo le battute dei PNG presenti: niente avviso, e la misura dei copioni lo segue.
    from valida import copioni
    from valida.esito import Esito
    modifica(camp, "png/png_bruno.yaml", lambda d: d["voce"]["tts"].update(voce_id="tabitha"))
    _seconda_scena(camp, ["png_bruno"], ["png_irma"])
    assert "SCENA.voci_simili" not in errori(camp)
    assert "SCENA.voci_simili_altrove" not in avvisi(camp)
    cartella = tmp_path / "copioni"
    cartella.mkdir()
    azione = [[{"pg": "pg_tobia", "azione": "chiedo a Bruno se ha visto qualcosa stanotte"}]]
    scrivi(cartella, "prima.yaml", {"turni": azione})
    scrivi(cartella, "seconda.yaml", {"scena": "scena_due", "turni": azione})
    _, c = valida(camp, contesto_b=False)
    righe = copioni.controlla(c, Esito(), cartella)
    assert "bruno_notte_domanda" in righe[0] and "bruno_notte_domanda" not in righe[1]


def test_scena_come_lista(camp, tmp_path):
    from valida import copioni
    from valida.esito import Esito
    _seconda_scena(camp, ["png_irma", "png_bruno"], ["png_irma"])
    modifica(camp, "repertorio/narrazione.yaml", lambda d: battuta(d, "nar_botte").update(scena=["scena_volpe", "scena_due"]))
    assert "REPERTORIO.scena" not in errori(camp)
    cartella = tmp_path / "copioni"
    cartella.mkdir()
    azione = [[{"pg": "pg_lia", "azione": "scendo in cantina e guardo le botti"}]]
    scrivi(cartella, "volpe.yaml", {"turni": azione})
    scrivi(cartella, "zdue.yaml", {"scena": "scena_due", "turni": azione})
    _, c = valida(camp, contesto_b=False)
    righe = [r for r in copioni.controlla(c, Esito(), cartella) if " T1 " in r]
    assert "nar_botte" in righe[0] and "nar_botte" in righe[1]
    modifica(camp, "repertorio/narrazione.yaml", lambda d: battuta(d, "nar_botte").update(scena=["scena_volpe", "scena_inventata"]))
    assert "REPERTORIO.scena" in errori(camp)


def test_scena_testo_che_porta_una_voce_simile(camp):
    modifica(camp, "png/png_bruno.yaml", lambda d: d["voce"]["tts"].update(voce_id="tabitha"))
    _seconda_scena(camp, ["png_bruno"], ["png_irma"], taglio="Se i PG esitano, Bruno arriva dalla locanda e trascina tutti fuori.")
    assert "SCENA.voci_simili_testo" in avvisi(camp)


def test_scena_desiderio_che_porta_una_voce_simile(camp):
    modifica(camp, "png/png_bruno.yaml", lambda d: d["voce"]["tts"].update(voce_id="tabitha"))
    modifica(camp, "png/png_irma.yaml", lambda d: d.update(desiderio="Portare Bruno in cappella prima dell'alba."))
    assert "SCENA.voci_simili_testo" in avvisi(camp)


def test_scena_battuta_di_un_png_assente_in_rigoroso(camp):
    modifica(camp, "repertorio/png_bruno.yaml", lambda d: battuta(d, "bruno_notte_domanda").update(scena="scena_due"))
    _seconda_scena(camp, ["png_irma", "png_bruno"], ["png_irma"])
    assert "SCENA.png_assente" not in errori(camp)
    assert "SCENA.png_assente" in errori(camp, rigoroso=True)


def test_scena_nodo_noto_ai_pg_non_chiede_tre_indizi(camp):
    # Nota 8: un luogo che tutti conoscono dall'inizio non va scoperto con tre indizi.
    modifica(camp, "scena.yaml", lambda d: d["uscite"][1].update(segnalata_da=["i_cera"]))
    assert "SCENA.uscite" in avvisi(camp)
    modifica(camp, "campagna.yaml", lambda d: d["nodi"][1].update(noto_ai_pg=True))
    assert "SCENA.uscite" not in avvisi(camp)


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


def test_fronti_orologio_che_parte_dopo_un_id_inesistente(camp):
    # Nota 26: un orologio che parte da una scelta dichiara da quale battuta o indizio (parte_dopo).
    modifica(camp, "campagna.yaml", lambda d: d["orologi"][0].update(parte_dopo=["irma_lanterna_cera"]))
    assert "FRONTI.campo" not in errori(camp)
    modifica(camp, "campagna.yaml", lambda d: d["orologi"][0].update(parte_dopo=["battuta_che_non_esiste"]))
    assert "FRONTI.campo" in errori(camp)


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


# --- MONDO (cronologia e logistica) ----------------------------------------------------------------

def _crono(d: dict) -> dict:
    return d["preparazione"]["cronologia"]


def _logi(d: dict) -> dict:
    return d["preparazione"]["logistica"]


def test_mondo_eventi_fuori_ordine(camp):
    modifica(camp, "campagna.yaml", lambda d: _crono(d)["eventi"][2]["quando"].update(ora="03:00") or
             _crono(d)["eventi"][1]["quando"].update(ora="05:00"))
    assert "MONDO.ordine" in errori(camp)


def test_mondo_segni_dell_orologio_al_contrario(camp):
    modifica(camp, "campagna.yaml", lambda d: _crono(d)["eventi"][3]["segno"].update(n=1) or
             _crono(d)["eventi"][2]["segno"].update(n=3))
    assert "MONDO.ordine" in errori(camp)


def test_mondo_documento_datato_prima_del_fatto(camp):
    # Il quarto difetto del revisore di ponte-lanterne: una riga datata prima di ciò che prova.
    modifica(camp, "campagna.yaml", lambda d: _crono(d)["documenti"][0].update(datato={"giorni_fa": 40}))
    assert "MONDO.documento" in errori(camp)


def test_mondo_viaggio_che_non_ci_sta(camp):
    modifica(camp, "campagna.yaml", lambda d: _logi(d)["durate"][0].update(minuti=300))
    assert "MONDO.tempo" in errori(camp)


def test_mondo_due_viaggi_che_invece_ci_stanno(camp):
    # Il primo difetto del revisore: «ne entra uno solo», ma due viaggi ci stavano.
    modifica(camp, "campagna.yaml", lambda d: _logi(d)["verifiche"].append(
        {"tra": ["t_inizio", "t_alba"], "non_ci_sta": ["d_cantina", "d_cantina"], "perche": "Si scende una volta sola."}))
    assert "MONDO.tempo" in errori(camp)


def test_mondo_capienza_superata(camp):
    # Il secondo difetto: una barca da otto per gruppi di venti.
    modifica(camp, "campagna.yaml", lambda d: _logi(d)["gruppi"][0].update(persone=3))
    assert "MONDO.capienza" in errori(camp)


def test_mondo_ora_non_valida_e_fatto_inesistente(camp):
    modifica(camp, "campagna.yaml", lambda d: _crono(d)["eventi"][2]["quando"].update(ora="25:00") or
             _crono(d)["eventi"][0].update(fatti=["f_nessuno"]))
    assert {"MONDO.forma", "MONDO.riferimento"} <= errori(camp)


def test_mondo_assente_solo_in_rigoroso(camp):
    modifica(camp, "campagna.yaml", lambda d: d["preparazione"].pop("cronologia"))
    assert "MONDO.assente" not in errori(camp)
    assert "MONDO.assente" in errori(camp, rigoroso=True)


def test_mondo_indizio_documento_senza_data_in_rigoroso(camp):
    modifica(camp, "scena.yaml", lambda d: d["indizi"][1].update(tipo="documento"))
    assert "MONDO.documento_mancante" not in errori(camp)
    assert "MONDO.documento_mancante" in errori(camp, rigoroso=True)


# --- LIVELLO (durata in sessioni, strumenti/strati.py) ----------------------------------------------

def test_livello_brief_senza_sessioni_e_un_avviso(camp):
    modifica(camp, "brief.yaml", lambda d: d.pop("sessioni"))
    assert "LIVELLO.sessioni" not in errori(camp, rigoroso=True)
    assert "LIVELLO.sessioni" in avvisi(camp, rigoroso=True)
    (camp / "brief.yaml").unlink()
    assert "LIVELLO.sessioni" in avvisi(camp)


def test_livello_sopra_la_one_shot_non_e_supportato(camp):
    # Un arco di quattro sessioni non si sa ancora preparare: meglio un errore che una campagna a metà.
    modifica(camp, "brief.yaml", lambda d: d.update(sessioni=4))
    assert "LIVELLO.non_supportato" in errori(camp)
    modifica(camp, "brief.yaml", lambda d: d.update(sessioni="aperta"))
    assert "LIVELLO.non_supportato" in errori(camp)


def test_livello_valori_sbagliati_e_forzato_senza_motivo(camp):
    modifica(camp, "brief.yaml", lambda d: d.update(sessioni="tante"))
    assert "LIVELLO.forma" in errori(camp)
    modifica(camp, "brief.yaml", lambda d: d.update(sessioni=1, livello="campagna"))
    assert "LIVELLO.forzato" in errori(camp)


# --- STATO e CONTINUITÀ (il mini giocato una volta: test_valida_fixtures/arco) ----------------------

ARCO = QUI / "test_valida_fixtures" / "arco"


@pytest.fixture
def arco(camp: Path) -> Path:
    """Il mini con sopra il registro della sessione 1, lo stato e il pacchetto della sessione 2."""
    shutil.copytree(ARCO, camp, dirs_exist_ok=True)
    return camp


def stato_continuita(cartella: Path) -> tuple[set[str], set[str]]:
    esito, _ = valida(cartella, voci=VOCI if VOCI.exists() else None, contesto_b=False)
    tieni = lambda c: c.split(".")[0] in ("STATO", "CONTINUITÀ")  # noqa: E731
    return {c for c in esito.codici() if tieni(c)}, {v.codice for v in esito.avvisi if tieni(v.codice)}


def _fatto(d: dict, fid: str) -> dict:
    return next(f for f in d["fatti"] if f["id"] == fid)


@serve_node
def test_validare_un_pacchetto_con_la_vista_unita_del_server(arco):
    # --sessione 2: la vista unita viene da strumenti/unisci_pacchetto.ts; STATO e CONTINUITÀ dalla campagna vera.
    scena = leggi(arco, "scena.yaml")
    scena.update(id="scena_due", png_presenti=["png_irma", "png_bruno"])
    scrivi(arco, "sessioni/02/scene/scena_due.yaml", scena)
    from valida.pacchetto import valida_pacchetto
    esito, c = valida_pacchetto(arco, 2, rigoroso=False, voci=VOCI if VOCI.exists() else None, contesto_b_attivo=False)
    assert [s_.get("id") for _, s_ in c.scene] == ["scena_due"] and [b["id"] for b in c.battute] == ["nar_ritorno"]
    assert "LIVELLO.non_supportato" in {v.codice for v in esito.avvisi}          # in prova: avviso, non errore
    assert not {v.codice for v in esito.errori if v.codice.split(".")[0] in ("STATO", "CONTINUITÀ")}
    # Un morto in scena nel pacchetto lo vede CONTINUITÀ, sulla campagna vera.
    modifica(arco, "stato/stato.yaml", lambda d: _fatto(d, "g_bruno_parla")["effetti"]["png"]["png_bruno"].update(vivo=False))
    esito, _ = valida_pacchetto(arco, 2, rigoroso=False, voci=VOCI if VOCI.exists() else None, contesto_b_attivo=False)
    assert "CONTINUITÀ.morto" in esito.codici()


def test_stato_e_continuita_dell_arco_valido(arco):
    assert stato_continuita(arco) == (set(), set())


def test_stato_citazione_che_il_registro_non_dice(arco):
    modifica(arco, "stato/stato.yaml", lambda d: _fatto(d, "g_irma_promette")["fonte"].update(
        citazione="Ti giuro che pagherò tutto, anche il mercante"))
    assert "STATO.fonte" in stato_continuita(arco)[0]


def test_stato_evento_e_turno_che_non_ci_sono(arco):
    modifica(arco, "stato/stato.yaml", lambda d: _fatto(d, "g_lanterna_trovata")["fonte"].update(evento={"indizio": "i_cera"}))
    assert "STATO.fonte" in stato_continuita(arco)[0]
    modifica(arco, "stato/stato.yaml", lambda d: _fatto(d, "g_lanterna_trovata").update(fonte={"sessione": 1, "turno": 40, "citazione": "x"}))
    assert "STATO.fonte" in stato_continuita(arco)[0]


def test_stato_fuori_scena_senza_motivo(arco):
    modifica(arco, "stato/stato.yaml", lambda d: _fatto(d, "g_mercante_riparte")["fonte"].pop("motivo"))
    assert "STATO.fonte" in stato_continuita(arco)[0]


def test_stato_fuori_scena_senza_la_regola_che_lo_produce(arco):
    # docs/strati.md, principio 4: il motivo nomina l'orologio o la regola, e quella esiste.
    modifica(arco, "stato/stato.yaml", lambda d: _fatto(d, "g_mercante_riparte")["fonte"].update(motivo="il mercante si è stufato"))
    assert "STATO.fonte" in stato_continuita(arco)[0]
    modifica(arco, "stato/stato.yaml", lambda d: _fatto(d, "g_mercante_riparte")["fonte"].update(motivo="o_carovana avanza"))
    assert "STATO.fonte" in stato_continuita(arco)[0]


def test_stato_registro_o_trascrizione_mancanti(arco):
    # Il registro lo scrive il server; la trascrizione accanto serve a verificare le citazioni.
    (arco / "sessioni" / "01" / "trascrizione.yaml").unlink()
    assert "STATO.registro" in stato_continuita(arco)[0]
    (arco / "sessioni" / "01" / "registro.yaml").unlink()
    assert "STATO.registro" in stato_continuita(arco)[0]


def test_stato_citazione_da_un_azione_privata_del_registro(arco):
    # Anche le azioni dei PG sono testo del turno: lo stato può citarle (il registro è del master).
    modifica(arco, "stato/stato.yaml", lambda d: _fatto(d, "g_bruno_parla")["fonte"].update(
        citazione="prometto a Bruno che non dirò niente"))
    assert stato_continuita(arco) == (set(), set())


def test_stato_superato_da_un_fatto_che_viene_prima(arco):
    modifica(arco, "stato/stato.yaml", lambda d: _fatto(d, "g_irma_promette").update(superato_da="g_bruno_parla"))
    assert "STATO.superato" in stato_continuita(arco)[0]


def test_stato_orologio_diverso_dal_registro(arco):
    modifica(arco, "stato/stato.yaml", lambda d: d["orologi"]["o_processione"].update(pieni=2))
    assert "STATO.orologio" in stato_continuita(arco)[0]


def test_continuita_un_morto_non_parla(arco):
    modifica(arco, "stato/stato.yaml", lambda d: _fatto(d, "g_bruno_parla")["effetti"]["png"]["png_bruno"].update(vivo=False))
    assert "CONTINUITÀ.morto" in stato_continuita(arco)[0]


def test_continuita_cio_che_un_png_ha_saputo(arco):
    # Bruno ha saputo dove sta la lanterna, ma la sua scheda lo tiene nel non_sa.
    modifica(arco, "stato/stato.yaml", lambda d: _fatto(d, "g_bruno_parla")["effetti"]["png"]["png_bruno"].update(sa=["f_lanterna_cantina"]))
    assert "CONTINUITÀ.saputo" in stato_continuita(arco)[0]


def test_continuita_png_cambiato_senza_scheda_aggiornata(arco):
    # Principio 6: la scheda del pacchetto sostituisce quella della campagna, che resta la versione iniziale.
    (arco / "sessioni" / "02" / "png" / "png_bruno.yaml").unlink()
    assert "CONTINUITÀ.scheda" in stato_continuita(arco)[0]


def test_continuita_scheda_aggiornata_che_non_torna(arco):
    def indietro(d):
        d["sa"].remove("f_impronte_cera")
        d["atteggiamento_pg"]["pg_lia"]["stato"] = "ostile"
    modifica(arco, "sessioni/02/png/png_bruno.yaml", indietro)
    assert {"CONTINUITÀ.saputo", "CONTINUITÀ.scheda"} <= stato_continuita(arco)[0]


def test_continuita_morto_con_la_scheda_nel_pacchetto(arco):
    modifica(arco, "stato/stato.yaml", lambda d: _fatto(d, "g_bruno_parla")["effetti"]["png"]["png_bruno"].update(vivo=False))
    modifica(arco, "sessioni/02/scene/scena_due.yaml", lambda d: d.update(png_presenti=["png_irma"]))
    assert "CONTINUITÀ.morto" in stato_continuita(arco)[0]


def test_continuita_segreto_senza_parola_nel_pacchetto(arco):
    # Le parole del pacchetto sostituiscono quelle della campagna: un segreto che entra in sessione ha la sua.
    modifica(arco, "sessioni/02/repertorio/parole_segrete.yaml", lambda d: d.update(parole=d["parole"][:1]))
    assert "CONTINUITÀ.segreto" in stato_continuita(arco)[0]
    (arco / "sessioni" / "02" / "repertorio" / "parole_segrete.yaml").unlink()
    assert "CONTINUITÀ.segreto" in stato_continuita(arco)[0]


def test_continuita_parola_segreta_di_un_fatto_gia_saputo(arco):
    modifica(arco, "sessioni/02/repertorio/parole_segrete.yaml", lambda d: d["parole"].append(
        {"parola": "fagotto", "regex": "fagotto", "fatti": ["f_bruno_visto"], "pubblica_dopo": [], "nota": ""}))
    assert "CONTINUITÀ.saputo" in stato_continuita(arco)[0]


def test_continuita_orologio_che_riparte_da_capo(arco):
    modifica(arco, "sessioni/02/sessione.yaml", lambda d: d["pieni_all_inizio"].update(o_processione=0))
    assert "CONTINUITÀ.orologio" in stato_continuita(arco)[0]
    # Un orologio dei fronti (orologi_extra) non va in pieni_all_inizio: il server rifiuterebbe il pacchetto.
    modifica(arco, "sessioni/02/sessione.yaml", lambda d: d["pieni_all_inizio"].update(o_processione=4, o_mercante=1))
    assert "CONTINUITÀ.orologio" in stato_continuita(arco)[0]
    # Senza voce l'orologio ripartirebbe da quello della campagna (0), non dai segni dello stato.
    modifica(arco, "sessioni/02/sessione.yaml", lambda d: d.pop("pieni_all_inizio"))
    assert "CONTINUITÀ.orologio" in stato_continuita(arco)[0]


def test_continuita_promessa_dimenticata_e_oggetto_perso(arco):
    modifica(arco, "sessioni/02/sessione.yaml", lambda d: d["preparazione"].update(fili=[]))
    modifica(arco, "stato/stato.yaml", lambda d: _fatto(d, "g_lanterna_trovata")["effetti"]["oggetti"]["ogg_lanterna"].update(
        nome="bancone", stato="distrutto"))
    errori_, avvisi_ = stato_continuita(arco)
    assert {"CONTINUITÀ.promessa", "CONTINUITÀ.oggetto"} <= avvisi_ and not errori_


def test_continuita_pg_che_torna_indietro(arco):
    modifica(arco, "stato/stato.yaml", lambda d: d["pg"]["pg_tobia"].update(livello=3))
    assert "CONTINUITÀ.pg" in stato_continuita(arco)[0]


# --- ARCO (il livello arco preparato prima: riferimenti/arco.md) -----------------------------------

ARCO_MINI = {
    "premessa": "Il mercante del passo vuole la locanda di Irma, e un inverno per prendersela.",
    "domanda": "La locanda della Volpe sarà ancora di Irma a primavera?",
    "fronte": "fronte_debiti", "orologio": "o_mercante",
    "tappe": [
        {"id": "tp_pegno", "segno": 1, "cosa": "Il mercante prende un pegno.", "segno_visibile": "Una lettera sul bancone.", "entro_sessione": 1},
        {"id": "tp_debito", "segno": 2, "cosa": "Il debito raddoppia.", "segno_visibile": "Un conto nuovo.", "entro_sessione": 2},
        {"id": "tp_locanda", "segno": 4, "cosa": "Il mercante si prende la locanda.", "segno_visibile": "Un'insegna nuova.", "entro_sessione": 3},
    ],
    "ritmo": {"per_sessione": 2, "accelera": ["Irma firma un foglio del mercante"], "rallenta": ["i PG pagano una rata"]},
    "atti": [{"id": "atto_1", "sessioni": [1], "domanda": "La lanterna tornerà in cappella?"},
             {"id": "atto_2", "sessioni": [2, 3], "domanda": "Irma pagherà il debito?"}],
    "finali": [{"id": "fn_salva", "orologio": {"min": 0, "max": 2}, "quando": "il mercante non arriva alla locanda", "esito": "Irma resta"},
               {"id": "fn_persa", "orologio": {"min": 3, "max": 4}, "quando": "il mercante si prende la locanda", "esito": "Irma parte"}],
    "png_ricorrenti": ["png_irma", "png_bruno"],
    "fili": [{"id": "filo_tetto", "cosa": "Il tetto della locanda", "torna_in": [2]}],
    "sessioni": [{"numero": 2, "abbozzo": "Il mercante torna con le carte del debito.", "png": ["png_irma"], "fili": ["filo_tetto"]},
                 {"numero": 3, "abbozzo": "La notte dell'asta della locanda.", "png": ["png_bruno"]}],
}


@pytest.fixture
def arco_mini(camp: Path) -> Path:
    """Il mini come arco di tre sessioni, con preparazione.arco (le misure del livello sono avvisi)."""
    import copy
    modifica(camp, "brief.yaml", lambda d: d.update(sessioni=3))
    modifica(camp, "campagna.yaml", lambda d: d["preparazione"].update(arco=copy.deepcopy(ARCO_MINI)))
    return camp


def codici_arco(cartella: Path) -> tuple[set[str], set[str]]:
    esito, _ = valida(cartella, voci=VOCI if VOCI.exists() else None, contesto_b=False)
    return ({c for c in esito.codici() if c.startswith("ARCO.")}, {v.codice for v in esito.avvisi if v.codice.startswith("ARCO.")})


def _arco(d: dict) -> dict:
    return d["preparazione"]["arco"]


def test_arco_valido(arco_mini):
    errori_, avvisi_ = codici_arco(arco_mini)
    assert errori_ == set() and avvisi_ <= {"ARCO.misure"}      # il mini ha due PNG, l'arco ne prevede 4–6
    assert "LIVELLO.non_supportato" in errori(arco_mini)          # il livello arco resta fuori fino alla prova D4


def test_arco_tappe_e_orologio_incoerenti(arco_mini):
    modifica(arco_mini, "campagna.yaml", lambda d: _arco(d)["tappe"][2].update(segno=3))           # destino al segno 4
    assert "ARCO.tappe" in codici_arco(arco_mini)[0]


def test_arco_tappa_prima_di_quanto_il_ritmo_permette(arco_mini):
    modifica(arco_mini, "campagna.yaml", lambda d: _arco(d)["tappe"][2].update(entro_sessione=1))  # 4 segni a 2 per sessione
    assert "ARCO.tappe" in codici_arco(arco_mini)[0]


def test_arco_fronte_che_non_arriva_mai_o_arriva_subito(arco_mini):
    modifica(arco_mini, "campagna.yaml", lambda d: _arco(d)["ritmo"].update(per_sessione=1))       # 1 × 3 < 4
    assert "ARCO.tappe" in codici_arco(arco_mini)[0]
    modifica(arco_mini, "campagna.yaml", lambda d: _arco(d)["ritmo"].update(per_sessione=4))
    assert "ARCO.tappe" in codici_arco(arco_mini)[0]


def test_arco_finali_con_un_buco_o_con_un_pg(arco_mini):
    modifica(arco_mini, "campagna.yaml", lambda d: _arco(d)["finali"][1]["orologio"].update(min=4))   # 3 senza finale
    assert "ARCO.finali" in codici_arco(arco_mini)[0]
    modifica(arco_mini, "campagna.yaml", lambda d: _arco(d)["finali"][1].update(orologio={"min": 3, "max": 4},
                                                                                 quando="Lia convince il console"))
    assert "ARCO.finali" in codici_arco(arco_mini)[0]


def test_arco_atti_che_non_coprono_le_sessioni(arco_mini):
    modifica(arco_mini, "campagna.yaml", lambda d: _arco(d)["atti"][1].update(sessioni=[3]))
    assert "ARCO.atti" in codici_arco(arco_mini)[0]


def test_arco_png_ricorrente_mai_usato_e_filo_che_non_torna(arco_mini):
    def rompi(d):
        _arco(d)["sessioni"][1]["png"] = []
        _arco(d)["fili"].append({"id": "filo_anello", "cosa": "L'anello della madre"})
    modifica(arco_mini, "campagna.yaml", rompi)
    modifica(arco_mini, "scena.yaml", lambda d: d.update(png_presenti=["png_irma"]))
    errori_, _ = codici_arco(arco_mini)
    assert {"ARCO.png", "ARCO.fili"} <= errori_


def test_arco_abbozzo_mancante(arco_mini):
    modifica(arco_mini, "campagna.yaml", lambda d: _arco(d)["sessioni"].pop())
    assert "ARCO.sessioni" in codici_arco(arco_mini)[0]


def test_arco_forma(arco_mini):
    modifica(arco_mini, "campagna.yaml", lambda d: _arco(d).update(domanda="Il mercante vincerà", fronte="fronte_lanterna"))
    assert "ARCO.forma" in codici_arco(arco_mini)[0]


# --- Note di nozze-neve: regole piccole ------------------------------------------------------------

def test_cognome_comune_non_nomina_una_voce_simile(camp):
    # Nota 5: Adelina e Zelia Bonfanti; «casa Bonfanti» non nomina Zelia.
    modifica(camp, "png/png_irma.yaml", lambda d: d.update(nome="Irma Volpi"))
    modifica(camp, "png/png_bruno.yaml", lambda d: d.update(nome="Bruno Volpi") or d["voce"]["tts"].update(voce_id="tabitha"))
    def nel_taglio(cartella: Path) -> bool:
        esito, _ = valida(cartella, voci=VOCI if VOCI.exists() else None, contesto_b=False)
        return any(v.codice == "SCENA.voci_simili_testo" and "taglio" in v.dove for v in esito.avvisi)
    _seconda_scena(camp, ["png_bruno"], ["png_irma"], taglio="La scena si chiude quando la famiglia Volpi torna alla locanda.")
    assert not nel_taglio(camp)
    _seconda_scena(camp, ["png_bruno"], ["png_irma"], taglio="La scena si chiude quando Bruno torna alla locanda.")
    assert nel_taglio(camp)


def test_veli_vuoti_se_il_brief_non_ne_vuole(camp):
    # Nota 1: «Veils: none required». La chiave resta, la lista può essere vuota.
    modifica(camp, "stile.yaml", lambda d: d.update(veli=[]))
    assert "STILE.campo" not in errori(camp) and "STILE.veli" in avvisi(camp)
    modifica(camp, "stile.yaml", lambda d: d.pop("veli"))
    assert "STILE.campo" in errori(camp)


def test_pg_uno_piu_del_massimo_dei_giocatori(camp):
    # Nota 2: «3-5» giocatori vuole sei PG; il mini ne ha due.
    modifica(camp, "brief.yaml", lambda d: d.update(giocatori="1-2"))
    assert "PG.numero" in errori(camp, rigoroso=True)
    modifica(camp, "brief.yaml", lambda d: d.update(giocatori=1))
    assert "PG.numero" not in errori(camp, rigoroso=True)


def test_testi_preparati_che_nominano_un_pg(camp):
    # Nota 7: la fisarmonica dei sensi era di un PG.
    modifica(camp, "scena.yaml", lambda d: d["sensi"].__setitem__(0, "La pipa di Tobia manda un odore dolce."))
    assert "PROSA.nome_pg" in errori(camp)


def test_lettera_letta_in_prima_persona(camp):
    # Nota 16: «tuo fratello…» letto dal narratore suona rivolto a un PG.
    modifica(camp, "repertorio/narrazione.yaml", lambda d: battuta(d, "tr_sala").update(
        testo=["[narratore] Sul biglietto c'è scritto: «Ti aspetto all'alba, alla cappella.»"]))
    assert "PROSA.citazione" in avvisi(camp)


def test_audio_dentro_o_fuori(camp):
    modifica(camp, "scena.yaml", lambda d: d.update(audio={"interno": False}))
    assert not {c for c in errori(camp) if c.startswith("AUDIO.")}
    modifica(camp, "scena.yaml", lambda d: d.update(audio={"interno": "fuori"}))
    assert "AUDIO.forma" in errori(camp)


def test_luogo_senza_immagine(camp):
    # immagini2: un luogo dove il master può portare il tavolo, senza scheda né prompt, non ha immagine.
    modifica(camp, "campagna.yaml", lambda d: d["nodi"][1].pop("abbozzo") and None)
    assert "IMMAGINI.nodo" in avvisi(camp)                                     # uscita verso n_cappella
    # Una scena che si svolge lì (nodo evento collegato, e la nomina) è un errore in rigoroso.
    def evento(d):
        d["nodi"].append({"id": "e_alba", "tipo": "evento", "nome": "L'alba", "collegamenti": ["n_cappella", "n_locanda"]})
        d["nodi"][0]["collegamenti"].append("e_alba")
    modifica(camp, "campagna.yaml", evento)
    _seconda_scena(camp, ["png_irma", "png_bruno"], ["png_irma"])
    modifica(camp, "scene/scena_due.yaml", lambda d: d.update(nodo="e_alba", nome="All'alba, davanti alla Cappella"))
    assert "IMMAGINI.nodo" in errori(camp, rigoroso=True)
    modifica(camp, "campagna.yaml", lambda d: d["nodi"][1].update(scheda="scene/scena_due.yaml"))
    assert "IMMAGINI.nodo" not in errori(camp, rigoroso=True)


def test_regex_inglese_per_i_prompt(camp):
    # immagini2, punto 2: i prompt sono in inglese, la regex italiana non li vede.
    modifica(camp, "png/png_irma.yaml", lambda d: d["aspetto"].update(prompt_ritratto="bust portrait of an innkeeper holding a silver lantern, [STILE]"))
    assert "IMMAGINI.segreto" not in errori(camp, rigoroso=True)
    modifica(camp, "repertorio/parole_segrete.yaml", lambda d: d["parole"][0].update(regex_en="silver lantern"))
    assert "IMMAGINI.segreto" in errori(camp, rigoroso=True)


# --- VINCOLI (ciò che chiunque percepisce di un indizio) -------------------------------------------

def test_vincoli_indizio_fisico_senza_vincolo_in_rigoroso(camp):
    # Giudizio di nozze-neve: il campanaccio muto «suona forte», perché nessuno l'aveva detto al narratore.
    modifica(camp, "scena.yaml", lambda d: d["indizi"][1].pop("vincolo_pubblico"))
    assert "VINCOLI.mancante" not in errori(camp)
    assert "VINCOLI.mancante" in errori(camp, rigoroso=True)


def test_vincoli_senza_segreti(camp):
    modifica(camp, "scena.yaml", lambda d: d["indizi"][1].update(vincolo_pubblico="In una botte vuota c'è la lanterna."))
    assert "VINCOLI.segreto" in errori(camp)
    modifica(camp, "scena.yaml", lambda d: d["indizi"][1].update(vincolo_pubblico="Le botti sono vuote.") or
             d.update(vincoli_pubblici=["Il mercante aspetta il pegno al passo."]))
    assert "VINCOLI.segreto" in errori(camp)


def test_vincoli_contraddetti_dalla_scena(camp):
    modifica(camp, "scena.yaml", lambda d: d["indizi"][1].update(vincolo_pubblico="La botte grande in fondo non suona quando la si tocca."))
    modifica(camp, "scena.yaml", lambda d: d["sensi"].__setitem__(1, "La botte grande in fondo suona cupa a ogni colpo di vento."))
    assert "VINCOLI.contraddetto" in avvisi(camp)
    modifica(camp, "scena.yaml", lambda d: d["sensi"].__setitem__(1, "Le botti suonano cupe al vento, tranne la grande in fondo."))
    assert "VINCOLI.contraddetto" not in avvisi(camp)


# --- SCELTA (decisioni.strade del brief) ----------------------------------------------------------

STRADE = [{"strada": "Riportare la lanterna e tacere", "prezzo": "Il mercante si prende la locanda all'alba", "pesa_su": ["png_irma"]},
          {"strada": "Dire tutto al paese", "prezzo": "Bruno perde l'amicizia di Irma", "pesa_su": ["png_bruno"]}]


def test_scelta_strade_giuste(camp):
    modifica(camp, "brief.yaml", lambda d: d.setdefault("decisioni", {}).update(strade=STRADE))
    assert not {c for c in errori(camp, rigoroso=True) if c.startswith("SCELTA.")}
    assert not {c for c in avvisi(camp) if c.startswith("SCELTA.")}


def test_scelta_premio_travestito_da_prezzo(camp):
    # Il desiderio di Irma è «Pagare il tetto prima della neve»: se il prezzo è quello, per lei è un premio.
    premio = [STRADE[0], {"strada": "Il pegno al mercante", "prezzo": "Irma riesce a pagare il tetto", "pesa_su": ["png_irma"]}]
    modifica(camp, "brief.yaml", lambda d: d.setdefault("decisioni", {}).update(strade=premio))
    assert "SCELTA.premio" not in errori(camp)
    assert "SCELTA.premio" in errori(camp, rigoroso=True)


def test_scelta_forma_e_strade_mancanti(camp):
    modifica(camp, "brief.yaml", lambda d: d.setdefault("decisioni", {}).update(strade=[{"strada": "Una sola", "pesa_su": ["png_nessuno"]}]))
    assert "SCELTA.forma" in errori(camp)
    modifica(camp, "brief.yaml", lambda d: d["decisioni"].pop("strade"))
    assert "SCELTA.strade" in avvisi(camp)


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


def test_prosa_vocativo_involontario(camp):
    # Nota 19: «Irma, dietro il bancone, …» a voce suona come il narratore che chiama Irma.
    modifica(camp, "repertorio/narrazione.yaml",
             lambda d: battuta(d, "tr_sala").update(testo=["[narratore] Irma, dietro il bancone, asciuga i boccali in silenzio."]))
    assert "PROSA.vocativo" in avvisi(camp)


# --- REPERTORIO -----------------------------------------------------------------------------------

def test_repertorio_riferimento_inesistente(camp):
    modifica(camp, "repertorio/png_irma.yaml",
             lambda d: battuta(d, "irma_lanterna_cera")["richiede"].update(indizi_rivelati=["i_fantasma"]))
    assert "REPERTORIO.riferimento" in errori(camp)


def test_repertorio_esempio_di_voce_che_mente(camp):
    modifica(camp, "repertorio/png_irma.yaml", lambda d: battuta(d, "irma_lanterna_domanda").update(solo_esempio=True))
    assert "REPERTORIO.flag" in errori(camp)


def test_repertorio_quando_che_dice_chi_mente(camp):
    modifica(camp, "repertorio/png_bruno.yaml",
             lambda d: battuta(d, "bruno_notte_domanda").update(quando="Bruno mente su cosa ha visto"))
    assert "REPERTORIO.quando" in errori(camp)


def test_repertorio_id_che_dice_chi_mente_in_rigoroso(camp):
    # Note 10 e 19 di nozze-neve: il selettore legge l'id come una frase («segale versione»: è la bugia).
    def rinomina(d):
        battuta(d, "irma_lanterna_domanda")["id"] = "irma_lanterna_versione"
    modifica(camp, "repertorio/png_irma.yaml", rinomina)
    assert "REPERTORIO.id_rivelatore" not in errori(camp)
    assert "REPERTORIO.id_rivelatore" in errori(camp, rigoroso=True)


def test_repertorio_da_pg_inesistente(camp):
    modifica(camp, "repertorio/png_bruno.yaml",
             lambda d: battuta(d, "bruno_notte_promessa")["richiede"].update(da_pg=["pg_nessuno"]))
    assert "REPERTORIO.riferimento" in errori(camp)


def test_repertorio_oppure_finche_il_server_non_lo_applica(camp, monkeypatch):
    # Nota 25: il cancello «oppure». Un server che ignora le chiavi che non conosce lo lascerebbe aperto:
    # finché OPPURE_NEL_SERVER è False il validatore lo rifiuta (oggi è True: il Motore lo applica).
    from valida import costanti
    monkeypatch.setattr(costanti, "OPPURE_NEL_SERVER", False)
    modifica(camp, "repertorio/png_bruno.yaml", lambda d: battuta(d, "bruno_notte_promessa").update(
        richiede={"battute_usate": ["bruno_notte_domanda"], "oppure": [{"privata": True}, {"indizi_rivelati": ["i_cera"]}]}))
    assert "REPERTORIO.oppure" in errori(camp)


def test_repertorio_oppure_quando_il_server_lo_applica(camp, monkeypatch):
    from valida import costanti
    monkeypatch.setattr(costanti, "OPPURE_NEL_SERVER", True)
    buono = {"battute_usate": ["bruno_notte_domanda"], "oppure": [{"privata": True}, {"indizi_rivelati": ["i_cera"]}]}
    modifica(camp, "repertorio/png_bruno.yaml", lambda d: battuta(d, "bruno_notte_promessa").update(richiede=buono))
    assert not {"REPERTORIO.oppure", "COPERTURA.cancello"} & errori(camp, rigoroso=True)
    # Un'alternativa senza cancello apre la confessione a tutti; un'alternativa annidata non è prevista.
    aperto = {"oppure": [{"privata": True}, {"battute_non_usate": ["irma_saluto"]}]}
    modifica(camp, "repertorio/png_bruno.yaml", lambda d: battuta(d, "bruno_notte_promessa").update(richiede=aperto))
    assert "COPERTURA.cancello" in errori(camp, rigoroso=True)
    annidato = {"oppure": [{"privata": True}, {"oppure": [{"privata": True}, {"privata": True}]}]}
    modifica(camp, "repertorio/png_bruno.yaml", lambda d: battuta(d, "bruno_notte_promessa").update(richiede=annidato))
    assert "REPERTORIO.oppure" in errori(camp)


def test_repertorio_riferimento_inesistente_in_un_alternativa(camp):
    modifica(camp, "repertorio/png_bruno.yaml", lambda d: battuta(d, "bruno_notte_promessa")["richiede"].update(
        oppure=[{"indizi_rivelati": ["i_fantasma"]}, {"privata": True}]))
    assert "REPERTORIO.riferimento" in errori(camp)


# --- COPERTURA ------------------------------------------------------------------------------------

def test_copertura_segno_legato_a_una_scena_di_un_orologio_di_sessione(camp):
    # Nota 6: un orologio attivo in più scene avanza ovunque, quindi i suoi segni non hanno `scena`.
    _seconda_scena(camp, ["png_irma", "png_bruno"], ["png_irma"])
    assert "COPERTURA.segno" not in errori(camp)
    modifica(camp, "repertorio/narrazione.yaml", lambda d: battuta(d, "nar_segno_2").update(scena="scena_volpe"))
    assert "COPERTURA.segno" in errori(camp)


def test_copertura_menzogna_senza_segnale(camp):
    modifica(camp, "repertorio/png_irma.yaml", lambda d: battuta(d, "irma_lanterna_domanda")["testo"].pop(0))
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


def test_copertura_finali_solo_per_stato(camp):
    # Playtest di nozze-neve: finali con temi neutri e cancello d'orologio non uscivano mai senza un'azione.
    def neutri(d):
        for b in d["battute"]:
            if b["tipo"] == "finale":
                b["temi"] = ["orologio"]
                b.setdefault("richiede", {})["orologio"] = {"id": "o_processione", "min": 4, "max": 4}
    modifica(camp, "repertorio/narrazione.yaml", neutri)
    assert "COPERTURA.finale_senza_azione" in avvisi(camp)


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
             lambda d: battuta(d, "irma_lanterna_domanda").update(quando="un PG chiede a Irma del pegno"))
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


@serve_node
def test_segreti_nella_pianta_della_scena_del_modo_b(camp):
    # La descrizione entra nel contesto del selettore: il vecchio controllo non la guardava.
    modifica(camp, "scena.yaml", lambda d: d.update(descrizione=d["descrizione"] + " Irma ha nascosto un fagotto."))
    assert "SEGRETI.contesto_b" not in errori(camp)
    assert "SEGRETI.contesto_b" in errori(camp, contesto_b=True)


@serve_node
def test_segreti_nella_regola_di_prosa_del_modo_b(camp):
    # Nota 12 della prova cieca: la regola «parola che il narratore non dice mai» conteneva la soluzione.
    modifica(camp, "stile.yaml", lambda d: d.setdefault("regole_prosa", []).append(
        "Il narratore non dice mai che la lanterna è nella botte."))
    assert "SEGRETI.contesto_b" in errori(camp, contesto_b=True)


@serve_node
def test_segreti_nell_abbozzo_di_un_nodo_del_modo_b(camp):
    modifica(camp, "campagna.yaml", lambda d: d["nodi"][1].update(abbozzo="Una cappella di pietra. Il mercante aspetta il pegno."))
    assert "SEGRETI.contesto_b" in errori(camp, contesto_b=True)


def test_segreti_contesto_b_senza_node_e_un_avviso(camp, monkeypatch):
    from valida import contesto_b
    monkeypatch.setattr(contesto_b, "_comando", lambda: None)
    modifica(camp, "scena.yaml", lambda d: d.update(descrizione=d["descrizione"] + " Irma ha nascosto un fagotto."))
    assert "SEGRETI.contesto_b" not in errori(camp, contesto_b=True)
    assert "SEGRETI.contesto_b_non_controllato" in avvisi(camp, contesto_b=True)


def test_segreti_nell_aggancio_di_un_pg(camp):
    # Nota 13: la scheda pubblica del PG va al telefono del giocatore (e al selettore), anche senza node.
    modifica(camp, "pg.yaml", lambda d: d["personaggi"][0].update(aggancio="Devi dei soldi al mercante dell'alba."))
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


def test_segreti_regex_che_scatta_dentro_una_parola(camp):
    # Nota 14: «sa del leone» trovava «Rosa del leone»; qui «egno» trova «pegno».
    modifica(camp, "repertorio/parole_segrete.yaml", lambda d: d["parole"][1].update(regex="egno|mercante"))
    assert "SEGRETI.regex_dentro_parola" in avvisi(camp)


# --- IMMAGINI -------------------------------------------------------------------------------------

def test_immagini_prompt_ritratto_senza_stile(camp):
    modifica(camp, "png/png_irma.yaml", lambda d: d["aspetto"].update(prompt_ritratto="bust portrait of a thin innkeeper"))
    assert "IMMAGINI.ritratto" in errori(camp)


def test_immagini_stile_due_volte(camp):
    modifica(camp, "png/png_irma.yaml", lambda d: d["aspetto"].update(prompt_immagine=d["aspetto"]["prompt_immagine"] + ", [STILE]"))
    assert "IMMAGINI.ritratto" in errori(camp)


def test_immagini_segreto_nel_luogo_di_un_nodo_in_rigoroso(camp):
    modifica(camp, "campagna.yaml", lambda d: d["nodi"][1].update(
        immagine={"prompt_luogo": "small stone chapel, the silver lantern hidden behind the altar, no people"}))
    assert "IMMAGINI.segreto" not in errori(camp)
    assert "IMMAGINI.segreto" in errori(camp, rigoroso=True)


def test_immagini_luogo_di_un_nodo_in_italiano(camp):
    modifica(camp, "campagna.yaml", lambda d: d["nodi"][1].update(immagine={"prompt_luogo": "una cappella di pietra con la neve sul tetto"}))
    assert "IMMAGINI.lingua" in avvisi(camp)


def test_immagini_situazione_con_dopo_inesistente_e_senza_dopo(camp):
    sit = {"id": "in_cantina", "prompt": "the innkeeper in the cellar, holding a lantern"}
    modifica(camp, "png/png_irma.yaml", lambda d: d["aspetto"].update(situazioni=[sit]))
    assert "IMMAGINI.situazione" not in errori(camp)
    assert "IMMAGINI.situazione" in errori(camp, rigoroso=True)
    modifica(camp, "png/png_irma.yaml", lambda d: d["aspetto"].update(situazioni=[{**sit, "dopo": ["i_niente"]}]))
    assert "IMMAGINI.situazione" in errori(camp)
    modifica(camp, "png/png_irma.yaml", lambda d: d["aspetto"].update(situazioni=[{**sit, "dopo": ["i_botte"]}]))
    assert "IMMAGINI.situazione" not in errori(camp, rigoroso=True)


def test_immagini_ritratto_senza_stile(camp):
    modifica(camp, "png/png_irma.yaml", lambda d: d["aspetto"].update(prompt_immagine="thin innkeeper woman, firelight"))
    assert "IMMAGINI.ritratto" in errori(camp)


def test_immagini_tratto_segreto_solo_in_rigoroso(camp):
    modifica(camp, "png/png_bruno.yaml", lambda d: d["aspetto"]["invarianti"].append("un fagotto sotto il mantello"))
    assert "IMMAGINI.segreto" not in errori(camp)
    assert "IMMAGINI.segreto" in errori(camp, rigoroso=True)


def _situazione(camp: Path, *situazioni: dict) -> None:
    modifica(camp, "png/png_irma.yaml", lambda d: d["aspetto"].update(situazioni=list(situazioni)))


def test_immagini_situazione_dopo_la_rivelazione_del_tratto(camp):
    # Il tratto si ricava dal lessico: i_cera e nar_cera rendono pubblico f_impronte_cera («gocce di cera»).
    _situazione(camp, {"id": "sui_gradini", "dopo": ["i_cera", "nar_cera"], "prompt": "the innkeeper on the cellar steps"})
    assert "IMMAGINI.situazione" not in errori(camp, rigoroso=True)
    assert "IMMAGINI.situazione" not in avvisi(camp, rigoroso=True)


def test_immagini_situazione_che_comparirebbe_prima_del_tratto(camp):
    # tr_sala esce prima della cera: la situazione comparirebbe prima della rivelazione.
    _situazione(camp, {"id": "sui_gradini", "dopo": ["i_cera", "tr_sala"], "prompt": "the innkeeper on the cellar steps"})
    assert "IMMAGINI.situazione" in errori(camp)


def test_immagini_situazione_dopo_un_esempio_di_voce(camp):
    _situazione(camp, {"id": "sui_gradini", "dopo": ["irma_saluto"], "prompt": "the innkeeper on the cellar steps"})
    assert "IMMAGINI.situazione" in errori(camp)


def test_immagini_situazione_dopo_una_battuta_che_non_rivela(camp):
    _situazione(camp, {"id": "sui_gradini", "dopo": ["tr_sala"], "prompt": "the innkeeper on the cellar steps"})
    assert "IMMAGINI.situazione" not in errori(camp)
    assert "IMMAGINI.situazione" in avvisi(camp)


def test_immagini_tratto_in_un_altra_situazione_che_si_vede_prima(camp):
    _situazione(camp, {"id": "sui_gradini", "dopo": ["i_cera"], "prompt": "the innkeeper on the cellar steps"},
                {"id": "al_bancone", "dopo": ["tr_sala"], "prompt": "the innkeeper at the counter, gocce di cera on her sleeve"})
    assert "IMMAGINI.situazione" in errori(camp)


# --- AUDIO (campi espliciti di docs/audio.md) ------------------------------------------------------

def test_audio_campi_giusti_passano(camp):
    modifica(camp, "stile.yaml", lambda d: d.update(audio={
        "tonalita": "re dorico", "tempo": 88, "strumenti": ["fisarmonica", "clarinetto"], "umore_base": "taverna_calda",
        "epoca": "antica", "motivo": {"metro": 4, "note": [[0, 1], [2, 1], [4, 1], [2, 1], [1, 2], [0, 2]]}}))
    modifica(camp, "scena.yaml", lambda d: d.update(audio={"musica": ["notte", "taverna", "fiddle"],
                                                           "ambiente": ["fuoco", {"tag": "vento", "volume": 0.3}],
                                                           "umore_iniziale": "taverna_calda"}))
    modifica(camp, "png/png_irma.yaml", lambda d: d.update(tema={"carattere": ["caldo"], "strumento": "flauto dolce",
                                                                 "modo": "maggiore", "registro": "medio"}))
    assert not {c for c in errori(camp, rigoroso=True) if c.startswith("AUDIO.")}
    assert not {c for c in avvisi(camp) if c.startswith("AUDIO.")}


def test_audio_valori_fuori_vocabolario(camp):
    modifica(camp, "stile.yaml", lambda d: d.update(audio={"umore_base": "allegria", "epoca": "vittoriana", "tonalita": "zeta"}))
    modifica(camp, "scena.yaml", lambda d: d.update(audio={"ambiente": ["lupi"], "umore_iniziale": "suspense"}))
    modifica(camp, "png/png_irma.yaml", lambda d: d.update(tema={"carattere": "misteriosa", "strumento": "theremin",
                                                                 "modo": "esotico", "registro": "altissimo"}))
    assert "AUDIO.vocabolario" in errori(camp)


def test_audio_chiave_sconosciuta_e_volume(camp):
    modifica(camp, "scena.yaml", lambda d: d.update(audio={"musiche": ["notte"], "ambiente": [{"tag": "fuoco", "volume": 3}]}))
    assert "AUDIO.forma" in errori(camp)


def test_audio_motivo_che_la_pipeline_scarterebbe(camp):
    # Un salto di un'ottava e mezza e note troppo poche: temi/motivo.py lo scarterebbe in silenzio.
    modifica(camp, "stile.yaml", lambda d: d.update(audio={"motivo": {"metro": 4, "note": [[0, 1], [9, 3]]}}))
    assert "AUDIO.motivo" in errori(camp)


def test_audio_parola_segreta_in_un_tema_o_in_un_luogo(camp):
    modifica(camp, "png/png_irma.yaml", lambda d: d.update(tema={"strumento": "fisarmonica del mercante"}))
    modifica(camp, "campagna.yaml", lambda d: d["nodi"][1].update(audio={"musica": ["fagotto nella cantina"]}))
    assert "AUDIO.segreto" in errori(camp)


def test_audio_tema_che_tradisce_chi_mente(camp):
    # Irma mente: il frigio la farebbe suonare sinistra prima che il tavolo trovi la bugia.
    modifica(camp, "png/png_irma.yaml", lambda d: d.update(tema={"modo": "frigio"}))
    assert "AUDIO.tema_rivelatore" not in errori(camp)
    assert "AUDIO.tema_rivelatore" in errori(camp, rigoroso=True)
    # Un carattere che la persona pubblica non giustifica è un avviso.
    modifica(camp, "png/png_irma.yaml", lambda d: d.update(tema={"carattere": ["freddo"]}))
    assert "AUDIO.tema_rivelatore" in avvisi(camp)


def test_audio_segnali_delle_battute_giusti(camp):
    # Il segno nomina la campana nella prima frase: l'effetto parte con lei. «auto» vale nelle battute.
    modifica(camp, "repertorio/narrazione.yaml", lambda d: battuta(d, "nar_segno_1").update(
        audio={"effetto": "sfx_campana", "umore": "auto"}))
    modifica(camp, "repertorio/narrazione.yaml", lambda d: battuta(d, "nar_segno_4").update(audio={"umore": "rito_sacro"}))
    assert not {c for c in errori(camp, rigoroso=True) if c.split(".")[0] in ("AUDIO", "REPERTORIO")}
    assert not {c for c in avvisi(camp) if c.startswith("AUDIO.")}


def test_audio_segnali_delle_battute_fuori_vocabolario(camp):
    modifica(camp, "repertorio/narrazione.yaml", lambda d: battuta(d, "nar_segno_1").update(audio={"effetto": "gong"}))
    modifica(camp, "repertorio/narrazione.yaml", lambda d: battuta(d, "nar_segno_2").update(audio={"umore": "suspense"}))
    assert "AUDIO.vocabolario" in errori(camp)
    modifica(camp, "repertorio/narrazione.yaml", lambda d: battuta(d, "nar_segno_3").update(audio={"volume": 2}))
    assert "AUDIO.forma" in errori(camp)


def test_audio_umore_iniziale_non_e_auto(camp):
    modifica(camp, "scena.yaml", lambda d: d.update(audio={"umore_iniziale": "auto"}))
    assert "AUDIO.vocabolario" in errori(camp)


def test_audio_effetto_che_la_battuta_non_nomina(camp):
    # nar_segno_2 parla di qualcuno che bussa: una campana lì suonerebbe a caso.
    modifica(camp, "repertorio/narrazione.yaml", lambda d: battuta(d, "nar_segno_2").update(audio={"effetto": "campana"}))
    assert "AUDIO.segnale" in avvisi(camp)


def test_audio_effetto_assente_dal_catalogo(camp):
    (camp / "audio").mkdir()
    (camp / "audio" / "sfx_porta.m4a").write_bytes(b"x")
    (camp / "audio" / "manifest.json").write_text('{"effetti": [{"id": "sfx_porta", "tag": "porta", "file": "sfx_porta.m4a"}]}')
    modifica(camp, "repertorio/narrazione.yaml", lambda d: battuta(d, "nar_segno_1").update(audio={"effetto": "campana"}))
    assert "AUDIO.catalogo" in avvisi(camp)


def test_audio_segnale_su_un_riempitivo(camp):
    modifica(camp, "repertorio/narrazione.yaml", lambda d: battuta(d, "nar_stallo").update(audio={"umore": "lutto"}))
    assert "AUDIO.segnale" in avvisi(camp)


def test_audio_troppi_cambi_d_umore(camp):
    def tre(d):
        for bid in ("nar_segno_1", "nar_segno_2", "nar_segno_3"):
            battuta(d, bid)["audio"] = {"umore": "inseguimento"}
    modifica(camp, "repertorio/narrazione.yaml", tre)
    assert "AUDIO.segnale" in avvisi(camp)


def test_copioni_misura_il_catalogo(camp, tmp_path):
    from valida import copioni
    from valida.esito import Esito
    cartella = tmp_path / "copioni"
    cartella.mkdir()
    scrivi(cartella, "prova.yaml", {"turni": [[{"pg": "pg_lia", "azione": "scendo in cantina e guardo le botti"}],
                                              [{"pg": "pg_tobia", "azione": "chiedo a Bruno se ha visto qualcosa stanotte"}]]})
    esito, c = valida(camp)
    righe = copioni.controlla(c, Esito(), cartella)
    assert "nar_botte" in righe[0] and "bruno_notte_domanda" in righe[1]
    assert copioni.catalogo(c, "una frase senza parole utili") == []


def test_copioni_seguono_cancelli_e_stato(camp, tmp_path):
    # Nota 16: la misura contava anche le battute chiuse da un cancello.
    from valida import copioni
    from valida.esito import Esito
    cartella = tmp_path / "copioni"
    cartella.mkdir()
    scrivi(cartella, "cancelli.yaml", {"turni": [
        [{"pg": "pg_lia", "azione": "prometto a Bruno che non dirò niente", "privata": True}],
        [{"pg": "pg_tobia", "azione": "chiedo a Bruno se ha visto qualcosa stanotte"}],
        [{"pg": "pg_lia", "azione": "prometto a Bruno che non dirò niente"}],
        [{"pg": "pg_lia", "azione": "prometto a Bruno che non dirò niente", "privata": True}]]})
    _, c = valida(camp, contesto_b=False)
    righe = copioni.controlla(c, Esito(), cartella)
    assert "bruno_notte_promessa" not in righe[0]          # serve prima la sua versione
    assert "bruno_notte_domanda" in righe[1]
    assert "bruno_notte_promessa" not in righe[2]          # pubblica: il cancello privata la ferma
    assert "bruno_notte_promessa" in righe[3]              # privata, dopo la versione


def test_copioni_contano_le_azioni_private_e_gli_essenziali(camp, tmp_path):
    # Giudizio di nozze-neve: i copioni non avevano azioni private, e 115 battute su 139 non sono mai uscite.
    from valida import copioni
    from valida.esito import Esito
    cartella = tmp_path / "copioni"
    cartella.mkdir()
    scrivi(cartella, "pubblico.yaml", {"turni": [[{"pg": "pg_lia", "azione": "guardo il camino"}]]})
    _, c = valida(camp, contesto_b=False)
    es = Esito()
    righe = copioni.controlla(c, es, cartella)
    codici = {v.codice for v in es.avvisi}
    assert "COPERTURA.copioni_private" in codici
    assert "COPERTURA.copioni_essenziali" in codici                    # i_cera, essenziale, non è mai raggiunto
    assert any("0 private" in r for r in righe) and any("battute raggiunte dai copioni" in r for r in righe)
    scrivi(cartella, "pubblico.yaml", {"turni": [[{"pg": "pg_lia", "azione": "guardo i gradini della cantina", "privata": True}],
                                                 [{"pg": "pg_lia", "azione": "prometto a Bruno di tacere", "privata": True}],
                                                 [{"pg": "pg_tobia", "azione": "guardo la cera sui gradini"}]]})
    es = Esito()
    copioni.controlla(c, es, cartella)
    assert "COPERTURA.copioni_private" not in {v.codice for v in es.avvisi}


def test_copioni_seguono_la_scena(camp, tmp_path):
    from valida import copioni
    from valida.esito import Esito
    _seconda_scena(camp, ["png_irma", "png_bruno"], ["png_irma"])
    modifica(camp, "repertorio/narrazione.yaml", lambda d: battuta(d, "nar_botte").update(scena="scena_due"))
    cartella = tmp_path / "copioni"
    cartella.mkdir()
    azione = [[{"pg": "pg_lia", "azione": "scendo in cantina e guardo le botti"}]]
    scrivi(cartella, "volpe.yaml", {"turni": azione})
    scrivi(cartella, "zdue.yaml", {"scena": "scena_due", "turni": azione})
    _, c = valida(camp, contesto_b=False)
    righe = [r for r in copioni.controlla(c, Esito(), cartella) if " T1 " in r]
    assert "nar_botte" not in righe[0] and "nar_botte" in righe[1]


def test_ogni_classe_ha_almeno_un_test():
    """Promemoria: una classe di errore nuova vuole il suo test qui sopra."""
    from valida.esito import CLASSI
    testo = Path(__file__).read_text(encoding="utf-8")
    for classe in CLASSI:
        assert f'"{classe}.' in testo, f"nessun test per la classe {classe}"


def _riga_bruno(camp, riga):
    """Mette una riga di prova nella battuta bruno_rifiuto (repertorio del mini)."""
    modifica(camp, "repertorio/png_bruno.yaml",
             lambda d: next(b for b in d["battute"] if b["id"] == "bruno_rifiuto").update(testo=[riga]))


def test_voce_markup_valido_passa_e_non_conta_come_parole(camp):
    # Direzione a inizio riga, un suono e un tag chiuso: nessun errore, e la prosa misura solo le parole.
    _riga_bruno(camp, "[png_bruno] [seccato, a mezza voce] Non lo so. [sigh] Chiedete a <emphasis>chi sa</emphasis>.")
    assert not {c for c in errori(camp, rigoroso=True) if c.startswith("VOCE.")}
    assert not {c for c in avvisi(camp) if c.startswith("VOCE.")}
    assert not {c for c in errori(camp, rigoroso=True) if c.startswith("PROSA.")}


def test_voce_markup_rotto(camp):
    _riga_bruno(camp, "[png_bruno] Non lo so. <whisper>Chiedete a chi sa.")
    assert "VOCE.tag_non_chiuso" in errori(camp)
    _riga_bruno(camp, "[png_bruno] Non lo so. <shout>Chiedete</shout> a chi sa.")
    assert "VOCE.tag_sconosciuto" in errori(camp)
    _riga_bruno(camp, "[png_bruno] [Seccato. Molto] Non lo so.")
    assert "VOCE.direzione_punto" in errori(camp)
    _riga_bruno(camp, "[png_bruno] [" + "molto " * 15 + "seccato] Non lo so.")
    assert "VOCE.direzione_lunga" in errori(camp)
    _riga_bruno(camp, "[png_bruno] Non lo so. [seccato] Chiedete a chi sa.")
    assert "VOCE.direzione_a_meta" in avvisi(camp)


# --- schede numeriche e prove (docs/prove.md §2) ---------------------------------------------------

def _scheda_pg(d: dict, pid: str = "pg_lia") -> dict:
    return next(p for p in d["personaggi"] if p["id"] == pid)["scheda"]


def _scheda_png(d: dict) -> dict:
    return d["scheda"]


def _codici_schede(cartella: Path) -> set[str]:
    return {c for c in errori(cartella) if c.startswith("SCHEDA.")}


def test_schede_mancanti_con_i_dadi(camp):
    modifica(camp, "pg.yaml", lambda d: next(p for p in d["personaggi"] if p["id"] == "pg_lia").pop("scheda"))
    modifica(camp, "png/png_irma.yaml", lambda d: d.pop("scheda"))
    assert {"SCHEDA.mancante"} <= errori(camp)


def test_schede_mancanti_senza_dadi_non_sono_un_errore(camp):
    modifica(camp, "campagna.yaml", lambda d: d.update(regole={"dadi": False}))
    modifica(camp, "pg.yaml", lambda d: next(p for p in d["personaggi"] if p["id"] == "pg_lia").pop("scheda"))
    modifica(camp, "png/png_irma.yaml", lambda d: d.pop("scheda"))
    assert not _codici_schede(camp)
    assert errori(camp, rigoroso=True) == set()


def test_regole_dadi_deve_essere_booleano(camp):
    modifica(camp, "campagna.yaml", lambda d: d.update(regole={"dadi": "no"}))
    assert "SCHEDA.regole" in errori(camp)


def test_scheda_caratteristiche_pg_fino_a_20_png_fino_a_30(camp):
    modifica(camp, "pg.yaml", lambda d: _scheda_pg(d).__setitem__("caratteristiche", {**_scheda_pg(d)["caratteristiche"], "forza": 25}))
    assert "SCHEDA.caratteristiche" in errori(camp)
    modifica(camp, "pg.yaml", lambda d: _scheda_pg(d).__setitem__("caratteristiche", {**_scheda_pg(d)["caratteristiche"], "forza": 20}))
    modifica(camp, "png/png_bruno.yaml", lambda d: _scheda_png(d)["caratteristiche"].__setitem__("carisma", 25))
    assert not _codici_schede(camp)


def test_scheda_caratteristica_mancante_o_sconosciuta(camp):
    modifica(camp, "pg.yaml", lambda d: _scheda_pg(d)["caratteristiche"].pop("carisma"))
    assert "SCHEDA.caratteristiche" in errori(camp)
    modifica(camp, "pg.yaml", lambda d: _scheda_pg(d)["caratteristiche"].update(fortuna=10))
    assert "SCHEDA.caratteristiche" in errori(camp)


def test_scheda_modificatore_scritto_a_mano(camp):
    modifica(camp, "pg.yaml", lambda d: _scheda_pg(d)["caratteristiche"].__setitem__("forza", "+3"))
    assert "SCHEDA.modificatore_a_mano" in errori(camp)
    modifica(camp, "pg.yaml", lambda d: _scheda_pg(d).update(modificatore={"furtivita": 5}))
    assert "SCHEDA.modificatore_a_mano" in errori(camp)


def test_scheda_abilita_e_maestria(camp):
    modifica(camp, "pg.yaml", lambda d: _scheda_pg(d).__setitem__("competenze", ["volare"]))
    assert "SCHEDA.abilita" in errori(camp)
    modifica(camp, "pg.yaml", lambda d: _scheda_pg(d).update(competenze=["percezione"], maestrie=["furtivita"]))
    assert "SCHEDA.abilita" in errori(camp)


def test_scheda_abilita_con_nome_italiano_e_accettata(camp):
    modifica(camp, "pg.yaml", lambda d: _scheda_pg(d).__setitem__("competenze", ["Rapidità di mano", "Furtività"]))
    assert not _codici_schede(camp)


def test_scheda_armatura_dell_srd_o_ca(camp):
    modifica(camp, "pg.yaml", lambda d: _scheda_pg(d).__setitem__("armatura", {"tipo": "tuta spaziale", "scudo": False}))
    assert "SCHEDA.armatura" in errori(camp)
    modifica(camp, "pg.yaml", lambda d: _scheda_pg(d).update(armatura="nessuna", ca=14))
    assert not _codici_schede(camp)


def test_scheda_ca_scritta_diversa_dall_armatura(camp):
    # Lia: armatura di cuoio con Destrezza 16 (+3) fa 14. Scriverne un'altra è un errore.
    modifica(camp, "pg.yaml", lambda d: _scheda_pg(d).__setitem__("ca", 12))
    assert "SCHEDA.ca" in errori(camp)


def test_scheda_pf_non_oltre_il_massimo_di_classe(camp):
    # Lia: ladra, dado 8, Costituzione +1: al livello 1 il massimo è 9.
    modifica(camp, "pg.yaml", lambda d: _scheda_pg(d).__setitem__("pf", 9))
    assert "SCHEDA.pf" not in errori(camp)
    modifica(camp, "pg.yaml", lambda d: _scheda_pg(d).__setitem__("pf", 10))
    assert "SCHEDA.pf" in errori(camp)


def test_scheda_classe_sconosciuta_e_un_avviso(camp):
    modifica(camp, "pg.yaml", lambda d: next(p for p in d["personaggi"] if p["id"] == "pg_lia").__setitem__("classe", "pirata"))
    modifica(camp, "pg.yaml", lambda d: _scheda_pg(d).__setitem__("pf", 50))
    assert "SCHEDA.pf" in avvisi(camp)
    assert "SCHEDA.pf" not in errori(camp)


def test_scheda_pg_due_tiri_salvezza(camp):
    modifica(camp, "pg.yaml", lambda d: _scheda_pg(d).__setitem__("tiri_salvezza", ["destrezza"]))
    assert "SCHEDA.tiri_salvezza" in errori(camp)


def test_scheda_attacchi(camp):
    modifica(camp, "pg.yaml", lambda d: _scheda_pg(d)["attacchi"][0].__setitem__("danno", "1d7"))
    assert "SCHEDA.attacco" in errori(camp)
    modifica(camp, "pg.yaml", lambda d: _scheda_pg(d)["attacchi"][0].update(danno="1d8+1"))
    assert "SCHEDA.attacco" in errori(camp)
    modifica(camp, "pg.yaml", lambda d: _scheda_pg(d)["attacchi"][0].pop("caratteristica"))
    assert "SCHEDA.attacco" in errori(camp)
    modifica(camp, "pg.yaml", lambda d: _scheda_pg(d)["attacchi"][0].update(danno="1d8", bonus=1, caratteristica="destrezza"))
    assert not _codici_schede(camp)


def test_png_gs_non_valido(camp):
    modifica(camp, "png/png_bruno.yaml", lambda d: _scheda_png(d).__setitem__("gs", "3/5"))
    assert "SCHEDA.gs" in errori(camp)


def test_png_gs_frazione_e_livello(camp):
    modifica(camp, "png/png_bruno.yaml", lambda d: _scheda_png(d).update(gs="1/8", ca=12))
    assert not _codici_schede(camp)
    modifica(camp, "png/png_bruno.yaml", lambda d: (_scheda_png(d).pop("gs"), _scheda_png(d).update(livello=1)))
    assert not _codici_schede(camp)


def test_png_ca_fuori_dalla_fascia_del_gs(camp):
    modifica(camp, "png/png_bruno.yaml", lambda d: _scheda_png(d).__setitem__("ca", 18))
    assert "SCHEDA.gs" in errori(camp)


def test_png_pf_fuori_dalla_fascia_del_gs(camp):
    modifica(camp, "png/png_irma.yaml", lambda d: _scheda_png(d).__setitem__("pf", 40))
    assert "SCHEDA.gs" in errori(camp)


def test_png_attacco_con_piu_di_due_dadi_a_gs_basso(camp):
    modifica(camp, "png/png_bruno.yaml", lambda d: _scheda_png(d)["attacchi"][0].update(danno="3d6"))
    assert "SCHEDA.gs" in errori(camp)


def _prova(**campi) -> dict:
    base = {"id": "p_cassetta", "quando": "un PG apre il lucchetto della cassetta del pedaggio",
            "abilita": "rapidita_di_mano", "cd": 15}
    base.update(campi)
    return base


def _metti_prove(camp: Path, prove: list) -> None:
    modifica(camp, "scena.yaml", lambda d: d.__setitem__("prove", prove))


def test_prove_della_scena_valide(camp):
    _metti_prove(camp, [_prova(), _prova(id="p_sala", abilita="percezione", indizio="i_botte"),
                        _prova(id="p_forza", abilita=None, caratteristica="forza", cd=10)])
    modifica(camp, "scena.yaml", lambda d: d["prove"][2].pop("abilita"))
    assert not _codici_schede(camp)


def test_prove_della_scena_regole(camp):
    casi = {
        "id senza p_": _prova(id="cassetta"),
        "cd fuori scala": _prova(cd=40),
        "abilita inventata": _prova(abilita="volare"),
        "nessuna abilita": {k: v for k, v in _prova().items() if k != "abilita"},
        "due abilita": _prova(caratteristica="forza"),
        "quando troppo lungo": _prova(quando="un PG " + " ".join(["apre"] * 16) + " la cassetta"),
        "indizio inesistente": _prova(indizio="i_fantasma"),
        "indizio essenziale": _prova(indizio="i_cera"),
    }
    for nome, prova in casi.items():
        modifica(camp, "scena.yaml", lambda d, p=prova: d.__setitem__("prove", [p]))
        assert "SCHEDA.prove" in errori(camp), nome


def test_prove_con_id_ripetuto_in_due_scene(camp, tmp_path):
    _metti_prove(camp, [_prova()])
    scrivi(camp / "scene", "seconda.yaml", {"id": "scena_due", "prove": [_prova()]}) if (camp / "scene").is_dir() else None
    if not (camp / "scene").is_dir():
        (camp / "scene").mkdir()
        scrivi(camp / "scene", "seconda.yaml", {"id": "scena_due", "prove": [_prova()]})
    assert "SCHEDA.prove" in errori(camp)


def test_richiede_prova_deve_esistere(camp):
    def con_prova(valore):
        def f(d):
            battuta(d, "bruno_notte_promessa")["richiede"] = {"prova": valore}
        return f
    modifica(camp, "repertorio/png_bruno.yaml", con_prova("persuasione"))
    assert "SCHEDA.richiede_prova" not in errori(camp)
    modifica(camp, "repertorio/png_bruno.yaml", con_prova("volare"))
    assert "SCHEDA.richiede_prova" in errori(camp)
    modifica(camp, "repertorio/png_bruno.yaml", con_prova("p_cassetta"))
    assert "SCHEDA.richiede_prova" in errori(camp)
    _metti_prove(camp, [_prova()])
    assert "SCHEDA.richiede_prova" not in errori(camp)
    modifica(camp, "repertorio/png_bruno.yaml", con_prova("p_cassetta"))
    assert "SCHEDA.richiede_prova" not in errori(camp)
