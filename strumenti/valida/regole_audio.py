"""Campi espliciti dell'audio (docs/audio.md): `audio` di stile, scene e nodi, `tema` dei PNG.

Sono tutti facoltativi: senza, la pipeline (strumenti/audio/genera_audio.py) deduce tutto dai testi
pubblici. Se ci sono, la pipeline ignora con un avviso i valori che non conosce, quindi un errore di
battitura si perde in silenzio: il validatore li controlla contro lo stesso vocabolario chiuso
(strumenti/audio/vocabolario.py, caricato da qui senza le dipendenze audio), e ci cerca le parole segrete.

  stile.audio      {tonalita, modo, tempo, strumenti, umore_base, epoca, motivo}
  scena/nodo.audio {musica: [descrittori], ambiente: [tag | {tag, volume}], umore_iniziale}
  png.tema         {carattere, strumento, modo, registro}
  battuta.audio    {umore, effetto}: segnali automatici (docs/audio.md, «Segnali automatici»); umore anche
                   `auto` (torna alla musica del luogo), effetto un tag di EFFETTI (`sfx_` tollerato)

Dei segnali delle battute si controlla anche il mestiere: l'effetto parte con la PRIMA frase della
battuta, che deve nominare quel suono (le parole sono le regole REGOLE_EFFETTI della pipeline);
l'effetto deve esistere nel catalogo della campagna (audio/manifest.json), o non suona; e i cambi
d'umore restano rari (il Motore ne applica al massimo uno al minuto).

Un tema non tradisce chi mente: il modo frigio (l'unico «sinistro») su un PNG che mente è un avviso
rigoroso, e un carattere che la persona pubblica non giustifica è un avviso.
"""

from __future__ import annotations

import importlib.util
import re
import sys
from functools import lru_cache
from pathlib import Path
from types import ModuleType

from .carica import Campagna
from .esito import Esito

AUDIO = Path(__file__).resolve().parent.parent / "audio"     # strumenti/audio/

CHIAVI_STILE = {"tonalita", "modo", "tempo", "strumenti", "umore_base", "epoca", "motivo"}
CHIAVI_LUOGO = {"musica", "ambiente", "umore_iniziale", "interno"}
CHIAVI_TEMA = {"carattere", "strumento", "modo", "registro"}
CHIAVI_BATTUTA = {"umore", "effetto"}
UMORE_AUTO = "auto"          # torna alla musica del luogo: vale nelle battute, non in umore_iniziale
MAX_UMORI_PER_SCENA = 2      # battute non finali con un cambio d'umore che possono uscire nella stessa scena
TEMPO = (40, 200)          # bpm plausibili per un motivo cantabile


def _carica(nome: str, percorso: Path) -> ModuleType | None:
    """Un modulo della pipeline audio per percorso, senza importare il suo pacchetto (che vuole numpy)."""
    if not percorso.exists():
        return None
    spec = importlib.util.spec_from_file_location(nome, percorso)
    modulo = importlib.util.module_from_spec(spec)
    sys.modules[nome] = modulo  # le dataclass lo cercano qui
    spec.loader.exec_module(modulo)
    return modulo


@lru_cache(maxsize=1)
def vocabolario() -> ModuleType | None:
    return _carica("_audio_vocabolario", AUDIO / "vocabolario.py")


@lru_cache(maxsize=1)
def motivo() -> ModuleType | None:
    return _carica("_audio_motivo", AUDIO / "temi" / "motivo.py")


def _stringhe(valore) -> list[str]:
    if isinstance(valore, str):
        return [valore]
    if isinstance(valore, dict):
        return [s for v in valore.values() for s in _stringhe(v)]
    if isinstance(valore, list):
        return [s for v in valore for s in _stringhe(v)]
    return []


def _segreti(c: Campagna, e: Esito, dove: str, valore) -> None:
    """Le parole segrete non entrano nei campi dell'audio: scelgono musica e temi che il tavolo sente."""
    regex = []
    for v in (c.parole_segrete or {}).get("parole") or []:
        try:
            regex.append((re.compile(str(v.get("regex"))), v.get("parola", "?")))
        except (re.error, AttributeError):
            pass  # lo segnala regole_segreti
    for testo in _stringhe(valore):
        for rx, parola in regex:
            if rx.search(testo.lower()):
                e.errore("AUDIO.segreto", dove, f"«{parola}» in un campo dell'audio: la musica scelta lo tradirebbe")


