"""Incompetech (Kevin MacLeod, CC BY 4.0): catalogo, traduzione nel nostro vocabolario, scelta, download.

Endpoint verificati dal vivo il 2 novembre 2026 (https://incompetech.com/agent-section/, la sezione
per agenti autonomi; robots.txt lo permette):
  https://incompetech.com/music/royalty-free/pieces.json   — tutto il catalogo (~1.440 brani)
  https://incompetech.com/music/royalty-free/genre.json    — chiave dei generi (id → nome)
  https://incompetech.com/music/royalty-free/mp3-royaltyfree/<filename>  — i file
Il catalogo si scarica una volta in cache/audio/incompetech/ e si rinnova con --aggiorna-catalogo.
Si scaricano SOLO i brani scelti, uno alla volta, con una pausa tra le richieste.

La scelta è un punteggio trasparente (ogni addendo ha un nome, finisce nel manifest come `perche`):
umore (feel), genere, strumenti (tavolozza ed epoca), parole della descrizione (ambientazione,
ora, meteo), bpm ed energia, durata. Un piccolo scarto deterministico, ricavato dall'id della
campagna, fa sì che due campagne simili non abbiano sempre gli stessi brani.
"""

from __future__ import annotations

import json
import logging
import re
import time
import urllib.parse
import urllib.request
import zlib
from dataclasses import dataclass, field
from pathlib import Path

import vocabolario as V
from percorsi import CACHE_INCOMPETECH, PAUSA_RICHIESTE_S, USER_AGENT

log = logging.getLogger("audio.incompetech")

BASE = "https://incompetech.com/music/royalty-free/"
URL_CATALOGO = BASE + "pieces.json"
URL_GENERI = BASE + "genre.json"
URL_FILE = BASE + "mp3-royaltyfree/"
LICENZA = "CC BY 4.0"
URL_LICENZA = "http://creativecommons.org/licenses/by/4.0/"

# Profili d'umore: pesi sui `feel` di Incompetech (positivi = lo vogliamo, negativi = lo evitiamo),
# intervallo di bpm, parole della descrizione che lo confermano.
PROFILI_UMORE: dict[str, dict] = {
    "esplorazione_tesa": {"feel": {"Mysterious": 1.0, "Suspenseful": 1.0, "Dark": 0.6, "Eerie": 0.5, "Unnerving": 0.3, "Calming": 0.1,
                                   "Humorous": -1.5, "Bouncy": -1.2, "Grooving": -1.0, "Uplifting": -0.8, "Bright": -0.6, "Aggressive": -0.6, "Action": -0.4, "Epic": -0.3},
                          "bpm": (50, 115), "chiave": r"myster|suspens|investigat|sneak", "parole": r"myster|suspens|tension|tense|dark|explor|sneak|investigat|eerie|uneas|creep|brooding"},
    "taverna_calda": {"feel": {"Bouncy": 0.8, "Bright": 0.7, "Relaxed": 0.6, "Uplifting": 0.6, "Humorous": 0.3, "Calming": 0.3, "Grooving": 0.2,
                               "Dark": -1.0, "Eerie": -1.5, "Unnerving": -1.5, "Aggressive": -1.2, "Suspenseful": -0.8, "Intense": -0.5},
                      "bpm": (80, 170), "chiave": r"tavern|\bpub\b|\binn\b|drinking|\bale\b|feast", "parole": r"tavern|celtic|\bfolk|\bjig\b|\breel\b|dance|merry|feast|\bpub\b|irish|ren faire|party|drinking"},
    "rito_sacro": {"feel": {"Mystical": 1.0, "Calming": 0.6, "Somber": 0.5, "Relaxed": 0.3, "Mysterious": 0.3,
                            "Bouncy": -1.2, "Grooving": -1.2, "Humorous": -1.5, "Driving": -1.0, "Action": -1.0, "Aggressive": -1.2},
                   "bpm": (40, 100), "chiave": r"church|choir|chant|monaster|sacred|hymn", "parole": r"choir|chant|church|sacred|monaster|hymn|prayer|organ|requiem|ritual|gregorian|\bmass\b"},
    "inseguimento": {"feel": {"Driving": 1.0, "Action": 1.0, "Intense": 0.8, "Suspenseful": 0.5, "Aggressive": 0.2,
                              "Calming": -1.2, "Relaxed": -1.2, "Humorous": -1.0, "Somber": -0.5, "Bouncy": -0.3},
                     "bpm": (110, 190), "chiave": r"chase|pursuit|escape|getaway", "parole": r"chase|\brun|pursuit|urgent|hurry|action|race|escape|tension|frantic"},
    "combattimento_epico": {"feel": {"Epic": 1.0, "Action": 1.0, "Intense": 0.8, "Aggressive": 0.6, "Driving": 0.5,
                                     "Calming": -1.5, "Relaxed": -1.5, "Humorous": -1.5, "Bouncy": -0.8},
                            "bpm": (100, 190), "chiave": r"battle|\bfight|combat|\bwar\b", "parole": r"battle|fight|epic|\bwar\b|combat|heroic|clash|charge"},
    "lutto": {"feel": {"Somber": 1.0, "Calming": 0.4, "Dark": 0.3, "Relaxed": 0.2, "Mysterious": 0.1,
                       "Bouncy": -1.5, "Grooving": -1.5, "Humorous": -1.8, "Action": -1.2, "Driving": -1.2, "Aggressive": -1.5, "Uplifting": -0.5, "Bright": -0.8},
              "bpm": (40, 90), "chiave": r"funeral|lament|mourn|grief|sorrow|elegy", "parole": r"\bsad|sorrow|grief|lament|mourn|funeral|melanchol|\bloss|elegy|tragic|requiem"},
}

