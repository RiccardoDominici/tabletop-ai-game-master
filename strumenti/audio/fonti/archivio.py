"""Internet Archive (archive.org): suoni d'ambiente ed effetti in CC0 o marchio di pubblico dominio.

Perché questa fonte: è l'unica, tra quelle senza chiave, che permette lo scaricamento da script.
Verificato il 2 novembre 2026:
  - robots.txt di archive.org vieta solo /control/ e /report/; le API (advancedsearch, metadata)
    e i download (/download/<id>/<file>) sono ammessi;
  - OpenGameArt vieta nel robots.txt gli agenti Claude-Code/Claude-User; Kenney vieta /assets/,
    /downloads/ e /files/ a tutti; l'API di Wikimedia Commons sta sotto /w/, vietata a tutti:
    per questo NON si usano.
Query: advancedsearch con mediatype:audio e licenseurl esattamente CC0 o PDM (http, tra virgolette).
Le licenze sono dichiarate da chi carica: le si registra così come sono, con la pagina d'origine.

Il rischio di questa fonte è il contenuto: molti «rain» sono brani musicali, molte registrazioni
sul campo hanno traffico o voci. Per questo i candidati passano da filtri di parole e poi da una
misura del suono (pool.py: piattezza spettrale, LRA, silenzi) prima di entrare nel fondo.
"""

from __future__ import annotations

import json
import logging
import math
import re
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path

from percorsi import PAUSA_RICHIESTE_S, USER_AGENT

log = logging.getLogger("audio.archivio")

CERCA = "https://archive.org/advancedsearch.php"
METADATI = "https://archive.org/metadata/"
SCARICA = "https://archive.org/download/"
LICENZE = {
    "http://creativecommons.org/publicdomain/zero/1.0/": "CC0 1.0",
    "http://creativecommons.org/publicdomain/mark/1.0/": "Public Domain Mark 1.0",
}
FORMATI = ("VBR MP3", "MP3", "Ogg Vorbis", "Flac", "WAVE", "24bit Flac")
MAX_MB = 15
# Parole che in un ambiente fantasy non vogliamo (traffico, musica, parlato registrato…).
VIETATE = (r"traffic|\bcars?\b|street|\bcity\b|urban|\btrain|\btram\b|metro|subway|airport|\bplane|aircraft|engine|motor|"
           r"highway|\bbus\b|music|\bsong|album|podcast|interview|speech|lecture|\bradio\b|\bband\b|remix|\bbeat|\bdj\b|"
           r"\bmix\b|sermon|\bnews|episode|chapter|audiobook|librivox|\bpoem|reading|truck|siren|construction|"
           r"\bphone|\btv\b|computer|electronic|synth|guitar|piano|\bjazz|\brock\b|\bpop\b|hip.?hop|ambient music|meditation|"
           r"binaural|asmr|hz\b|white noise|pink noise|brown noise|sleep|relax")
# Le stesse, meno quelle che per folla e taverna servono (le voci SONO il suono).
VIETATE_SENZA_VOCI = VIETATE.replace(r"interview|speech|lecture|", "")
BUONE = r"ambien|field.?record|soundscape|\bloop|sound effect|\bsfx|\bfx\b|nature|recording|atmos"
# Titoli da disco o da concerto: un «9. Purple Rain» o un «Live at the … Tavern» dichiarati CC0 sono
# brani musicali caricati con la licenza sbagliata, non ambienti. Si scartano dal titolo.
TITOLI_DA_DISCO = (r"^\s*\d+\s*[.\-)]\s|\b(19|20)\d\d-\d\d-\d\d\b|\bd\d+t\d+|\blive (at|in)\b|\bconcert|\bvol\.?\s*\d|compilation|\brecords\b|\balbum\b|"
                   r"\b(ep|lp)\b|remaster|\bfeat\.|\bcover\b|\bdemo\b|\bsession|\binterv|\bintervjuer|\bpodcast|\bshow\b|\bmixtape")


def ammesso(titolo: str, testo: str, parole: tuple[str, ...], con_voci: bool) -> str | None:
    """None se il candidato va bene, altrimenti il motivo dello scarto (vale anche per il fondo già scaricato).

    Regole: niente parole vietate (traffico, musica, parlato…), niente titoli da disco, e il titolo
    deve contenere almeno una delle parole cercate (una parola solo nei soggetti non basta: così
    passavano interviste svedesi come «animali della fattoria»).
    """
    t = titolo.lower()
    if re.search(VIETATE_SENZA_VOCI if con_voci else VIETATE, f"{t} {testo.lower()}"):
        return "parole vietate (traffico, musica, parlato…)"
    if re.search(TITOLI_DA_DISCO, t):
        return "titolo da disco o da concerto"
    radici = {w[:5] for q in parole for w in q.lower().split() if len(w) >= 3}
    if not any(r in t for r in radici):
        return "il titolo non nomina il suono cercato"
    return None

_ultima = 0.0


