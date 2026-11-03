"""Motore immagini locale per Cantastorie: FLUX.2 klein 4B a 4 bit, via la CLI di mflux (MLX), su Apple Silicon.

Perché un processo per immagine
-------------------------------
Le immagini (luoghi e ritratti dei PNG) si generano PRIMA della sessione, in locale, perché le API a
pagamento sono in pausa. Sul Mac di riferimento (M1, 16 GB, con altre app pesanti accese) tenere il
modello in un unico processo Python fa crescere la memoria (codificatore di testo + cache MLX: 11 GB
di picco) e manda il sistema in swap: la seconda immagine diventa più lenta della prima.
La CLI di mflux con `--low-ram`, lanciata una volta per immagine, scarica il codificatore di testo
dopo l'uso e limita la cache: 4,35 GB di picco, niente swap, stessa velocità. I pesi si leggono da
disco in pochi secondi a ogni avvio, quindi il costo del processo nuovo è piccolo.
Misure complete: esperimenti/immagini/risultati.md.

Due comandi, stessi pesi:
  mflux-generate-flux2       solo testo (luoghi, ritratti)
  mflux-generate-flux2-edit  testo + immagini di riferimento (lo stesso PNG in altre situazioni)

Uso minimo:
    from motore import Motore
    esito = Motore().genera("prompt...", seme=7, larghezza=1024, altezza=576, uscita=Path("x.png"))
"""

from __future__ import annotations

import logging
import re
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path

log = logging.getLogger("immagini.motore")

# Ripack a 4 bit della comunità mflux (Apache-2.0 come l'originale BFL): solo safetensors, 4,62 GB.
# La quantizzazione è già nei pesi: niente `-q`.
MODELLO_REPO = "mflux-community/flux2-klein-4b-mflux-q4"
MODELLO_BASE = "flux2-klein-4b"
# Il modello è distillato: 4 passi e guidance 1.0 (il default della CLI) sono i valori previsti.
PASSI_DEFAULT = 4

# Sotto questa carica, a batteria, ci si rifiuta di partire: una generazione lunga può spegnere il Mac.
BATTERIA_MINIMA = 20
# Sotto questo spazio libero non si parte: lo swap del sistema vive sullo stesso disco.
DISCO_MINIMO_GB = 8.0
# Nuovi tentativi quando il watchdog della GPU uccide il calcolo (successo il 3/11 su una situazione a
# 1920 con riferimento: «[METAL] Command buffer execution failed: Impacting Interactivity»).
TENTATIVI_GPU = 1

# I comandi stanno nel venv accanto a questo file (vedi requirements.txt).
BIN = Path(__file__).resolve().parent / ".venv" / "bin"


@dataclass
class Esito:
    """Risultato di una generazione: dove sta il PNG, quanto ci ha messo, picco di memoria del processo."""

    percorso: Path
    secondi: float
    picco_gb: float | None


def stato_alimentazione() -> tuple[bool, int | None]:
    """Ritorna (a_corrente, percentuale_batteria). Su errori di `pmset` assume corrente (non blocca)."""
    try:
        out = subprocess.run(["pmset", "-g", "batt"], capture_output=True, text=True, timeout=5).stdout
    except (OSError, subprocess.SubprocessError):
        return True, None
    a_corrente = "AC Power" in out
    m = re.search(r"(\d+)%", out)
    return a_corrente, (int(m.group(1)) if m else None)


def verifica_alimentazione(minima: int = BATTERIA_MINIMA) -> None:
    """Solleva RuntimeError se il Mac è a batteria sotto la soglia: meglio fermarsi che spegnersi a metà."""
    a_corrente, perc = stato_alimentazione()
    if a_corrente:
        return
    if perc is not None and perc < minima:
        raise RuntimeError(f"Mac a batteria al {perc}%: collega l'alimentatore prima di generare immagini.")
    log.warning("Mac a batteria (%s%%): ogni immagine consuma molto, meglio collegare l'alimentatore.", perc)


