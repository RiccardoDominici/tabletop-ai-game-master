"""Freesound (freesound.org): fonte innestabile, attiva solo se c'è FREESOUND_API_KEY.

Come attivarla: creare un account su freesound.org, poi una chiave API in
https://freesound.org/apiv2/apply/ (gratuita), e metterla nell'ambiente prima di lanciare la pipeline:
    export FREESOUND_API_KEY=...        (o in .env alla radice, che è fuori da git)
Con la sola chiave (token) si leggono ricerca e anteprime (mp3/ogg di buona qualità, ~128 kbps);
gli originali richiederebbero OAuth2, qui non servono. Limiti: 60 richieste al minuto, 2.000 al giorno.
Si chiedono solo suoni con licenza «Creative Commons 0» e durata nell'intervallo richiesto.
Endpoint: https://freesound.org/docs/api/resources_apiv2.html (letto il 2 novembre 2026).
"""

from __future__ import annotations

import json
import logging
import os
import urllib.parse
import urllib.request
from pathlib import Path

from fonti.archivio import Candidato, _get
from percorsi import RADICE

log = logging.getLogger("audio.freesound")

API = "https://freesound.org/apiv2/search/text/"


def chiave() -> str | None:
    if os.environ.get("FREESOUND_API_KEY"):
        return os.environ["FREESOUND_API_KEY"]
    env = RADICE / ".env"
    if env.exists():
        for riga in env.read_text(encoding="utf-8").splitlines():
            if riga.strip().startswith("FREESOUND_API_KEY="):
                return riga.split("=", 1)[1].strip().strip('"')
    return None


def attiva() -> bool:
    return chiave() is not None


def cerca(parole: str, con_voci: bool, durata: tuple[float, float], righe: int = 15) -> list[Candidato]:
    k = chiave()
    if not k:
        return []
    filtro = f'license:"Creative Commons 0" duration:[{durata[0]} TO {durata[1]}]'
    params = {"query": parole, "filter": filtro, "page_size": str(righe), "sort": "rating_desc",
              "fields": "id,name,username,license,url,duration,previews,filesize,avg_rating,num_ratings", "token": k}
    try:
        dati = json.loads(_get(f"{API}?{urllib.parse.urlencode(params)}"))
    except Exception as e:
        log.warning("freesound: ricerca «%s» fallita: %s", parole, e)
        return []
    out = []
    for r in dati.get("results", []):
        anteprima = (r.get("previews") or {}).get("preview-hq-mp3")
        if not anteprima:
            continue
        out.append(Candidato(
            fonte="Freesound", id=f"fs{r['id']}", titolo=r.get("name", ""), autore=r.get("username", ""),
            licenza="CC0 1.0", licenza_url=r.get("license", ""), pagina=r.get("url", ""), url_file=anteprima,
            nome_file=f"fs{r['id']}.mp3", durata_s=float(r.get("duration") or 0), mb=0.0,
            punteggio=float(r.get("avg_rating") or 0) + min(2.0, float(r.get("num_ratings") or 0) / 10)))
    return out


def scarica(c: Candidato, destinazione: Path) -> Path:
    destinazione.parent.mkdir(parents=True, exist_ok=True)
    if not destinazione.exists():
        destinazione.write_bytes(_get(c.url_file, timeout=120))
    return destinazione
