"""Pronunciation lexicon (docs/pronuncia.md): every proper name in the texts has an entry in pronunce.yaml.

The synthetic voice reads invented names badly; before synthesis, the server replaces every name with the
lexicon's spelling in the campaign's language (apps/server/src/voce/pronuncia.ts). Here we check that the
lexicon exists, is well formed and covers the names:

- PRONUNCIA.lessico_mancante (strict): no pronunce.yaml;
- PRONUNCIA.schema: `lessico` is not a list, an entry without `nome` or without the spelling in the campaign's
  language, a repeated name, voice markup in the spelling (square brackets, tags), `forme` that is not a map,
  `motori` that is not a map of voice engines (fish, qwen) to plain-text respellings;
- PRONUNCIA.nome_senza_voce (strict): a word that looks like a proper name (the words of PNG and PG names; a
  mid-sentence capitalised word, not an acronym, that never appears in lowercase in the texts) with no voice in the
  lexicon, nor in the `pronuncia` field of the sheet, nor in `non_nomi`;
- PRONUNCIA.parola_comune (warning): the name of an entry also appears in lowercase in the texts (it is also a
  common word) and the entry lacks `solo_maiuscolo: true`, so the server would change the common word too;
- PRONUNCIA.non_verificata (warning): entries that strumenti/pronuncia/ has not yet tested by ear.

The texts are all the strings that can reach the voice or the narrator: campaign (without
`preparazione`), scenes, PNG sheets, PG, repertoire. Technical keys (id, image prompts, file) are excluded.
"""

from __future__ import annotations

import re
import unicodedata
from pathlib import Path

import yaml

from .carica import Campagna
from .esito import Esito

FILE = "pronunce.yaml"
FILE_GIOCO = "pronunce-gioco.yaml"
TIPI = {"png", "pg", "luogo", "oggetto", "fazione", "dio", "termine", "altro"}
# Voice engines that can have their own respelling (apps/server/src/voce/pronuncia.ts, MOTORI_GRAFIA).
MOTORI = {"fish", "qwen"}
MARKUP = re.compile(r"[\[\]<>{}]")
# Keys that are not spoken or narrated text.
CHIAVI_TECNICHE = {"id", "tag", "voce_id", "file", "prompt_immagine", "prompt_luogo", "stile_immagini", "prompt", "registro_voce",
                   "preparazione", "_file", "chi", "quando", "pronuncia", "statistiche", "alias", "rif", "nodo", "conclusione", "scena", "temi", "tipo", "audio", "immagine", "musica"}
# Words of the texts for the GM and the Engine, not story names (in all content languages).
META = {"motore", "narratore", "preparatore", "critico", "master", "engine", "narrator", "preparer", "critic"}
PAROLA = re.compile(r"[^\W\d_](?:[^\W_]|-)*", re.UNICODE)
DIVISORE_FRASI = re.compile(r"(?<=[.!?…:;])\s+|[«\"“—]\s*")


def senza_accenti(s: str) -> str:
    return "".join(ch for ch in unicodedata.normalize("NFD", s) if unicodedata.category(ch) != "Mn")


def _stringhe(x, chiave: str | None = None):
    """All the strings of a YAML value, skipping the technical keys."""
    if chiave in CHIAVI_TECNICHE:
        return
    if isinstance(x, str):
        yield x
    elif isinstance(x, dict):
        for k, v in x.items():
            yield from _stringhe(v, str(k))
    elif isinstance(x, list):
        for v in x:
            yield from _stringhe(v, chiave)


def _pulisci(testo: str) -> str:
    """Removes the line label («[png_x] »), the stage directions, the expressive voice tags and the ids."""
    t = re.sub(r"^\[[a-z0-9_]+\]\s?", "", testo)
    t = re.sub(r"\[[^\]]*\]|<[^>]*>", " ", t)
    return re.sub(r"\S*_\S*", " ", t)  # ids (png_irma, f_rain) are not spoken words


def testi(c: Campagna) -> list[str]:
    fonti = [{k: v for k, v in (c.campagna or {}).items() if k != "preparazione"}, c.pg]
    fonti += [d for _, d in c.scene] + [d for _, d in c.png.values()] + list(c.battute)
    return [_pulisci(s) for f in fonti for s in _stringhe(f)]


def candidati(testi_: list[str]) -> dict[str, str]:
    """Words with a mid-sentence capital that never appear in lowercase in the texts: lowercase key → form."""
    minuscole: set[str] = set()
    maiuscole: dict[str, str] = {}
    for t in testi_:
        for frase in DIVISORE_FRASI.split(t):
            parole = PAROLA.findall(frase)
            for i, p in enumerate(parole):
                if p[0].islower():
                    minuscole.add(p.lower())
                elif i > 0 and len(p) >= 3 and p[0].isupper() and not p.rstrip("s").isupper():  # acronyms (PNG, PCs) excluded
                    maiuscole.setdefault(p.lower(), p)
    return {k: v for k, v in maiuscole.items() if k not in minuscole}


def _nomi_delle_schede(c: Campagna) -> dict[str, str]:
    """The words of the names of PNG, PG and scenes (capitalised): they are proper names by definition."""
    out: dict[str, str] = {}
    nomi = [d.get("nome") for _, d in c.png.values()] + [p.get("nome") for p in c.personaggi]
    for n in nomi:
        if isinstance(n, str):
            for p in PAROLA.findall(n):
                if p[0].isupper() and len(p) >= 2:
                    out.setdefault(p.lower(), p)
    return out


