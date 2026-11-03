"""Validazione di un pacchetto di sessione (`valida_campagna.py --sessione N`, fase D2).

Il pacchetto `sessioni/<nn>/` si gioca unito al livello di campagna, con regole di unione che stanno nel
server. Per non averne una seconda copia in Python, qui si chiede a server2 la vista unita
(strumenti/unisci_pacchetto.ts, una one-shot in una cartella temporanea) e la si valida con le classi di
sempre; STATO, CONTINUITÀ e ARCO guardano invece la campagna vera, dove stanno stato, registri e arco.
I file della vista si riportano a quelli della campagna con mappa.json, così gli errori dicono dove correggere.

LIVELLO.non_supportato diventa un avviso solo qui: chi valida un pacchetto lo sta già giocando in prova
(fase D4); per la preparazione di una campagna nuova resta un errore.
"""

from __future__ import annotations

import json
import logging
import subprocess
import tempfile
from pathlib import Path

from . import contesto_b
from .carica import Campagna, _trova_voci
from .esito import Esito, Voce

log = logging.getLogger(__name__)

SCRIPT = contesto_b.STRUMENTI / "unisci_pacchetto.ts"
DELLA_CAMPAGNA = ("STATO", "CONTINUITÀ", "ARCO")


def valida_pacchetto(cartella: Path, numero: int, rigoroso: bool, voci: Path | None, contesto_b_attivo: bool):
    from . import valida

    cartella = Path(cartella).resolve()
    cmd = contesto_b._comando()
    if cmd is None or not SCRIPT.exists():
        raise RuntimeError("la vista unita del pacchetto vuole node e strumenti/unisci_pacchetto.ts")
    voci = voci or _trova_voci(cartella)
    with tempfile.TemporaryDirectory(prefix="pacchetto-") as tmp:
        vista = Path(tmp) / cartella.name
        r = subprocess.run([*cmd, str(SCRIPT), str(cartella), "--sessione", str(numero), "--uscita", str(vista)],
                           cwd=contesto_b.RADICE, capture_output=True, text=True, timeout=contesto_b.TEMPO_MASSIMO)
        if r.returncode != 0:
            raise RuntimeError((r.stderr.strip().splitlines() or [f"uscita {r.returncode}"])[-1])
        mappa = json.loads((vista / "mappa.json").read_text(encoding="utf-8")) if (vista / "mappa.json").exists() else {}
        esito_vista, c_vista = valida(vista, rigoroso=rigoroso, voci=voci, contesto_b=contesto_b_attivo)
        esito_campagna, _ = valida(cartella, rigoroso=rigoroso, voci=voci, contesto_b=False)
    esito = Esito(rigoroso=rigoroso)
    for v in esito_vista.voci:
        if v.codice.split(".")[0] in DELLA_CAMPAGNA:
            continue
        dove = _riporta(v.dove, mappa)
        if v.codice == "LIVELLO.non_supportato":
            esito.voci.append(Voce("avviso", v.codice, dove, v.messaggio + " (pacchetto in prova: avviso)"))
        else:
            esito.voci.append(Voce(v.gravita, v.codice, dove, v.messaggio))
    esito.voci += [v for v in esito_campagna.voci if v.codice.split(".")[0] in DELLA_CAMPAGNA]
    c_vista.cartella = cartella / "sessioni" / f"{numero:02d}"
    return esito, c_vista


def _riporta(dove: str, mappa: dict) -> str:
    """«scene/01_scena_due.yaml apertura» → «sessioni/02/scene/scena_due.yaml apertura» (mappa.json della vista)."""
    testa, _, resto = dove.partition(" ")
    originali = mappa.get(testa)
    if not originali:
        return dove
    origine = originali[-1] if isinstance(originali, list) else str(originali)
    return f"{origine} {resto}".strip()
