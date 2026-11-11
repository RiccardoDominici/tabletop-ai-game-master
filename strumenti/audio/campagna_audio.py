"""Dalla cartella di una campagna ai testi PUBBLICI che servono all'audio (luoghi, PNG, stile).

Regola di sicurezza (come strumenti/immagini/campagna.py): si leggono SOLO campi che i giocatori
possono già vedere o sentire, o che il validatore tratta come pubblici (il contesto del modo B,
apps/server/src/repertorio/contesto.ts). Così una musica o un tema non possono tradire un segreto.

  stile.yaml        → tono, tema, stile_immagini, tavolozza_musicale, regole_prosa, audio (facoltativo)
  scena*.yaml       → id, nodo, nome, descrizione, sensi, elementi_interattivi SENZA «NASCOSTA»,
                      apertura, intensita, musica.tag/transizione, immagine.prompt_luogo/invarianti,
                      png_presenti, audio (facoltativo)
  campagna.yaml     → nodi[]: id, tipo, nome, abbozzo, scheda, immagine.prompt_luogo, audio (facoltativo)
  png/*.yaml        → id, nome, aspetto.lettura, personalita.superficie e sotto_pressione,
                      voce (senza mai_dice; di voce.tts solo eta_apparente, altezza, timbro: è ciò che
                      si SENTE), tema (facoltativo)

MAI letti: ruolo, segreto, mente_su, desiderio, paura, fronte, sa/non_sa, crede_a_torto, relazioni,
iniziative, evoluzione, atteggiamento_pg, la `preparazione` di campagna.yaml, il repertorio.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from pathlib import Path

import yaml

from vocabolario import UMORI

log = logging.getLogger("audio.campagna")


@dataclass
class LuogoTesti:
    """Un luogo della campagna come lo vede l'audio: id del manifest e testi pubblici per campo."""

    id: str                          # luogo_<id scena o nodo>
    sorgente: str                    # scena | nodo
    nome: str
    testi: dict[str, str] = field(default_factory=dict)   # campo → testo
    umore: str | None = None         # musica.tag della scena
    transizioni: list[str] = field(default_factory=list)  # umori citati in musica.transizione
    intensita: int | None = None
    audio: dict = field(default_factory=dict)              # il campo esplicito `audio`, se c'è
    alias_di: str | None = None      # un nodo che ha per scheda una scena: stesso audio della scena
    png_presenti: list[str] = field(default_factory=list)


@dataclass
class PngTesti:
    id: str
    nome: str
    testi: dict[str, str] = field(default_factory=dict)
    tema: dict = field(default_factory=dict)               # il campo esplicito `tema`, se c'è
    eta: int | None = None
    altezza: str | None = None       # bassa | media | alta (della voce)


@dataclass
class CampagnaAudio:
    id: str
    cartella: Path
    titolo: str
    stile: dict[str, str]            # tono, tema, stile_immagini, strumenti, regole_prosa (testi)
    tavolozza_tag: list[str]
    audio: dict                      # stile.audio esplicito
    luoghi: list[LuogoTesti]
    png: list[PngTesti]


def _yaml(percorso: Path) -> dict:
    return yaml.safe_load(percorso.read_text(encoding="utf-8")) or {}


def _testo(valore) -> str:
    """Qualsiasi valore YAML (stringa, lista, dizionario) come un unico testo da cercare."""
    if valore is None:
        return ""
    if isinstance(valore, str):
        return valore
    if isinstance(valore, dict):
        return " ; ".join(_testo(v) for v in valore.values())
    if isinstance(valore, (list, tuple)):
        return " ; ".join(_testo(v) for v in valore)
    return str(valore)


def _file_scene(cartella: Path) -> list[Path]:
    """scena.yaml, scena_*.yaml e scene/*.yaml, in ordine stabile (lo stesso delle immagini)."""
    return sorted(cartella.glob("scena*.yaml")) + sorted((cartella / "scene").glob("*.yaml"))


def _marcatore_nascosto() -> re.Pattern:
    """I marcatori degli elementi nascosti di tutte le lingue (lingue/*/motore.yaml, `nascosto.marcatori`): «NASCOSTA:»
    e «HIDDEN:» valgono in ogni campagna, come nel server e nel validatore."""
    voci: list[str] = []
    for f in sorted((Path(__file__).resolve().parents[2] / "lingue").glob("*/motore.yaml")):
        # Solo la sezione `nascosto`: il resto di motore.yaml lo legge il server (non tutto è YAML per PyYAML).
        m = re.search(r"^nascosto:\n(?:[ #].*\n?)*", f.read_text(encoding="utf-8"), re.M)
        dati = (yaml.safe_load(m.group(0)) or {}) if m else {}
        voci += [str(v) for v in ((dati.get("nascosto") or {}).get("marcatori") or [])]
    return re.compile(r"\b(" + "|".join(re.escape(v) for v in dict.fromkeys(voci)) + ")", re.IGNORECASE)


_MARCATORE_NASCOSTO = _marcatore_nascosto()


def _umori_citati(testo: str) -> list[str]:
    return [u for u in UMORI if u in (testo or "")]


