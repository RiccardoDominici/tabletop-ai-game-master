"""Il contesto VERO del selettore in modo B, compilato dal server (strumenti/contesto_modo_b.ts).

Il validatore non riscrive in Python il compilatore del server (apps/server/src/repertorio/contesto.ts):
lo esegue con node e tsx, e riceve per ogni scena le sezioni del contesto PRIMA della rete di
sicurezza. Così il controllo dei segreti guarda esattamente i campi che il selettore riceve (pianta,
taglio, abbozzi dei nodi, regole di prosa, agganci dei PG…), anche quando il server cambia l'allowlist.

Se node o tsx mancano, o la campagna non si carica ancora (per esempio pg.yaml non è scritto),
`compila` restituisce None e il motivo: chi chiama ne fa un avviso, non un errore.
"""

from __future__ import annotations

import json
import logging
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

log = logging.getLogger(__name__)

STRUMENTI = Path(__file__).resolve().parent.parent       # strumenti/
SCRIPT = STRUMENTI / "contesto_modo_b.ts"
RADICE = STRUMENTI.parent                                 # radice del repository (node_modules)
TEMPO_MASSIMO = 120                                       # secondi: tsx compila al volo i moduli del server


@dataclass
class ScenaB:
    id: str
    sezioni: list[tuple[str, str]] = field(default_factory=list)   # (nome della sezione, testo)


@dataclass
class ContestoB:
    scene: list[ScenaB]
    avvisi: list[str]


def _comando() -> list[str] | None:
    """tsx locale del repository se c'è (più veloce), altrimenti npx senza installare nulla."""
    locale = RADICE / "node_modules" / ".bin" / "tsx"
    if locale.exists() and shutil.which("node"):
        return [str(locale)]
    if shutil.which("npx") and shutil.which("node"):
        return ["npx", "--no-install", "tsx"]
    return None


def compila(cartella: Path) -> tuple[ContestoB | None, str]:
    """Compila il contesto del modo B di ogni scena. Restituisce (contesto, "") o (None, motivo)."""
    if not SCRIPT.exists():
        return None, f"manca {SCRIPT.name}"
    cmd = _comando()
    if cmd is None:
        return None, "node non è installato: il contesto vero del modo B non si può compilare"
    try:
        r = subprocess.run([*cmd, str(SCRIPT), str(Path(cartella).resolve()), "--json"], cwd=RADICE,
                           capture_output=True, text=True, timeout=TEMPO_MASSIMO)
    except (OSError, subprocess.TimeoutExpired) as err:
        return None, f"compilatore del server non eseguibile: {err}"
    if r.returncode != 0:
        motivo = (r.stderr.strip().splitlines() or [f"uscita {r.returncode}"])[-1]
        return None, motivo
    try:
        dati = json.loads(r.stdout)
    except json.JSONDecodeError as err:
        return None, f"uscita del compilatore illeggibile: {err}"
    scene = [ScenaB(s["id"], [(x["nome"], x["testo"]) for x in s.get("sezioni") or []]) for s in dati.get("scene") or []]
    log.debug("contesto B compilato: %d scene", len(scene))
    return ContestoB(scene, list(dati.get("avvisi") or [])), ""


def campo_della_riga(righe: list[str], i: int) -> str:
    """Il percorso YAML approssimato della riga i (chiavi dei genitori per rientro): «voce.stile»."""
    def rientro(s: str) -> int:
        return len(s) - len(s.lstrip(" "))

    chiavi, livello = [], rientro(righe[i])
    riga = righe[i].strip().removeprefix("- ")
    if ":" in riga and not riga.startswith('"'):
        chiavi.append(riga.split(":", 1)[0].strip())
    for j in range(i - 1, -1, -1):
        s = righe[j]
        if not s.strip() or s.lstrip().startswith("#"):
            continue
        if rientro(s) < livello:
            livello = rientro(s)
            testa = s.strip().removeprefix("- ")
            if ":" in testa:
                chiavi.append(testa.split(":", 1)[0].strip())
        if livello == 0:
            break
    return ".".join(reversed(chiavi))