class Motore:
    """Genera un'immagine per processo con la CLI di mflux. Nessuno stato pesante resta in memoria."""

    def __init__(self, repo: str = MODELLO_REPO, fp16: bool = True, low_ram: bool = True):
        """fp16: calcolo interno in float16; su M1 è circa il 20% più veloce e l'immagine non cambia a vista.
        low_ram: la modalità di mflux che libera il codificatore di testo e limita la cache MLX."""
        self.repo = repo
        self.fp16 = fp16
        self.low_ram = low_ram

    @property
    def descrizione(self) -> str:
        """Etichetta del modello da scrivere nei manifest."""
        extra = [x for x, on in (("fp16", self.fp16), ("low-ram", self.low_ram)) if on]
        return f"{self.repo} (base {MODELLO_BASE}, mflux{', ' + ', '.join(extra) if extra else ''})"

    def comando(self, prompt: str, seme: int, larghezza: int, altezza: int, uscita: Path,
                riferimenti: list[Path] | None = None, passi: int = PASSI_DEFAULT) -> list[str]:
        """La riga di comando di mflux (lista, niente shell: il prompt non va mai interpretato)."""
        exe = "mflux-generate-flux2-edit" if riferimenti else "mflux-generate-flux2"
        cmd = [str(BIN / exe), "--model", self.repo, "--base-model", MODELLO_BASE,
               "--prompt", prompt, "--seed", str(seme), "--width", str(larghezza), "--height", str(altezza),
               "--steps", str(passi), "--output", str(uscita),
               "--battery-percentage-stop-limit", str(BATTERIA_MINIMA)]
        if riferimenti:
            cmd += ["--image-paths", *[str(r) for r in riferimenti]]
        if self.low_ram:
            cmd.append("--low-ram")
        if self.fp16:
            cmd += ["--compute-precision", "float16"]
        return cmd

    def genera(self, prompt: str, seme: int, larghezza: int, altezza: int, uscita: Path,
               riferimenti: list[str | Path] | None = None, passi: int = PASSI_DEFAULT) -> Esito:
        """Genera un PNG in `uscita`. Larghezza e altezza: multipli di 16.

        riferimenti: immagini di riferimento (es. il ritratto del PNG). mflux le riduce da sé a max 1 Mpx;
        ogni riferimento aggiunge token, quindi rallenta la generazione.
        """
        if larghezza % 16 or altezza % 16:
            raise ValueError(f"dimensioni {larghezza}x{altezza}: servono multipli di 16")
        verifica_alimentazione()
        uscita = Path(uscita)
        uscita.parent.mkdir(parents=True, exist_ok=True)
        # mflux non sovrascrive: se il file c'è già salva con un suffisso, e il controllo sotto
        # troverebbe il vecchio file. Lo togliamo prima (chi chiama ha già deciso di rigenerare).
        uscita.unlink(missing_ok=True)
        rif = [Path(r) for r in riferimenti] if riferimenti else None
        # /usr/bin/time -l (macOS) aggiunge il "peak memory footprint" del processo su stderr.
        cmd = ["/usr/bin/time", "-l", *self.comando(prompt, seme, larghezza, altezza, uscita, rif, passi)]
        t0 = time.perf_counter()
        proc = subprocess.run(cmd, capture_output=True, text=True)
        for tentativo in range(1, TENTATIVI_GPU + 1):
            if proc.returncode == 0 or not _errore_gpu_transitorio(proc):
                break
            # Il watchdog di macOS uccide un calcolo Metal che tiene la GPU troppo a lungo mentre
            # l'interfaccia ne ha bisogno: dipende dal momento, non dal prompt. Si riprova uguale.
            log.warning("errore transitorio della GPU (Metal «Impacting Interactivity») su %s: nuovo tentativo %d/%d",
                        uscita.name, tentativo, TENTATIVI_GPU)
            verifica_alimentazione()
            uscita.unlink(missing_ok=True)
            time.sleep(5)
            proc = subprocess.run(cmd, capture_output=True, text=True)
        secondi = time.perf_counter() - t0
        if proc.returncode != 0 or not uscita.exists():
            # Si tolgono le righe statistiche di /usr/bin/time, che altrimenti coprono il messaggio di mflux.
            # Nota: se la batteria scende sotto il limite, mflux si ferma da sé ed esce con codice 0.
            righe = [r for r in (proc.stdout + proc.stderr).splitlines()
                     if r.strip() and not re.match(r"^\s*[\d.,]+\s+[a-z ]+$", r)]
            coda = "\n".join(righe[-12:])
            raise RuntimeError(f"mflux (codice {proc.returncode}) non ha scritto {uscita.name}:\n{coda}")
        m = re.search(r"(\d+)\s+peak memory footprint", proc.stderr)
        picco = int(m.group(1)) / 1000**3 if m else None
        log.info("generata %s %dx%d seme=%d rif=%d in %.1f s (picco processo %s GB)", uscita.name, larghezza,
                 altezza, seme, len(rif or []), secondi, f"{picco:.2f}" if picco else "?")
        return Esito(percorso=uscita, secondi=secondi, picco_gb=picco)