# Generi (id di genre.json) per un'epoca antica/fantasy: bonus e malus. Gli altri valgono 0.
GENERI_ANTICA = {"22": 0.3, "25": 0.3, "4": 0.3, "10": 0.0, "20": -0.5, "5": -0.2, "24": -0.2,
                 "7": -2.0, "19": -2.0, "6": -3.0, "8": -2.0, "16": -2.0, "26": -3.0, "18": -2.0, "21": -2.0,
                 "9": -3.0, "11": -1.0, "3": -1.0, "12": -1.0, "13": -0.8, "14": -0.8, "2": -0.3, "15": -1.5, "23": -5.0}
# Parole (descrizione, feel, strumenti) che dicono «antico»: medioevo, rinascimento, folk acustico.
ANTICHE = r"medieval|renaissance|celtic|\bfolk|olden|minstrel|1400|\blute|ren faire|irish|baroque|crumhorn|shawm|gemshorn|hurdy|recorder|dulcimer|bouzouki"
# Parole moderne che in un fantasy stonano (titolo o descrizione).
MODERNE = r"\bcity|urban|modern|techno|disco|funk|hip.?hop|\brock\b|synth|electro|cyber|space|sci.?fi|future|80s|retro|chiptune|8.?bit|christmas|holiday|jazz|lounge|elevator|corporate|commercial|advert|game show|spy|surf|country|western|cowboy|latin|tango|samba|reggae"


@dataclass
class Brano:
    titolo: str
    file: str
    durata_s: int
    strumenti: set[str]
    strumenti_testo: str
    genere: str
    bpm: int | None
    descrizione: str
    feel: set[str]
    isrc: str | None = None

    @property
    def url(self) -> str:
        return URL_FILE + urllib.parse.quote(self.file)

    @property
    def crediti(self) -> str:
        # La riga che Incompetech chiede, su una riga sola.
        return f"\"{self.titolo}\" Kevin MacLeod (incompetech.com), Licensed under Creative Commons: By Attribution 4.0 License, {URL_LICENZA}"


