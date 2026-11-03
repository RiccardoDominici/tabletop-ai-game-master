"""Dalla cartella di una campagna all'elenco delle immagini da generare (luoghi, ritratti, scene coi PNG).

Regola di sicurezza: si leggono SOLO i campi pensati per le immagini, mai il resto delle schede.
  - stile.yaml            → stile_immagini   (il frammento [STILE], in inglese)
  - scena*.yaml           → id, immagine.prompt_luogo, immagine.invarianti, png_presenti
  - campagna.yaml         → nodi[] di tipo luogo: id, scheda, immagine.prompt_luogo
  - png/*.yaml            → id, aspetto.prompt_immagine, aspetto.invarianti,
                            e se ci sono aspetto.prompt_ritratto e aspetto.situazioni (facoltativi)
I testi liberi come `descrizione` della scena o `abbozzo` dei nodi NON si usano: mescolano pianta,
meccaniche e talvolta segreti, che sul proiettore non devono finire.

Tipi di immagine:
  luogo      — prompt_luogo + [STILE], 16:9. Uno per scena e uno per ogni nodo-luogo di campagna.yaml
               che ha immagine.prompt_luogo. Un nodo con `scheda` che punta a una scena diventa un
               ALIAS: luogo_<nodo> usa lo stesso file di luogo_<scena> (il master può chiamare il luogo
               con l'uno o con l'altro id), senza generare niente.
  ritratto   — il PNG da solo, 3:4. Prompt: prompt_ritratto se c'è, altrimenti prompt_immagine;
               in coda le invarianti (in italiano: il codificatore di testo Qwen3 le capisce) e [STILE].
               aspetto.situazioni NON entra mai nel ritratto: lì stanno i tratti nascosti.
  situazione — il PNG in un'altra situazione, 16:9, col RITRATTO come immagine di riferimento,
               così il volto resta quello. Vengono da aspetto.situazioni e, in automatico, da ogni
               scena in cui il PNG è presente (in quel caso si passa anche l'immagine del luogo).
               Id: situazione_<png>_<id situazione>, situazione_<png>_in_<luogo>. Il prefisso conta:
               il server cerca solo ritratto_<png> e luogo_<id>, quindi una situazione (per esempio
               il volto senza cappuccio, cioè un indizio) non può mai finire sul proiettore al posto
               del ritratto; la mostra solo chi la chiede per id, dopo la rivelazione.
"""

from __future__ import annotations

import logging
import zlib
from dataclasses import dataclass, field
from pathlib import Path

import yaml

from formato import con_formato

log = logging.getLogger("immagini.campagna")

SEGNAPOSTO_STILE = "[STILE]"
# Dimensioni FINALI dei file. Il modello lavora a multipli di 16 (vedi dimensioni_generazione):
# 1080 non lo è, quindi i luoghi si generano a 1920x1088 e si ritagliano al centro a 1920x1080.
# Perché 1920 nativo e non 1280 ingrandito: esperimenti/immagini/risultati.md, «Risoluzione».
DIM_LUOGO = (1920, 1080)    # 16:9, proiettore a tutto schermo (con Ken Burns fino a +8%)
DIM_RITRATTO = (768, 1024)  # 3:4, riquadro di chi parla
# Le situazioni vanno a tutto schermo come i luoghi (es. il volto rivelato): stessa risoluzione.
DIM_SITUAZIONE = DIM_LUOGO


