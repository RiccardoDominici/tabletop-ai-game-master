"""Controllo visivo automatico di un'immagine generata: Claude (Haiku 5.5, con la visione) la guarda.

Perché
------
In un framework che genera campagne all'infinito nessuno apre ogni file. Fino al 3/11 l'unico
controllo era un agente che guardava le immagini a una a una; i difetti che trovava sono la lista
fissa qui sotto: firme finte e scritte (4 luoghi su 7 di prova-f0), orli di carta, soggetto diverso
dal prompt (mani visibili dove la scheda le vuole nelle maniche), anatomia (volti doppi), cose che non
dovrebbero esserci (pioggia dentro una casa), e un tratto nascosto che si vede prima della rivelazione.

Come
----
- Due immagini: l'intera (lato lungo 1568 px, la risoluzione utile del modello) e un mosaico dei quattro
  angoli a piena risoluzione, perché le firme finte sono piccole e stanno negli angoli.
- Il prompt con cui è stata generata (la parte di stile si ignora), il tipo, e i tratti nascosti che NON
  devono vedersi (le situazioni del PNG, per un ritratto o un luogo).
- Risposta strutturata (json schema): una lista di problemi con tipo, descrizione, grave sì/no.
  L'esito lo decide il codice: «difettosa» se c'è almeno un problema grave.
- Chiave: ANTHROPIC_API_KEY dell'ambiente, poi la riga del .env alla radice, poi il file di ripiego (come
  apps/server/src/llm/chiavi.ts); mai stampata;
  URL fisso https://api.anthropic.com, perché ANTHROPIC_BASE_URL della shell punta a un proxy.
- Costo di ogni chiamata dai token di `usage` (prezzi di Haiku 5.5 fino a 100K token di prompt).
"""

from __future__ import annotations

import base64
import io
import json
import logging
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # strumenti/, per chiavi.py
from chiavi import cerca_chiave, lunghezza_sicura  # noqa: E402

log = logging.getLogger("immagini.visione")

MODELLO = "claude-haiku-5-5"
URL_API = "https://api.anthropic.com"
FILE_CHIAVE_PREDEFINITO = "/Users/riccardo/Developer/godExperiment/backend/.env"
# Prezzi Haiku 5.5 in dollari per token (prompt fino a 100K token): $0,10 / $0,50 per milione.
PREZZO_INGRESSO = 0.10 / 1_000_000
PREZZO_USCITA = 0.50 / 1_000_000
LATO_MAX = 1568          # lato lungo dell'immagine intera mandata al modello
ANGOLO = (480, 270)      # ritaglio di ogni angolo, a piena risoluzione (per le firme)