def _chiavi(e: Esito, dove: str, d, ammesse: set[str]) -> bool:
    if not isinstance(d, dict):
        e.errore("AUDIO.forma", dove, f"è una mappa con le chiavi {sorted(ammesse)}")
        return False
    for k in sorted(set(d) - ammesse):
        e.errore("AUDIO.forma", dove, f"chiave {k!r} non prevista (ammesse {sorted(ammesse)}): la pipeline la ignorerebbe")
    return True


def _stile(c: Campagna, e: Esito, V: ModuleType) -> None:
    a = c.stile.get("audio")
    if a is None or not _chiavi(e, "stile.yaml audio", a, CHIAVI_STILE):
        return
    dove = "stile.yaml audio"
    if "tonalita" in a and V.tonica_da_testo(a["tonalita"])[0] is None:
        e.errore("AUDIO.vocabolario", dove, f"tonalita {a['tonalita']!r}: una nota (do, re… o C, D…) e un modo facoltativo")
    if "modo" in a and V.normalizza_modo(a["modo"]) is None:
        e.errore("AUDIO.vocabolario", dove, f"modo {a['modo']!r} fuori da {sorted(V.MODI)} (o maggiore, minore)")
    if "tempo" in a and not (isinstance(a["tempo"], int) and TEMPO[0] <= a["tempo"] <= TEMPO[1]):
        e.errore("AUDIO.forma", dove, f"tempo {a['tempo']!r}: un intero di battiti al minuto, da {TEMPO[0]} a {TEMPO[1]}")
    if "strumenti" in a:
        voci = a["strumenti"] if isinstance(a["strumenti"], list) else [a["strumenti"]]
        for x in voci:
            ammessi, vietati = V.strumenti_in(str(x))
            if not ammessi and not vietati:
                e.errore("AUDIO.vocabolario", dove, f"strumento {x!r} sconosciuto (vedi strumenti/audio/vocabolario.py, STRUMENTI)")
    if "umore_base" in a and a["umore_base"] not in V.UMORI:
        e.errore("AUDIO.vocabolario", dove, f"umore_base {a['umore_base']!r} fuori da {list(V.UMORI)}")
    if "epoca" in a and a["epoca"] not in V.EPOCHE:
        e.errore("AUDIO.vocabolario", dove, f"epoca {a['epoca']!r} fuori da {list(V.EPOCHE)}")
    if "motivo" in a:
        _motivo(e, dove, a["motivo"])
    _segreti(c, e, dove, {k: v for k, v in a.items() if k != "motivo"})


def _motivo(e: Esito, dove: str, dati) -> None:
    """stile.audio.motivo: le stesse regole della pipeline (temi/motivo.py), che altrimenti lo scarta."""
    M = motivo()
    if M is None:
        return
    try:
        note = [M.Nota(None if g is None else int(g), float(d)) for g, d in dati["note"]]
        m = M.Motivo(note, int(dati.get("metro", 4)), "stile.audio.motivo")
    except (KeyError, TypeError, ValueError, AttributeError) as err:
        e.errore("AUDIO.motivo", dove, f"motivo illeggibile ({err}): forma {{metro: 4, note: [[grado, durata], ...]}}")
        return
    for problema in M.valida(m):
        e.errore("AUDIO.motivo", dove, f"motivo scartato dalla pipeline: {problema}")


