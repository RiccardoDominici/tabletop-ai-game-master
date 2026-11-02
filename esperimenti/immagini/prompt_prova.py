"""Prompt della prova di stile e coerenza per la campagna «prova-f0» (Il pane dei lumi).

Dalla campagna si leggono SOLO i campi pensati per le immagini:
  - stile.yaml           → stile_immagini (il frammento [STILE])
  - scena.yaml           → immagine.prompt_luogo
  - png/*.yaml           → aspetto.prompt_immagine (per riferimento; qui l'identità è riscritta a mano)
Niente segreti, indizi o note del master finiscono nei prompt.

Ogni "lavoro" è un dict: id, prompt, seme, larghezza, altezza, riferimenti (lista di id di lavori
già generati, il cui PNG va usato come immagine di riferimento).
"""

from __future__ import annotations

from pathlib import Path

import yaml

RADICE = Path(__file__).resolve().parents[2]
CAMPAGNA = RADICE / "campagne" / "prova-f0"


def stile_campagna() -> str:
    """Il frammento [STILE] così com'è scritto nella carta di stile (versione v0)."""
    return yaml.safe_load((CAMPAGNA / "stile.yaml").read_text())["stile_immagini"]


def prompt_luogo() -> str:
    """Il prompt del luogo della scena (senza [STILE])."""
    return yaml.safe_load((CAMPAGNA / "scena.yaml").read_text())["immagine"]["prompt_luogo"]


# --- Varianti del frammento [STILE] provate (vedi risultati.md per il giudizio) -----------------
STILI: dict[str, str] = {
    "v0": stile_campagna(),
}

# --- Identità dei PNG ---------------------------------------------------------------------------
# Riscritte da aspetto.prompt_immagine togliendo la parte di "situazione" (forno dietro, porta,
# grata), che nel ritratto a busto non deve esserci. Sebastiano ha il cappuccio calato: la cicatrice
# "si vede solo senza cappuccio" (invarianti) ed è un indizio, quindi non va nel ritratto di gioco.
IDENTITA: dict[str, dict] = {
    "ottavia": {
        "chi": "woman",
        "id": "a short stout 61-year-old village baker woman, white hair tied in a red headscarf, "
              "flour-dusted forearms up to the elbows, clean linen apron, reddened sleepless eyes",
        "seme": 1101,
    },
    "baldrin": {
        "chi": "dwarf",
        "id": "a stocky grey-bearded dwarf blacksmith who looks about fifty, beard bound with iron rings, "
              "scorched leather apron, iron key on a leather cord around his neck, soot-blackened hands",
        "seme": 1202,
    },
    "sebastiano": {
        "chi": "man",
        "id": "a gaunt tall man about forty, worn black hooded cloak with the hood pulled low over his eyes, "
              "three-day stubble, clean steady hands with short nails",
        "seme": 1303,
    },
}

# Due situazioni per PNG, prese dalla scena (luoghi e oggetti pubblici della sala).
SITUAZIONI: dict[str, list[tuple[str, str]]] = {
    "ottavia": [
        ("forno", "pulling round loaves of dark rye bread out of a glowing wood-fired oven with a long "
                  "wooden peel, under low soot-black rafters"),
        ("ceste", "standing at a long tavern table, covering baskets of bread with white linen cloths, "
                  "glancing warily over her shoulder"),
    ],
    "baldrin": [
        ("porta", "seated on a stool before a locked heavy wooden storeroom door with a small iron grate, "
                  "forge hammer resting on his knees, glaring toward the viewer"),
        ("finestra", "standing at a small tavern window at night, looking out at a stone square where a candle "
                     "burns in every window, one hand closed around the iron key at his neck"),
    ],
    "sebastiano": [
        ("grata", "his face seen through the small iron grate of a heavy wooden storeroom door, lit by a "
                  "candle held outside the door"),
        ("ripostiglio", "sitting on the floor of a dark storeroom among flour sacks, a single candle beside "
                        "him, hands resting on his knees"),
    ],
}

RITRATTO = "head-and-shoulders bust portrait, facing the viewer, plain dark neutral background"
LARG_LUOGO, ALT_LUOGO = 1024, 576   # 16:9 per il proiettore
LARG_RITR, ALT_RITR = 768, 1024     # 3:4 per il riquadro di chi parla


def lavori_stile(versione: str) -> list[dict]:
    """Luogo + tre ritratti con la variante di [STILE] indicata."""
    stile = STILI[versione]
    out = [{
        "id": f"{versione}_luogo",
        "prompt": f"{prompt_luogo()}, {stile}",
        "seme": 1000, "larghezza": LARG_LUOGO, "altezza": ALT_LUOGO, "riferimenti": [],
    }]
    for nome, d in IDENTITA.items():
        out.append({
            "id": f"{versione}_ritratto_{nome}",
            "prompt": f"{RITRATTO} of {d['id']}, {stile}",
            "seme": d["seme"], "larghezza": LARG_RITR, "altezza": ALT_RITR, "riferimenti": [],
        })
    return out


def lavori_coerenza(versione: str, modo: str) -> list[dict]:
    """Due situazioni per PNG.

    modo "a": stesse invarianti nel prompt + stesso seme del ritratto, nessun riferimento.
    modo "b": il ritratto come immagine di riferimento, prompt che chiede la stessa persona.
    """
    stile = STILI[versione]
    out = []
    for nome, d in IDENTITA.items():
        for chiave, situazione in SITUAZIONI[nome]:
            if modo == "a":
                prompt = f"{d['id']}, {situazione}, {stile}"
                rif = []
            else:
                prompt = (f"The same {d['chi']} as in the reference image, with the same face, hair and clothes: "
                          f"{d['id']}, now {situazione}. {stile}")
                rif = [f"{versione}_ritratto_{nome}"]
            out.append({
                "id": f"{versione}_{modo}_{nome}_{chiave}",
                "prompt": prompt,
                "seme": d["seme"], "larghezza": LARG_LUOGO, "altezza": ALT_LUOGO, "riferimenti": rif,
            })
    return out


def lotto(nome: str) -> list[dict]:
    """Nomi dei lotti: 'stile_<v>', 'a_<v>', 'b_<v>'."""
    tipo, versione = nome.split("_", 1)
    if tipo == "stile":
        return lavori_stile(versione)
    if tipo in ("a", "b"):
        return lavori_coerenza(versione, tipo)
    raise ValueError(f"lotto sconosciuto: {nome}")