# Variabili della shell che l'SDK leggerebbe e che qui non devono valere (come il server).
VARIABILI_IGNORATE = ("ANTHROPIC_BASE_URL", "ANTHROPIC_CUSTOM_HEADERS", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_API_KEY")

TIPI_PROBLEMA = ["testo_o_firma", "margine", "soggetto", "anatomia", "incongruenza", "segreto"]

SCHEMA = {
    "type": "object",
    "properties": {
        "descrizione": {"type": "string", "description": "What the image shows, in one or two sentences."},
        "problemi": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "tipo": {"type": "string", "enum": TIPI_PROBLEMA},
                    "dove": {"type": "string", "description": "Where in the image (e.g. bottom-right corner)."},
                    "descrizione": {"type": "string", "description": "The problem, in Italian, one short sentence."},
                    "grave": {"type": "boolean", "description": "True if a player looking at the projector would notice it."},
                },
                "required": ["tipo", "dove", "descrizione", "grave"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["descrizione", "problemi"],
    "additionalProperties": False,
}

ISTRUZIONI = """You check illustrations generated for a tabletop role-playing game. They are projected full-screen \
(locations, situations) or shown in a small box beside the subtitles (character portraits). Nobody else will look \
at this image before players see it, so report every problem a player would notice, and only real ones.

You get the full image and, as a second image, a 2x2 mosaic of its four corners at full resolution \
(top-left, top-right, bottom-left, bottom-right), because fake signatures are small and hide in corners.

Check, in this order:
1. testo_o_firma: any text, letters, numbers, signature, monogram, initials, scribbled autograph or watermark anywhere \
(corners especially). Only marks that look WRITTEN count: grass, twigs, cracks, footprints, wood grain, a plain plaque or \
an ornament are not writing. Unreadable pseudo-writing on books, ledgers, letters, papers or a shop sign is NOT a \
problem either (it is how these objects look); report it only as a signature if it sits in a corner of the picture.
2. margine: the picture does not fill the frame: a white or paper-coloured border, a torn paper edge, a painted \
vignette that ends before the edge. Snow, fog or a white wall that are part of the scene are NOT a margin.
3. soggetto: the image contradicts the prompt in something that matters: a required element is missing or wrong \
(count it as grave only if it changes what players would understand), or a person has a trait the prompt contradicts.
4. anatomia: extra or missing limbs or fingers, melted hands, a duplicated or ghost face, broken perspective on a person.
5. incongruenza: something that should not be there: rain or snow falling indoors, objects floating, modern objects \
in a medieval scene, a second copy of the same character.
6. segreto: if a list of hidden traits is given (descriptions of later scenes that reveal something about THIS character), \
the character shows the revealed thing here (e.g. a scar that must stay hidden, an object found later, an action done in \
secret). Places, crowds, weather and objects of the scene that those descriptions also mention are NOT secrets.

Ignore the style part of the prompt (technique, palette, light): judge content only. Write each problem's \
description in Italian. If there is nothing wrong, return an empty list of problems."""


@dataclass
class Verdetto:
    """Esito del controllo visivo di un'immagine."""

    esito: str                                   # ok | difettosa | non_verificata
    problemi: list[dict] = field(default_factory=list)
    descrizione: str = ""
    costo_usd: float = 0.0
    token: dict = field(default_factory=dict)
    modello: str = MODELLO

    @property
    def motivi(self) -> list[str]:
        """I problemi gravi in parole (per il log, il manifest e stato_preparazione)."""
        return [f"{p['tipo']}: {p['descrizione']} ({p['dove']})" for p in self.problemi if p.get("grave")]

    def come_voce(self) -> dict:
        return {"esito": self.esito, "motivi": self.motivi, "problemi": self.problemi, "descrizione": self.descrizione,
                "costo_usd": round(self.costo_usd, 6), "token": self.token, "modello": self.modello}


def leggi_chiave(percorso: str | Path | None = None) -> str:
    """Chiave Anthropic: ambiente, poi .env alla radice, poi il file di ripiego (strumenti/chiavi.py)."""
    valore, origine = cerca_chiave(
        "ANTHROPIC_API_KEY",
        file_precedente=percorso or os.environ.get("ANTHROPIC_KEY_FILE") or FILE_CHIAVE_PREDEFINITO,
    )
    log.info("chiave Anthropic da: %s (%s)", origine, lunghezza_sicura(valore))
    return valore


def crea_client(file_chiave: str | Path | None = None):
    """Client Anthropic con la chiave (ambiente, .env, ripiego) e l'URL fisso. Toglie le variabili ANTHROPIC_*
    della shell DOPO aver letto la chiave: ANTHROPIC_API_KEY, se c'è, è la prima fonte."""
    import anthropic

    chiave = leggi_chiave(file_chiave)
    tolte = [n for n in VARIABILI_IGNORATE if n in os.environ]
    for n in tolte:
        del os.environ[n]
    if tolte:
        log.info("variabili della shell ignorate (solo i nomi): %s", ", ".join(tolte))
    return anthropic.Anthropic(api_key=chiave, base_url=URL_API, max_retries=2, timeout=120.0)


def _jpeg_b64(img) -> str:
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=90)
    return base64.standard_b64encode(buf.getvalue()).decode("ascii")


def immagini_da_mandare(percorso: str | Path) -> tuple[str, str]:
    """(intera ridotta a LATO_MAX, mosaico 2x2 dei quattro angoli a piena risoluzione), in base64."""
    from PIL import Image

    with Image.open(percorso) as im:
        im = im.convert("RGB")
        w, h = im.size
        cw, ch = min(ANGOLO[0], w // 2), min(ANGOLO[1], h // 2)
        mosaico = Image.new("RGB", (cw * 2 + 8, ch * 2 + 8), (255, 0, 255))  # bordo magenta: non è carta
        for i, (x, y) in enumerate([(0, 0), (w - cw, 0), (0, h - ch), (w - cw, h - ch)]):
            mosaico.paste(im.crop((x, y, x + cw, y + ch)), ((i % 2) * (cw + 8), (i // 2) * (ch + 8)))
        scala = LATO_MAX / max(w, h)
        intera = im.resize((round(w * scala), round(h * scala)), Image.LANCZOS) if scala < 1 else im
        return _jpeg_b64(intera), _jpeg_b64(mosaico)


def controlla(percorso: str | Path, prompt: str, tipo: str, segreti: list[str] | None = None,
              client=None) -> Verdetto:
    """Guarda l'immagine e ritorna il verdetto. Non solleva per un rifiuto del modello: «non_verificata»."""
    client = client or crea_client()
    intera, mosaico = immagini_da_mandare(percorso)
    testo = [f"Image type: {tipo}.", f"Prompt used to generate it:\n{prompt}"]
    if segreti:
        testo.append("Hidden traits: later scenes that reveal something about this character. What they reveal about the "
                     "character must NOT be visible here:\n" + "\n".join(f"- {s}" for s in segreti))
    risposta = client.messages.create(
        model=MODELLO,
        max_tokens=8000,
        system=ISTRUZIONI,
        output_config={"effort": "medium", "format": {"type": "json_schema", "schema": SCHEMA}},
        messages=[{"role": "user", "content": [
            {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": intera}},
            {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": mosaico}},
            {"type": "text", "text": "\n\n".join(testo)},
        ]}],
    )
    uso = risposta.usage
    token = {"ingresso": uso.input_tokens, "uscita": uso.output_tokens}
    costo = uso.input_tokens * PREZZO_INGRESSO + uso.output_tokens * PREZZO_USCITA
    if risposta.stop_reason != "end_turn":  # rifiuto, max_tokens: niente verdetto inventato
        log.warning("controllo visivo di %s non concluso (stop_reason=%s)", Path(percorso).name, risposta.stop_reason)
        return Verdetto("non_verificata", costo_usd=costo, token=token)
    dati = json.loads(next(b.text for b in risposta.content if b.type == "text"))
    problemi = dati.get("problemi") or []
    esito = "difettosa" if any(p.get("grave") for p in problemi) else "ok"
    v = Verdetto(esito, problemi, dati.get("descrizione", ""), costo, token)
    log.info("controllo visivo %s: %s%s — %d+%d token, $%.5f", Path(percorso).name, esito,
             f" ({'; '.join(v.motivi)})" if v.motivi else "", token["ingresso"], token["uscita"], costo)
    return v
