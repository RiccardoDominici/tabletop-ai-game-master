"""Impostazioni del servizio voce.

Tutti i valori hanno un default sensato e si possono cambiare con variabili
d'ambiente VOCE_* (utile per le prove di latenza senza toccare il codice).
I percorsi sono relativi alla radice del repository, ricavata da questo file:
services/voce/voce/config.py -> parents[3] = radice.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

RADICE_REPO = Path(__file__).resolve().parents[3]


def _env(nome: str, default: str) -> str:
    return os.environ.get(nome, default)


@dataclass(frozen=True)
class Impostazioni:
    # Rete: solo loopback, perché lo chiama soltanto il server Node sulla stessa macchina.
    host: str = field(default_factory=lambda: _env("VOCE_HOST", "127.0.0.1"))
    porta: int = field(default_factory=lambda: int(_env("VOCE_PORTA", "4611")))

    # Modello: Qwen3-TTS 0.6B Base, 8 bit, già nella cache HF (non scaricare altro).
    modello: str = field(
        default_factory=lambda: _env("VOCE_MODELLO", "mlx-community/Qwen3-TTS-12Hz-0.6B-Base-8bit")
    )
    lingua: str = field(default_factory=lambda: _env("VOCE_LINGUA", "italian"))

    # Ogni quanti secondi di audio il modello emette un pezzo (12,5 token/s:
    # il pezzo è int(intervallo * 12,5) token). 0,24 = 3 token. Misura A/B
    # intercalata (banco/ab_latenza.py, 6 giri, frase breve del narratore):
    # rispetto a 0,5 il primo audio arriva 205 ms prima a parità di RTF (-0,003);
    # 0,16 (2 token) guadagna altri 70 ms ma peggiora il RTF di +0,047.
    intervallo_streaming: float = field(
        default_factory=lambda: float(_env("VOCE_INTERVALLO", "0.24"))
    )

    # Tetto alla cache dei buffer MLX (MB). Senza tetto MLX tiene i buffer
    # liberati per riusarli e la memoria del processo cresce; la libreria
    # svuota la cache solo a fine generazione.
    limite_cache_mlx_mb: int = field(default_factory=lambda: int(_env("VOCE_CACHE_MLX_MB", "1024")))

    # Classe QoS del thread worker (voce/priorita.py): "interattiva", "avviata", "default", "" = non toccare.
    qos_worker: str = field(default_factory=lambda: _env("VOCE_QOS", "interattiva"))

    # Tetto di sicurezza alla durata generata: secondi = base + caratteri / car_al_secondo.
    # Il parlato italiano misurato è ~16-18 caratteri/s; 6 car/s lascia margine ~3x
    # per letture lente, ma blocca le generazioni "in fuga" che non emettono EOS.
    tetto_secondi_base: float = 4.0
    tetto_caratteri_al_secondo: float = 6.0
    tetto_token_assoluto: int = 2048

    registro_voci: Path = field(
        default_factory=lambda: Path(_env("VOCE_REGISTRO", str(RADICE_REPO / "assets" / "voci" / "voci.yaml")))
    )
    file_log: Path = field(
        default_factory=lambda: Path(_env("VOCE_LOG", str(RADICE_REPO / "logs" / "voce.jsonl")))
    )

    # Frase usata per riscaldare ogni voce all'avvio (compila i kernel MLX,
    # codifica la clip di riferimento e calcola l'embedding del parlante).
    frase_riscaldamento: str = "Pronti a cominciare, la storia sta per iniziare."