def _luogo_da_scena(scena: dict, nome_file: str) -> LuogoTesti:
    elementi = [e for e in (scena.get("elementi_interattivi") or []) if not _MARCATORE_NASCOSTO.search(_testo(e))]
    img = scena.get("immagine") or {}
    musica = scena.get("musica") or {}
    testi = {
        "nome": _testo(scena.get("nome")),
        "sensi": _testo(scena.get("sensi")),
        "prompt_luogo": _testo(img.get("prompt_luogo")),
        "invarianti": _testo(img.get("invarianti")),
        "elementi": _testo(elementi),
        "apertura": _testo(scena.get("apertura")),
        "descrizione": _testo(scena.get("descrizione")),
    }
    umore = musica.get("tag") if musica.get("tag") in UMORI else None
    if musica.get("tag") and not umore:
        log.warning("%s: musica.tag %r fuori dal vocabolario, ignorato", nome_file, musica.get("tag"))
    intensita = scena.get("intensita")
    return LuogoTesti(
        id=f"luogo_{scena.get('id', Path(nome_file).stem)}", sorgente="scena",
        nome=testi["nome"] or scena.get("id", ""), testi=testi, umore=umore,
        transizioni=[u for u in _umori_citati(_testo(musica.get("transizione"))) if u != umore],
        intensita=intensita if isinstance(intensita, int) else None,
        audio=scena.get("audio") or {}, png_presenti=list(scena.get("png_presenti") or []),
    )


def leggi_luoghi(cartella: Path) -> list[LuogoTesti]:
    """Un luogo per scena, poi i nodi-luogo senza scheda; i nodi con scheda di scena diventano alias."""
    luoghi: list[LuogoTesti] = []
    id_scena: dict[str, str] = {}
    for f in _file_scene(cartella):
        scena = _yaml(f)
        l = _luogo_da_scena(scena, f.name)
        luoghi.append(l)
        id_scena[f.relative_to(cartella).as_posix()] = l.id
    percorso = cartella / "campagna.yaml"
    nodi = (_yaml(percorso).get("nodi") or []) if percorso.exists() else []
    gia = {l.id for l in luoghi}
    for nodo in nodi:
        if not isinstance(nodo, dict) or not nodo.get("id") or nodo.get("tipo") not in ("luogo", "evento"):
            continue
        ident = f"luogo_{nodo['id']}"
        scheda = nodo.get("scheda")
        if scheda in id_scena:
            if id_scena[scheda] != ident and ident not in gia:
                luoghi.append(LuogoTesti(id=ident, sorgente="nodo", nome=_testo(nodo.get("nome")), alias_di=id_scena[scheda]))
            continue
        if nodo.get("tipo") != "luogo" or ident in gia:
            continue  # un evento senza scheda non è un posto: niente musica di luogo
        testi = {
            "nome": _testo(nodo.get("nome")),
            "abbozzo": _testo(nodo.get("abbozzo")),
            "prompt_luogo": _testo((nodo.get("immagine") or {}).get("prompt_luogo")),
        }
        luoghi.append(LuogoTesti(id=ident, sorgente="nodo", nome=testi["nome"] or nodo["id"], testi=testi,
                                 audio=nodo.get("audio") or {}))
    return luoghi


def _eta(valore) -> int | None:
    """«40-45», «circa 70», 35 → un'età indicativa (la media se è un intervallo)."""
    numeri = [int(x) for x in re.findall(r"\d+", str(valore or ""))]
    return round(sum(numeri) / len(numeri)) if numeri else None


def leggi_png(cartella: Path) -> list[PngTesti]:
    out = []
    for f in sorted((cartella / "png").glob("*.yaml")):
        d = _yaml(f)
        aspetto = d.get("aspetto") or {}
        pers = d.get("personalita") or {}
        voce = dict(d.get("voce") or {})
        tts = voce.pop("tts", None) or {}
        voce.pop("mai_dice", None)
        testi = {
            "lettura": _testo(aspetto.get("lettura")),
            "superficie": _testo(pers.get("superficie")),
            "sotto_pressione": _testo(pers.get("sotto_pressione")),
            "voce": _testo({k: voce.get(k) for k in ("registro", "stile", "tic", "gesto", "battuta_campione")}),
            "timbro": _testo(tts.get("timbro")),
        }
        altezza = str(tts.get("altezza") or "").lower() or None
        out.append(PngTesti(id=d.get("id", f.stem), nome=_testo(d.get("nome")) or f.stem, testi=testi,
                            tema=d.get("tema") or {}, eta=_eta(tts.get("eta_apparente")), altezza=altezza))
    return out


def leggi(cartella: Path) -> CampagnaAudio:
    cartella = Path(cartella).resolve()
    stile = _yaml(cartella / "stile.yaml")
    tav = stile.get("tavolozza_musicale") or {}
    return CampagnaAudio(
        id=stile.get("id") or cartella.name,
        cartella=cartella,
        titolo=_testo(stile.get("titolo")),
        stile={
            "tono": _testo(stile.get("tono")),
            "tema": _testo(stile.get("tema")),
            "stile_immagini": _testo(stile.get("stile_immagini")),
            "strumenti": _testo(tav.get("strumenti")),
            "regole_prosa": _testo(stile.get("regole_prosa")),
        },
        tavolozza_tag=[t for t in (tav.get("tag") or []) if t in UMORI],
        audio=stile.get("audio") or {},
        luoghi=leggi_luoghi(cartella),
        png=leggi_png(cartella),
    )
