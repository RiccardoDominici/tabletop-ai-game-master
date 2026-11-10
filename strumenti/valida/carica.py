"""Caricamento di una cartella di campagna in una struttura unica, tollerante agli errori.

Cosa legge (forma descritta in .claude/skills/preparatore/riferimenti/schema.md):
    brief.yaml                                   facoltativo: sessioni e livello (strumenti/strati.py)
    stile.yaml, campagna.yaml, pg.yaml
    scena.yaml, scena_*.yaml, scene/*.yaml      una o più schede scena (la prima giocata è scena.yaml)
    png/*.yaml                                   schede PNG, il nome del file è l'id
    repertorio/*.yaml                            battute (i file senza chiave `battute` si saltano)
    repertorio/parole_segrete.yaml               lessico dei segreti (facoltativo ma richiesto col repertorio)
    assets/voci/voci.yaml (risalendo le cartelle) registro delle voci del TTS (facoltativo)

Un file illeggibile diventa un errore STRUTTURA e la validazione prosegue con ciò che c'è.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

from .esito import Esito
from .lingua import LINGUA_PREDEFINITA, Prosa, carica_prosa, lingua_della_campagna, lingue_disponibili, prosa_predefinita


@dataclass
class Campagna:
    cartella: Path
    brief: dict | None = None                                           # brief.yaml, se c'è (livello, sessioni)
    stile: dict = field(default_factory=dict)
    campagna: dict = field(default_factory=dict)
    pg: dict = field(default_factory=dict)
    scene: list[tuple[str, dict]] = field(default_factory=list)       # (nome file relativo, dati)
    png: dict[str, tuple[str, dict]] = field(default_factory=dict)      # id -> (nome file, dati)
    battute: list[dict] = field(default_factory=list)                   # ognuna con "_file"
    parole_segrete: dict | None = None
    regole: dict | None = None                                          # regole/regole.yaml, se c'è (docs/regole.md)
    voci_registrate: set[str] | None = None
    voci_simili: dict[str, set[str]] = field(default_factory=dict)       # voce -> voci che si confondono con lei
    voce_narratore: str = "narratore"
    lingua: str = LINGUA_PREDEFINITA                                     # `lingua` di campagna.yaml (assente = it)
    prosa: Prosa = field(default_factory=prosa_predefinita)             # regole di prosa della lingua (lingue/<codice>/prosa.yaml)

    # --- viste derivate (calcolate da `deriva`) ---
    canone: dict[str, dict] = field(default_factory=dict)
    indizi: dict[str, dict] = field(default_factory=dict)               # id -> indizio, con "nodo" e "_dove"
    orologi: dict[str, dict] = field(default_factory=dict)              # orologi del narratore + extra dei fronti
    nodi: dict[str, dict] = field(default_factory=dict)
    rivelazioni: dict[str, dict] = field(default_factory=dict)
    per_id: dict[str, dict] = field(default_factory=dict)               # battute per id

    @property
    def personaggi(self) -> list[dict]:
        p = self.pg.get("personaggi") if isinstance(self.pg, dict) else self.pg
        return [x for x in (p or []) if isinstance(x, dict)]

    @property
    def pg_ids(self) -> list[str]:
        return [p.get("id") for p in self.personaggi if p.get("id")]

    @property
    def preparazione(self) -> dict:
        return self.campagna.get("preparazione") or {}

    @property
    def fronti(self) -> list[dict]:
        return [f for f in (self.preparazione.get("fronti") or []) if isinstance(f, dict)]

    def scena_iniziale(self) -> dict | None:
        for nome, s in self.scene:
            if nome == "scena.yaml":
                return s
        return self.scene[0][1] if self.scene else None

    def fatti_nascosti(self) -> set[str]:
        return {i for i, f in self.canone.items() if not f.get("noto_ai_pg")}

    def voce_di(self, pid: str) -> str | None:
        return (((self.png.get(pid) or ("", {}))[1].get("voce") or {}).get("tts") or {}).get("voce_id")

    def voci_confuse(self, a: str, b: str) -> bool:
        """Le voci di due PNG si confondono a orecchio: uguali, o simili per il registro (simile_a)."""
        va, vb = self.voce_di(a), self.voce_di(b)
        return bool(va and vb and (va == vb or vb in self.voci_simili.get(va, set())))


def _leggi(percorso: Path, esito: Esito, obbligatorio: bool) -> Any:
    rel = percorso.name if percorso.parent.name in ("", ".") else f"{percorso.parent.name}/{percorso.name}"
    if not percorso.exists():
        if obbligatorio:
            esito.errore("STRUTTURA.file_mancante", rel, "file obbligatorio assente")
        return None
    try:
        return yaml.safe_load(percorso.read_text(encoding="utf-8"))
    except yaml.YAMLError as e:
        esito.errore("STRUTTURA.yaml", rel, f"YAML illeggibile: {str(e).splitlines()[0]}")
        return None


def _trova_voci(cartella: Path) -> Path | None:
    for su in [cartella, *cartella.parents]:
        p = su / "assets" / "voci" / "voci.yaml"
        if p.exists():
            return p
    return None


def carica(cartella: Path, esito: Esito, voci: Path | None = None) -> Campagna:
    cartella = Path(cartella)
    c = Campagna(cartella=cartella)
    if not cartella.is_dir():
        esito.errore("STRUTTURA.cartella", str(cartella), "la cartella della campagna non esiste")
        return c
    brief = _leggi(cartella / "brief.yaml", esito, False)
    c.brief = brief if isinstance(brief, dict) else ({} if (cartella / "brief.yaml").exists() else None)
    c.stile = _leggi(cartella / "stile.yaml", esito, True) or {}
    c.campagna = _leggi(cartella / "campagna.yaml", esito, True) or {}
    codice = lingua_della_campagna(c.campagna)
    if codice is None:
        grezza = c.campagna.get("lingua") if isinstance(c.campagna, dict) else None
        esito.errore("STRUTTURA.lingua", "campagna.yaml",
                     f"lingua {grezza!r} sconosciuta (ammesse: {', '.join(lingue_disponibili())}; assente = it)")
        codice = LINGUA_PREDEFINITA
    c.lingua, c.prosa = codice, carica_prosa(codice)
    c.pg = _leggi(cartella / "pg.yaml", esito, True) or {}
    c.regole = _leggi(cartella / "regole" / "regole.yaml", esito, False)

    file_scene = [cartella / "scena.yaml"] if (cartella / "scena.yaml").exists() else []
    file_scene += sorted(p for p in cartella.glob("scena_*.yaml"))
    file_scene += sorted((cartella / "scene").glob("*.yaml"))
    if not file_scene:
        esito.errore("STRUTTURA.file_mancante", "scena.yaml", "nessuna scheda scena (scena.yaml o scene/*.yaml)")
    for p in file_scene:
        dati = _leggi(p, esito, True)
        if isinstance(dati, dict):
            c.scene.append((str(p.relative_to(cartella)), dati))

    cartella_png = cartella / "png"
    if not cartella_png.is_dir():
        esito.errore("STRUTTURA.file_mancante", "png/", "manca la cartella delle schede PNG")
    else:
        for p in sorted(cartella_png.glob("*.yaml")):
            dati = _leggi(p, esito, True)
            if isinstance(dati, dict):
                pid = dati.get("id") or p.stem
                c.png[pid] = (str(p.relative_to(cartella)), dati)

    rep = cartella / "repertorio"
    if rep.is_dir():
        for p in sorted(rep.glob("*.yaml")):
            dati = _leggi(p, esito, False)
            if p.name == "parole_segrete.yaml":
                c.parole_segrete = dati if isinstance(dati, dict) else {}
                continue
            if not isinstance(dati, dict) or "battute" not in dati:
                continue
            for b in dati.get("battute") or []:
                if isinstance(b, dict):
                    b = dict(b)
                    b["_file"] = p.name
                    c.battute.append(b)

    percorso_voci = voci or _trova_voci(cartella)
    if percorso_voci and percorso_voci.exists():
        reg = yaml.safe_load(percorso_voci.read_text(encoding="utf-8")) or {}
        ids = {v.get("id") for v in reg.get("voci", []) if isinstance(v, dict)}
        c.voci_registrate = {i for i in ids if i}
        # simile_a è simmetrico: basta scriverlo da una parte.
        for v in reg.get("voci", []):
            if isinstance(v, dict) and v.get("id"):
                for altra in v.get("simile_a") or []:
                    c.voci_simili.setdefault(v["id"], set()).add(altra)
                    c.voci_simili.setdefault(altra, set()).add(v["id"])
    deriva(c)
    return c


def deriva(c: Campagna) -> None:
    """Calcola le viste derivate: canone, indizi (scene + nodi), orologi, nodi, rivelazioni, battute per id."""
    c.canone = {f["id"]: f for f in (c.campagna.get("canone") or []) if isinstance(f, dict) and f.get("id")}
    c.nodi = {n["id"]: n for n in (c.campagna.get("nodi") or []) if isinstance(n, dict) and n.get("id")}
    c.rivelazioni = {r["id"]: r for r in (c.campagna.get("rivelazioni") or []) if isinstance(r, dict) and r.get("id")}
    c.orologi = {o["id"]: o for o in (c.campagna.get("orologi") or []) if isinstance(o, dict) and o.get("id")}
    for f in c.fronti:
        for o in f.get("orologi_extra") or []:
            if isinstance(o, dict) and o.get("id"):
                c.orologi.setdefault(o["id"], o)
    c.indizi = {}
    for nome, s in c.scene:
        for i in s.get("indizi") or []:
            if isinstance(i, dict) and i.get("id"):
                c.indizi[i["id"]] = {**i, "_dove": nome}
    for n in c.nodi.values():
        for i in n.get("indizi") or []:
            if isinstance(i, dict) and i.get("id"):
                c.indizi[i["id"]] = {**i, "nodo": i.get("nodo", n["id"]), "_dove": f"campagna.yaml nodo {n['id']}"}
    c.per_id = {}
    for b in c.battute:
        if b.get("id"):
            c.per_id.setdefault(b["id"], b)
