"""Test del registro voci (voce/registro.py), compreso il registro vero del repository."""
import pytest

from voce.config import Impostazioni
from voce.registro import ErroreRegistro, carica_registro


def test_registro_del_repo():
    voci = carica_registro(Impostazioni().registro_voci)
    assert list(voci) == ["narratore", "vincent", "nadine", "lucian", "tabitha"]
    for v in voci.values():
        assert v.file.is_file() and v.file.suffix == ".wav"
        assert v.testo_rif.endswith(".")


def _scrivi(tmp_path, testo):
    (tmp_path / "a.wav").write_bytes(b"")
    p = tmp_path / "voci.yaml"
    p.write_text(testo, encoding="utf-8")
    return p


def test_id_duplicato(tmp_path):
    p = _scrivi(tmp_path, "voci:\n - {id: a, file: a.wav, testo_rif: x}\n - {id: a, file: a.wav, testo_rif: y}\n")
    with pytest.raises(ErroreRegistro, match="duplicato"):
        carica_registro(p)


def test_clip_mancante(tmp_path):
    p = _scrivi(tmp_path, "voci:\n - {id: a, file: manca.wav, testo_rif: x}\n")
    with pytest.raises(ErroreRegistro, match="clip mancante"):
        carica_registro(p)


def test_testo_rif_obbligatorio(tmp_path):
    p = _scrivi(tmp_path, "voci:\n - {id: a, file: a.wav}\n")
    with pytest.raises(ErroreRegistro, match="testo_rif"):
        carica_registro(p)


def test_file_assente(tmp_path):
    with pytest.raises(ErroreRegistro):
        carica_registro(tmp_path / "nessuno.yaml")
