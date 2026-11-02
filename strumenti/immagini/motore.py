"""Motore immagini locale per Cantastorie: FLUX.2 klein 4B a 4 bit, via mflux (MLX), su Apple Silicon.

Perché questo modulo esiste
---------------------------
Le immagini (luoghi e ritratti dei PNG) si generano PRIMA della sessione, in locale, perché le API a
pagamento sono in pausa. Il Mac di riferimento è un M1 con 16 GB: il modello va caricato UNA volta sola
(costa decine di secondi) e poi riusato per tutte le immagini della campagna.

mflux ha due varianti di FLUX.2 klein con gli stessi pesi: `Flux2Klein` (solo testo) e
`Flux2KleinEdit` (testo + immagini di riferimento: stesso volto in situazioni diverse). La variante
edit NON accetta zero riferimenti (in mflux 0.24.0 va in errore su mx.concatenate), quindi il motore
tiene in memoria UNA variante per volta e la cambia quando serve: i pesi si caricano pigramente da
disco in pochi secondi, mentre due copie (2 × 4,6 GB) su 16 GB porterebbero allo swap.
Conviene quindi ordinare il lavoro: prima tutte le immagini da solo testo, poi quelle con riferimenti.

Uso minimo:
    from motore import Motore
    m = Motore()
    esito = m.genera("prompt...", seme=7, larghezza=1024, altezza=576)
    esito.immagine.save("x.png")

Dipendenze: il venv `strumenti/immagini/.venv` (mflux 0.24.0, vedi requirements.txt).
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
# La quantizzazione è già nei pesi: niente `quantize=` al caricamento.
MODELLO_REPO = "mflux-community/flux2-klein-4b-mflux-q4"
MODELLO_BASE = "flux2-klein-4b"
# Il modello è distillato: 4 passi e guidance 1.0 sono i valori previsti da mflux.
PASSI_DEFAULT = 4

# Sotto questa carica, a batteria, ci si rifiuta di partire: una generazione lunga può spegnere il Mac.
BATTERIA_MINIMA = 20


@dataclass
class Esito:
    """Risultato di una generazione: l'immagine PIL, il tempo e il picco di memoria MLX."""

    immagine: "object"  # PIL.Image.Image (import pigro, vedi sotto)
    secondi: float
    picco_gb: float


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
    log.warning("Mac a batteria (%s%%): la generazione sarà più lenta e consuma molto.", perc)


class Motore:
    """Tiene in memoria FLUX.2 klein 4B (4 bit) e genera immagini con o senza riferimenti."""

    def __init__(self, repo: str = MODELLO_REPO, fp16: bool = False, limite_cache_gb: float | None = None):
        """Carica il modello (scarica i pesi da Hugging Face al primo uso, nella cache standard).

        fp16: calcolo interno di attenzione/MLP in float16; mflux dice che aiuta sugli M1/M2, dove il
              bfloat16 è lento. Cambia leggermente l'immagine a parità di seme.
        limite_cache_gb: tetto alla cache MLX (memoria riusabile), utile se il sistema va in swap.
        """
        # Import pigri: così `--dry-run` dello strumento non paga il caricamento di MLX/mflux.
        import mlx.core as mx

        self._mx = mx
        self.repo = repo
        self.fp16 = fp16
        if limite_cache_gb is not None:
            mx.set_cache_limit(int(limite_cache_gb * 1000**3))
        self._modello = None
        self._edit: bool | None = None  # quale variante è caricata (None = nessuna)
        self.secondi_caricamento = 0.0  # somma dei caricamenti (di solito 1 o 2)

    def _variante(self, edit: bool):
        """Ritorna la variante richiesta, scaricando l'altra se era in memoria."""
        if self._edit is edit:
            return self._modello
        import gc

        from mflux.models.common.compute_precision.compute_precision import ComputePrecision
        from mflux.models.common.config import ModelConfig
        from mflux.models.flux2.variants import Flux2Klein, Flux2KleinEdit

        if self._modello is not None:
            log.info("scarico la variante %s", "edit" if self._edit else "testo")
            self._modello = None
            gc.collect()
            self._mx.clear_cache()
        classe = Flux2KleinEdit if edit else Flux2Klein
        t0 = time.perf_counter()
        log.info("carico %s, variante %s (fp16=%s)…", self.repo, classe.__name__, self.fp16)
        self._modello = classe(
            model_config=ModelConfig.flux2_klein_4b(),
            model_path=self.repo,
            compute_precision=ComputePrecision.dtype_for("float16" if self.fp16 else None),
        )
        self._edit = edit
        dt = time.perf_counter() - t0
        self.secondi_caricamento += dt
        log.info("variante pronta in %.1f s (i pesi MLX si leggono pigramente al primo uso)", dt)
        return self._modello

    @property
    def descrizione(self) -> str:
        """Etichetta del modello da scrivere nei manifest."""
        return f"{self.repo} (base {MODELLO_BASE}, mflux{', fp16' if self.fp16 else ''})"

    def genera(
        self,
        prompt: str,
        seme: int,
        larghezza: int,
        altezza: int,
        riferimenti: list[str | Path] | None = None,
        passi: int = PASSI_DEFAULT,
    ) -> Esito:
        """Genera un'immagine. Larghezza e altezza devono essere multipli di 16.

        riferimenti: immagini di riferimento (es. il ritratto del PNG). mflux le ridimensiona da sé a
        max 1 Mpx; ogni riferimento aggiunge token, quindi rallenta la generazione.
        """
        if larghezza % 16 or altezza % 16:
            raise ValueError(f"dimensioni {larghezza}x{altezza}: servono multipli di 16")
        mx = self._mx
        modello = self._variante(edit=bool(riferimenti))
        mx.reset_peak_memory()
        t0 = time.perf_counter()
        comuni = dict(seed=seme, prompt=prompt, num_inference_steps=passi, width=larghezza, height=altezza,
                      guidance=1.0)
        if riferimenti:
            img = modello.generate_image(**comuni, image_paths=[Path(r) for r in riferimenti])
        else:
            img = modello.generate_image(**comuni)
        secondi = time.perf_counter() - t0
        picco = mx.get_peak_memory() / 1000**3
        log.info("generata %dx%d seme=%d rif=%d in %.1f s (picco MLX %.2f GB)",
                 larghezza, altezza, seme, len(riferimenti or []), secondi, picco)
        return Esito(immagine=img.image, secondi=secondi, picco_gb=picco)


def salva_jpeg(immagine, percorso: str | Path, lato_max: int = 1280, qualita: int = 85) -> Path:
    """Salva una copia JPEG leggera (per git e per il proiettore): lato lungo <= lato_max."""
    from PIL import Image

    percorso = Path(percorso)
    percorso.parent.mkdir(parents=True, exist_ok=True)
    img = immagine.convert("RGB")
    scala = lato_max / max(img.size)
    if scala < 1:
        img = img.resize((round(img.width * scala), round(img.height * scala)), Image.LANCZOS)
    img.save(percorso, "JPEG", quality=qualita, optimize=True, progressive=True)
    return percorso