def dimensioni_generazione(larghezza: int, altezza: int) -> tuple[int, int]:
    """Le dimensioni da chiedere al modello: arrotondate in su al multiplo di 16 (poi si ritaglia)."""
    return -(-larghezza // 16) * 16, -(-altezza // 16) * 16


@dataclass
class Richiesta:
    """Un'immagine da generare. `riferimenti` sono id di altre richieste, da generare prima.

    Con `alias_di` non si genera niente: la voce del manifest punta al file di un'altra richiesta.
    """

    id: str
    tipo: str              # luogo | ritratto | situazione
    prompt: str
    seme: int
    larghezza: int
    altezza: int
    riferimenti: list[str] = field(default_factory=list)
    alias_di: str | None = None
    extra: dict = field(default_factory=dict)   # campi in più per il manifest (es. `dopo` di una situazione)

    @property
    def file(self) -> str:
        return f"{self.alias_di or self.id}.jpg"


def seme_da_id(ident: str) -> int:
    """Seme stabile ricavato dall'id: rigenerare dà la stessa immagine, senza tenere un registro a mano."""
    return zlib.crc32(ident.encode()) % 1_000_000_000


def con_stile(prompt: str, stile: str) -> str:
    """Sostituisce il segnaposto [STILE] (se manca, lo accoda; mai due volte), poi accoda il formato.

    Il formato del proiettore (full-bleed, niente margini, firme o scritte) è dello strumento, non della
    campagna: vedi formato.py. Viene per ultimo e non ripete ciò che la carta di stile dice già.
    """
    prompt = prompt.strip().rstrip(",. ")
    if SEGNAPOSTO_STILE in prompt:
        return con_formato(prompt.replace(SEGNAPOSTO_STILE, stile))
    return con_formato(f"{prompt}, {stile}")


def _yaml(percorso: Path) -> dict:
    return yaml.safe_load(percorso.read_text(encoding="utf-8")) or {}


def leggi_stile(cartella: Path) -> str:
    stile = _yaml(cartella / "stile.yaml").get("stile_immagini")
    if not stile:
        raise ValueError(f"{cartella}/stile.yaml: manca stile_immagini (il frammento [STILE])")
    return stile.strip()


def _file_scene(cartella: Path) -> list[Path]:
    """scena.yaml, scena_*.yaml e scene/*.yaml, in ordine stabile."""
    return sorted(cartella.glob("scena*.yaml")) + sorted((cartella / "scene").glob("*.yaml"))


def _invarianti(lista) -> str:
    return "; ".join(str(x) for x in (lista or []))


def richieste_luoghi(cartella: Path, stile: str) -> tuple[list[Richiesta], dict[str, list[str]]]:
    """Una richiesta per scena con immagine. Ritorna anche {id_luogo: [png presenti]}."""
    out, presenti = [], {}
    for f in _file_scene(cartella):
        scena = _yaml(f)
        img = scena.get("immagine") or {}
        base = img.get("prompt_luogo")
        if not base:
            log.warning("%s: niente immagine.prompt_luogo, scena saltata", f.name)
            continue
        ident = f"luogo_{scena.get('id', f.stem)}"
        out.append(Richiesta(ident, "luogo", con_stile(base, stile), seme_da_id(ident), *DIM_LUOGO))
        presenti[ident] = list(scena.get("png_presenti") or [])
    return out, presenti


def richieste_nodi(cartella: Path, stile: str) -> list[Richiesta]:
    """I nodi-luogo di campagna.yaml: un alias se hanno una scheda di scena, un luogo se hanno un prompt.

    Il server chiede `luogo_<id>` sia con l'id della scena sia con quello del nodo (regia.ts:
    luogo iniziale = id della scena, luoghi collegati = id dei nodi), quindi servono entrambi.
    """
    percorso = cartella / "campagna.yaml"
    if not percorso.exists():
        return []
    # scheda di scena → id della scena (per gli alias)
    id_scena = {f.relative_to(cartella).as_posix(): _yaml(f).get("id", f.stem) for f in _file_scene(cartella)}
    out = []
    for nodo in _yaml(percorso).get("nodi") or []:
        # Contano i nodi-luogo e qualunque nodo (anche un evento) la cui scheda è una scena: il master
        # può spostare il proiettore su quell'id. I nodi dei PNG no: la loro scheda è png/….
        if not isinstance(nodo, dict) or not nodo.get("id") or nodo.get("tipo") == "png":
            continue
        ident = f"luogo_{nodo['id']}"
        scheda = nodo.get("scheda")
        prompt = (nodo.get("immagine") or {}).get("prompt_luogo")
        if nodo.get("tipo") != "luogo" and scheda not in id_scena and not prompt:
            continue
        if scheda in id_scena and not prompt:
            bersaglio = f"luogo_{id_scena[scheda]}"
            if bersaglio != ident:
                out.append(Richiesta(ident, "luogo", "", 0, *DIM_LUOGO, alias_di=bersaglio))
        elif prompt:
            out.append(Richiesta(ident, "luogo", con_stile(prompt, stile), seme_da_id(ident), *DIM_LUOGO))
        else:
            log.warning("campagna.yaml: il nodo %s non ha immagine.prompt_luogo, niente immagine", nodo["id"])
    return out


def identita_situazioni(asp: dict) -> str:
    """Chi è il PNG, da ripetere nelle situazioni: solo tratti, niente inquadratura né fondo.

    Il testo del ritratto NON si riusa: «head-and-shoulders bust portrait… plain background» litiga
    con l'inquadratura 16:9 della situazione. L'aspetto completo lo porta già il ritratto passato
    come immagine di riferimento; qui bastano le invarianti. Se mancano, prompt_immagine (che è una
    descrizione, non un ritratto), senza [STILE].
    """
    inv = _invarianti(asp.get("invarianti"))
    if inv:
        return f"tratti fissi: {inv}"
    return (asp.get("prompt_immagine") or "").replace(SEGNAPOSTO_STILE, "").strip().rstrip(",. ")


def segreti_png(cartella: Path, pid: str) -> list[str]:
    """I prompt delle situazioni dichiarate di un PNG: i tratti che NON devono vedersi altrove (vedi qualita.py)."""
    for f in sorted((Path(cartella) / "png").glob("*.yaml")):
        scheda = _yaml(f)
        if scheda.get("id", f.stem) == pid:
            return [s["prompt"] for s in ((scheda.get("aspetto") or {}).get("situazioni") or []) if s.get("prompt")]
    return []


def richieste_png(cartella: Path, stile: str, luoghi: dict[str, list[str]]) -> list[Richiesta]:
    """Ritratto di ogni PNG, poi le sue situazioni (dichiarate e automatiche dalle scene)."""
    out = []
    for f in sorted((cartella / "png").glob("*.yaml")):
        scheda = _yaml(f)
        pid = scheda.get("id", f.stem)
        asp = scheda.get("aspetto") or {}
        base = asp.get("prompt_ritratto") or asp.get("prompt_immagine")
        if not base:
            log.warning("%s: niente aspetto.prompt_immagine, PNG saltato", f.name)
            continue
        inv = _invarianti(asp.get("invarianti"))
        # Le invarianti vanno PRIMA di [STILE], così lo stile resta l'ultima cosa del prompt.
        corpo = base.replace(SEGNAPOSTO_STILE, "").strip().rstrip(",. ")
        if inv:
            corpo = f"{corpo}. Tratti fissi: {inv}"
        rid = f"ritratto_{pid}"
        out.append(Richiesta(rid, "ritratto", con_stile(corpo, stile), seme_da_id(rid), *DIM_RITRATTO))

        identita = identita_situazioni(asp)
        situazioni = [s for s in (asp.get("situazioni") or []) if s.get("id") and s.get("prompt")]
        for s in situazioni:
            ident = f"situazione_{pid}_{s['id']}"
            prompt = f"The same person as in the reference image, same face, hair and clothes: {identita}. Now {s['prompt']}"
            # `dopo`: gli id (indizi, battute) dopo i quali la situazione si può mostrare. Finisce nel
            # manifest, così chi la proietta sa quando: prima di allora è un segreto.
            extra = {"png": pid, "dopo": list(s.get("dopo") or []), "automatica": False}
            out.append(Richiesta(ident, "situazione", con_stile(prompt, stile), seme_da_id(ident),
                                 *DIM_SITUAZIONE, riferimenti=[rid], extra=extra))
        for lid, chi in luoghi.items():
            if pid not in chi:
                continue
            ident = f"situazione_{pid}_in_{lid.removeprefix('luogo_')}"
            prompt = (f"The same person as in the first reference image, same face, hair and clothes: {identita}. "
                      f"Now inside the place shown in the second reference image")
            out.append(Richiesta(ident, "situazione", con_stile(prompt, stile), seme_da_id(ident),
                                 *DIM_SITUAZIONE, riferimenti=[rid, lid], extra={"png": pid, "dopo": [], "automatica": True}))
    return out


def richieste(cartella: Path) -> list[Richiesta]:
    """Tutte le richieste della campagna, in ordine di dipendenza (luoghi, ritratti, situazioni).

    Gli alias vengono in fondo: puntano a file che devono esistere già.
    """
    cartella = Path(cartella)
    stile = leggi_stile(cartella)
    luoghi, presenti = richieste_luoghi(cartella, stile)
    nodi = richieste_nodi(cartella, stile)
    ids_scene = {r.id for r in luoghi}
    nodi = [r for r in nodi if r.id not in ids_scene]  # una scena e un nodo con lo stesso id: vince la scena
    png = richieste_png(cartella, stile, presenti)
    ordine = {"luogo": 0, "ritratto": 1, "situazione": 2}
    return sorted(luoghi + nodi + png, key=lambda r: (r.alias_di is not None, ordine[r.tipo]))