def _luogo(c: Campagna, e: Esito, V: ModuleType, dove: str, a) -> None:
    if a is None or not _chiavi(e, dove, a, CHIAVI_LUOGO):
        return
    musica = a.get("musica")
    if musica is not None and not (isinstance(musica, list) and all(isinstance(x, str) for x in musica)):
        e.errore("AUDIO.forma", dove, "musica è una lista di descrittori (umore, energia, ora, meteo, ambientazione, o parole libere)")
    for voce in a.get("ambiente") or []:
        tag, vol = (voce.get("tag"), voce.get("volume")) if isinstance(voce, dict) else (voce, None)
        if tag not in V.AMBIENTI:
            e.errore("AUDIO.vocabolario", dove, f"ambiente {tag!r} fuori da {sorted(V.AMBIENTI)}")
        if vol is not None and not (isinstance(vol, (int, float)) and 0 < vol <= 1):
            e.errore("AUDIO.forma", dove, f"ambiente {tag}: volume {vol!r} è il guadagno dello strato, tra 0 e 1")
    if "interno" in a and not isinstance(a["interno"], bool):
        e.errore("AUDIO.forma", dove, "interno è true (al chiuso) o false (all'aperto)")
    if "umore_iniziale" in a and a["umore_iniziale"] not in V.UMORI:
        e.errore("AUDIO.vocabolario", dove, f"umore_iniziale {a['umore_iniziale']!r} fuori da {list(V.UMORI)}")
    _segreti(c, e, dove, a)


def _persona_pubblica(d: dict) -> str:
    """I campi del PNG che il tavolo vede e sente: gli stessi che legge la pipeline (campagna_audio.py)."""
    asp, pers, voce = d.get("aspetto") or {}, d.get("personalita") or {}, d.get("voce") or {}
    pezzi = [asp.get("lettura"), pers.get("superficie"), pers.get("sotto_pressione"),
             *[voce.get(k) for k in ("registro", "stile", "tic", "gesto", "battuta_campione")],
             (voce.get("tts") or {}).get("timbro")]
    return " ".join(s for p in pezzi for s in _stringhe(p)).lower()


def _tema(c: Campagna, e: Esito, V: ModuleType, pid: str, dove: str, d: dict) -> None:
    t = d.get("tema")
    if t is None or not _chiavi(e, f"{dove} tema", t, CHIAVI_TEMA):
        return
    caratteri = t.get("carattere")
    caratteri = [x.strip() for x in re.split(r"[,;]", caratteri)] if isinstance(caratteri, str) else list(caratteri or [])
    for k in caratteri:
        if k not in V.CARATTERI:
            e.errore("AUDIO.vocabolario", f"{dove} tema", f"carattere {k!r} fuori da {sorted(V.CARATTERI)}")
    if "strumento" in t and not [s for s in V.strumenti_in(str(t["strumento"]))[0] if s in V.STRUMENTI_TEMA]:
        e.errore("AUDIO.vocabolario", f"{dove} tema", f"strumento {t['strumento']!r}: non è uno strumento da motivo "
                                                       f"({', '.join(V.STRUMENTI_TEMA)})")
    modo = V.normalizza_modo(t.get("modo")) if "modo" in t else None
    if "modo" in t and modo is None:
        e.errore("AUDIO.vocabolario", f"{dove} tema", f"modo {t['modo']!r} fuori da {sorted(V.MODI)}")
    if "registro" in t and t["registro"] not in V.REGISTRI:
        e.errore("AUDIO.vocabolario", f"{dove} tema", f"registro {t['registro']!r} fuori da {sorted(V.REGISTRI)}")
    _segreti(c, e, f"{dove} tema", t)
    # Il tema nasce dalla persona pubblica: non deve far sentire chi mente.
    if modo == "frigio" and d.get("mente_su"):
        e.avviso("AUDIO.tema_rivelatore", f"{dove} tema", "modo frigio, l'unico che suona sinistro, su un PNG che mente: "
                                                          "il tavolo sentirebbe la bugia prima di trovarla", rigoroso=True)
    noti = [k for k in caratteri if k in V.CARATTERI]
    pubblica = _persona_pubblica(d)
    if noti and not any(re.search(V.CARATTERI[k].schema, pubblica) for k in noti):
        e.avviso("AUDIO.tema_rivelatore", f"{dove} tema", f"carattere {noti}: niente nella persona pubblica (lettura, "
                                                          "personalità, voce) lo giustifica. Se viene da ciò che nasconde, il tema lo tradisce")


