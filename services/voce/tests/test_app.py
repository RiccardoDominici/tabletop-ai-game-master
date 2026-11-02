"""Test di coda + API HTTP con un motore finto (niente MLX): FIFO, errori, annullamento.

Il motore finto produce pezzi di audio a intervalli regolari, così si può
verificare l'ordine e l'interruzione senza caricare il modello.
"""
import threading
import time

import numpy as np
import pytest
from starlette.testclient import TestClient

from voce.app import crea_app
from voce.coda import Coda
from voce.config import Impostazioni
from voce.diario import DiarioJsonl
from voce.registro import Voce


class MotoreFinto:
    sample_rate = 24000

    def __init__(self, pezzi=5, pausa_s=0.05, errore_al_pezzo=None):
        self.pezzi, self.pausa_s, self.errore_al_pezzo = pezzi, pausa_s, errore_al_pezzo
        self.eseguiti: list[str] = []
        self.thread_usati: set[int] = set()
        self.chiusi = 0

    def carica(self):
        self.thread_usati.add(threading.get_ident())
        return 0.0

    def prepara_voci(self, voci):
        return {k: 0.0 for k in voci}

    def riscalda(self):
        return {}

    def risveglia(self, durata_s, voce_id=None, interrompi=lambda: False):
        self.risvegli = getattr(self, "risvegli", 0) + 1
        t0 = time.perf_counter()
        while time.perf_counter() - t0 < durata_s:
            if interrompi():
                return time.perf_counter() - t0, True
            time.sleep(0.01)
        return time.perf_counter() - t0, False

    def genera(self, testo, voce, info=None):
        self.thread_usati.add(threading.get_ident())
        self.eseguiti.append(testo)
        try:
            for i in range(self.pezzi):
                if self.errore_al_pezzo == i:
                    raise RuntimeError("guasto finto")
                time.sleep(self.pausa_s)
                if info is not None:
                    info.pezzi += 1
                yield np.full(2400, 0.1, dtype=np.float32)  # 0,1 s di audio
        finally:
            self.chiusi += 1


@pytest.fixture
def ambiente(tmp_path):
    def crea(**kw):
        clip = tmp_path / "x.wav"
        clip.write_bytes(b"")
        voci = {"narratore": Voce("narratore", clip, "testo"), "vincent": Voce("vincent", clip, "testo")}
        motore = MotoreFinto(**kw)
        diario = DiarioJsonl(tmp_path / "voce.jsonl")
        coda = Coda(motore, voci, diario, qos=None)
        app = crea_app(Impostazioni(), coda)
        return app, coda, motore, tmp_path / "voce.jsonl"

    return crea


def _attendi_pronto(coda, s=2.0):
    assert coda.pronto.wait(s)


def test_salute_e_stream(ambiente):
    app, coda, motore, _ = ambiente()
    with TestClient(app) as c:
        _attendi_pronto(coda)
        s = c.get("/salute").json()
        assert s["pronto"] is True and s["formato"] == "pcm_s16le" and s["sample_rate"] == 24000
        assert s["voci"] == ["narratore", "vincent"]
        r = c.post("/tts", json={"id": "a", "voce": "narratore", "testo": "Ciao «amici»"})
        assert r.status_code == 200
        assert r.headers["x-sample-rate"] == "24000" and r.headers["x-formato"] == "pcm_s16le"
        assert r.headers["content-type"] == "application/octet-stream"
        assert len(r.content) == 5 * 2400 * 2
    assert motore.eseguiti == ["Ciao amici."]  # il testo arriva normalizzato
    assert len(motore.thread_usati) == 1  # caricamento e generazione sullo stesso thread


def test_errori(ambiente):
    app, coda, _, _ = ambiente()
    with TestClient(app) as c:
        _attendi_pronto(coda)
        r = c.post("/tts", json={"id": "a", "voce": "drago", "testo": "Ciao"})
        assert r.status_code == 404 and "errore" in r.json()
        assert c.post("/tts", json={"id": "a", "voce": "narratore", "testo": "  "}).status_code == 400
        assert c.post("/tts", json={"id": "a", "voce": "narratore", "testo": "🐉"}).status_code == 400
        assert c.post("/tts", json={"voce": "narratore", "testo": "Ciao"}).status_code == 400
        assert c.post("/tts", content=b"non json").status_code == 400
        assert c.post("/annulla", json={"id": "nessuno"}).json() == {"annullata": False}