def _errore_gpu_transitorio(proc: subprocess.CompletedProcess) -> bool:
    """Vero se mflux è caduto per il watchdog della GPU (kIOGPUCommandBufferCallbackErrorImpactingInteractivity)."""
    return "Impacting Interactivity" in (proc.stdout or "") + (proc.stderr or "")


def verifica_disco(cartella: str | Path, minimo_gb: float = DISCO_MINIMO_GB) -> None:
    """Solleva RuntimeError se sul volume di `cartella` restano meno di `minimo_gb` GB liberi.

    Il sistema usa il disco per lo swap: sotto qualche GB una generazione può bloccare il Mac.
    """
    import shutil

    libero = shutil.disk_usage(Path(cartella)).free / 1000**3
    if libero < minimo_gb:
        raise RuntimeError(f"solo {libero:.1f} GB liberi su disco (minimo {minimo_gb} GB): libera spazio prima di generare.")


class _Gia:
    """Context manager che restituisce un'immagine già aperta senza chiuderla all'uscita."""

    def __init__(self, img):
        self.img = img

    def __enter__(self):
        return self.img

    def __exit__(self, *exc):
        return False


def salva_jpeg(sorgente, percorso: str | Path, lato_max: int = 1280, qualita: int = 85,
               dimensioni: tuple[int, int] | None = None) -> Path:
    """Salva una copia JPEG (per git e per il proiettore) di un'immagine su disco.

    Senza `dimensioni`: lato lungo <= lato_max. Con `dimensioni` (larghezza, altezza): ritaglio al
    centro alle proporzioni chieste, poi ridimensionamento esatto (serve per 1920x1080, che il modello
    non può generare: si genera 1920x1088 e si tolgono 4 righe sopra e 4 sotto).
    """
    from PIL import Image

    percorso = Path(percorso)
    percorso.parent.mkdir(parents=True, exist_ok=True)
    # `sorgente` può essere già un'immagine aperta (per esempio dopo rifila.rifila).
    apri = (lambda: _Gia(sorgente)) if isinstance(sorgente, Image.Image) else (lambda: Image.open(sorgente))
    with apri() as img:
        img = img.convert("RGB")
        if dimensioni:
            lw, la = dimensioni
            # Il rettangolo più grande con le proporzioni lw:la che sta nell'immagine, centrato.
            if img.width * la > img.height * lw:
                w, h = round(img.height * lw / la), img.height
            else:
                w, h = img.width, round(img.width * la / lw)
            x, y = (img.width - w) // 2, (img.height - h) // 2
            img = img.crop((x, y, x + w, y + h))
            if img.size != (lw, la):
                img = img.resize((lw, la), Image.LANCZOS)
        else:
            scala = lato_max / max(img.size)
            if scala < 1:
                img = img.resize((round(img.width * scala), round(img.height * scala)), Image.LANCZOS)
        img.save(percorso, "JPEG", quality=qualita, optimize=True, progressive=True)
    return percorso