def _effetti_nel_catalogo(c: Campagna) -> set[str] | None:
    """Tag degli effetti che hanno il loro file nel catalogo della campagna; None se l'audio non è ancora fatto."""
    import json
    percorso = c.cartella / "audio" / "manifest.json"
    if not percorso.exists():
        return None
    try:
        man = json.loads(percorso.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    return {v.get("tag") for v in man.get("effetti") or [] if (c.cartella / "audio" / str(v.get("file", ""))).exists()}


def _prima_frase(b: dict) -> str:
    righe = b.get("testo") or []
    return re.sub(r"^\[[a-z0-9_]+\]\s*", "", str(righe[0])) if righe else ""


def _battute(c: Campagna, e: Esito, V: ModuleType) -> None:
    """`audio: {umore, effetto}` delle battute: vocabolario, catalogo, suono nominato, rarità degli umori."""
    catalogo = _effetti_nel_catalogo(c)
    umori_per_scena: dict[str, list[str]] = {}
    scene = [s.get("id") for _, s in c.scene]
    for b in c.battute:
        if "audio" not in b:
            continue
        dove = f"{b['_file']} {b.get('id', '?')} audio"
        a = b["audio"]
        if not _chiavi(e, dove, a, CHIAVI_BATTUTA):
            continue
        if b.get("solo_esempio") or b.get("riempitivo"):
            e.avviso("AUDIO.segnale", dove, "un esempio di voce non esce mai, un riempitivo esce a caso allo stallo: "
                                            "il segnale non parte, o parte senza motivo")
        umore = a.get("umore")
        if "umore" in a and umore != UMORE_AUTO and umore not in V.UMORI:
            e.errore("AUDIO.vocabolario", dove, f"umore {umore!r} fuori da {list(V.UMORI)} o «auto» (errore di caricamento del server)")
        effetto = str(a.get("effetto", "")).removeprefix("sfx_") if "effetto" in a else None
        if effetto is not None and effetto not in V.EFFETTI:
            e.errore("AUDIO.vocabolario", dove, f"effetto {a.get('effetto')!r} fuori da {list(V.EFFETTI)} (errore di caricamento del server)")
        elif effetto is not None:
            if catalogo is not None and effetto not in catalogo:
                e.avviso("AUDIO.catalogo", dove, f"effetto {effetto}: il catalogo della campagna non ha sfx_{effetto}, quindi non suona")
            regole = [r for r in V.REGOLE_EFFETTI if r.tag == effetto]
            if regole and not any(re.search(r.schema, _prima_frase(b).lower()) for r in regole):
                e.avviso("AUDIO.segnale", dove, f"l'effetto {effetto} parte con la prima frase, che non nomina quel suono: "
                                                f"«{_prima_frase(b)[:60]}»")
        if umore and b.get("tipo") != "finale":
            for sid in ([b["scena"]] if b.get("scena") else scene):
                umori_per_scena.setdefault(sid, []).append(b.get("id", "?"))
    for sid, ids in sorted(umori_per_scena.items()):
        if len(ids) > MAX_UMORI_PER_SCENA:
            e.avviso("AUDIO.segnale", sid, f"{len(ids)} battute cambiano l'umore in questa scena ({', '.join(ids)}): "
                                           f"tienili rari, al massimo {MAX_UMORI_PER_SCENA} oltre ai finali")


def controlla(c: Campagna, e: Esito) -> None:
    usati = c.stile.get("audio") is not None or any("audio" in s for _, s in c.scene) \
        or any("audio" in n for n in c.nodi.values()) or any("tema" in d for _, d in c.png.values()) \
        or any("audio" in b for b in c.battute)
    if not usati:
        return  # tutto dedotto dalla pipeline: niente da controllare
    V = vocabolario()
    if V is None:
        e.avviso("AUDIO.forma", "strumenti/audio/vocabolario.py", "vocabolario dell'audio assente: campi audio non controllati")
        return
    _stile(c, e, V)
    for nome, s in c.scene:
        _luogo(c, e, V, f"{nome} audio", s.get("audio"))
    for nid, n in c.nodi.items():
        _luogo(c, e, V, f"campagna.yaml nodo {nid} audio", n.get("audio"))
    for pid, (nome, d) in c.png.items():
        _tema(c, e, V, pid, nome, d)
    _battute(c, e, V)