@dataclass
class Scelta:
    brano: Brano
    punteggio: float
    perche: dict = field(default_factory=dict)


# --- Rete e cache --------------------------------------------------------------------------------
_ultima_richiesta = 0.0


def _scarica(url: str, destinazione: Path) -> Path:
    """Scarica con una pausa tra le richieste (al massimo una al secondo); scrive in modo atomico."""
    global _ultima_richiesta
    attesa = PAUSA_RICHIESTE_S - (time.monotonic() - _ultima_richiesta)
    if attesa > 0:
        time.sleep(attesa)
    destinazione.parent.mkdir(parents=True, exist_ok=True)
    tmp = destinazione.with_suffix(destinazione.suffix + ".parziale")
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    log.info("scarico %s", url)
    with urllib.request.urlopen(req, timeout=120) as r, open(tmp, "wb") as f:
        while blocco := r.read(1 << 16):
            f.write(blocco)
    _ultima_richiesta = time.monotonic()
    tmp.replace(destinazione)
    return destinazione


def catalogo(aggiorna: bool = False) -> list[Brano]:
    """Il catalogo dalla cache (scaricato la prima volta)."""
    pezzi, generi = CACHE_INCOMPETECH / "pieces.json", CACHE_INCOMPETECH / "genre.json"
    if aggiorna or not pezzi.exists():
        _scarica(URL_CATALOGO, pezzi)
        _scarica(URL_GENERI, generi)
    out = []
    for p in json.loads(pezzi.read_text(encoding="utf-8")):
        if not p.get("filename") or not p.get("title"):
            continue
        h, m, s = (int(x) for x in (p.get("length") or "00:00:00").split(":"))
        try:
            bpm = int(p["bpm"]) if p.get("bpm") else None
        except ValueError:
            bpm = None
        out.append(Brano(
            titolo=p["title"].strip(), file=p["filename"], durata_s=h * 3600 + m * 60 + s,
            strumenti=V.strumenti_incompetech(p.get("instruments") or ""), strumenti_testo=p.get("instruments") or "",
            genere=str(p.get("genre") or ""), bpm=bpm, descrizione=(p.get("description") or "").strip(),
            feel={f.strip() for f in (p.get("feel") or "").split(",") if f.strip()}, isrc=p.get("isrc"),
        ))
    return out


def scarica_brano(b: Brano) -> Path:
    destinazione = CACHE_INCOMPETECH / "mp3" / b.file
    if destinazione.exists() and destinazione.stat().st_size > 10_000:
        return destinazione
    return _scarica(b.url, destinazione)