def _coperte_dalle_schede(c: Campagna) -> set[str]:
    """The words covered by the `pronuncia` field of the sheets (aligned word by word with the name)."""
    out: set[str] = set()
    for d in [d for _, d in c.png.values()] + c.personaggi:
        nome, pron = d.get("nome"), d.get("pronuncia")
        if isinstance(nome, str) and isinstance(pron, str) and len(nome.split()) == len(pron.split()):
            out |= {p.lower() for p in nome.split()}
    return out


def _leggi(percorso: Path, e: Esito) -> dict | None:
    try:
        d = yaml.safe_load(percorso.read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError) as err:
        e.errore("PRONUNCIA.schema", percorso.name, f"unreadable YAML: {str(err).splitlines()[0]}")
        return None
    if not isinstance(d, dict) or not isinstance(d.get("lessico", []), list):
        e.errore("PRONUNCIA.schema", percorso.name, "expected an object with `lessico:` (a list of entries)")
        return None
    return d


def _voci(d: dict, lingua: str, dove: str, e: Esito) -> tuple[set[str], list[dict]]:
    """The covered forms (lowercase, also without accents and word by word) and the well-formed entries."""
    coperte: set[str] = set()
    buone: list[dict] = []
    viste: set[str] = set()
    for k, v in enumerate(d.get("lessico") or []):
        if not isinstance(v, dict) or not isinstance(v.get("nome"), str) or not v["nome"].strip():
            e.errore("PRONUNCIA.schema", f"{dove} #{k + 1}", "entry without `nome`")
            continue
        nome = v["nome"].strip()
        qui = f"{dove} {nome}"
        if nome.lower() in viste:
            e.errore("PRONUNCIA.schema", qui, "name repeated in the lexicon")
            continue
        viste.add(nome.lower())
        blocco = v.get(lingua)
        grafia = blocco if isinstance(blocco, str) else blocco.get("grafia") if isinstance(blocco, dict) else None
        if not isinstance(grafia, str) or not grafia.strip():
            e.errore("PRONUNCIA.schema", qui, f"missing spelling in the campaign's language (`{lingua}: {{grafia: …}}`)")
            continue
        if MARKUP.search(grafia):
            e.errore("PRONUNCIA.schema", qui, "the spelling must be plain text: no square brackets, tags or curly braces")
        if v.get("tipo") is not None and v.get("tipo") not in TIPI:
            e.avviso("PRONUNCIA.schema", qui, f"`tipo` «{v.get('tipo')}» not in the vocabulary ({', '.join(sorted(TIPI))})")
        motori = blocco.get("motori") if isinstance(blocco, dict) else None
        if motori is not None and (not isinstance(motori, dict) or any(k not in MOTORI or not isinstance(x, str) or not x.strip() or MARKUP.search(x) for k, x in motori.items())):
            e.errore("PRONUNCIA.schema", qui, f"`{lingua}.motori` maps a voice engine ({', '.join(sorted(MOTORI))}) to a plain-text respelling")
        forme_lingua = blocco.get("forme") if isinstance(blocco, dict) else None
        if forme_lingua is not None and not isinstance(forme_lingua, dict):
            e.errore("PRONUNCIA.schema", qui, f"`{lingua}.forme` must be a map: form → spelling")
            forme_lingua = None
        forme = [nome] + [f for f in (v.get("forme") or []) if isinstance(f, str)] + list((forme_lingua or {}).keys())
        for f in forme:
            for x in [f, *f.split()]:
                coperte |= {x.lower(), senza_accenti(x).lower()}
        buone.append(v)
    return coperte, buone


def controlla(c: Campagna, e: Esito) -> None:
    percorso = c.cartella / FILE
    if not percorso.exists():
        e.avviso("PRONUNCIA.lessico_mancante", FILE, "the name pronunciation lexicon is missing (docs/pronuncia.md; strumenti/pronuncia/ checks it)", rigoroso=True)
        return
    d = _leggi(percorso, e)
    if d is None:
        return
    coperte, voci = _voci(d, c.lingua, FILE, e)
    if (c.cartella / FILE_GIOCO).exists():
        dg = _leggi(c.cartella / FILE_GIOCO, e)
        if dg is not None:
            coperte |= _voci(dg, c.lingua, FILE_GIOCO, e)[0]
    non_nomi = {str(x).lower() for x in (d.get("non_nomi") or [])}
    coperte |= non_nomi | META | _coperte_dalle_schede(c)

    t = testi(c)
    da_coprire = {**candidati(t), **_nomi_delle_schede(c)}
    mancanti = sorted(v for k, v in da_coprire.items() if k not in coperte and senza_accenti(k) not in coperte)
    for nome in mancanti:
        e.avviso("PRONUNCIA.nome_senza_voce", FILE, f"«{nome}» looks like a proper name and has no voice in the lexicon (or goes in `non_nomi`)", rigoroso=True)

    minuscole = {p for s in t for p in PAROLA.findall(s) if p[0].islower()}
    for v in voci:
        nome = v["nome"].strip()
        if " " not in nome and nome.lower() in minuscole and v.get("solo_maiuscolo") is not True:
            e.avviso("PRONUNCIA.parola_comune", f"{FILE} {nome}", f"«{nome.lower()}» also appears as a common word: add `solo_maiuscolo: true`")
    da_provare = [v["nome"] for v in voci if not v.get("verificata")]
    if da_provare:
        e.avviso("PRONUNCIA.non_verificata", FILE, f"{len(da_provare)} entries not yet tested by ear (strumenti/pronuncia/prova.ts): {', '.join(da_provare[:6])}{'…' if len(da_provare) > 6 else ''}")
