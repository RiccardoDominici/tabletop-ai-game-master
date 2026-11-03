"""Test della qualità delle immagini (controlli.py, qualita.py, visione.py) e del ciclo dei tentativi di genera.py.

    python3 -m pytest -q strumenti/immagini/test_qualita.py

Senza modello e senza rete: un motore finto disegna immagini pulite o difettose a seconda del seme, e
un client finto fa da controllo visivo. Controlla che:
  - i controlli a pixel vedano un orlo vero ma non la neve che tocca il bordo;
  - firme, orli, anatomia e segreti siano gravi anche se il modello dice «lieve»;
  - una difettosa si rigeneri con un seme NUOVO, al massimo MAX_TENTATIVI volte, tenendo la migliore;
  - un'immagine già fatta e difettosa entri nel piano e riparta dal tentativo successivo.
"""

from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace

import numpy as np
import pytest
from PIL import Image

import campagna
import controlli
import genera
import motore as M
import qualita
import visione
from manifest import Manifest

# --- immagini finte ------------------------------------------------------------------------------

def _scena(w: int, h: int, orlo: int = 0, neve_ai_bordi: bool = False) -> Image.Image:
    """Un'immagine «dipinta» (rumore scuro), con un orlo di carta largo `orlo` px o neve che tocca il bordo."""
    rng = np.random.default_rng(1)
    a = rng.integers(40, 160, size=(h, w, 3), dtype=np.uint8)
    if neve_ai_bordi:  # neve chiara in basso, ma solo su un terzo del bordo
        a[int(h * 0.8):, : w // 3] = 240
    if orlo:
        carta = (246, 242, 234)  # chiaro e poco saturo: ben sopra la soglia di rifila.CHIARO
        a[:orlo, :] = a[-orlo:, :] = carta
        a[:, :orlo] = a[:, -orlo:] = carta
    return Image.fromarray(a)


def test_controlli_vedono_l_orlo_ma_non_la_neve(tmp_path: Path):
    _scena(1920, 1080, orlo=12).save(tmp_path / "orlo.jpg")
    _scena(1920, 1080, neve_ai_bordi=True).save(tmp_path / "neve.jpg")
    Image.new("RGB", (1920, 1080), (200, 200, 200)).save(tmp_path / "vuota.jpg")
    assert {p["tipo"] for p in controlli.controlla_file(tmp_path / "orlo.jpg", (1920, 1080))} == {"margine"}
    assert controlli.controlla_file(tmp_path / "neve.jpg", (1920, 1080)) == []
    assert "vuota" in {p["tipo"] for p in controlli.controlla_file(tmp_path / "vuota.jpg", (1920, 1080))}
    assert "dimensioni" in {p["tipo"] for p in controlli.controlla_file(tmp_path / "neve.jpg", (1280, 720))}


# --- controllo visivo finto -----------------------------------------------------------------------

class ClientFinto:
    """Fa da client Anthropic: risponde con i problemi dati, come farebbe il modello con lo schema."""

    def __init__(self, problemi: list[dict]):
        self.problemi = problemi
        self.chiamate = 0
        self.messages = SimpleNamespace(create=self._create)

    def _create(self, **kw):
        self.chiamate += 1
        assert kw["model"] == visione.MODELLO and kw["output_config"]["format"]["type"] == "json_schema"
        assert [b["type"] for b in kw["messages"][0]["content"]] == ["image", "image", "text"]  # intera + angoli
        testo = json.dumps({"descrizione": "una scena", "problemi": self.problemi})
        return SimpleNamespace(stop_reason="end_turn", content=[SimpleNamespace(type="text", text=testo)],
                               usage=SimpleNamespace(input_tokens=3000, output_tokens=700))


def test_una_firma_e_grave_anche_se_il_modello_dice_lieve(tmp_path: Path, mini: Path):
    _scena(1920, 1080).save(tmp_path / "x.jpg")
    r = next(x for x in campagna.richieste(mini) if x.id == "luogo_scena_sala")
    client = ClientFinto([{"tipo": "testo_o_firma", "dove": "angolo in basso a destra", "descrizione": "firma", "grave": False},
                          {"tipo": "soggetto", "dove": "centro", "descrizione": "manca un dettaglio", "grave": False}])
    q = qualita.valuta(tmp_path / "x.jpg", r, mini, client)
    assert q["esito"] == "difettosa" and len(q["motivi"]) == 1 and q["motivi"][0].startswith("testo_o_firma")
    assert q["costo_usd"] == pytest.approx(3000 * visione.PREZZO_INGRESSO + 700 * visione.PREZZO_USCITA)


def test_segreti_solo_dove_non_devono_vedersi(mini: Path):
    rr = {r.id: r for r in campagna.richieste(mini)}
    assert any("scar" in s for s in qualita.segreti_per(rr["ritratto_png_uno"], mini))
    assert any("scar" in s for s in qualita.segreti_per(rr["situazione_png_uno_in_scena_sala"], mini))
    assert qualita.segreti_per(rr["situazione_png_uno_senza_cappuccio"], mini) == []  # è la rivelazione
    assert qualita.segreti_per(rr["luogo_scena_sala"], mini) == []


# --- ciclo dei tentativi --------------------------------------------------------------------------

class MotoreFinto:
    """Disegna un'immagine difettosa (orlo) per i semi in `difettosi`, pulita per gli altri."""

    difettosi: set[int] = set()
    semi: list[int] = []
    descrizione = "motore-finto"

    def __init__(self, fp16: bool = True):
        pass

    def genera(self, prompt, seme, larghezza, altezza, uscita, riferimenti=None):
        MotoreFinto.semi.append(seme)
        _scena(larghezza, altezza, orlo=120 if seme in MotoreFinto.difettosi else 0).save(uscita)
        return M.Esito(Path(uscita), 1.0, None)


@pytest.fixture()
def finto(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(M, "Motore", MotoreFinto)
    monkeypatch.setattr(M, "verifica_alimentazione", lambda *a, **k: None)
    monkeypatch.setattr(M, "verifica_disco", lambda *a, **k: None)
    monkeypatch.setattr(genera, "modello_attuale", lambda fp16: MotoreFinto.descrizione)
    MotoreFinto.semi = []
    return MotoreFinto


def test_difettosa_si_rifa_con_un_seme_nuovo(mini: Path, finto):
    r = next(x for x in campagna.richieste(mini) if x.id == "luogo_n_bosco")
    finto.difettosi = {r.seme}  # il seme dell'id dà un'immagine con l'orlo
    man = Manifest(mini / "immagini")
    genera.esegui(mini, [r], man, fp16=True, seme=None, client_visione=None)
    voce = Manifest(mini / "immagini").voci["luogo_n_bosco"]
    assert finto.semi == [r.seme, qualita.seme_tentativo(r.id, 1)]
    assert voce["seme"] == qualita.seme_tentativo(r.id, 1)
    assert voce["qualita"]["esito"] == "ok" and voce["qualita"]["tentativi"] == 2
    assert controlli.controlla_file(mini / "immagini" / r.file, (r.larghezza, r.altezza)) == []


def test_dopo_tutti_i_tentativi_resta_la_migliore_da_controllare(mini: Path, finto):
    r = next(x for x in campagna.richieste(mini) if x.id == "luogo_n_bosco")
    finto.difettosi = {r.seme} | {qualita.seme_tentativo(r.id, n) for n in range(1, qualita.MAX_TENTATIVI)}
    genera.esegui(mini, [r], Manifest(mini / "immagini"), fp16=True, seme=None, client_visione=None)
    voce = Manifest(mini / "immagini").voci["luogo_n_bosco"]
    assert len(finto.semi) == qualita.MAX_TENTATIVI
    assert voce["qualita"]["esito"] == "da_controllare" and voce["qualita"]["motivi"]
    assert voce["seme"] == r.seme  # a parità di difetti, la prima


def test_una_gia_fatta_difettosa_entra_nel_piano_e_riparte_dal_tentativo_dopo(mini: Path, finto, monkeypatch):
    r = next(x for x in campagna.richieste(mini) if x.id == "luogo_n_bosco")
    finto.difettosi = {r.seme}
    monkeypatch.setattr(genera, "client_visione", lambda: None)
    # Un giro «vecchio» senza controlli: l'immagine difettosa c'è, con la sua firma, ma senza `qualita`.
    genera.esegui(mini, [r], Manifest(mini / "immagini"), fp16=True, seme=None, client_visione=None)
    man = Manifest(mini / "immagini")
    _scena(r.larghezza, r.altezza, orlo=120).save(man.cartella / r.file)
    voce = {k: v for k, v in man.voci[r.id].items() if k != "qualita"}
    voce["seme"] = r.seme
    from freschezza import firme_attese
    man.voci[r.id] = voce
    voce["firma"] = firme_attese(campagna.richieste(mini), man, MotoreFinto.descrizione)[r.id]
    man.salva()
    finto.semi = []
    monkeypatch.setattr("sys.argv", ["genera.py", str(mini), "--id", r.id])
    genera.main()
    voce = Manifest(mini / "immagini").voci[r.id]
    assert finto.semi == [qualita.seme_tentativo(r.id, 1)]  # mai di nuovo il seme che ha dato il difetto
    assert voce["qualita"]["esito"] == "ok" and voce["qualita"]["tentativi"] == 2