# --- Punteggio ---------------------------------------------------------------------------------
def punteggio(b: Brano, umore: str, energia: str, ambientazioni: list[str], ora: str | None, meteo: list[str],
              tavolozza: list[str], vietati: list[str], epoca: str, parole: list[str], campagna: str) -> tuple[float, dict]:
    prof = PROFILI_UMORE[umore]
    testo = f"{b.titolo} {b.descrizione}".lower()
    voci: dict[str, float] = {}
    voci["umore"] = sum(prof["feel"].get(f, 0.0) for f in b.feel)
    if re.search(prof["parole"], testo):
        voci["parole_umore"] = 1.5
    # La parola che DEFINISCE l'umore («tavern», «funeral», «battle») vale più di un aggettivo.
    if prof.get("chiave") and re.search(prof["chiave"], testo):
        voci["parola_chiave"] = 1.0
    if epoca == "antica" and re.search(ANTICHE, testo + " " + " ".join(b.feel).lower() + " " + b.strumenti_testo.lower()):
        voci["antico"] = 0.8
    if epoca == "antica":
        voci["genere"] = GENERI_ANTICA.get(b.genere, 0.0)
        if "elettronici" in b.strumenti:
            voci["elettronici"] = -2.5
        if re.search(MODERNE, testo):
            voci["parole_moderne"] = -1.5
    if b.genere == "15":          # polka: solo per la taverna
        voci["polka"] = 0.5 if umore == "taverna_calda" else -1.5
    if b.genere == "10":          # horror: buono per la tensione, fuori luogo altrove
        voci["horror"] = 0.2 if umore == "esplorazione_tesa" else -0.8
    in_tavolozza = len(b.strumenti & set(tavolozza))
    if in_tavolozza:
        voci["tavolozza"] = min(1.4, 0.7 * in_tavolozza)
    if set(vietati) & b.strumenti and umore != "combattimento_epico":
        voci["vietati"] = -1.0 * len(set(vietati) & b.strumenti)
    ambient = sum(1 for a in ambientazioni[:3] if re.search(V.AMBIENTAZIONI.get(a, r"$^"), testo))
    if ambient:
        voci["ambientazione"] = min(1.2, 0.6 * ambient)
    if ora == "notte" and b.feel & {"Dark", "Mysterious"}:
        voci["notte"] = 0.2
    if "pioggia" in meteo and re.search(r"\brain", testo):
        voci["pioggia"] = 0.3
    if parole:
        libere = sum(1 for p in parole if p in testo)
        if libere:
            voci["parole_esplicite"] = 0.6 * libere
    lo, hi = prof["bpm"]
    if b.bpm:
        fuori = max(lo - b.bpm, b.bpm - hi, 0)
        if fuori:
            voci["bpm"] = -min(1.5, fuori / 40)
    if energia == "alta" and b.feel & {"Intense", "Driving", "Action"}:
        voci["energia"] = 0.4
    elif energia == "bassa" and b.feel & {"Calming", "Relaxed", "Somber"}:
        voci["energia"] = 0.4
    elif energia == "bassa" and b.feel & {"Intense", "Driving", "Action", "Aggressive"}:
        voci["energia"] = -0.6
    # Durata: sotto 75 s non regge un loop di due minuti; oltre 7 minuti si scarica troppo.
    if b.durata_s < 75:
        voci["durata"] = -3.0
    elif b.durata_s < 110:
        voci["durata"] = -0.5
    elif b.durata_s > 600:
        voci["durata"] = -1.5
    elif b.durata_s > 420:
        voci["durata"] = -0.6
    voci["varieta"] = (zlib.crc32(f"{campagna}|{b.titolo}".encode()) / 2**32) * 0.3
    return sum(voci.values()), {k: round(v, 2) for k, v in voci.items() if v}


def scegli(richieste: list[tuple[str, dict]], tavolozza: list[str], vietati: list[str], epoca: str,
           campagna: str, esclusi: set[str] | None = None, brani: list[Brano] | None = None) -> dict[str, Scelta]:
    """Un brano diverso per ogni richiesta (id → descrittore come dict), in ordine.

    Avidità in ordine di richiesta: i luoghi della scena iniziale vengono prima e prendono i brani
    migliori; nessun brano si ripete nella campagna (`esclusi` contiene quelli già nel manifest).
    """
    brani = brani if brani is not None else catalogo()
    usati = set(esclusi or ())
    out: dict[str, Scelta] = {}
    for ident, d in richieste:
        migliore = None
        for b in brani:
            if b.titolo in usati:
                continue
            s, perche = punteggio(b, d["umore"], d.get("energia", "media"), d.get("ambientazioni", []), d.get("ora"),
                                  d.get("meteo", []), tavolozza, vietati, epoca, d.get("parole", []), campagna)
            if migliore is None or s > migliore.punteggio:
                migliore = Scelta(b, round(s, 2), perche)
        if migliore is None:
            log.error("%s: nessun brano disponibile", ident)
            continue
        usati.add(migliore.brano.titolo)
        out[ident] = migliore
        log.info("%s → «%s» (%.2f) %s", ident, migliore.brano.titolo, migliore.punteggio, migliore.perche)
    return out