def test_fifo(ambiente):
    app, coda, motore, _ = ambiente(pezzi=3, pausa_s=0.05)
    with TestClient(app) as c:
        _attendi_pronto(coda)
        risposte = {}

        def chiedi(i):
            risposte[i] = c.post("/tts", json={"id": f"r{i}", "voce": "vincent", "testo": f"Frase {i}"})

        fili = []
        for i in range(3):
            t = threading.Thread(target=chiedi, args=(i,))
            t.start()
            fili.append(t)
            time.sleep(0.02)
        for t in fili:
            t.join()
    assert motore.eseguiti == ["Frase 0.", "Frase 1.", "Frase 2."]
    assert all(risposte[i].status_code == 200 and len(risposte[i].content) == 3 * 4800 for i in range(3))


def test_annulla_ferma_la_generazione(ambiente):
    app, coda, motore, log = ambiente(pezzi=50, pausa_s=0.02)
    with TestClient(app) as c:
        _attendi_pronto(coda)
        risultato = {}

        def chiedi():
            risultato["r"] = c.post("/tts", json={"id": "lungo", "voce": "narratore", "testo": "Lungo"})

        t = threading.Thread(target=chiedi)
        t.start()
        time.sleep(0.15)
        assert c.post("/annulla", json={"id": "lungo"}).json() == {"annullata": True}
        t.join(2)
        assert risultato["r"].status_code == 200
        assert len(risultato["r"].content) < 50 * 4800  # finita prima del tempo
    assert motore.chiusi == 1  # il generatore del motore è stato chiuso
    assert '"annullata": true' in log.read_text()


def test_annulla_in_coda_non_genera(ambiente):
    app, coda, motore, _ = ambiente(pezzi=10, pausa_s=0.03)
    with TestClient(app) as c:
        _attendi_pronto(coda)
        fili = [threading.Thread(target=lambda i=i: c.post("/tts", json={"id": f"q{i}", "voce": "narratore",
                                                                         "testo": f"Frase {i}"}))
                for i in range(2)]
        fili[0].start()
        time.sleep(0.05)
        fili[1].start()
        time.sleep(0.05)
        assert c.post("/annulla", json={"id": "q1"}).json() == {"annullata": True}
        for t in fili:
            t.join(3)
    assert motore.eseguiti == ["Frase 0."]  # la seconda è stata tolta dalla coda


def test_errore_del_motore_tronca_la_risposta(ambiente):
    app, coda, _, log = ambiente(pezzi=5, errore_al_pezzo=2)
    with TestClient(app, raise_server_exceptions=False) as c:
        _attendi_pronto(coda)
        with pytest.raises(Exception):
            r = c.post("/tts", json={"id": "rotto", "voce": "narratore", "testo": "Ciao"})
            r.raise_for_status()
            assert len(r.content) == 5 * 4800  # non deve arrivare qui completo
    assert "guasto finto" in log.read_text()


def test_non_pronto_503(tmp_path):
    clip = tmp_path / "x.wav"
    clip.write_bytes(b"")
    voci = {"narratore": Voce("narratore", clip, "testo")}
    coda = Coda(MotoreFinto(), voci, DiarioJsonl(tmp_path / "l.jsonl"), qos=None)
    app = crea_app(Impostazioni(), coda)
    c = TestClient(app)  # senza "with": niente lifespan, il worker non parte
    r = c.post("/tts", json={"id": "a", "voce": "narratore", "testo": "Ciao"})
    assert r.status_code == 503
    assert c.get("/salute").json()["pronto"] is False


def test_sveglia_si_fa_da_parte_per_le_richieste_vere(ambiente):
    app, coda, motore, log = ambiente(pezzi=2, pausa_s=0.01)
    with TestClient(app) as c:
        _attendi_pronto(coda)
        assert c.post("/sveglia", json={}).json() == {"accodata": True}
        assert c.post("/sveglia", json={}).json() == {"accodata": False}  # già in coda/in corso
        t0 = time.perf_counter()
        r = c.post("/tts", json={"id": "a", "voce": "narratore", "testo": "Ciao"})
        attesa = time.perf_counter() - t0
        assert r.status_code == 200 and len(r.content) == 2 * 4800
        assert attesa < 0.5  # il risveglio (0,8 s) si è interrotto appena è arrivata la richiesta
        assert c.post("/sveglia", json={"durata_s": 9}).status_code == 400
    assert motore.risvegli == 1
    assert '"evento": "sveglia"' in log.read_text() and '"interrotta": true' in log.read_text()