@dataclass
class Candidato:
    fonte: str
    id: str                 # identificativo stabile nella fonte
    titolo: str
    autore: str
    licenza: str
    licenza_url: str
    pagina: str
    url_file: str
    nome_file: str
    durata_s: float
    mb: float
    punteggio: float


def _get(url: str, timeout: int = 60) -> bytes:
    global _ultima
    attesa = PAUSA_RICHIESTE_S - (time.monotonic() - _ultima)
    if attesa > 0:
        time.sleep(attesa)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read()
    finally:
        _ultima = time.monotonic()


def _durata(valore) -> float:
    """«123.4», «2:03», «01:02:03» → secondi."""
    if valore is None:
        return 0.0
    s = str(valore)
    try:
        if ":" in s:
            parti = [float(x) for x in s.split(":")]
            return sum(p * 60 ** i for i, p in enumerate(reversed(parti)))
        return float(s)
    except ValueError:
        return 0.0


def _testo(v) -> str:
    return " ".join(v) if isinstance(v, list) else str(v or "")


def cerca(parole: str, con_voci: bool, durata: tuple[float, float], righe: int = 30) -> list[Candidato]:
    """Candidati per una query (inglese), già filtrati per parole e ordinati per punteggio."""
    licenze = " OR ".join(f'licenseurl:"{u}"' for u in LICENZE)
    termini = " AND ".join(parole.split())
    # Fuori il Live Music Archive (etree): sono concerti, anche quando il titolo dice «Tavern».
    q = f"mediatype:audio AND ({licenze}) AND (title:({termini}) OR subject:({termini})) AND NOT collection:etree"
    params = [("q", q), ("rows", str(righe)), ("output", "json"), ("sort[]", "downloads desc")]
    params += [("fl[]", f) for f in ("identifier", "title", "licenseurl", "creator", "subject", "description", "collection", "downloads")]
    url = f"{CERCA}?{urllib.parse.urlencode(params)}"
    try:
        docs = json.loads(_get(url))["response"]["docs"]
    except Exception as e:
        log.warning("archive.org: ricerca «%s» fallita: %s", parole, e)
        return []
    out = []
    for d in docs:
        titolo = _testo(d.get("title"))
        testo = f"{titolo} {_testo(d.get('subject'))} {_testo(d.get('description'))[:600]}".lower()
        if ammesso(titolo, testo, (parole,), con_voci):
            continue
        if d.get("licenseurl") not in LICENZE:
            continue
        punti = 2.0 * sum(1 for p in parole.split() if p in titolo.lower())
        punti += 1.0 if re.search(BUONE, testo) else 0.0
        punti += 0.5 if "aporee" in _testo(d.get("collection")) else 0.0     # registrazioni sul campo
        punti += 0.3 * math.log10(1 + float(d.get("downloads") or 0))
        out.append((punti, d))
    out.sort(key=lambda x: -x[0])
    candidati = []
    for punti, d in out[:6]:     # al massimo 6 metadati per query: poche richieste
        f = _file_migliore(d["identifier"], durata)
        if f:
            nome, secondi, mb = f
            candidati.append(Candidato(
                fonte="Internet Archive", id=d["identifier"], titolo=_testo(d.get("title")),
                autore=_testo(d.get("creator")) or "sconosciuto", licenza=LICENZE[d["licenseurl"]],
                licenza_url=d["licenseurl"], pagina=f"https://archive.org/details/{d['identifier']}",
                url_file=f"{SCARICA}{d['identifier']}/{urllib.parse.quote(nome)}", nome_file=nome,
                durata_s=secondi, mb=mb, punteggio=round(punti, 2)))
    return candidati


def _file_migliore(identificativo: str, durata: tuple[float, float]) -> tuple[str, float, float] | None:
    """Il file audio più adatto dell'oggetto: durata nell'intervallo, sotto MAX_MB, mp3 se c'è."""
    try:
        meta = json.loads(_get(METADATI + identificativo))
    except Exception as e:
        log.warning("archive.org: metadati di %s non letti: %s", identificativo, e)
        return None
    scelti = []
    for f in meta.get("files", []):
        if f.get("format") not in FORMATI:
            continue
        secondi, mb = _durata(f.get("length")), float(f.get("size") or 0) / 1e6
        if not (durata[0] <= secondi <= durata[1]) or mb > MAX_MB or mb <= 0:
            continue
        preferenza = FORMATI.index(f["format"])
        scelti.append((preferenza, mb, f["name"], secondi))
    if not scelti:
        return None
    scelti.sort()
    _, mb, nome, secondi = scelti[0]
    return nome, secondi, mb


def scarica(c: Candidato, destinazione: Path) -> Path:
    destinazione.parent.mkdir(parents=True, exist_ok=True)
    if destinazione.exists() and destinazione.stat().st_size > 1000:
        return destinazione
    log.info("scarico %s (%.1f MB)", c.url_file, c.mb)
    tmp = destinazione.with_suffix(destinazione.suffix + ".parziale")
    tmp.write_bytes(_get(c.url_file, timeout=180))
    tmp.replace(destinazione)
    return destinazione
